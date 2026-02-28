-- Security fixes: enable RLS for app_settings + harden functions

-- 1) app_settings had RLS disabled
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view app settings" ON public.app_settings;
CREATE POLICY "Members can view app settings"
ON public.app_settings
FOR SELECT
USING (
  auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "Super admin manages app settings" ON public.app_settings;
CREATE POLICY "Super admin manages app settings"
ON public.app_settings
FOR ALL
USING (has_global_role(auth.uid(), 'super_admin'::global_role))
WITH CHECK (has_global_role(auth.uid(), 'super_admin'::global_role));

-- 2) Ensure all new functions have immutable behavior and fixed search_path; avoid SECURITY DEFINER where not needed
CREATE OR REPLACE FUNCTION public._date_range_days_inclusive(p_start date, p_end date)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT (p_end - p_start) + 1;
$$;

CREATE OR REPLACE FUNCTION public.validate_cl_transaction()
RETURNS trigger
LANGUAGE plpgsql
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

CREATE OR REPLACE FUNCTION public.validate_general_off_earn()
RETURNS trigger
LANGUAGE plpgsql
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

CREATE OR REPLACE FUNCTION public.validate_general_off_deduct()
RETURNS trigger
LANGUAGE plpgsql
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
