-- Add nullable planning fields to roster_days (safe, no data loss)
alter table public.roster_days
  add column if not exists morning_duty_note text null,
  add column if not exists evening_duty_note text null,
  add column if not exists night_duty_note text null,
  add column if not exists leave_status text null;

-- Recreate roster_visual_entries policy so super_admin is not restricted by get_my_institution_id()
drop policy if exists "Institution members manage visual roster" on public.roster_visual_entries;

create policy "Institution members manage visual roster"
on public.roster_visual_entries
for all
to authenticated
using (
  has_global_role(auth.uid(), 'super_admin'::global_role)
  or (
    institution_id = get_my_institution_id()
    and is_in_institution(auth.uid(), institution_id)
  )
)
with check (
  has_global_role(auth.uid(), 'super_admin'::global_role)
  or (
    institution_id = get_my_institution_id()
    and is_in_institution(auth.uid(), institution_id)
  )
);
