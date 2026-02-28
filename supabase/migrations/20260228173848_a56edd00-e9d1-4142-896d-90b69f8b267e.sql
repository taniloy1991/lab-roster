-- Leave Management System (CL + General OFF) tables

-- 1) Casual Leave transactions (deductions only)
CREATE TABLE IF NOT EXISTS public.cl_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  total_days integer NOT NULL,
  year integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cl_transactions_inst_staff_year
  ON public.cl_transactions (institution_id, staff_id, year);

CREATE INDEX IF NOT EXISTS idx_cl_transactions_inst_year
  ON public.cl_transactions (institution_id, year);

-- 2) General OFF earn
CREATE TABLE IF NOT EXISTS public.general_off_earn (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  days_earned integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_general_off_earn_inst_staff
  ON public.general_off_earn (institution_id, staff_id);

-- 3) General OFF deduct
CREATE TABLE IF NOT EXISTS public.general_off_deduct (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  days_deducted integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_general_off_deduct_inst_staff
  ON public.general_off_deduct (institution_id, staff_id);

-- 4) Balance views (dynamic)
CREATE OR REPLACE VIEW public.cl_balance_dynamic AS
SELECT
  ct.institution_id,
  ct.staff_id,
  ct.year,
  COALESCE(SUM(ct.total_days), 0)::bigint AS used_days,
  (20 - COALESCE(SUM(ct.total_days), 0))::bigint AS remaining_days
FROM public.cl_transactions ct
GROUP BY ct.institution_id, ct.staff_id, ct.year;

CREATE OR REPLACE VIEW public.general_off_balance_dynamic AS
SELECT
  s.institution_id,
  s.id AS staff_id,
  COALESCE(e.earned, 0)::bigint AS total_earned,
  COALESCE(d.used, 0)::bigint AS total_used,
  (COALESCE(e.earned, 0) - COALESCE(d.used, 0))::bigint AS remaining_balance
FROM public.staff s
LEFT JOIN (
  SELECT institution_id, staff_id, SUM(days_earned) AS earned
  FROM public.general_off_earn
  GROUP BY institution_id, staff_id
) e ON e.institution_id = s.institution_id AND e.staff_id = s.id
LEFT JOIN (
  SELECT institution_id, staff_id, SUM(days_deducted) AS used
  FROM public.general_off_deduct
  GROUP BY institution_id, staff_id
) d ON d.institution_id = s.institution_id AND d.staff_id = s.id;

-- 5) Validation triggers (compute days, enforce limits)
CREATE OR REPLACE FUNCTION public._date_range_days_inclusive(p_start date, p_end date)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (p_end - p_start) + 1;
$$;

CREATE OR REPLACE FUNCTION public.validate_cl_transaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  already_used integer;
  computed_days integer;
  y integer;
BEGIN
  IF NEW.end_date < NEW.start_date THEN
    RAISE EXCEPTION 'End date must be on/after start date';
  END IF;

  y := EXTRACT(YEAR FROM NEW.start_date);
  IF EXTRACT(YEAR FROM NEW.end_date) <> y THEN
    RAISE EXCEPTION 'Date range must be within the same year';
  END IF;

  computed_days := public._date_range_days_inclusive(NEW.start_date, NEW.end_date);
  IF computed_days <= 0 THEN
    RAISE EXCEPTION 'Invalid date range';
  END IF;

  NEW.total_days := computed_days;
  NEW.year := y;

  SELECT COALESCE(SUM(total_days), 0)
    INTO already_used
  FROM public.cl_transactions
  WHERE institution_id = NEW.institution_id
    AND staff_id = NEW.staff_id
    AND year = NEW.year;

  IF (already_used + NEW.total_days) > 20 THEN
    RAISE EXCEPTION 'CL limit exceeded';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_cl_transaction ON public.cl_transactions;
CREATE TRIGGER trg_validate_cl_transaction
BEFORE INSERT ON public.cl_transactions
FOR EACH ROW
EXECUTE FUNCTION public.validate_cl_transaction();

CREATE OR REPLACE FUNCTION public.validate_general_off_earn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  computed_days integer;
BEGIN
  IF NEW.end_date < NEW.start_date THEN
    RAISE EXCEPTION 'End date must be on/after start date';
  END IF;

  computed_days := public._date_range_days_inclusive(NEW.start_date, NEW.end_date);
  IF computed_days <= 0 THEN
    RAISE EXCEPTION 'Invalid date range';
  END IF;

  NEW.days_earned := computed_days;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_general_off_earn ON public.general_off_earn;
CREATE TRIGGER trg_validate_general_off_earn
BEFORE INSERT ON public.general_off_earn
FOR EACH ROW
EXECUTE FUNCTION public.validate_general_off_earn();

CREATE OR REPLACE FUNCTION public.validate_general_off_deduct()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  computed_days integer;
  earned_total integer;
  used_total integer;
BEGIN
  IF NEW.end_date < NEW.start_date THEN
    RAISE EXCEPTION 'End date must be on/after start date';
  END IF;

  computed_days := public._date_range_days_inclusive(NEW.start_date, NEW.end_date);
  IF computed_days <= 0 THEN
    RAISE EXCEPTION 'Invalid date range';
  END IF;

  NEW.days_deducted := computed_days;

  SELECT COALESCE(SUM(days_earned), 0) INTO earned_total
  FROM public.general_off_earn
  WHERE institution_id = NEW.institution_id
    AND staff_id = NEW.staff_id;

  SELECT COALESCE(SUM(days_deducted), 0) INTO used_total
  FROM public.general_off_deduct
  WHERE institution_id = NEW.institution_id
    AND staff_id = NEW.staff_id;

  IF (earned_total - used_total - NEW.days_deducted) < 0 THEN
    RAISE EXCEPTION 'Insufficient OFF balance';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_general_off_deduct ON public.general_off_deduct;
CREATE TRIGGER trg_validate_general_off_deduct
BEFORE INSERT ON public.general_off_deduct
FOR EACH ROW
EXECUTE FUNCTION public.validate_general_off_deduct();

-- 6) RLS
ALTER TABLE public.cl_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.general_off_earn ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.general_off_deduct ENABLE ROW LEVEL SECURITY;

-- Casual Leave: members manage (no role differences)
DROP POLICY IF EXISTS "Institution members manage CL transactions" ON public.cl_transactions;
CREATE POLICY "Institution members manage CL transactions"
ON public.cl_transactions
FOR ALL
USING (
  institution_id = get_my_institution_id()
  AND is_in_institution(auth.uid(), institution_id)
)
WITH CHECK (
  institution_id = get_my_institution_id()
  AND is_in_institution(auth.uid(), institution_id)
);

-- OFF earn: members manage
DROP POLICY IF EXISTS "Institution members manage OFF earn" ON public.general_off_earn;
CREATE POLICY "Institution members manage OFF earn"
ON public.general_off_earn
FOR ALL
USING (
  institution_id = get_my_institution_id()
  AND is_in_institution(auth.uid(), institution_id)
)
WITH CHECK (
  institution_id = get_my_institution_id()
  AND is_in_institution(auth.uid(), institution_id)
);

-- OFF deduct: members manage
DROP POLICY IF EXISTS "Institution members manage OFF deduct" ON public.general_off_deduct;
CREATE POLICY "Institution members manage OFF deduct"
ON public.general_off_deduct
FOR ALL
USING (
  institution_id = get_my_institution_id()
  AND is_in_institution(auth.uid(), institution_id)
)
WITH CHECK (
  institution_id = get_my_institution_id()
  AND is_in_institution(auth.uid(), institution_id)
);
