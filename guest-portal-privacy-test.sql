-- Run in the Supabase SQL editor. All temporary test rows are rolled back.
-- Any failed assertion raises an error. Do not activate login unless this passes.
begin;
insert into auth.users(id) values ('f8e8b0ab-66ca-46a0-9443-06f2a9fc1001'), ('f8e8b0ab-66ca-46a0-9443-06f2a9fc1002');
insert into public.guest_members(id,active) values
 ('f8e8b0ab-66ca-46a0-9443-06f2a9fc1001',true),
 ('f8e8b0ab-66ca-46a0-9443-06f2a9fc1002',false);
do $$ begin
 if not exists(select 1 from storage.buckets where id='guest-resources' and not public) then raise exception 'Bucket is not private'; end if;
 if has_table_privilege('authenticated','public.guest_members','INSERT,UPDATE,DELETE') then raise exception 'Guests can change approvals'; end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','f8e8b0ab-66ca-46a0-9443-06f2a9fc1001',true);
do $$ begin
 if (select count(*) from storage.objects where bucket_id='guest-resources' and name in ('preparation-integration.pdf','psychedelic-soul-journal.pdf')) <> 2 then raise exception 'Approved guest cannot read both workbooks'; end if;
 if (select count(*) from public.guest_members) <> 1 then raise exception 'Membership isolation failed'; end if;
end $$;
select set_config('request.jwt.claim.sub','f8e8b0ab-66ca-46a0-9443-06f2a9fc1002',true);
do $$ begin
 if exists(select 1 from storage.objects where bucket_id='guest-resources') then raise exception 'Inactive guest can read workbooks'; end if;
end $$;
select set_config('request.jwt.claim.sub','f8e8b0ab-66ca-46a0-9443-06f2a9fc1003',true);
do $$ begin
 if exists(select 1 from storage.objects where bucket_id='guest-resources') then raise exception 'Unapproved user can read workbooks'; end if;
end $$;
reset role;
rollback;
select 'PASS: private bucket, approved downloads, isolated memberships, inactive and unapproved denial' as result;
