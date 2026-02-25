-- Ensure staff_code exists (it already does in current schema); enforce uniqueness per institution (case-insensitive)

-- Unique index on normalized (lowercased) staff_code, ignoring NULL/empty
CREATE UNIQUE INDEX IF NOT EXISTS staff_institution_staff_code_unique
ON public.staff (institution_id, lower(staff_code))
WHERE staff_code IS NOT NULL AND length(btrim(staff_code)) > 0;
