-- 1) Drop duplicate table (only if exists)
DROP TABLE IF EXISTS public.off_ledger;

-- 2) Ensure ledgers have institution_id as single source of truth
ALTER TABLE public.compensatory_off_ledger
  ADD COLUMN IF NOT EXISTS institution_id uuid;

ALTER TABLE public.casual_leave_ledger
  ADD COLUMN IF NOT EXISTS institution_id uuid;

-- 3) Backfill institution_id from staff
UPDATE public.compensatory_off_ledger l
SET institution_id = s.institution_id
FROM public.staff s
WHERE s.id = l.staff_id
  AND l.institution_id IS NULL;

UPDATE public.casual_leave_ledger l
SET institution_id = s.institution_id
FROM public.staff s
WHERE s.id = l.staff_id
  AND l.institution_id IS NULL;

-- Make institution_id required now that it is backfilled
ALTER TABLE public.compensatory_off_ledger
  ALTER COLUMN institution_id SET NOT NULL;

ALTER TABLE public.casual_leave_ledger
  ALTER COLUMN institution_id SET NOT NULL;

-- Add FK to institutions
ALTER TABLE public.compensatory_off_ledger
  DROP CONSTRAINT IF EXISTS compensatory_off_ledger_institution_id_fkey;
ALTER TABLE public.compensatory_off_ledger
  ADD CONSTRAINT compensatory_off_ledger_institution_id_fkey
  FOREIGN KEY (institution_id) REFERENCES public.institutions(id)
  ON DELETE CASCADE;

ALTER TABLE public.casual_leave_ledger
  DROP CONSTRAINT IF EXISTS casual_leave_ledger_institution_id_fkey;
ALTER TABLE public.casual_leave_ledger
  ADD CONSTRAINT casual_leave_ledger_institution_id_fkey
  FOREIGN KEY (institution_id) REFERENCES public.institutions(id)
  ON DELETE CASCADE;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_off_ledger_institution_staff_date
  ON public.compensatory_off_ledger (institution_id, staff_id, duty_date);

CREATE INDEX IF NOT EXISTS idx_cl_ledger_institution_staff_year
  ON public.casual_leave_ledger (institution_id, staff_id, year);

-- 4) RLS: single rule: institution_id must match the active institution
ALTER TABLE public.compensatory_off_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.casual_leave_ledger ENABLE ROW LEVEL SECURITY;

-- Replace existing policies with institution-scoped versions
DROP POLICY IF EXISTS "Lab incharge manages OFF ledger" ON public.compensatory_off_ledger;
DROP POLICY IF EXISTS "Staff can view own OFF ledger" ON public.compensatory_off_ledger;
DROP POLICY IF EXISTS "Super admin manages OFF ledger" ON public.compensatory_off_ledger;

CREATE POLICY "Institution-scoped OFF ledger read/write"
ON public.compensatory_off_ledger
FOR ALL
USING (
  (institution_id = public.get_my_institution_id())
  AND (
    public.has_institution_role(auth.uid(), institution_id, 'lab_incharge'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.staff s
      WHERE s.id = compensatory_off_ledger.staff_id
        AND s.user_id = auth.uid()
        AND s.institution_id = compensatory_off_ledger.institution_id
    )
  )
)
WITH CHECK (
  (institution_id = public.get_my_institution_id())
  AND public.has_institution_role(auth.uid(), institution_id, 'lab_incharge'::public.app_role)
);

CREATE POLICY "Super admin manages OFF ledger"
ON public.compensatory_off_ledger
FOR ALL
USING (public.has_global_role(auth.uid(), 'super_admin'::public.global_role))
WITH CHECK (public.has_global_role(auth.uid(), 'super_admin'::public.global_role));

DROP POLICY IF EXISTS "Lab incharge manages CL ledger" ON public.casual_leave_ledger;
DROP POLICY IF EXISTS "Staff can view own CL ledger" ON public.casual_leave_ledger;
DROP POLICY IF EXISTS "Super admin manages CL ledger" ON public.casual_leave_ledger;

CREATE POLICY "Institution-scoped CL ledger read/write"
ON public.casual_leave_ledger
FOR ALL
USING (
  (institution_id = public.get_my_institution_id())
  AND (
    public.has_institution_role(auth.uid(), institution_id, 'lab_incharge'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.staff s
      WHERE s.id = casual_leave_ledger.staff_id
        AND s.user_id = auth.uid()
        AND s.institution_id = casual_leave_ledger.institution_id
    )
)
)
WITH CHECK (
  (institution_id = public.get_my_institution_id())
  AND public.has_institution_role(auth.uid(), institution_id, 'lab_incharge'::public.app_role)
);

CREATE POLICY "Super admin manages CL ledger"
ON public.casual_leave_ledger
FOR ALL
USING (public.has_global_role(auth.uid(), 'super_admin'::public.global_role))
WITH CHECK (public.has_global_role(auth.uid(), 'super_admin'::public.global_role));
