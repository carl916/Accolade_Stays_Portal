create table public.smoobu_property_mappings (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  provider text not null default 'smoobu' check (provider = 'smoobu'),
  smoobu_apartment_id bigint not null,
  smoobu_apartment_name text not null,
  is_active boolean not null default true,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_id, provider),
  unique (provider, smoobu_apartment_id)
);

create table public.smoobu_bookings (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete restrict,
  smoobu_reservation_id bigint not null unique,
  smoobu_reference_id text,
  smoobu_apartment_id bigint not null,
  smoobu_apartment_name text not null,
  smoobu_channel_id bigint,
  channel_name text,
  booking_type text not null default '',
  arrival_date date not null,
  departure_date date not null,
  previous_arrival_date date,
  previous_departure_date date,
  check_in_time time,
  check_out_time time,
  guest_name text not null default '',
  guest_email text,
  guest_phone text,
  adults integer check (adults is null or adults >= 0),
  children integer check (children is null or children >= 0),
  guest_language text,
  guest_id bigint,
  guest_app_url text,
  notice text,
  is_blocked_booking boolean not null default false,
  is_cancelled boolean not null default false,
  source_deleted_at timestamptz,
  booking_price numeric(12, 2),
  price_paid text,
  prepayment numeric(12, 2),
  prepayment_paid text,
  deposit numeric(12, 2),
  deposit_paid text,
  smoobu_created_at timestamptz,
  smoobu_modified_at timestamptz,
  sync_status text not null default 'synced' check (sync_status in ('synced', 'cancelled', 'deleted', 'error')),
  last_synced_at timestamptz,
  last_sync_error text,
  messages_last_webhook_at timestamptz,
  messages_need_refresh boolean not null default false,
  clean_review_required boolean not null default false,
  clean_review_reason text,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (departure_date >= arrival_date)
);

create table public.smoobu_booking_price_elements (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.smoobu_bookings (id) on delete cascade,
  smoobu_price_element_id bigint not null,
  type text,
  name text,
  amount numeric(12, 2),
  quantity integer,
  tax numeric(12, 2),
  currency_code text,
  sort_order integer,
  price_included_in_id bigint,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (booking_id, smoobu_price_element_id)
);

