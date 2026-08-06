-- Introducer commissions are derived from the factory dates, never typed in.
--
--   RM5,000 falls due 30 days after the RM4M disbursement
--   RM5,000 more falls due 30 days after the RM1M reaches HQ
--
-- Correcting a stage backwards clears the dates, which removes the *accrued*
-- line — but a commission that was genuinely paid is never deleted.

create or replace function private.sync_commissions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  ------------------------------------------------------------------ disbursement
  if new.disbursed_at is not null then
    insert into public.commissions (
      factory_deal_id, factory_name, introducer_name, introducer_phone,
      trigger_event, amount, status, due_at
    )
    values (
      new.id, new.company_name, new.introducer_name, new.introducer_phone,
      'disbursement', 5000, 'accrued', new.disbursed_at + 30
    )
    on conflict (factory_deal_id, trigger_event) do update
      set factory_name     = excluded.factory_name,
          introducer_name  = excluded.introducer_name,
          introducer_phone = excluded.introducer_phone,
          -- Never move the due date of a line that has already been paid.
          due_at = case
                     when public.commissions.status = 'paid'
                     then public.commissions.due_at
                     else excluded.due_at
                   end;
  else
    delete from public.commissions
     where factory_deal_id = new.id
       and trigger_event   = 'disbursement'
       and status          = 'accrued';
  end if;

  -------------------------------------------------------------------- investment
  if new.invested_at is not null then
    insert into public.commissions (
      factory_deal_id, factory_name, introducer_name, introducer_phone,
      trigger_event, amount, status, due_at
    )
    values (
      new.id, new.company_name, new.introducer_name, new.introducer_phone,
      'investment', 5000, 'accrued', new.invested_at + 30
    )
    on conflict (factory_deal_id, trigger_event) do update
      set factory_name     = excluded.factory_name,
          introducer_name  = excluded.introducer_name,
          introducer_phone = excluded.introducer_phone,
          due_at = case
                     when public.commissions.status = 'paid'
                     then public.commissions.due_at
                     else excluded.due_at
                   end;
  else
    delete from public.commissions
     where factory_deal_id = new.id
       and trigger_event   = 'investment'
       and status          = 'accrued';
  end if;

  return new;
end;
$$;

create trigger factory_deals_sync_commissions
  after insert or update on public.factory_deals
  for each row execute function private.sync_commissions();
