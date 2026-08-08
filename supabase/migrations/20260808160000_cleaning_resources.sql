do $$
begin
  if not exists (select 1 from pg_type where typname = 'cleaning_resource_type') then
    create type public.cleaning_resource_type as enum ('individual', 'pair');
  end if;

  if not exists (select 1 from pg_type where typname = 'cleaning_resource_working_mode') then
    create type public.cleaning_resource_working_mode as enum ('as_assigned', 'solo');
  end if;
end $$;

create table if not exists public.cleaning_resources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  resource_type public.cleaning_resource_type not null default 'individual',
  labour_multiplier numeric(4, 2) not null default 1 check (labour_multiplier > 0),
  primary_user_id uuid references public.profiles (id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cleaning_resources_name_not_blank check (length(trim(name)) > 0),
  constraint cleaning_resources_pair_multiplier_check check (
    (resource_type = 'individual' and labour_multiplier = 1)
    or (resource_type = 'pair' and labour_multiplier = 2)
  )
);

create unique index if not exists cleaning_resources_name_key
on public.cleaning_resources (name);

create index if not exists cleaning_resources_primary_user_id_idx
on public.cleaning_resources (primary_user_id);

drop trigger if exists set_cleaning_resources_updated_at on public.cleaning_resources;
create trigger set_cleaning_resources_updated_at
before update on public.cleaning_resources
for each row execute function public.set_updated_at();

alter table public.cleaning_jobs
  add column if not exists assigned_cleaning_resource_id uuid references public.cleaning_resources (id) on delete set null,
  add column if not exists assigned_cleaning_resource_name text,
  add column if not exists assigned_cleaning_resource_type public.cleaning_resource_type,
  add column if not exists assigned_cleaning_resource_labour_multiplier numeric(4, 2),
  add column if not exists working_mode public.cleaning_resource_working_mode,
  add column if not exists effective_labour_multiplier numeric(4, 2),
  add column if not exists actual_labour_minutes integer;

alter table public.cleaning_jobs
  drop constraint if exists cleaning_jobs_resource_snapshot_check,
  add constraint cleaning_jobs_resource_snapshot_check
  check (
    assigned_cleaning_resource_id is null
    or (
      assigned_cleaning_resource_name is not null
      and assigned_cleaning_resource_type is not null
      and assigned_cleaning_resource_labour_multiplier is not null
      and assigned_cleaning_resource_labour_multiplier > 0
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

insert into public.cleaning_resources (
  name,
  resource_type,
  labour_multiplier,
  primary_user_id,
  is_active
)
select
  profiles.full_name,
  'individual'::public.cleaning_resource_type,
  1,
  profiles.id,
  profiles.is_active
from public.profiles
where profiles.role = 'cleaner'
on conflict (name) do update
set
  primary_user_id = coalesce(public.cleaning_resources.primary_user_id, excluded.primary_user_id),
  is_active = public.cleaning_resources.is_active or excluded.is_active;

update public.cleaning_jobs
set
  assigned_cleaning_resource_id = cleaning_resources.id,
  assigned_cleaning_resource_name = cleaning_resources.name,
  assigned_cleaning_resource_type = cleaning_resources.resource_type,
  assigned_cleaning_resource_labour_multiplier = cleaning_resources.labour_multiplier,
  effective_labour_multiplier = coalesce(public.cleaning_jobs.effective_labour_multiplier, cleaning_resources.labour_multiplier),
  actual_labour_minutes = case
    when public.cleaning_jobs.actual_duration_minutes is null then public.cleaning_jobs.actual_labour_minutes
    else round(public.cleaning_jobs.actual_duration_minutes * cleaning_resources.labour_multiplier)::integer
  end
from public.cleaning_resources
where public.cleaning_jobs.assigned_cleaner_id = cleaning_resources.primary_user_id
  and public.cleaning_jobs.assigned_cleaning_resource_id is null;

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
  check (
    status not in ('accepted', 'in_progress')
    or (
      assigned_cleaning_resource_id is not null
      and assigned_cleaner_id is not null
    )
  );

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
      left join public.cleaning_resources
        on cleaning_resources.id = cleaning_jobs.assigned_cleaning_resource_id
      where cleaning_jobs.id = job_id
        and (
          cleaning_jobs.assigned_cleaner_id = auth.uid()
          or cleaning_resources.primary_user_id = auth.uid()
        )
    ),
    false
  )
$$;

alter table public.cleaning_resources enable row level security;

drop policy if exists "Managers can manage cleaning resources" on public.cleaning_resources;
create policy "Managers can manage cleaning resources"
on public.cleaning_resources
for all
to authenticated
using (public.current_user_can_manage_operations())
with check (public.current_user_can_manage_operations());

drop policy if exists "Cleaners can view own cleaning resources" on public.cleaning_resources;
create policy "Cleaners can view own cleaning resources"
on public.cleaning_resources
for select
to authenticated
using (is_active = true and primary_user_id = auth.uid());

drop policy if exists "Cleaners can view assigned cleaning jobs" on public.cleaning_jobs;
create policy "Cleaners can view assigned cleaning jobs"
on public.cleaning_jobs
for select
to authenticated
using (public.user_can_access_cleaning_job(id));

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
      and cleaning_jobs.status <> 'cancelled'
      and public.user_can_access_cleaning_job(cleaning_jobs.id)
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
      and cleaning_jobs.status <> 'cancelled'
      and public.user_can_access_cleaning_job(cleaning_jobs.id)
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
      and cleaning_jobs.status <> 'cancelled'
      and public.user_can_access_cleaning_job(cleaning_jobs.id)
  )
);

notify pgrst, 'reload schema';
