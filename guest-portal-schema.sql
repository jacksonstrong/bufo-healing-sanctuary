-- Apply in the existing Supabase project before activating guest login.
begin;
create table public.guest_members (
 id uuid primary key references auth.users(id) on delete cascade,
 active boolean not null default false
);
alter table public.guest_members enable row level security;
revoke all on public.guest_members from anon, authenticated;
grant select on public.guest_members to authenticated;
create policy guest_own_membership on public.guest_members for select to authenticated
 using (id = auth.uid());
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
 values ('guest-resources', 'guest-resources', false, 52428800, array['application/pdf']);
create policy approved_guest_documents on storage.objects for select to authenticated
 using (bucket_id = 'guest-resources' and exists (
  select 1 from public.guest_members where id = auth.uid() and active
 ));
commit;
-- Invite/create each guest through Supabase Auth, then approve their UUID:
-- insert into public.guest_members(id,active) values ('GUEST_AUTH_UUID',true);
-- Revoke access with: update public.guest_members set active=false where id='GUEST_AUTH_UUID';
