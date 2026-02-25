-- 1) Harden leave approval side-effects + validations

-- OFF: prevent duplicates + prevent negative balance
CREATE OR REPLACE FUNCTION public.auto_off_use()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare 
  leave_day date;
  days_requested integer;
  current_balance integer;
begin
  -- Only act when transitioning into approved
  if not (new.leave_type = 'off' and lower(new.status::text) = 'approved') then
    return new;
  end if;

  if tg_op = 'UPDATE' and lower(old.status::text) = 'approved' then
    -- already approved earlier; do nothing (prevents duplicate inserts)
    return new;
  end if;

  days_requested := (new.end_date - new.start_date) + 1;

  select
    (count(*) filter (where entry_type = 'earn') - count(*) filter (where entry_type = 'use'))
  into current_balance
  from public.compensatory_off_ledger
  where staff_id = new.staff_id
    and institution_id = new.institution_id;

  if coalesce(current_balance, 0) < days_requested then
    raise exception 'Insufficient OFF balance';
  end if;

  leave_day := new.start_date;
  while leave_day <= new.end_date loop
    insert into public.compensatory_off_ledger (
      staff_id,
      duty_date,
      entry_type,
      source_type,
      institution_id
    )
    values (
      new.staff_id,
      leave_day,
      'use',
      null,
      new.institution_id
    );

    leave_day := leave_day + interval '1 day';
  end loop;

  return new;
end;
$function$;

-- CL: prevent duplicates + enforce yearly 20-day limit INCLUDING this request span
CREATE OR REPLACE FUNCTION public.auto_cl_use()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare 
  leave_day date;
  used_count integer;
  days_requested integer;
  y integer;
begin
  -- Only act when transitioning into approved
  if not (new.leave_type = 'casual' and lower(new.status::text) = 'approved') then
    return new;
  end if;

  if tg_op = 'UPDATE' and lower(old.status::text) = 'approved' then
    -- already approved earlier; do nothing (prevents duplicate inserts)
    return new;
  end if;

  days_requested := (new.end_date - new.start_date) + 1;
  y := extract(year from new.start_date);

  select count(*) into used_count
  from public.casual_leave_ledger
  where staff_id = new.staff_id
    and year = y;

  if (coalesce(used_count, 0) + days_requested) > 20 then
    raise exception 'Casual leave limit exceeded';
  end if;

  leave_day := new.start_date;
  while leave_day <= new.end_date loop
    insert into public.casual_leave_ledger (
      staff_id,
      leave_date,
      institution_id,
      year
    )
    values (
      new.staff_id,
      leave_day,
      new.institution_id,
      y
    );

    leave_day := leave_day + interval '1 day';
  end loop;

  return new;
end;
$function$;

-- 2) Add triggers to actually run these functions on approvals
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_leave_auto_off_use') THEN
    DROP TRIGGER tr_leave_auto_off_use ON public.leave_requests;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_leave_auto_cl_use') THEN
    DROP TRIGGER tr_leave_auto_cl_use ON public.leave_requests;
  END IF;
END $$;

CREATE TRIGGER tr_leave_auto_off_use
AFTER UPDATE OF status ON public.leave_requests
FOR EACH ROW
WHEN (
  new.status = 'approved'::public.leave_status
  AND new.leave_type = 'off'::public.leave_type
)
EXECUTE FUNCTION public.auto_off_use();

CREATE TRIGGER tr_leave_auto_cl_use
AFTER UPDATE OF status ON public.leave_requests
FOR EACH ROW
WHEN (
  new.status = 'approved'::public.leave_status
  AND new.leave_type = 'casual'::public.leave_type
)
EXECUTE FUNCTION public.auto_cl_use();

-- 3) Fix RLS: remove overly-permissive ALL policy and replace with SELECT-only isolation
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'leave_requests'
      AND policyname = 'leave_isolation'
  ) THEN
    DROP POLICY "leave_isolation" ON public.leave_requests;
  END IF;
END $$;

CREATE POLICY "leave_requests_isolation_select"
ON public.leave_requests
FOR SELECT
USING (
  institution_id = (
    SELECT profiles.active_institution_id
    FROM public.profiles
    WHERE profiles.user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1
    FROM public.institution_users iu
    WHERE iu.user_id = auth.uid()
      AND iu.institution_id = leave_requests.institution_id
  )
);