create table public.smoobu_sync_runs (
  id uuid primary key default gen_random_uuid(),
  sync_type text not null check (sync_type in ('initial', 'incremental', 'webhook', 'manual')),
  status text not null default 'running' check (status in ('running', 'completed', 'failed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  date_from date,
  date_to date,
  modified_from timestamptz,
  modified_to timestamptz,
  records_created integer not null default 0,
  records_updated integer not null default 0,
  records_cancelled integer not null default 0,
  records_failed integer not null default 0,
  last_successful_sync_at timestamptz,
  error_message text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.smoobu_webhook_events (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  smoobu_user_id bigint,
  smoobu_reservation_id bigint,
  payload_hash text not null unique,
  status text not null default 'received' check (status in ('received', 'processed', 'failed', 'ignored')),
  error_message text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

alter table public.cleaning_jobs
  add column smoobu_booking_id uuid references public.smoobu_bookings (id) on delete set null,
  add column booking_change_requires_review boolean not null default false,
  add column booking_change_reason text,
  add column booking_context jsonb not null default '{}'::jsonb;

create index smoobu_property_mappings_property_id_idx on public.smoobu_property_mappings (property_id);
create index smoobu_bookings_property_dates_idx on public.smoobu_bookings (property_id, arrival_date, departure_date);
create index smoobu_bookings_active_calendar_idx on public.smoobu_bookings (property_id, arrival_date, departure_date)
  where is_blocked_booking = false and is_cancelled = false and source_deleted_at is null;
create index smoobu_bookings_sync_idx on public.smoobu_bookings (smoobu_modified_at, last_synced_at);
create index smoobu_booking_price_elements_booking_id_idx on public.smoobu_booking_price_elements (booking_id);
create index cleaning_jobs_smoobu_booking_id_idx on public.cleaning_jobs (smoobu_booking_id);

create trigger set_smoobu_property_mappings_updated_at
before update on public.smoobu_property_mappings
for each row execute function public.set_updated_at();

create trigger set_smoobu_bookings_updated_at
before update on public.smoobu_bookings
for each row execute function public.set_updated_at();

create trigger set_smoobu_booking_price_elements_updated_at
before update on public.smoobu_booking_price_elements
for each row execute function public.set_updated_at();

create trigger set_smoobu_sync_runs_updated_at
before update on public.smoobu_sync_runs
for each row execute function public.set_updated_at();

create or replace function public.create_cleaning_job_from_booking_with_bedroom_snapshots(
  p_booking_id uuid,
  p_expected_start_time time,
  p_guest_arrival_deadline timestamptz,
  p_expected_duration_minutes integer,
  p_cleaning_type public.cleaning_type,
  p_instructions text,
  p_notes text,
  p_required_configurations jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  booking_record public.smoobu_bookings%rowtype;
  new_job_id uuid;
  bedroom_record record;
  required_configuration public.bed_configuration;
  active_bedroom_count integer;
begin
  if not public.current_user_can_manage_operations() then
    raise exception 'Only administrators and cleaning managers can create booking-linked cleaning jobs.';
  end if;

  select *
  into booking_record
  from public.smoobu_bookings
  where id = p_booking_id;

  if booking_record.id is null then
    raise exception 'Choose a valid booking.';
  end if;

  if booking_record.is_blocked_booking
    or booking_record.is_cancelled
    or booking_record.source_deleted_at is not null then
    raise exception 'A clean cannot be created from this booking state without manual review.';
  end if;

  if exists (
    select 1
    from public.cleaning_jobs
    where cleaning_jobs.smoobu_booking_id = p_booking_id
      and cleaning_jobs.status <> 'cancelled'
  ) then
    raise exception 'A cleaning job already exists for this booking.';
  end if;

  select count(*)
  into active_bedroom_count
  from public.bedrooms
  where bedrooms.property_id = booking_record.property_id
    and bedrooms.is_active = true;

  if active_bedroom_count = 0 then
    raise exception 'The selected property must have at least one active bedroom.';
  end if;

  if p_expected_duration_minutes <= 0 then
    raise exception 'Expected duration must be greater than zero.';
  end if;

  insert into public.cleaning_jobs (
    property_id,
    scheduled_date,
    expected_start_time,
    expected_start_time_window_end,
    guest_arrival_deadline,
    expected_duration_minutes,
    cleaning_type,
    status,
    instructions,
    notes,
    created_by,
    smoobu_booking_id,
    booking_context
  )
  values (
    booking_record.property_id,
    booking_record.departure_date,
    p_expected_start_time,
    null,
    p_guest_arrival_deadline,
    p_expected_duration_minutes,
    p_cleaning_type,
    'awaiting_approval',
    coalesce(p_instructions, ''),
    coalesce(p_notes, ''),
    auth.uid(),
    booking_record.id,
    jsonb_build_object(
      'departing_guest_name', booking_record.guest_name,
      'smoobu_reservation_id', booking_record.smoobu_reservation_id,
      'smoobu_reference_id', booking_record.smoobu_reference_id,
      'departure_date', booking_record.departure_date,
      'check_out_time', booking_record.check_out_time
    )
  )
  returning id into new_job_id;

  for bedroom_record in
    select
      bedrooms.id,
      bedrooms.name,
      bedrooms.physical_bed_type,
      bedrooms.current_configuration
    from public.bedrooms
    where bedrooms.property_id = booking_record.property_id
      and bedrooms.is_active = true
    order by bedrooms.name
  loop
    required_configuration := (p_required_configurations ->> bedroom_record.id::text)::public.bed_configuration;

    if required_configuration is null then
      raise exception 'A required configuration is missing for bedroom %.', bedroom_record.name;
    end if;

    if not exists (
      select 1
      from public.bedroom_permitted_configurations
      where bedroom_permitted_configurations.bedroom_id = bedroom_record.id
        and bedroom_permitted_configurations.configuration = required_configuration
        and bedroom_permitted_configurations.is_active = true
    ) then
      raise exception 'The required configuration is not permitted for bedroom %.', bedroom_record.name;
    end if;

    insert into public.cleaning_job_bedrooms (
      cleaning_job_id,
      bedroom_id,
      bedroom_name,
      physical_bed_type,
      assumed_current_configuration,
      required_configuration
    )
    values (
      new_job_id,
      bedroom_record.id,
      bedroom_record.name,
      bedroom_record.physical_bed_type,
      bedroom_record.current_configuration,
      required_configuration
    );
  end loop;

  return new_job_id;
end;
$$;

alter table public.smoobu_property_mappings enable row level security;
alter table public.smoobu_bookings enable row level security;
alter table public.smoobu_booking_price_elements enable row level security;
alter table public.smoobu_sync_runs enable row level security;
alter table public.smoobu_webhook_events enable row level security;

create policy "Managers can view Smoobu property mappings"
on public.smoobu_property_mappings
for select
to authenticated
using (public.current_user_can_manage_operations());

create policy "Administrators can manage Smoobu property mappings"
on public.smoobu_property_mappings
for all
to authenticated
using (public.current_user_is_administrator())
with check (public.current_user_is_administrator());

create policy "Managers can view Smoobu bookings"
on public.smoobu_bookings
for select
to authenticated
using (public.current_user_can_manage_operations());

create policy "Administrators can manage Smoobu bookings"
on public.smoobu_bookings
for all
to authenticated
using (public.current_user_is_administrator())
with check (public.current_user_is_administrator());

create policy "Managers can view Smoobu booking price elements"
on public.smoobu_booking_price_elements
for select
to authenticated
using (public.current_user_can_manage_operations());

create policy "Administrators can manage Smoobu booking price elements"
on public.smoobu_booking_price_elements
for all
to authenticated
using (public.current_user_is_administrator())
with check (public.current_user_is_administrator());

create policy "Managers can view Smoobu sync runs"
on public.smoobu_sync_runs
for select
to authenticated
using (public.current_user_can_manage_operations());

create policy "Administrators can manage Smoobu sync runs"
on public.smoobu_sync_runs
for all
to authenticated
using (public.current_user_is_administrator())
with check (public.current_user_is_administrator());

create policy "Administrators can view Smoobu webhook events"
on public.smoobu_webhook_events
for select
to authenticated
using (public.current_user_is_administrator());
