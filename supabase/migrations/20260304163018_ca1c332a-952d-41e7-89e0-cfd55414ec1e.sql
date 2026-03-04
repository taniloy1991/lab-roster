CREATE OR REPLACE FUNCTION public.enforce_birdem_staff_dates_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  birdem_id constant uuid := 'cfa40334-46e7-431d-9f77-3f3aa1a6b339'::uuid;
  asif_user_id constant uuid := 'f6b0964c-ce2e-457f-9aa7-0fe164d69454'::uuid;
BEGIN
  IF NEW.institution_id <> birdem_id THEN
    RETURN NEW;
  END IF;

  IF auth.uid() = asif_user_id THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.dob IS NOT NULL OR NEW.joining_date IS NOT NULL THEN
      RAISE EXCEPTION 'Only authorized user can set DOB or joining date for this institution';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.dob IS DISTINCT FROM OLD.dob OR NEW.joining_date IS DISTINCT FROM OLD.joining_date THEN
    RAISE EXCEPTION 'Only authorized user can update DOB or joining date for this institution';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_birdem_staff_dates_access ON public.staff;
CREATE TRIGGER trg_enforce_birdem_staff_dates_access
BEFORE INSERT OR UPDATE ON public.staff
FOR EACH ROW
EXECUTE FUNCTION public.enforce_birdem_staff_dates_access();