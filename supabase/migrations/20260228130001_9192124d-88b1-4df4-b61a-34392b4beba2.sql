-- Ensure selected_roster_dates is protected but writable by Lab Incharge
ALTER TABLE public.selected_roster_dates ENABLE ROW LEVEL SECURITY;

-- Read: any authenticated institution member can read selection table (used for PDF export)
DO $$ BEGIN
  CREATE POLICY "Selected roster dates readable by members"
  ON public.selected_roster_dates
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND is_in_institution(auth.uid(), get_my_institution_id())
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Write: only lab_incharge can manage selection table
DO $$ BEGIN
  CREATE POLICY "Selected roster dates manageable by lab incharge"
  ON public.selected_roster_dates
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND has_institution_role(auth.uid(), get_my_institution_id(), 'lab_incharge'::app_role)
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND has_institution_role(auth.uid(), get_my_institution_id(), 'lab_incharge'::app_role)
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;