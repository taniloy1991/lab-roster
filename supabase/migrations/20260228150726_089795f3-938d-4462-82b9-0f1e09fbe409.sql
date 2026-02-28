-- PART 1: Holidays duplicate fix + PART 3: staff_leaves table

-- 1) Fix holidays uniqueness rules
DO $$
BEGIN
  -- drop the old unique constraint if it exists (name may vary)
  IF EXISTS (
    SELECT 1
    FROM   pg_constraint
    WHERE  conname = 'holidays_institution_id_holiday_date_key'
  ) THEN
    ALTER TABLE public.holidays DROP CONSTRAINT holidays_institution_id_holiday_date_key;
  END IF;
END $$;

-- unique per staff per date (allows multiple staff on same date)
CREATE UNIQUE INDEX IF NOT EXISTS holidays_unique_staff_date
  ON public.holidays (institution_id, holiday_date, staff_id)
  WHERE staff_id IS NOT NULL;

-- only one government holiday row per institution + date (staff_id NULL)
CREATE UNIQUE INDEX IF NOT EXISTS holidays_unique_govt_date
  ON public.holidays (institution_id, holiday_date)
  WHERE staff_id IS NULL AND holiday_type = 'government';


-- 2) New staff_leaves table for per-staff per-date leave selection (roster UI + prints)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'staff_leave_type') THEN
    CREATE TYPE public.staff_leave_type AS ENUM ('casual', 'off_use', 'general_off', 'government');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.staff_leaves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  duty_date date NOT NULL,
  leave_type public.staff_leave_type NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, duty_date, staff_id)
);

ALTER TABLE public.staff_leaves ENABLE ROW LEVEL SECURITY;

-- Any authenticated institution member can read
CREATE POLICY "Institution members can view staff leaves"
ON public.staff_leaves
FOR SELECT
TO authenticated
USING (
  institution_id = public.get_my_institution_id()
  AND public.is_in_institution(auth.uid(), institution_id)
);

-- Only lab_incharge can manage (insert/update/delete)
CREATE POLICY "Lab incharge manages staff leaves"
ON public.staff_leaves
FOR ALL
TO authenticated
USING (
  institution_id = public.get_my_institution_id()
  AND public.has_institution_role(auth.uid(), institution_id, 'lab_incharge'::public.app_role)
)
WITH CHECK (
  institution_id = public.get_my_institution_id()
  AND public.has_institution_role(auth.uid(), institution_id, 'lab_incharge'::public.app_role)
);

-- updated_at trigger
DROP TRIGGER IF EXISTS set_staff_leaves_updated_at ON public.staff_leaves;
CREATE TRIGGER set_staff_leaves_updated_at
BEFORE UPDATE ON public.staff_leaves
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();
