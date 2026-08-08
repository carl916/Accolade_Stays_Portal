do $$
begin
  if not exists (select 1 from pg_type where typname = 'cleaner_type') then
    create type public.cleaner_type as enum ('individual', 'pair');
  end if;

  if not exists (select 1 from pg_type where typname = 'cleaner_working_mode') then
    create type public.cleaner_working_mode as enum ('as_pair', 'solo');
  end if;
end $$;

alter table public.profiles
  add column if not exists cleaner_type public.cleaner_type;

update public.profiles
set cleaner_type = null
where role <> 'cleaner';

do $$
begin
  if to_regclass('public.cleaning_resources') is not null then
    update public.profiles
    set cleaner_type = coalesce(cleaning_resources.resource_type::text::public.cleaner_type, 'individual'::public.cleaner_type)
    from public.cleaning_resources
    where profiles.id = cleaning_resources.primary_user_id
      and profiles.role = 'cleaner';
  end if;
end $$;

update public.profiles
set cleaner_type = 'individual'
where role = 'cleaner'
  and cleaner_type is null;

alter table public.profiles
  drop constraint if exists profiles_cleaner_type_role_check,
  add constraint profiles_cleaner_type_role_check
  check (
    (role = 'cleaner' and cleaner_type is not null)
    or (role <> 'cleaner' and cleaner_type is null)
  );

alter table public.cleaning_jobs
  add column if not exists assigned_cleaner_name text,
  add column if not exists assigned_cleaner_type public.cleaner_type,
  add column if not exists assigned_cleaner_labour_multiplier numeric(4, 2);

do $$
begin
  if to_regclass('public.cleaning_resources') is not null then
    update public.cleaning_jobs
    set
      assigned_cleaner_id = coalesce(cleaning_resources.primary_user_id, cleaning_jobs.assigned_cleaner_id),
      assigned_cleaner_name = coalesce(cleaning_jobs.assigned_cleaner_name, cleaning_resources.name),
      assigned_cleaner_type = coalesce(
        cleaning_jobs.assigned_cleaner_type,
        cleaning_resources.resource_type::text::public.cleaner_type
      ),
      assigned_cleaner_labour_multiplier = coalesce(
        cleaning_jobs.assigned_cleaner_labour_multiplier,
        cleaning_resources.labour_multiplier
      )
    from public.cleaning_resources
    where cleaning_jobs.assigned_cleaning_resource_id = cleaning_resources.id;
  end if;
end $$;

update public.cleaning_jobs
set
  assigned_cleaner_name = coalesce(cleaning_jobs.assigned_cleaner_name, profiles.full_name),
  assigned_cleaner_type = coalesce(cleaning_jobs.assigned_cleaner_type, profiles.cleaner_type),
  assigned_cleaner_labour_multiplier = coalesce(
    cleaning_jobs.assigned_cleaner_labour_multiplier,
    case profiles.cleaner_type when 'pair' then 2 else 1 end
  ),
  effective_labour_multiplier = coalesce(
    cleaning_jobs.effective_labour_multiplier,
    case profiles.cleaner_type when 'pair' then 2 else 1 end
  )
from public.profiles
where cleaning_jobs.assigned_cleaner_id = profiles.id;

alter table public.cleaning_jobs
  drop constraint if exists cleaning_jobs_cleaner_snapshot_check,
  add constraint cleaning_jobs_cleaner_snapshot_check
  check (
    assigned_cleaner_id is null
    or (
      assigned_cleaner_name is not null
      and assigned_cleaner_type is not null
      and assigned_cleaner_labour_multiplier is not null
      and assigned_cleaner_labour_multiplier > 0
    )
  );

alter table public.cleaning_jobs
  drop constraint if exists cleaning_jobs_effective_labour_multiplier_check,
  add constraint cleaning_jobs_effective_labour_multiplier_check
  check (effective_labour_multiplier is null or effective_labour_multiplier > 0);

alter table public.cleaning_jobs
  drop constraint if exists cleaning_jobs_actual_labour_minutes_check,
  add constraint cleaning_jobs_actual_labour_minutes_check
  check (actual_labour_minutes is null or actual_labour_minutes >= 0);

