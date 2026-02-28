-- RBAC: super_admin override within active institution scope (no schema/table shape changes)

-- selected_roster_dates: allow super_admin OR institution member
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='selected_roster_dates'
      AND policyname='Selected roster dates manageable by members'
  ) THEN
    DROP POLICY "Selected roster dates manageable by members" ON public.selected_roster_dates;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='selected_roster_dates'
      AND policyname='Selected roster dates readable by members'
  ) THEN
    DROP POLICY "Selected roster dates readable by members" ON public.selected_roster_dates;
  END IF;
END$$;

CREATE POLICY "Selected roster dates readable by members"
ON public.selected_roster_dates
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND (
    has_global_role(auth.uid(), 'super_admin'::global_role)
    OR is_in_institution(auth.uid(), get_my_institution_id())
  )
);

CREATE POLICY "Selected roster dates manageable by members"
ON public.selected_roster_dates
FOR ALL
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND (
    has_global_role(auth.uid(), 'super_admin'::global_role)
    OR is_in_institution(auth.uid(), get_my_institution_id())
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (
    has_global_role(auth.uid(), 'super_admin'::global_role)
    OR is_in_institution(auth.uid(), get_my_institution_id())
  )
);

-- holidays: super_admin can insert/update/delete too
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='holidays'
      AND policyname='Lab incharge manages holidays'
  ) THEN
    DROP POLICY "Lab incharge manages holidays" ON public.holidays;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='holidays'
      AND policyname='Lab incharge updates holidays'
  ) THEN
    DROP POLICY "Lab incharge updates holidays" ON public.holidays;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='holidays'
      AND policyname='Lab incharge deletes holidays'
  ) THEN
    DROP POLICY "Lab incharge deletes holidays" ON public.holidays;
  END IF;
END$$;

CREATE POLICY "Lab incharge manages holidays"
ON public.holidays
FOR INSERT
TO authenticated
WITH CHECK (
  has_global_role(auth.uid(), 'super_admin'::global_role)
  OR has_institution_role(auth.uid(), institution_id, 'lab_incharge'::app_role)
);

CREATE POLICY "Lab incharge updates holidays"
ON public.holidays
FOR UPDATE
TO authenticated
USING (
  has_global_role(auth.uid(), 'super_admin'::global_role)
  OR has_institution_role(auth.uid(), institution_id, 'lab_incharge'::app_role)
)
WITH CHECK (
  has_global_role(auth.uid(), 'super_admin'::global_role)
  OR has_institution_role(auth.uid(), institution_id, 'lab_incharge'::app_role)
);

CREATE POLICY "Lab incharge deletes holidays"
ON public.holidays
FOR DELETE
TO authenticated
USING (
  has_global_role(auth.uid(), 'super_admin'::global_role)
  OR has_institution_role(auth.uid(), institution_id, 'lab_incharge'::app_role)
);

-- staff: allow super_admin full manage within institution
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='staff'
      AND policyname='Lab incharge can manage staff'
  ) THEN
    DROP POLICY "Lab incharge can manage staff" ON public.staff;
  END IF;
END$$;

CREATE POLICY "Lab incharge can manage staff"
ON public.staff
FOR ALL
TO authenticated
USING (
  has_global_role(auth.uid(), 'super_admin'::global_role)
  OR has_institution_role(auth.uid(), institution_id, 'lab_incharge'::app_role)
)
WITH CHECK (
  has_global_role(auth.uid(), 'super_admin'::global_role)
  OR has_institution_role(auth.uid(), institution_id, 'lab_incharge'::app_role)
);

-- roster_days: allow super_admin manage
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='roster_days'
      AND policyname='Lab incharge manages roster days'
  ) THEN
    DROP POLICY "Lab incharge manages roster days" ON public.roster_days;
  END IF;
END$$;

CREATE POLICY "Lab incharge manages roster days"
ON public.roster_days
FOR ALL
TO authenticated
USING (
  has_global_role(auth.uid(), 'super_admin'::global_role)
  OR has_institution_role(auth.uid(), institution_id, 'lab_incharge'::app_role)
)
WITH CHECK (
  has_global_role(auth.uid(), 'super_admin'::global_role)
  OR has_institution_role(auth.uid(), institution_id, 'lab_incharge'::app_role)
);

-- roster_shift_assignments: allow super_admin manage
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='roster_shift_assignments'
      AND policyname='Lab incharge manages roster assignments'
  ) THEN
    DROP POLICY "Lab incharge manages roster assignments" ON public.roster_shift_assignments;
  END IF;
END$$;

CREATE POLICY "Lab incharge manages roster assignments"
ON public.roster_shift_assignments
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.roster_days rd
    WHERE rd.id = roster_shift_assignments.roster_day_id
      AND (
        has_global_role(auth.uid(), 'super_admin'::global_role)
        OR has_institution_role(auth.uid(), rd.institution_id, 'lab_incharge'::app_role)
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.roster_days rd
    WHERE rd.id = roster_shift_assignments.roster_day_id
      AND (
        has_global_role(auth.uid(), 'super_admin'::global_role)
        OR has_institution_role(auth.uid(), rd.institution_id, 'lab_incharge'::app_role)
      )
  )
);

-- leave_requests: super_admin can manage (approve/reject) as well
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='leave_requests'
      AND policyname='Lab incharge manages leave requests'
  ) THEN
    DROP POLICY "Lab incharge manages leave requests" ON public.leave_requests;
  END IF;
END$$;

CREATE POLICY "Lab incharge manages leave requests"
ON public.leave_requests
FOR ALL
TO authenticated
USING (
  has_global_role(auth.uid(), 'super_admin'::global_role)
  OR has_institution_role(auth.uid(), institution_id, 'lab_incharge'::app_role)
)
WITH CHECK (
  has_global_role(auth.uid(), 'super_admin'::global_role)
  OR has_institution_role(auth.uid(), institution_id, 'lab_incharge'::app_role)
);

-- institution_settings update: super_admin can update too
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='institution_settings'
      AND policyname='Lab incharge can update settings'
  ) THEN
    DROP POLICY "Lab incharge can update settings" ON public.institution_settings;
  END IF;
END$$;

CREATE POLICY "Lab incharge can update settings"
ON public.institution_settings
FOR UPDATE
TO authenticated
USING (
  has_global_role(auth.uid(), 'super_admin'::global_role)
  OR has_institution_role(auth.uid(), institution_id, 'lab_incharge'::app_role)
)
WITH CHECK (
  has_global_role(auth.uid(), 'super_admin'::global_role)
  OR has_institution_role(auth.uid(), institution_id, 'lab_incharge'::app_role)
);

-- roster_visual_entries: allow super_admin even if not explicit member (still scoped to active institution)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='roster_visual_entries'
      AND policyname='Institution members manage visual roster'
  ) THEN
    DROP POLICY "Institution members manage visual roster" ON public.roster_visual_entries;
  END IF;
END$$;

CREATE POLICY "Institution members manage visual roster"
ON public.roster_visual_entries
FOR ALL
TO authenticated
USING (
  institution_id = get_my_institution_id()
  AND (
    has_global_role(auth.uid(), 'super_admin'::global_role)
    OR is_in_institution(auth.uid(), institution_id)
  )
)
WITH CHECK (
  institution_id = get_my_institution_id()
  AND (
    has_global_role(auth.uid(), 'super_admin'::global_role)
    OR is_in_institution(auth.uid(), institution_id)
  )
);
