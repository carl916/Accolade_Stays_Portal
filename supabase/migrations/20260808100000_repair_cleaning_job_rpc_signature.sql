create or replace function public.create_cleaning_job_with_bedroom_snapshots(
  p_property_id uuid,
  p_scheduled_date date,
  p_expected_start_time time,
  p_expected_start_time_window_end time,
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
  new_job_id uuid;
  bedroom_record record;
  required_configuration public.bed_configuration;
  active_bedroom_count integer;
begin
  if public.current_user_role() <> 'administrator' then
    raise exception 'Only administrators can create cleaning jobs.';
  end if;

  select count(*)
  into active_bedroom_count
  from public.bedrooms
  where bedrooms.property_id = p_property_id
    and bedrooms.is_active = true;

  if active_bedroom_count = 0 then
    raise exception 'The selected property must have at least one active bedroom.';
  end if;

  if p_expected_duration_minutes <= 0 then
    raise exception 'Expected duration must be greater than zero.';
  end if;

  if p_expected_start_time_window_end is not null
    and p_expected_start_time is not null
    and p_expected_start_time_window_end < p_expected_start_time then
    raise exception 'The expected end of the time window cannot be before the start time.';
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
    created_by
  )
  values (
    p_property_id,
    p_scheduled_date,
    p_expected_start_time,
    p_expected_start_time_window_end,
    p_guest_arrival_deadline,
    p_expected_duration_minutes,
    p_cleaning_type,
    'awaiting_approval',
    coalesce(p_instructions, ''),
    coalesce(p_notes, ''),
    auth.uid()
  )
  returning id into new_job_id;

  for bedroom_record in
    select
      bedrooms.id,
      bedrooms.name,
      bedrooms.physical_bed_type,
      bedrooms.current_configuration
    from public.bedrooms
    where bedrooms.property_id = p_property_id
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

grant execute on function public.create_cleaning_job_with_bedroom_snapshots(
  uuid,
  date,
  time,
  time,
  timestamptz,
  integer,
  public.cleaning_type,
  text,
  text,
  jsonb
) to authenticated;

notify pgrst, 'reload schema';
