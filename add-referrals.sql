-- ============================================================
-- Field Provisions — remember who invited a new listing (referrals)
-- Paste into Supabase -> SQL Editor -> Run. Safe to run more than once.
--
-- Adds vendors.referred_by: the account whose invite link a new listing came from.
-- Vendors see "N businesses joined from your invites" in the app. You decide later what reward (if any) to give.
--
-- Run add-verified.sql and add-iap.sql first. This replaces the same protective trigger and keeps every earlier rule.
-- ============================================================

alter table vendors add column if not exists referred_by uuid references profiles(id) on delete set null;
create index if not exists vendors_referred_by_idx on vendors (referred_by);

create or replace function protect_vendor_flags() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  caller_is_admin boolean;
begin
  -- The SQL Editor and server-side tools (Stripe / RevenueCat webhooks) have no signed-in user: allow.
  if auth.uid() is null then
    return new;
  end if;

  select coalesce(is_admin, false) into caller_is_admin from profiles where id = auth.uid();
  if caller_is_admin then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.is_verified  := false;
    new.is_featured  := false;
    new.account_tier := 'free';
    new.pro_source   := null;
    -- You can't refer yourself.
    if new.referred_by is not null and new.referred_by = auth.uid() then
      new.referred_by := null;
    end if;
  else
    new.is_verified  := old.is_verified;
    new.is_featured  := old.is_featured;
    new.account_tier := old.account_tier;
    new.pro_source   := old.pro_source;
    new.referred_by  := old.referred_by;
  end if;
  return new;
end $$;

drop trigger if exists protect_vendor_flags_trg on vendors;
create trigger protect_vendor_flags_trg
  before insert or update on vendors
  for each row execute function protect_vendor_flags();
