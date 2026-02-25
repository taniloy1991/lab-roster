-- Enums
create type public.app_role as enum ('lab_incharge','staff');
create type public.global_role as enum ('super_admin');
create type public.roster_shift as enum ('morning','evening','night');
create type public.off_ledger_type as enum ('earn','use');
create type public.leave_type as enum ('casual','off');
create type public.leave_status as enum ('pending','approved','rejected','cancelled');

-- Base utility: updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Institutions
create table public.institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_institutions_updated_at
before update on public.institutions
for each row execute function public.set_updated_at();

-- Profiles (user-owned, no roles here)
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  active_institution_id uuid references public.institutions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Global roles (Super Admin) - separate table (no roles on profiles)
create table public.global_user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.global_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

-- Institution membership (no role column)
create table public.institution_users (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (institution_id, user_id)
);

-- Per-institution roles - separate table (CRITICAL)
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  institution_user_id uuid not null references public.institution_users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (institution_user_id, role)
);

-- Institution settings
create table public.institution_settings (
  institution_id uuid primary key references public.institutions(id) on delete cascade,
  casual_leave_quota_yearly int not null default 20,
  weekly_off_quota int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_institution_settings_updated_at
before update on public.institution_settings
for each row execute function public.set_updated_at();

-- Staff (may be linked to a user account for Staff portal)
create table public.staff (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  phone text,
  designation text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index staff_unique_user_per_institution
on public.staff (institution_id, user_id)
where user_id is not null;

create trigger trg_staff_updated_at
before update on public.staff
for each row execute function public.set_updated_at();

-- Holidays (manual)
create table public.holidays (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  holiday_date date not null,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, holiday_date)
);

create trigger trg_holidays_updated_at
before update on public.holidays
for each row execute function public.set_updated_at();

-- Roster days
create table public.roster_days (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  duty_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, duty_date)
);

create trigger trg_roster_days_updated_at
before update on public.roster_days
for each row execute function public.set_updated_at();

-- Shift assignments (multiple staff per shift)
create table public.roster_shift_assignments (
  id uuid primary key default gen_random_uuid(),
  roster_day_id uuid not null references public.roster_days(id) on delete cascade,
  shift public.roster_shift not null,
  staff_id uuid not null references public.staff(id) on delete cascade,
  is_extra boolean not null default false,
  created_at timestamptz not null default now(),
  unique (roster_day_id, shift, staff_id)
);

