-- Run the entire script once in Supabase SQL Editor as the default postgres role.
-- Uses temporary synthetic accounts and records. ROLLBACK removes all test data.
begin;
select set_config('portal.test_a', gen_random_uuid()::text, true);
select set_config('portal.test_b', gen_random_uuid()::text, true);
select set_config('portal.test_guest', gen_random_uuid()::text, true);
insert into auth.users(id) values
 (current_setting('portal.test_a')::uuid),
 (current_setting('portal.test_b')::uuid);
insert into public.facilitators(id,name) values
 (current_setting('portal.test_a')::uuid,'Temporary test A'),
 (current_setting('portal.test_b')::uuid,'Temporary test B');

set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('portal.test_a'), true);
insert into public.guests(id,name) values
 (current_setting('portal.test_guest')::uuid,'Temporary sample guest');
insert into public.ceremonies(id,guest_id,ceremony_date,feelings) values
 (gen_random_uuid(),current_setting('portal.test_guest')::uuid,current_date,'Synthetic test only');
do $$ begin
 if (select count(*) from public.guests where id=current_setting('portal.test_guest')::uuid)<>1 then
  raise exception 'FAIL: facilitator cannot read own guest';
 end if;
 if (select count(*) from public.ceremonies where guest_id=current_setting('portal.test_guest')::uuid)<>1 then
  raise exception 'FAIL: facilitator cannot read own entry';
 end if;
end $$;

select set_config('request.jwt.claim.sub', current_setting('portal.test_b'), true);
do $$ begin
 if exists(select 1 from public.guests where id=current_setting('portal.test_guest')::uuid) then
  raise exception 'FAIL: another facilitator can read the guest';
 end if;
 if exists(select 1 from public.ceremonies where guest_id=current_setting('portal.test_guest')::uuid) then
  raise exception 'FAIL: another facilitator can read the entry';
 end if;
 begin
  insert into public.guests(owner_id,name) values(current_setting('portal.test_a')::uuid,'Must be rejected');
  raise exception 'FAIL: owner impersonation allowed';
 exception when insufficient_privilege then null;
 end;
 begin
  insert into public.ceremonies(id,guest_id,ceremony_date) values(gen_random_uuid(),current_setting('portal.test_guest')::uuid,current_date);
  raise exception 'FAIL: another facilitator can attach an entry';
 exception when foreign_key_violation or insufficient_privilege then null;
 end;
end $$;

reset role;
update public.facilitators set active=false where id=current_setting('portal.test_a')::uuid;
set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('portal.test_a'), true);
do $$ begin
 if exists(select 1 from public.guests where id=current_setting('portal.test_guest')::uuid) then
  raise exception 'FAIL: inactive facilitator retains guest access';
 end if;
 begin
  insert into public.guests(name) values('Must be rejected');
  raise exception 'FAIL: inactive facilitator can create guest';
 exception when insufficient_privilege then null;
 end;
end $$;
reset role;
rollback;
select 'PASS: own records work; cross-account and inactive access blocked; temporary data removed.' as result;
