-- Allow all institution members (not just lab_incharge) to manage selected_roster_dates

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='selected_roster_dates'
      AND policyname='Selected roster dates manageable by lab incharge'
  ) THEN
    DROP POLICY "Selected roster dates manageable by lab incharge" ON public.selected_roster_dates;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='selected_roster_dates'
      AND policyname='Selected roster dates manageable by members'
  ) THEN
    CREATE POLICY "Selected roster dates manageable by members"
    ON public.selected_roster_dates
    FOR ALL
    TO authenticated
    USING (
      auth.uid() IS NOT NULL
      AND is_in_institution(auth.uid(), get_my_institution_id())
    )
    WITH CHECK (
      auth.uid() IS NOT NULL
      AND is_in_institution(auth.uid(), get_my_institution_id())
    );
  END IF;
END$$;
