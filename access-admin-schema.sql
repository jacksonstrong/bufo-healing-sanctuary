-- Only Marla's existing sanctuary account can manage approvals.
-- Apply through the Supabase SQL editor, then run access-admin-test.sql.
begin;
create table public.access_decisions (
 email text primary key check (email = lower(trim(email)) and length(email) between 3 and 254),
 name text not null check (length(trim(name)) between 1 and 200),
 access text not null check (access in ('guest','facilitator','declined')),
 updated_at timestamptz not null default now(),
 updated_by uuid references auth.users(id)
);
alter table public.access_decisions enable row level security;
revoke all on public.access_decisions from anon, authenticated;
grant select on public.access_decisions to authenticated;
create policy owner_reads_decisions on public.access_decisions for select to authenticated
 using (auth.uid() = 'ee5f61fc-bb15-4da6-86fa-f0d45724f33a'::uuid);

-- Preserve existing approvals before adding the email-based workflow.
insert into public.access_decisions(email,name,access)
 select lower(u.email), coalesce(f.name,'Guest'),
 case when f.active then 'facilitator' else 'guest' end
 from auth.users u left join public.facilitators f on f.id=u.id
 left join public.guest_members g on g.id=u.id
 where u.email is not null and (f.active or g.active);

create function public.apply_sanctuary_access(target_id uuid, target_email text, verified boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare decision public.access_decisions;
begin
 select * into decision from public.access_decisions where email=lower(trim(target_email));
 -- Existing accounts keep their memberships until an explicit decision exists.
 if decision.email is null then return; end if;
 insert into public.guest_members(id,active) values
 (target_id,verified and decision.access in ('guest','facilitator'))
 on conflict(id) do update set active=excluded.active;
 if decision.access='facilitator' then
  insert into public.facilitators(id,name,active) values(target_id,decision.name,verified)
  on conflict(id) do update set name=excluded.name,active=excluded.active;
 else
  update public.facilitators set active=false where id=target_id;
 end if;
end $$;
revoke all on function public.apply_sanctuary_access(uuid,text,boolean) from public,anon,authenticated;

create function public.sync_sanctuary_access() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 if TG_OP='UPDATE' and old.email is distinct from new.email then
  update public.guest_members set active=false where id=new.id;
  update public.facilitators set active=false where id=new.id;
 end if;
 perform public.apply_sanctuary_access(new.id,new.email,new.email_confirmed_at is not null);
 return new;
end $$;
revoke all on function public.sync_sanctuary_access() from public,anon,authenticated;
create trigger sanctuary_access_after_email after insert or update of email,email_confirmed_at
 on auth.users for each row execute function public.sync_sanctuary_access();

create function public.manage_sanctuary_access(person_email text, person_name text, chosen_access text)
returns text language plpgsql security definer set search_path = '' as $$
declare person auth.users; cleaned_email text := lower(trim(person_email));
begin
 if auth.uid() is distinct from 'ee5f61fc-bb15-4da6-86fa-f0d45724f33a'::uuid then
  raise exception 'Only Marla can approve access' using errcode='42501';
 end if;
 if cleaned_email is null or cleaned_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
 or length(cleaned_email)>254 or person_name is null or length(trim(person_name)) not between 1 and 200
 or chosen_access is null or chosen_access not in ('guest','facilitator','declined') then
  raise exception 'Enter a name, a valid email, and an access choice';
 end if;
 select * into person from auth.users where lower(email)=cleaned_email;
 if person.id='ee5f61fc-bb15-4da6-86fa-f0d45724f33a'::uuid and chosen_access<>'facilitator' then
  raise exception 'Marla must keep her facilitator access';
 end if;
 insert into public.access_decisions(email,name,access,updated_by)
 values(cleaned_email,trim(person_name),chosen_access,auth.uid())
 on conflict(email) do update set name=excluded.name,access=excluded.access,updated_at=now(),updated_by=auth.uid();
 if person.id is null then return 'Saved. This person still needs a portal account.'; end if;
 perform public.apply_sanctuary_access(person.id,person.email,person.email_confirmed_at is not null);
 if chosen_access='declined' then return 'Access declined. Both portals are locked for this account.'; end if;
 if person.email_confirmed_at is null then return 'Approval saved. This person still needs to verify their email.'; end if;
 return 'Access updated. They can sign in now.';
end $$;
revoke all on function public.manage_sanctuary_access(text,text,text) from public,anon;
grant execute on function public.manage_sanctuary_access(text,text,text) to authenticated;

-- Facilitators may read guest resources, with no change to private tracker ownership.
alter policy approved_guest_documents on storage.objects using (
 bucket_id='guest-resources' and (
 exists(select 1 from public.guest_members where id=auth.uid() and active)
 or exists(select 1 from public.facilitators where id=auth.uid() and active))
);
commit;
