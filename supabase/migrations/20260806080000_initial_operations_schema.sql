create extension if not exists pgcrypto;

create type public.app_role as enum (
  'administrator',
  'cleaning_manager',
  'cleaner'
);

create type public.cleaning_job_status as enum (
  'awaiting_approval',
  'awaiting_cleaner_response',
  'accepted',
  'in_progress',
  'completed',
  'requires_review',
  'cancelled'
);

create type public.cleaning_type as enum (
  'standard_changeover',
  'mid_stay_clean',
  'deep_or_remedial_clean',
  'other'
);

create type public.physical_bed_type as enum (
  'zip_and_link',
  'fixed_double',
  'fixed_single',
  'other'
);

create type public.bed_configuration as enum (
  'king',
  'double',
  'two_singles',
  'single',
  'unmade',
  'other',
  'unknown'
);

create type public.job_bedroom_completion_status as enum (
  'pending',
  'confirmed',
  'requires_review'
);

create type public.long_clean_reason as enum (
  'property_exceptionally_dirty',
  'excessive_rubbish',
  'guest_departure_delay',
  'access_delay',
  'additional_beds_required',
  'linen_problem',
  'damage_or_maintenance_issue',
  'missing_supplies',
  'cleaner_interruption',
  'other'
);

create type public.cleaning_exception_type as enum (
  'property_exceptionally_dirty',
  'excessive_rubbish',
  'access_problem',
  'damage',
  'linen_shortage',
  'missing_supplies',
  'guest_still_present',
  'bed_configuration_difference',
  'long_clean',
  'other'
);

create type public.exception_review_status as enum (
  'open',
  'in_review',
  'resolved',
  'dismissed'
);

create type public.notification_type as enum (
  'clean_awaiting_approval',
  'cleaner_declined_job',
  'job_unaccepted',
  'job_not_started_on_time',
  'clean_in_progress_too_long',
  'long_clean',
  'bed_configuration_requires_review',
  'job_assigned',
  'job_changed',
  'job_cancelled',
  'clean_due_soon',
  'clean_completed'
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique,
  full_name text not null,
  mobile_number text,
  role public.app_role not null default 'cleaner',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  address text,
  default_cleaning_duration_minutes integer not null default 180 check (default_cleaning_duration_minutes > 0),
  notes text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.bedrooms (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  name text not null,
  physical_bed_type public.physical_bed_type not null,
  default_configuration public.bed_configuration not null default 'unknown',
  current_configuration public.bed_configuration not null default 'unknown',
  current_configuration_confirmed_at timestamptz,
  current_configuration_confirmed_by uuid references public.profiles (id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_id, name)
);

create table public.bedroom_permitted_configurations (
  id uuid primary key default gen_random_uuid(),
  bedroom_id uuid not null references public.bedrooms (id) on delete cascade,
  configuration public.bed_configuration not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bedroom_id, configuration)
);

create table public.linen_items (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  unit text not null default 'item',
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cleaning_jobs (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete restrict,
  scheduled_date date not null,
  expected_start_time time,
  expected_start_time_window_end time,
  guest_arrival_deadline timestamptz,
  expected_duration_minutes integer not null default 180 check (expected_duration_minutes > 0),
  cleaning_type public.cleaning_type not null default 'standard_changeover',
  status public.cleaning_job_status not null default 'awaiting_approval',
  cleaning_manager_id uuid references public.profiles (id) on delete set null,
  assigned_cleaner_id uuid references public.profiles (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  approved_by uuid references public.profiles (id) on delete set null,
  assigned_at timestamptz,
  viewed_at timestamptz,
  accepted_at timestamptz,
  declined_at timestamptz,
  approved_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  actual_duration_minutes integer check (actual_duration_minutes is null or actual_duration_minutes >= 0),
  is_long_clean boolean not null default false,
  requires_review boolean not null default false,
  long_clean_reason public.long_clean_reason,
  long_clean_notes text,
  instructions text not null default '',
  notes text not null default '',
  manager_notes text not null default '',
  cleaner_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (completed_at is null or started_at is null or completed_at >= started_at),
  check (expected_start_time_window_end is null or expected_start_time is null or expected_start_time_window_end >= expected_start_time),
  check (status <> 'awaiting_cleaner_response' or assigned_cleaner_id is not null),
  check (not is_long_clean or long_clean_reason is not null)
);

create table public.cleaning_job_bedrooms (
  id uuid primary key default gen_random_uuid(),
  cleaning_job_id uuid not null references public.cleaning_jobs (id) on delete cascade,
  bedroom_id uuid references public.bedrooms (id) on delete set null,
  bedroom_name text not null,
  physical_bed_type public.physical_bed_type not null,
  assumed_current_configuration public.bed_configuration not null default 'unknown',
  actual_configuration_found public.bed_configuration,
  required_configuration public.bed_configuration not null,
  final_configuration public.bed_configuration,
  arrival_difference_reported boolean not null default false,
  completion_status public.job_bedroom_completion_status not null default 'pending',
  cleaner_note text,
  mismatch_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    final_configuration is null
    or final_configuration = required_configuration
    or length(trim(coalesce(mismatch_reason, ''))) > 0
  ),
  unique (cleaning_job_id, bedroom_name)
);

create table public.cleaning_linen_records (
  id uuid primary key default gen_random_uuid(),
  cleaning_job_id uuid not null references public.cleaning_jobs (id) on delete cascade,
  linen_item_id uuid not null references public.linen_items (id) on delete restrict,
  expected_dirty_quantity integer not null default 0 check (expected_dirty_quantity >= 0),
  dirty_quantity integer check (dirty_quantity is null or dirty_quantity >= 0),
  expected_clean_quantity integer not null default 0 check (expected_clean_quantity >= 0),
  clean_quantity_used integer check (clean_quantity_used is null or clean_quantity_used >= 0),
  is_confirmed boolean not null default false,
  recorded_by uuid references public.profiles (id) on delete set null,
  recorded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cleaning_job_id, linen_item_id),
  check (
    not is_confirmed
    or (
      dirty_quantity is not null
      and clean_quantity_used is not null
      and recorded_by is not null
      and recorded_at is not null
    )
  )
);

