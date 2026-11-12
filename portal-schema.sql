-- Run once in a new Supabase project. No guest data belongs in this file.
begin;
create table public.facilitators (
 id uuid primary key references auth.users(id) on delete cascade,
 name text not null check(length(name) between 1 and 200),
 active boolean not null default true
);
create table public.guests (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null default auth.uid() references public.facilitators(id),
 name text not null check(length(trim(name)) between 1 and 200),
 created_at timestamptz not null default now(),
 unique(id, owner_id)
);
create table public.ceremonies (
 id uuid primary key,
 owner_id uuid not null default auth.uid() references public.facilitators(id),
 guest_id uuid not null,
 ceremony_date date not null,
 intention text not null default '' check(length(intention)<=5000),
 preparation_minutes integer check(preparation_minutes between 0 and 100000),
 start_time time,
 end_time time,
 medicines jsonb not null default '[]' check(jsonb_typeof(medicines)='array' and jsonb_array_length(medicines)<=20 and octet_length(medicines::text)<20000),
 feelings text not null default '' check(length(feelings)<=10000),
 integration text not null default '' check(length(integration)<=10000),
 created_at timestamptz not null default now(),
 foreign key(guest_id,owner_id) references public.guests(id,owner_id)
);
create index guests_owner on public.guests(owner_id);
create index ceremonies_guest on public.ceremonies(owner_id,guest_id,ceremony_date);
alter table public.facilitators enable row level security;
alter table public.guests enable row level security;
alter table public.ceremonies enable row level security;
revoke all on public.facilitators,public.guests,public.ceremonies from anon,authenticated;
grant select on public.facilitators to authenticated;
grant select,insert on public.guests,public.ceremonies to authenticated;
grant update (ceremony_date, intention, preparation_minutes, start_time, end_time, medicines, feelings, integration)
 on public.ceremonies to authenticated;
create policy own_profile on public.facilitators for select to authenticated using(id=auth.uid());
create policy own_guests_read on public.guests for select to authenticated
 using(owner_id=auth.uid() and exists(select 1 from public.facilitators where id=auth.uid() and active));
create policy own_guests_create on public.guests for insert to authenticated
 with check(owner_id=auth.uid() and exists(select 1 from public.facilitators where id=auth.uid() and active));
create policy own_records_read on public.ceremonies for select to authenticated
 using(owner_id=auth.uid() and exists(select 1 from public.facilitators where id=auth.uid() and active));
create policy own_records_create on public.ceremonies for insert to authenticated
 with check(owner_id=auth.uid() and exists(select 1 from public.facilitators where id=auth.uid() and active));
create policy own_records_update on public.ceremonies for update to authenticated
 using(owner_id=auth.uid() and exists(select 1 from public.facilitators where id=auth.uid() and active))
 with check(owner_id=auth.uid() and exists(select 1 from public.facilitators where id=auth.uid() and active));
commit;
