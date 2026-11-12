-- Enable corrections to an active facilitator's own entries only.
-- Ownership, guest assignment, IDs and creation dates cannot be changed.
begin;
grant update (ceremony_date, intention, preparation_minutes, start_time, end_time, medicines, feelings, integration)
 on public.ceremonies to authenticated;
drop policy if exists own_records_update on public.ceremonies;
create policy own_records_update on public.ceremonies for update to authenticated
 using (owner_id=auth.uid() and exists(select 1 from public.facilitators where id=auth.uid() and active))
 with check (owner_id=auth.uid() and exists(select 1 from public.facilitators where id=auth.uid() and active));
-- Test with temporary sample accounts. Roll back samples before committing.
savepoint sample_records;
select set_config('portal.test_a', gen_random_uuid()::text, true);
select set_config('portal.test_b', gen_random_uuid()::text, true);
select set_config('portal.test_guest', gen_random_uuid()::text, true);
select set_config('portal.test_entry', gen_random_uuid()::text, true);
insert into auth.users(id) values
 (current_setting('portal.test_a')::uuid), (current_setting('portal.test_b')::uuid);
insert into public.facilitators(id,name) values
 (current_setting('portal.test_a')::uuid,'Temporary edit test A'),
 (current_setting('portal.test_b')::uuid,'Temporary edit test B');
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('portal.test_a'),true);
insert into public.guests(id,name) values(current_setting('portal.test_guest')::uuid,'Temporary sample');
insert into public.ceremonies(id,guest_id,ceremony_date) values
 (current_setting('portal.test_entry')::uuid,current_setting('portal.test_guest')::uuid,current_date);
do $$
declare changed integer;
begin
 update public.ceremonies set feelings='Corrected sample' where id=current_setting('portal.test_entry')::uuid;
 get diagnostics changed = row_count;
 if changed<>1 then raise exception 'FAIL: own entry edit blocked'; end if;
 begin
  update public.ceremonies set owner_id=current_setting('portal.test_b')::uuid where id=current_setting('portal.test_entry')::uuid;
  raise exception 'FAIL: ownership can change';
 exception when insufficient_privilege then null;
 end;
end $$;
select set_config('request.jwt.claim.sub',current_setting('portal.test_b'),true);
do $$
declare changed integer;
begin
 update public.ceremonies set feelings='Must not save' where id=current_setting('portal.test_entry')::uuid;
 get diagnostics changed = row_count;
 if changed<>0 then raise exception 'FAIL: cross-account edit allowed'; end if;
end $$;
reset role;
update public.facilitators set active=false where id=current_setting('portal.test_a')::uuid;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('portal.test_a'),true);
do $$
declare changed integer;
begin
 update public.ceremonies set feelings='Must not save' where id=current_setting('portal.test_entry')::uuid;
 get diagnostics changed = row_count;
 if changed<>0 then raise exception 'FAIL: inactive account can edit'; end if;
end $$;
reset role;
set local role anon;
do $$ begin
 begin
  update public.ceremonies set feelings='Must not save' where id=current_setting('portal.test_entry')::uuid;
  raise exception 'FAIL: anonymous edit allowed';
 exception when insufficient_privilege then null;
 end;
end $$;
reset role;
rollback to savepoint sample_records;
commit;
select 'PASS: editing enabled; other accounts, inactive accounts and anonymous edits blocked; sample records removed.' as result;
