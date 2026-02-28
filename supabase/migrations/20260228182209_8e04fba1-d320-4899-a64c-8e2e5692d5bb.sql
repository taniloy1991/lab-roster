-- PART 2: purely-visual roster storage

-- 1) Visual leave types for roster (display-only)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'roster_visual_leave_type') THEN
    CREATE TYPE public.roster_visual_leave_type AS ENUM (
      'others',
      'earned_leave',
      'casual_leave',
      'week_off',
      'govt_holiday',
      'none'
    );
  END IF;
END$$;

-- 2) Visual roster entries table
CREATE TABLE IF NOT EXISTS public.roster_visual_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL,
  duty_date date NOT NULL,
  shift public.roster_shift NULL, -- NULL row represents the per-date Leave column
  staff_id uuid NULL,            -- NULL for leave-only row
  responsibility_note text NULL,
  leave_type public.roster_visual_leave_type NULL,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3) Indexes
CREATE INDEX IF NOT EXISTS idx_roster_visual_entries_institution_date
  ON public.roster_visual_entries (institution_id, duty_date);

CREATE INDEX IF NOT EXISTS idx_roster_visual_entries_staff
  ON public.roster_visual_entries (staff_id);

-- 4) Prevent duplicates
-- Staff entries: one staff per shift per date
CREATE UNIQUE INDEX IF NOT EXISTS uq_roster_visual_staff_per_shift
  ON public.roster_visual_entries (institution_id, duty_date, shift, staff_id)
  WHERE shift IS NOT NULL AND staff_id IS NOT NULL;

-- Leave entry: single per date (leave column)
CREATE UNIQUE INDEX IF NOT EXISTS uq_roster_visual_leave_per_date
  ON public.roster_visual_entries (institution_id, duty_date)
  WHERE shift IS NULL AND staff_id IS NULL;

-- 5) Validation + auto created_by
CREATE OR REPLACE FUNCTION public.validate_roster_visual_entry()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  -- Auto stamp creator
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;

  -- Basic integrity
  IF NEW.shift IS NULL THEN
    -- Leave-column row (per date)
    IF NEW.staff_id IS NOT NULL THEN
      RAISE EXCEPTION 'Leave row cannot have staff_id';
    END IF;

    -- responsibility note not applicable for leave row
    NEW.responsibility_note := NULL;

    -- leave_type is required (can be "none")
    IF NEW.leave_type IS NULL THEN
      RAISE EXCEPTION 'Leave row must have leave_type';
    END IF;
  ELSE
    -- Staff shift row
    IF NEW.staff_id IS NULL THEN
      RAISE EXCEPTION 'Shift row must have staff_id';
    END IF;

    -- leave_type for shift row is optional but allowed
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_validate_roster_visual_entry'
  ) THEN
    CREATE TRIGGER trg_validate_roster_visual_entry
    BEFORE INSERT OR UPDATE ON public.roster_visual_entries
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_roster_visual_entry();
  END IF;
END$$;

-- 6) Row Level Security (institution members can read/write; no role-based differences)
ALTER TABLE public.roster_visual_entries ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'roster_visual_entries'
      AND policyname = 'Institution members manage visual roster'
  ) THEN
    CREATE POLICY "Institution members manage visual roster"
    ON public.roster_visual_entries
    FOR ALL
    TO authenticated
    USING (
      institution_id = get_my_institution_id()
      AND is_in_institution(auth.uid(), institution_id)
    )
    WITH CHECK (
      institution_id = get_my_institution_id()
      AND is_in_institution(auth.uid(), institution_id)
    );
  END IF;
END$$;
