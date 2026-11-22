-- Run after the migration in a transaction. Test users and approvals roll back.
begin;
insert into auth.users(id,email,email_confirmed_at) values
 ('f8e8b0ab-66ca-46a0-9443-06f2a9fc2001','access-test@example.invalid',now()),
 ('f8e8b0ab-66ca-46a0-9443-06f2a9fc2002','unverified-test@example.invalid',null);
set local role authenticated;
select set_config('request.jwt.claim.sub','f8e8b0ab-66ca-46a0-9443-06f2a9fc2001',true);
do $$ begin
 begin
  perform public.manage_sanctuary_access('access-test@example.invalid','Test','facilitator');
  raise exception 'Unauthorized approval was allowed';
 exception when insufficient_privilege then null; end;
 if exists(select 1 from public.access_decisions) then raise exception 'Private decisions exposed'; end if;
end $$;
select set_config('request.jwt.claim.sub','ee5f61fc-bb15-4da6-86fa-f0d45724f33a',true);
select public.manage_sanctuary_access('access-test@example.invalid','Test','facilitator');
select public.manage_sanctuary_access('unverified-test@example.invalid','Unverified','facilitator');
select set_config('request.jwt.claim.sub','f8e8b0ab-66ca-46a0-9443-06f2a9fc2001',true);
do $$ begin
 if not exists(select 1 from public.facilitators where id=auth.uid() and active) then raise exception 'Facilitator approval failed'; end if;
 if (select count(*) from storage.objects where bucket_id='guest-resources')<>2 then raise exception 'Facilitator resources missing'; end if;
 if exists(select 1 from public.guests where owner_id<>auth.uid()) then raise exception 'Private guest records exposed'; end if;
end $$;
select set_config('request.jwt.claim.sub','f8e8b0ab-66ca-46a0-9443-06f2a9fc2002',true);
do $$ begin
 if exists(select 1 from public.facilitators where active) or exists(select 1 from storage.objects where bucket_id='guest-resources') then raise exception 'Unverified account gained access'; end if;
end $$;
select set_config('request.jwt.claim.sub','ee5f61fc-bb15-4da6-86fa-f0d45724f33a',true);
select public.manage_sanctuary_access('access-test@example.invalid','Test','guest');
select set_config('request.jwt.claim.sub','f8e8b0ab-66ca-46a0-9443-06f2a9fc2001',true);
do $$ begin
 if exists(select 1 from public.facilitators where active) then raise exception 'Downgrade failed'; end if;
 if (select count(*) from storage.objects where bucket_id='guest-resources')<>2 then raise exception 'Guest resources missing'; end if;
end $$;
select set_config('request.jwt.claim.sub','ee5f61fc-bb15-4da6-86fa-f0d45724f33a',true);
select public.manage_sanctuary_access('access-test@example.invalid','Test','declined');
select set_config('request.jwt.claim.sub','f8e8b0ab-66ca-46a0-9443-06f2a9fc2001',true);
do $$ begin
 if exists(select 1 from storage.objects where bucket_id='guest-resources') then raise exception 'Revocation failed'; end if;
end $$;
reset role;
rollback;
select 'PASS: admin-only approval, private decisions, both portal roles, unverified denial, downgrade and revocation' as result;
