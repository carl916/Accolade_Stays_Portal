begin;

alter table public.properties
  add column if not exists address_line_1 text,
  add column if not exists address_line_2 text,
  add column if not exists town text,
  add column if not exists county text,
  add column if not exists postcode text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'properties'
      and column_name = 'address'
  ) then
    execute $copy_address$
      update public.properties
      set address_line_1 = coalesce(nullif(address_line_1, ''), coalesce(address, ''))
      where coalesce(address_line_1, '') = ''
    $copy_address$;
  end if;
end;
$$;

update public.properties
set
  address_line_1 = coalesce(address_line_1, ''),
  address_line_2 = coalesce(address_line_2, ''),
  town = coalesce(town, ''),
  county = coalesce(county, ''),
  postcode = coalesce(postcode, '');

alter table public.properties
  alter column address_line_1 set default '',
  alter column address_line_2 set default '',
  alter column town set default '',
  alter column county set default '',
  alter column postcode set default '',
  alter column address_line_1 set not null,
  alter column address_line_2 set not null,
  alter column town set not null,
  alter column county set not null,
  alter column postcode set not null;

comment on column public.properties.address_line_1 is 'First line of the property address.';
comment on column public.properties.address_line_2 is 'Second line of the property address, where applicable.';
comment on column public.properties.town is 'Town or city for the property address.';
comment on column public.properties.county is 'County or region for the property address.';
comment on column public.properties.postcode is 'Postcode for the property address.';

commit;