create table public.cleaning_exceptions (
  id uuid primary key default gen_random_uuid(),
  cleaning_job_id uuid not null references public.cleaning_jobs (id) on delete cascade,
  exception_type public.cleaning_exception_type not null,
  reason_code text,
  description text not null default '',
  evidence_required boolean not null default false,
  review_status public.exception_review_status not null default 'open',
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cleaning_job_photos (
  id uuid primary key default gen_random_uuid(),
  cleaning_job_id uuid not null references public.cleaning_jobs (id) on delete cascade,
  cleaning_exception_id uuid references public.cleaning_exceptions (id) on delete set null,
  uploaded_by uuid references public.profiles (id) on delete set null,
  storage_path text not null unique,
  caption text,
  uploaded_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  cleaning_job_id uuid references public.cleaning_jobs (id) on delete cascade,
  notification_type public.notification_type not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.cleaning_job_audit_events (
  id uuid primary key default gen_random_uuid(),
  cleaning_job_id uuid not null references public.cleaning_jobs (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  action text not null,
  previous_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.record_cleaning_job_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.cleaning_job_audit_events (
      cleaning_job_id,
      user_id,
      action,
      previous_value,
      new_value
    )
    values (
      new.id,
      auth.uid(),
      'clean_created',
      null,
      jsonb_build_object('status', new.status)
    );
  elsif old.status is distinct from new.status then
    insert into public.cleaning_job_audit_events (
      cleaning_job_id,
      user_id,
      action,
      previous_value,
      new_value
    )
    values (
      new.id,
      auth.uid(),
      'status_changed',
      jsonb_build_object('status', old.status),
      jsonb_build_object('status', new.status)
    );
  end if;

  return new;
end;
$$;

create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger set_properties_updated_at
before update on public.properties
for each row execute function public.set_updated_at();

create trigger set_bedrooms_updated_at
before update on public.bedrooms
for each row execute function public.set_updated_at();

create trigger set_bedroom_permitted_configurations_updated_at
before update on public.bedroom_permitted_configurations
for each row execute function public.set_updated_at();

create trigger set_linen_items_updated_at
before update on public.linen_items
for each row execute function public.set_updated_at();

create trigger set_cleaning_jobs_updated_at
before update on public.cleaning_jobs
for each row execute function public.set_updated_at();

create trigger set_cleaning_job_bedrooms_updated_at
before update on public.cleaning_job_bedrooms
for each row execute function public.set_updated_at();

create trigger set_cleaning_linen_records_updated_at
before update on public.cleaning_linen_records
for each row execute function public.set_updated_at();

create trigger set_cleaning_exceptions_updated_at
before update on public.cleaning_exceptions
for each row execute function public.set_updated_at();

create trigger record_cleaning_job_status_change
after insert or update of status on public.cleaning_jobs
for each row execute function public.record_cleaning_job_status_change();

create or replace function public.current_user_role()
returns public.app_role
language sql
security definer
set search_path = public
stable
as $$
  select role
  from public.profiles
  where id = auth.uid()
    and is_active = true
$$;

create or replace function public.current_user_can_manage_operations()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.current_user_role() in ('administrator', 'cleaning_manager'), false)
$$;

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

alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.bedrooms enable row level security;
alter table public.bedroom_permitted_configurations enable row level security;
alter table public.linen_items enable row level security;
alter table public.cleaning_jobs enable row level security;
alter table public.cleaning_job_bedrooms enable row level security;
alter table public.cleaning_linen_records enable row level security;
alter table public.cleaning_exceptions enable row level security;
alter table public.cleaning_job_photos enable row level security;
alter table public.notifications enable row level security;
alter table public.cleaning_job_audit_events enable row level security;

create policy "Users can create their own cleaner profile"
on public.profiles
for insert
to authenticated
with check (id = auth.uid() and role = 'cleaner');

create policy "Users can view their own profile"
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy "Managers can view profiles"
on public.profiles
for select
to authenticated
using (public.current_user_can_manage_operations());

create policy "Administrators can manage profiles"
on public.profiles
for all
to authenticated
using (public.current_user_role() = 'administrator')
with check (public.current_user_role() = 'administrator');

create policy "Managers can manage properties"
on public.properties
for all
to authenticated
using (public.current_user_can_manage_operations())
with check (public.current_user_can_manage_operations());

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

create policy "Managers can manage bedrooms"
on public.bedrooms
for all
to authenticated
using (public.current_user_can_manage_operations())
with check (public.current_user_can_manage_operations());

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

create policy "Managers can manage bedroom permitted configurations"
on public.bedroom_permitted_configurations
for all
to authenticated
using (public.current_user_can_manage_operations())
with check (public.current_user_can_manage_operations());

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

create policy "Managers can manage linen items"
on public.linen_items
for all
to authenticated
using (public.current_user_can_manage_operations())
with check (public.current_user_can_manage_operations());

create policy "Cleaners can view active linen items"
on public.linen_items
for select
to authenticated
using (is_active = true);

create policy "Managers can manage cleaning jobs"
on public.cleaning_jobs
for all
to authenticated
using (public.current_user_can_manage_operations())
with check (public.current_user_can_manage_operations());

create policy "Cleaners can view assigned cleaning jobs"
on public.cleaning_jobs
for select
to authenticated
using (assigned_cleaner_id = auth.uid());

create policy "Managers can manage cleaning job bedrooms"
on public.cleaning_job_bedrooms
for all
to authenticated
using (public.current_user_can_manage_operations())
with check (public.current_user_can_manage_operations());

create policy "Cleaners can view assigned job bedroom reports"
on public.cleaning_job_bedrooms
for select
to authenticated
using (public.user_can_access_cleaning_job(cleaning_job_id));

create policy "Cleaners can create assigned job bedroom reports"
on public.cleaning_job_bedrooms
for insert
to authenticated
with check (
  exists (
    select 1
    from public.cleaning_jobs
    where cleaning_jobs.id = cleaning_job_bedrooms.cleaning_job_id
      and cleaning_jobs.assigned_cleaner_id = auth.uid()
      and cleaning_jobs.status in ('accepted', 'in_progress')
  )
);

create policy "Cleaners can update assigned job bedroom reports"
on public.cleaning_job_bedrooms
for update
to authenticated
using (
  exists (
    select 1
    from public.cleaning_jobs
    where cleaning_jobs.id = cleaning_job_bedrooms.cleaning_job_id
      and cleaning_jobs.assigned_cleaner_id = auth.uid()
      and cleaning_jobs.status in ('accepted', 'in_progress')
  )
)
with check (
  exists (
    select 1
    from public.cleaning_jobs
    where cleaning_jobs.id = cleaning_job_bedrooms.cleaning_job_id
      and cleaning_jobs.assigned_cleaner_id = auth.uid()
      and cleaning_jobs.status in ('accepted', 'in_progress')
  )
);

create policy "Managers can manage cleaning linen records"
on public.cleaning_linen_records
for all
to authenticated
using (public.current_user_can_manage_operations())
with check (public.current_user_can_manage_operations());

create policy "Cleaners can view assigned cleaning linen records"
on public.cleaning_linen_records
for select
to authenticated
using (public.user_can_access_cleaning_job(cleaning_job_id));

create policy "Cleaners can create assigned cleaning linen records"
on public.cleaning_linen_records
for insert
to authenticated
with check (
  exists (
    select 1
    from public.cleaning_jobs
    where cleaning_jobs.id = cleaning_linen_records.cleaning_job_id
      and cleaning_jobs.assigned_cleaner_id = auth.uid()
      and cleaning_jobs.status in ('accepted', 'in_progress')
  )
);

create policy "Cleaners can update assigned cleaning linen records"
on public.cleaning_linen_records
for update
to authenticated
using (
  exists (
    select 1
    from public.cleaning_jobs
    where cleaning_jobs.id = cleaning_linen_records.cleaning_job_id
      and cleaning_jobs.assigned_cleaner_id = auth.uid()
      and cleaning_jobs.status in ('accepted', 'in_progress')
  )
)
with check (
  exists (
    select 1
    from public.cleaning_jobs
    where cleaning_jobs.id = cleaning_linen_records.cleaning_job_id
      and cleaning_jobs.assigned_cleaner_id = auth.uid()
      and cleaning_jobs.status in ('accepted', 'in_progress')
  )
);

create policy "Managers can manage cleaning exceptions"
on public.cleaning_exceptions
for all
to authenticated
using (public.current_user_can_manage_operations())
with check (public.current_user_can_manage_operations());

create policy "Cleaners can view assigned cleaning exceptions"
on public.cleaning_exceptions
for select
to authenticated
using (public.user_can_access_cleaning_job(cleaning_job_id));

create policy "Cleaners can create assigned cleaning exceptions"
on public.cleaning_exceptions
for insert
to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.cleaning_jobs
    where cleaning_jobs.id = cleaning_exceptions.cleaning_job_id
      and cleaning_jobs.assigned_cleaner_id = auth.uid()
      and cleaning_jobs.status in ('accepted', 'in_progress')
  )
);

create policy "Cleaners can update assigned open cleaning exceptions"
on public.cleaning_exceptions
for update
to authenticated
using (
  created_by = auth.uid()
  and review_status = 'open'
  and exists (
    select 1
    from public.cleaning_jobs
    where cleaning_jobs.id = cleaning_exceptions.cleaning_job_id
      and cleaning_jobs.assigned_cleaner_id = auth.uid()
      and cleaning_jobs.status in ('accepted', 'in_progress')
  )
)
with check (
  created_by = auth.uid()
  and review_status = 'open'
);

create policy "Managers can manage cleaning job photos"
on public.cleaning_job_photos
for all
to authenticated
using (public.current_user_can_manage_operations())
with check (public.current_user_can_manage_operations());

create policy "Cleaners can view assigned job photos"
on public.cleaning_job_photos
for select
to authenticated
using (public.user_can_access_cleaning_job(cleaning_job_id));

create policy "Cleaners can create assigned job photos"
on public.cleaning_job_photos
for insert
to authenticated
with check (
  uploaded_by = auth.uid()
  and exists (
    select 1
    from public.cleaning_jobs
    where cleaning_jobs.id = cleaning_job_photos.cleaning_job_id
      and cleaning_jobs.assigned_cleaner_id = auth.uid()
      and cleaning_jobs.status in ('accepted', 'in_progress')
  )
);

create policy "Cleaners can update assigned job photos"
on public.cleaning_job_photos
for update
to authenticated
using (
  uploaded_by = auth.uid()
  and exists (
    select 1
    from public.cleaning_jobs
    where cleaning_jobs.id = cleaning_job_photos.cleaning_job_id
      and cleaning_jobs.assigned_cleaner_id = auth.uid()
      and cleaning_jobs.status in ('accepted', 'in_progress')
  )
)
with check (uploaded_by = auth.uid());

create policy "Users can view their notifications"
on public.notifications
for select
to authenticated
using (user_id = auth.uid());

create policy "Users can update their notification read status"
on public.notifications
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Managers can manage notifications"
on public.notifications
for all
to authenticated
using (public.current_user_can_manage_operations())
with check (public.current_user_can_manage_operations());

create policy "Managers can view cleaning job audit events"
on public.cleaning_job_audit_events
for select
to authenticated
using (public.current_user_can_manage_operations());

create policy "Cleaners can view assigned job audit events"
on public.cleaning_job_audit_events
for select
to authenticated
using (public.user_can_access_cleaning_job(cleaning_job_id));

insert into public.properties (name)
values
  ('St Andrews'),
  ('Brahms'),
  ('Rossini')
on conflict (name) do nothing;

insert into public.linen_items (name, unit, display_order)
values
  ('King duvet covers', 'item', 10),
  ('Double duvet covers', 'item', 20),
  ('Single duvet covers', 'item', 30),
  ('King fitted sheets', 'item', 40),
  ('Double fitted sheets', 'item', 50),
  ('Single fitted sheets', 'item', 60),
  ('Pillowcases', 'item', 70),
  ('Bath towels', 'item', 80),
  ('Hand towels', 'item', 90),
  ('Bath mats', 'item', 100),
  ('Tea towels', 'item', 110)
on conflict (name) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cleaning-job-photos',
  'cleaning-job-photos',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Managers can read cleaning job photo objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'cleaning-job-photos'
  and public.current_user_can_manage_operations()
);

create policy "Cleaners can read assigned cleaning job photo objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'cleaning-job-photos'
  and exists (
    select 1
    from public.cleaning_job_photos
    where cleaning_job_photos.storage_path = storage.objects.name
      and public.user_can_access_cleaning_job(cleaning_job_photos.cleaning_job_id)
  )
);

create policy "Cleaners can upload cleaning job photo objects"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'cleaning-job-photos'
  and owner = auth.uid()
);
