-- Allow active facilitators to edit only their own ceremony content.
-- This does not create tables, touch auth.users, or delete records.
begin;
grant update (ceremony_date, intention, preparation_minutes, start_time, end_time, medicines, feelings, integration)
 on public.ceremonies to authenticated;
create policy own_records_update on public.ceremonies
 for update to authenticated
 using (owner_id=auth.uid() and exists (
  select 1 from public.facilitators where id=auth.uid() and active
 ))
 with check (owner_id=auth.uid() and exists (
  select 1 from public.facilitators where id=auth.uid() and active
 ));
commit;
select 'Editing enabled.' as result;
