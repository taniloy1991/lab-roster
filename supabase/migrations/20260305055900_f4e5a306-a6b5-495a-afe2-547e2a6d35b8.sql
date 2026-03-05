-- Remove Birdem/Asif-only restriction so all authorized users can manage DOB and joining date
DROP TRIGGER IF EXISTS trg_enforce_birdem_staff_dates_access ON public.staff;
DROP FUNCTION IF EXISTS public.enforce_birdem_staff_dates_access();