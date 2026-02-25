-- Fix linter: make views run with invoker privileges (not definer)
ALTER VIEW IF EXISTS public.off_balance_view SET (security_invoker = true);
ALTER VIEW IF EXISTS public.cl_balance_view SET (security_invoker = true);
ALTER VIEW IF EXISTS public.monthly_leave_summary SET (security_invoker = true);

-- Fix linter: pin search_path on trigger functions
CREATE OR REPLACE FUNCTION public.auto_off_use()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
declare 
  leave_day date;
  days_requested integer;
  current_balance integer;
begin
  if not (new.leave_type = 'off' and lower(new.status::text) = 'approved') then
    return new;
  end if;

  if tg_op = 'UPDATE' and lower(old.status::text) = 'approved' then
    return new;
  end if;

  days_requested := (new.end_date - new.start_date) + 1;

  select
    (count(*) filter (where entry_type = 'earn') - count(*) filter (where entry_type = 'use'))
  into current_balance
  from compensatory_off_ledger
  where staff_id = new.staff_id
    and institution_id = new.institution_id;

  if coalesce(current_balance, 0) < days_requested then
    raise exception 'Insufficient OFF balance';
  end if;

  leave_day := new.start_date;
  while leave_day <= new.end_date loop
    insert into compensatory_off_ledger (
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

CREATE OR REPLACE FUNCTION public.auto_cl_use()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
declare 
  leave_day date;
  used_count integer;
  days_requested integer;
  y integer;
begin
  if not (new.leave_type = 'casual' and lower(new.status::text) = 'approved') then
    return new;
  end if;

  if tg_op = 'UPDATE' and lower(old.status::text) = 'approved' then
    return new;
  end if;

  days_requested := (new.end_date - new.start_date) + 1;
  y := extract(year from new.start_date);

  select count(*) into used_count
  from casual_leave_ledger
  where staff_id = new.staff_id
    and year = y;

  if (coalesce(used_count, 0) + days_requested) > 20 then
    raise exception 'Casual leave limit exceeded';
  end if;

  leave_day := new.start_date;
  while leave_day <= new.end_date loop
    insert into casual_leave_ledger (
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

CREATE OR REPLACE FUNCTION public.auto_off_earn()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
declare
  duty_rec record;
begin

select * into duty_rec
from roster_days
where id = new.roster_day_id;

if duty_rec.is_friday = true
   or duty_rec.is_govt_holiday = true then

   insert into compensatory_off_ledger (
     staff_id,
     duty_date,
     entry_type,
     source_type,
     institution_id
   )
   values (
     new.staff_id,
     duty_rec.duty_date,
     'earn',
     case 
       when duty_rec.is_friday then 'friday'
       when duty_rec.is_govt_holiday then 'govt'
     end,
     duty_rec.institution_id
   );

end if;

return new;
end;
$function$;
