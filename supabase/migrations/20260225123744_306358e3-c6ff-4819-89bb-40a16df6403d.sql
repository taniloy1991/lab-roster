-- Allow bootstrap of the first Super Admin (only when none exists)
create policy "Bootstrap first super admin"
on public.global_user_roles
for insert
to authenticated
with check (
  role = 'super_admin'
  and not exists (select 1 from public.global_user_roles where role = 'super_admin')
  and user_id = auth.uid()
);