-- OFF ledger
create table public.off_ledger (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete cascade,
  entry_date date not null,
  entry_type public.off_ledger_type not null,
  amount numeric(6,2) not null default 1,
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Leave requests
create table public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  leave_type public.leave_type not null,
  status public.leave_status not null default 'pending',
  reason text,
  decision_note text,
  decided_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_leave_requests_updated_at
before update on public.leave_requests
for each row execute function public.set_updated_at();

-- Helper functions (SECURITY DEFINER to avoid RLS recursion)
create or replace function public.has_global_role(_user_id uuid, _role public.global_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.global_user_roles
    where user_id = _user_id and role = _role
  );
$$;

create or replace function public.is_in_institution(_user_id uuid, _institution_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.institution_users
    where user_id = _user_id and institution_id = _institution_id
  );
$$;

create or replace function public.has_institution_role(_user_id uuid, _institution_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.institution_users iu
    join public.user_roles ur on ur.institution_user_id = iu.id
    where iu.user_id = _user_id
      and iu.institution_id = _institution_id
      and ur.role = _role
  );
$$;

create or replace function public.get_my_institution_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select active_institution_id
  from public.profiles
  where user_id = auth.uid();
$$;

-- Enable RLS
alter table public.institutions enable row level security;
alter table public.profiles enable row level security;
alter table public.global_user_roles enable row level security;
alter table public.institution_users enable row level security;
alter table public.user_roles enable row level security;
alter table public.institution_settings enable row level security;
alter table public.staff enable row level security;
alter table public.holidays enable row level security;
alter table public.roster_days enable row level security;
alter table public.roster_shift_assignments enable row level security;
alter table public.off_ledger enable row level security;
alter table public.leave_requests enable row level security;

-- RLS policies
-- institutions
create policy "Super admin manages institutions"
on public.institutions
for all
to authenticated
using (public.has_global_role(auth.uid(), 'super_admin'))
with check (public.has_global_role(auth.uid(), 'super_admin'));

create policy "Members can view their institution"
on public.institutions
for select
to authenticated
using (public.is_in_institution(auth.uid(), id) or public.has_global_role(auth.uid(), 'super_admin'));

-- profiles
create policy "Users can view their own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can insert their own profile"
on public.profiles
for insert
to authenticated
with check (auth.uid() = user_id);

-- global roles: only super admins can manage; user can read own
create policy "User can read own global roles"
on public.global_user_roles
for select
to authenticated
using (auth.uid() = user_id or public.has_global_role(auth.uid(), 'super_admin'));

create policy "Super admin manages global roles"
on public.global_user_roles
for all
to authenticated
using (public.has_global_role(auth.uid(), 'super_admin'))
with check (public.has_global_role(auth.uid(), 'super_admin'));

-- institution_users
create policy "Super admin manages institution memberships"
on public.institution_users
for all
to authenticated
using (public.has_global_role(auth.uid(), 'super_admin'))
with check (public.has_global_role(auth.uid(), 'super_admin'));

create policy "Institution members can view memberships"
on public.institution_users
for select
to authenticated
using (public.is_in_institution(auth.uid(), institution_id) or public.has_global_role(auth.uid(), 'super_admin'));

-- user_roles
create policy "Super admin manages institution roles"
on public.user_roles
for all
to authenticated
using (public.has_global_role(auth.uid(), 'super_admin'))
with check (public.has_global_role(auth.uid(), 'super_admin'));

create policy "Institution members can view institution roles"
on public.user_roles
for select
to authenticated
using (
  exists (
    select 1
    from public.institution_users iu
    where iu.id = institution_user_id
      and public.is_in_institution(auth.uid(), iu.institution_id)
  )
  or public.has_global_role(auth.uid(), 'super_admin')
);

-- institution_settings
create policy "Members can view settings"
on public.institution_settings
for select
to authenticated
using (public.is_in_institution(auth.uid(), institution_id) or public.has_global_role(auth.uid(), 'super_admin'));

create policy "Lab incharge can update settings"
on public.institution_settings
for update
to authenticated
using (public.has_institution_role(auth.uid(), institution_id, 'lab_incharge'))
with check (public.has_institution_role(auth.uid(), institution_id, 'lab_incharge'));

create policy "Super admin can insert settings"
on public.institution_settings
for insert
to authenticated
with check (public.has_global_role(auth.uid(), 'super_admin'));

-- staff
create policy "Lab incharge can manage staff"
on public.staff
for all
to authenticated
using (public.has_institution_role(auth.uid(), institution_id, 'lab_incharge'))
with check (public.has_institution_role(auth.uid(), institution_id, 'lab_incharge'));

create policy "Staff user can view own staff record"
on public.staff
for select
to authenticated
using (user_id = auth.uid());

-- holidays
create policy "Institution members can view holidays"
on public.holidays
for select
to authenticated
using (public.is_in_institution(auth.uid(), institution_id) or public.has_global_role(auth.uid(), 'super_admin'));

create policy "Lab incharge manages holidays"
on public.holidays
for insert
to authenticated
with check (public.has_institution_role(auth.uid(), institution_id, 'lab_incharge'));

create policy "Lab incharge updates holidays"
on public.holidays
for update
to authenticated
using (public.has_institution_role(auth.uid(), institution_id, 'lab_incharge'))
with check (public.has_institution_role(auth.uid(), institution_id, 'lab_incharge'));

create policy "Lab incharge deletes holidays"
on public.holidays
for delete
to authenticated
using (public.has_institution_role(auth.uid(), institution_id, 'lab_incharge'));

-- roster_days
create policy "Institution members can view roster days"
on public.roster_days
for select
to authenticated
using (public.is_in_institution(auth.uid(), institution_id) or public.has_global_role(auth.uid(), 'super_admin'));

create policy "Lab incharge manages roster days"
on public.roster_days
for all
to authenticated
using (public.has_institution_role(auth.uid(), institution_id, 'lab_incharge'))
with check (public.has_institution_role(auth.uid(), institution_id, 'lab_incharge'));

-- roster_shift_assignments (derive institution via roster_day)
create policy "Members can view roster assignments"
on public.roster_shift_assignments
for select
to authenticated
using (
  exists (
    select 1
    from public.roster_days rd
    where rd.id = roster_day_id
      and (public.is_in_institution(auth.uid(), rd.institution_id) or public.has_global_role(auth.uid(), 'super_admin'))
  )
);

create policy "Lab incharge manages roster assignments"
on public.roster_shift_assignments
for all
to authenticated
using (
  exists (
    select 1
    from public.roster_days rd
    where rd.id = roster_day_id
      and public.has_institution_role(auth.uid(), rd.institution_id, 'lab_incharge')
  )
)
with check (
  exists (
    select 1
    from public.roster_days rd
    where rd.id = roster_day_id
      and public.has_institution_role(auth.uid(), rd.institution_id, 'lab_incharge')
  )
);

-- off_ledger
create policy "Lab incharge manages off ledger"
on public.off_ledger
for all
to authenticated
using (public.has_institution_role(auth.uid(), institution_id, 'lab_incharge'))
with check (public.has_institution_role(auth.uid(), institution_id, 'lab_incharge'));

create policy "Staff can view their off ledger"
on public.off_ledger
for select
to authenticated
using (
  exists (
    select 1 from public.staff s
    where s.id = staff_id
      and s.user_id = auth.uid()
      and s.institution_id = institution_id
  )
);

-- leave_requests
create policy "Lab incharge manages leave requests"
on public.leave_requests
for all
to authenticated
using (public.has_institution_role(auth.uid(), institution_id, 'lab_incharge'))
with check (public.has_institution_role(auth.uid(), institution_id, 'lab_incharge'));

create policy "Staff can view own leave requests"
on public.leave_requests
for select
to authenticated
using (
  exists (
    select 1 from public.staff s
    where s.id = staff_id
      and s.user_id = auth.uid()
      and s.institution_id = institution_id
  )
);

create policy "Staff can create own leave request"
on public.leave_requests
for insert
to authenticated
with check (
  exists (
    select 1 from public.staff s
    where s.id = staff_id
      and s.user_id = auth.uid()
      and s.institution_id = institution_id
  )
);

create policy "Staff can cancel pending own leave request"
on public.leave_requests
for update
to authenticated
using (
  status = 'pending'
  and exists (
    select 1 from public.staff s
    where s.id = staff_id
      and s.user_id = auth.uid()
      and s.institution_id = institution_id
  )
)
with check (
  (status = 'cancelled')
  and exists (
    select 1 from public.staff s
    where s.id = staff_id
      and s.user_id = auth.uid()
      and s.institution_id = institution_id
  )
);

-- Helpful indexes
create index idx_staff_institution on public.staff(institution_id);
create index idx_holidays_institution_date on public.holidays(institution_id, holiday_date);
create index idx_roster_days_institution_date on public.roster_days(institution_id, duty_date);
create index idx_roster_assignments_staff on public.roster_shift_assignments(staff_id);
create index idx_off_ledger_staff_date on public.off_ledger(staff_id, entry_date);
create index idx_leave_requests_staff_dates on public.leave_requests(staff_id, start_date, end_date);
