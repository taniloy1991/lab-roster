ALTER TABLE public.staff
ADD COLUMN IF NOT EXISTS dob date,
ADD COLUMN IF NOT EXISTS joining_date date;