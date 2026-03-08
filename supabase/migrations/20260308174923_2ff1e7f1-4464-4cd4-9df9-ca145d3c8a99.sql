-- selected_roster_dates is transient UI state; reset existing rows before scoping by institution
TRUNCATE TABLE public.selected_roster_dates;

-- Add institution scope
ALTER TABLE public.selected_roster_dates
ADD COLUMN institution_id uuid NOT NULL;

ALTER TABLE public.selected_roster_dates
ADD CONSTRAINT selected_roster_dates_institution_id_fkey
FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;

-- Prevent duplicates per institution/date and speed lookups
CREATE UNIQUE INDEX IF NOT EXISTS selected_roster_dates_institution_date_uidx
ON public.selected_roster_dates (institution_id, duty_date);

CREATE INDEX IF NOT EXISTS selected_roster_dates_institution_date_idx
ON public.selected_roster_dates (institution_id, duty_date);

-- Tighten policies to institution-scoped access
DROP POLICY IF EXISTS "Selected roster dates manageable by members" ON public.selected_roster_dates;
DROP POLICY IF EXISTS "Selected roster dates readable by members" ON public.selected_roster_dates;

CREATE POLICY "Selected roster dates readable by members"
ON public.selected_roster_dates
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND (
    has_global_role(auth.uid(), 'super_admin'::public.global_role)
    OR (
      institution_id = get_my_institution_id()
      AND is_in_institution(auth.uid(), institution_id)
    )
  )
);

CREATE POLICY "Selected roster dates manageable by members"
ON public.selected_roster_dates
FOR ALL
USING (
  auth.uid() IS NOT NULL
  AND (
    has_global_role(auth.uid(), 'super_admin'::public.global_role)
    OR (
      institution_id = get_my_institution_id()
      AND is_in_institution(auth.uid(), institution_id)
    )
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (
    has_global_role(auth.uid(), 'super_admin'::public.global_role)
    OR (
      institution_id = get_my_institution_id()
      AND is_in_institution(auth.uid(), institution_id)
    )
  )
);