-- ============================================================
-- Field Provisions — "Verified" badge + protect vendor flags
-- Paste into Supabase -> SQL Editor -> Run (safe to run more than once).
-- ============================================================

-- 1) The Verified badge column. You switch it on per vendor from the Admin panel.
alter table vendors add column if not exists is_verified boolean not null default false;

-- 2) Security: only admins (and server-side tools like the Stripe webhook and the
--    SQL Editor) may change a vendor's Verified / Featured / Pro status.
--    Without this, a vendor could grant themselves those flags by calling the API directly.
create or replace function protect_vendor_flags() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  caller_is_admin boolean;
begin
  -- auth.uid() is null for the SQL Editor and for service-role calls (Stripe webhook): allow those.
  if auth.uid() is null then
    return new;
  end if;

  select coalesce(is_admin, false) into caller_is_admin from profiles where id = auth.uid();
  if caller_is_admin then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.is_verified := false;
    new.is_featured := false;
    new.account_tier := 'free';
  else
    new.is_verified := old.is_verified;
    new.is_featured := old.is_featured;
    new.account_tier := old.account_tier;
  end if;
  return new;
end $$;

drop trigger if exists protect_vendor_flags_trg on vendors;
create trigger protect_vendor_flags_trg
  before insert or update on vendors
  for each row execute function protect_vendor_flags();

-- Optional: mark your demo vendor as verified
-- update vendors set is_verified = true where business_name = 'Demo Team Apparel Co.';