alter table public.cleaning_jobs
  add column if not exists cleaner_working_mode public.cleaner_working_mode;

update public.cleaning_jobs
set cleaner_working_mode = case
  when working_mode::text = 'solo' then 'solo'::public.cleaner_working_mode
  when assigned_cleaner_type = 'pair' then 'as_pair'::public.cleaner_working_mode
  else null
end
where cleaner_working_mode is null
  and exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'cleaning_jobs'
      and column_name = 'working_mode'
  );

alter table public.cleaning_jobs
  drop column if exists working_mode;

alter table public.cleaning_jobs
  rename column cleaner_working_mode to working_mode;

do $$
declare
  constraint_name text;
begin
  select conname
  into constraint_name
  from pg_constraint
  where conrelid = 'public.cleaning_jobs'::regclass
    and contype = 'c'
    and conname = 'cleaning_jobs_assigned_before_cleaner_execution_check'
  limit 1;

  if constraint_name is not null then
    execute format('alter table public.cleaning_jobs drop constraint %I', constraint_name);
  end if;
end $$;

alter table public.cleaning_jobs
  add constraint cleaning_jobs_assigned_before_cleaner_execution_check
  check (status not in ('accepted', 'in_progress') or assigned_cleaner_id is not null);

create or replace function public.user_can_access_cleaning_job(job_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    public.current_user_can_manage_operations()
    or exists (
      select 1
      from public.cleaning_jobs
      where cleaning_jobs.id = job_id
        and cleaning_jobs.assigned_cleaner_id = auth.uid()
    ),
    false
  )
$$;

drop policy if exists "Cleaners can view assigned cleaning jobs" on public.cleaning_jobs;
create policy "Cleaners can view assigned cleaning jobs"
on public.cleaning_jobs
for select
to authenticated
using (assigned_cleaner_id = auth.uid());

drop policy if exists "Cleaners can view assigned job properties" on public.properties;
create policy "Cleaners can view assigned job properties"
on public.properties
for select
to authenticated
using (
  exists (
    select 1
    from public.cleaning_jobs
    where cleaning_jobs.property_id = properties.id
      and cleaning_jobs.assigned_cleaner_id = auth.uid()
      and cleaning_jobs.status <> 'cancelled'
  )
);

drop policy if exists "Cleaners can view assigned job bedrooms" on public.bedrooms;
create policy "Cleaners can view assigned job bedrooms"
on public.bedrooms
for select
to authenticated
using (
  exists (
    select 1
    from public.cleaning_jobs
    where cleaning_jobs.property_id = bedrooms.property_id
      and cleaning_jobs.assigned_cleaner_id = auth.uid()
      and cleaning_jobs.status <> 'cancelled'
  )
);

drop policy if exists "Cleaners can view assigned job bedroom permitted configurations" on public.bedroom_permitted_configurations;
create policy "Cleaners can view assigned job bedroom permitted configurations"
on public.bedroom_permitted_configurations
for select
to authenticated
using (
  exists (
    select 1
    from public.bedrooms
    join public.cleaning_jobs on cleaning_jobs.property_id = bedrooms.property_id
    where bedrooms.id = bedroom_permitted_configurations.bedroom_id
      and cleaning_jobs.assigned_cleaner_id = auth.uid()
      and cleaning_jobs.status <> 'cancelled'
  )
);

alter table public.cleaning_jobs
  drop constraint if exists cleaning_jobs_resource_snapshot_check,
  drop column if exists assigned_cleaning_resource_id,
  drop column if exists assigned_cleaning_resource_name,
  drop column if exists assigned_cleaning_resource_type,
  drop column if exists assigned_cleaning_resource_labour_multiplier;

drop policy if exists "Managers can manage cleaning resources" on public.cleaning_resources;
drop policy if exists "Cleaners can view own cleaning resources" on public.cleaning_resources;
drop table if exists public.cleaning_resources;
drop type if exists public.cleaning_resource_working_mode;
drop type if exists public.cleaning_resource_type;

notify pgrst, 'reload schema';
