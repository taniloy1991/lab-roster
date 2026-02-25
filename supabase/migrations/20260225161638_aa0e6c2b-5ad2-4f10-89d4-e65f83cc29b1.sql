-- Create compensatory off ledger table
CREATE TABLE IF NOT EXISTS public.compensatory_off_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  duty_date date NOT NULL,
  entry_type text NOT NULL,
  source_type text NULL,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT compensatory_off_ledger_entry_type_chk CHECK (entry_type IN ('earn','use')),
  CONSTRAINT compensatory_off_ledger_source_type_chk CHECK (source_type IS NULL OR source_type IN ('friday','govt'))
);

ALTER TABLE public.compensatory_off_ledger ENABLE ROW LEVEL SECURITY;

-- Staff can view own OFF ledger
DO $$ BEGIN
  CREATE POLICY "Staff can view own OFF ledger"
  ON public.compensatory_off_ledger
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.staff s
      WHERE s.id = compensatory_off_ledger.staff_id
        AND s.user_id = auth.uid()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Lab incharge manages OFF ledger for their institution
DO $$ BEGIN
  CREATE POLICY "Lab incharge manages OFF ledger"
  ON public.compensatory_off_ledger
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.staff s
      WHERE s.id = compensatory_off_ledger.staff_id
        AND has_institution_role(auth.uid(), s.institution_id, 'lab_incharge'::app_role)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff s
      WHERE s.id = compensatory_off_ledger.staff_id
        AND has_institution_role(auth.uid(), s.institution_id, 'lab_incharge'::app_role)
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Super admin manages OFF ledger
DO $$ BEGIN
  CREATE POLICY "Super admin manages OFF ledger"
  ON public.compensatory_off_ledger
  FOR ALL
  USING (has_global_role(auth.uid(), 'super_admin'::global_role))
  WITH CHECK (has_global_role(auth.uid(), 'super_admin'::global_role));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- Create casual leave ledger table
CREATE TABLE IF NOT EXISTS public.casual_leave_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  leave_date date NOT NULL,
  year integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.casual_leave_ledger ENABLE ROW LEVEL SECURITY;

-- Staff can view own CL ledger
DO $$ BEGIN
  CREATE POLICY "Staff can view own CL ledger"
  ON public.casual_leave_ledger
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.staff s
      WHERE s.id = casual_leave_ledger.staff_id
        AND s.user_id = auth.uid()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Lab incharge manages CL ledger for their institution
DO $$ BEGIN
  CREATE POLICY "Lab incharge manages CL ledger"
  ON public.casual_leave_ledger
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.staff s
      WHERE s.id = casual_leave_ledger.staff_id
        AND has_institution_role(auth.uid(), s.institution_id, 'lab_incharge'::app_role)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff s
      WHERE s.id = casual_leave_ledger.staff_id
        AND has_institution_role(auth.uid(), s.institution_id, 'lab_incharge'::app_role)
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Super admin manages CL ledger
DO $$ BEGIN
  CREATE POLICY "Super admin manages CL ledger"
  ON public.casual_leave_ledger
  FOR ALL
  USING (has_global_role(auth.uid(), 'super_admin'::global_role))
  WITH CHECK (has_global_role(auth.uid(), 'super_admin'::global_role));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_comp_off_staff_date ON public.compensatory_off_ledger(staff_id, duty_date);
CREATE INDEX IF NOT EXISTS idx_cl_staff_year ON public.casual_leave_ledger(staff_id, year);