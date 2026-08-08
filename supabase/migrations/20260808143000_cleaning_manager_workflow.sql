create table public.cleaning_job_comments (
  id uuid primary key default gen_random_uuid(),
  cleaning_job_id uuid not null references public.cleaning_jobs (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  body text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index cleaning_job_comments_cleaning_job_id_created_at_idx
on public.cleaning_job_comments (cleaning_job_id, created_at);

create trigger set_cleaning_job_comments_updated_at
before update on public.cleaning_job_comments
for each row execute function public.set_updated_at();

alter table public.cleaning_job_comments enable row level security;

create policy "Managers can manage cleaning job comments"
on public.cleaning_job_comments
for all
to authenticated
using (public.current_user_can_manage_operations())
with check (public.current_user_can_manage_operations());

create policy "Cleaners can view assigned job comments"
on public.cleaning_job_comments
for select
to authenticated
using (public.user_can_access_cleaning_job(cleaning_job_id));

create policy "Cleaners can add comments to assigned jobs"
on public.cleaning_job_comments
for insert
to authenticated
with check (
  author_id = auth.uid()
  and public.user_can_access_cleaning_job(cleaning_job_id)
);

create policy "Managers can add cleaning job audit events"
on public.cleaning_job_audit_events
for insert
to authenticated
with check (public.current_user_can_manage_operations());

do $$
declare
  constraint_name text;
begin
  select conname
  into constraint_name
  from pg_constraint
  where conrelid = 'public.cleaning_jobs'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%awaiting_cleaner_response%'
  limit 1;

  if constraint_name is not null then
    execute format('alter table public.cleaning_jobs drop constraint %I', constraint_name);
  end if;
end $$;

alter table public.cleaning_jobs
  add constraint cleaning_jobs_assigned_before_cleaner_execution_check
  check (status not in ('accepted', 'in_progress') or assigned_cleaner_id is not null);
