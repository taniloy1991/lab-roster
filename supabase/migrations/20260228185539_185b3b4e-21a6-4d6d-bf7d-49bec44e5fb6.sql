-- 1) Fix restrictive isolation policies so super_admin override always works

-- staff: allow super_admin to pass the restrictive institution membership policy
ALTER POLICY staff_role_based
ON public.staff
USING (
  has_global_role(auth.uid(), 'super_admin'::global_role)
  OR (
    institution_id = (
      SELECT profiles.active_institution_id
      FROM public.profiles
      WHERE profiles.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM public.institution_users iu
      WHERE iu.user_id = auth.uid()
        AND iu.institution_id = public.staff.institution_id
    )
  )
);

-- roster_days: allow super_admin
ALTER POLICY roster_days_isolation
ON public.roster_days
USING (
  has_global_role(auth.uid(), 'super_admin'::global_role)
  OR (
    institution_id = (
      SELECT profiles.active_institution_id
      FROM public.profiles
      WHERE profiles.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM public.institution_users iu
      WHERE iu.user_id = auth.uid()
        AND iu.institution_id = public.roster_days.institution_id
    )
  )
);

-- roster_shift_assignments: allow super_admin
ALTER POLICY roster_assignments_isolation
ON public.roster_shift_assignments
USING (
  has_global_role(auth.uid(), 'super_admin'::global_role)
  OR (
    roster_day_id IN (
      SELECT rd.id
      FROM public.roster_days rd
      WHERE rd.institution_id = (
        SELECT profiles.active_institution_id
        FROM public.profiles
        WHERE profiles.user_id = auth.uid()
      )
    )
  )
);

-- leave_requests: allow super_admin
ALTER POLICY leave_requests_isolation_select
ON public.leave_requests
USING (
  has_global_role(auth.uid(), 'super_admin'::global_role)
  OR (
    institution_id = (
      SELECT profiles.active_institution_id
      FROM public.profiles
      WHERE profiles.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM public.institution_users iu
      WHERE iu.user_id = auth.uid()
        AND iu.institution_id = public.leave_requests.institution_id
    )
  )
);

-- casual_leave_ledger: allow super_admin
ALTER POLICY cl_isolation
ON public.casual_leave_ledger
USING (
  has_global_role(auth.uid(), 'super_admin'::global_role)
  OR (
    institution_id = (
      SELECT profiles.active_institution_id
      FROM public.profiles
      WHERE profiles.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM public.institution_users iu
      WHERE iu.user_id = auth.uid()
        AND iu.institution_id = public.casual_leave_ledger.institution_id
    )
  )
);

-- compensatory_off_ledger: allow super_admin
ALTER POLICY off_isolation
ON public.compensatory_off_ledger
USING (
  has_global_role(auth.uid(), 'super_admin'::global_role)
  OR (
    institution_id = (
      SELECT profiles.active_institution_id
      FROM public.profiles
      WHERE profiles.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM public.institution_users iu
      WHERE iu.user_id = auth.uid()
        AND iu.institution_id = public.compensatory_off_ledger.institution_id
    )
  )
);

-- 2) Extend roster visual validation to allow leave rows with staff_id (single staff/date in UI)
CREATE OR REPLACE FUNCTION public.validate_roster_visual_entry()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  -- Auto stamp creator
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;

  IF NEW.shift IS NULL THEN
    -- Leave row (visual-only)

    -- responsibility note not applicable for leave row
    NEW.responsibility_note := NULL;

    -- leave_type is required (can be "none")
    IF NEW.leave_type IS NULL THEN
      RAISE EXCEPTION 'Leave row must have leave_type';
    END IF;

    -- staff_id is OPTIONAL (legacy rows used staff_id NULL), but allowed now
    RETURN NEW;
  END IF;

  -- Staff shift row
  IF NEW.staff_id IS NULL THEN
    RAISE EXCEPTION 'Shift row must have staff_id';
  END IF;

  RETURN NEW;
END;
$$;
