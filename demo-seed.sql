-- ============================================================
-- Field Provisions — demo data for Apple App Review
-- Paste into Supabase -> SQL Editor -> Run.
--
-- BEFORE running: create two users in Supabase
--   Authentication -> Users -> Add user -> Create new user
--   (tick "Auto Confirm User" so no email confirmation is needed)
--     1) demo.coach@fieldprovisions.app   (or an address you control)
--     2) demo.vendor@fieldprovisions.app
--   Use a password you'll give Apple, e.g.  FieldDemo2026!
--
-- NOTE: sending a quote request fires your email webhook. If you use fake
-- addresses the emails just bounce — harmless, but you can use Gmail "plus"
-- addresses you own instead (aparks10uga+democoach@gmail.com etc.).
-- Change the two emails below to match what you created.
-- ============================================================

do $$
declare
  coach_email  text := 'demo.coach@fieldprovisions.app';
  vendor_email text := 'demo.vendor@fieldprovisions.app';
  coach_id  uuid;
  vendor_uid uuid;
  v1 uuid;  v2 uuid;  v3 uuid;
begin
  select id into coach_id   from auth.users where email = coach_email;
  select id into vendor_uid from auth.users where email = vendor_email;
  if coach_id is null or vendor_uid is null then
    raise exception 'Create both demo users in Authentication -> Users first (emails must match the two lines above).';
  end if;

  -- Profiles (the sign-up trigger may not have filled these in for dashboard-created users)
  insert into profiles (id, full_name, email, user_role, school_or_organization)
  values (coach_id, 'Coach Demo', coach_email, 'coach', 'Lincoln High School Athletics')
  on conflict (id) do update
    set full_name = excluded.full_name, user_role = 'coach',
        school_or_organization = excluded.school_or_organization;

  insert into profiles (id, full_name, email, user_role)
  values (vendor_uid, 'Vendor Demo', vendor_email, 'vendor')
  on conflict (id) do update
    set full_name = excluded.full_name, user_role = 'vendor';

  -- Re-runnable: clear previous demo rows first
  delete from quote_requests where requester_id = coach_id;
  delete from reviews where author_id = coach_id;
  delete from vendors where business_name in ('Demo Team Apparel Co.', 'Demo Turf & Field Care', 'Demo Awards & Trophies')
    and (claimed_by_vendor_id = vendor_uid or claimed_by_vendor_id is null);

  -- Vendor listings (the first is owned by the demo vendor account)
  insert into vendors (business_name, categories, sports, description, phone_number, email, website_url,
                       service_area_type, service_area_notes, claimed_by_vendor_id, account_tier, is_featured, promotion)
  values ('Demo Team Apparel Co.',
          array['Team Uniforms & Apparel','Spirit Wear & Fan Gear'],
          array['All Sports'],
          'Custom uniforms, warm-ups and spirit wear for school and club teams. Free design mockups and 2-week turnaround on most orders.',
          '(555) 010-2001', vendor_email, 'https://example.com/apparel',
          'nationwide', 'Ships nationwide; free local delivery within 50 miles of Atlanta, GA',
          vendor_uid, 'pro', true, '10% off team orders of 15 or more through the end of the season')
  returning vendor_id into v1;

  insert into vendors (business_name, categories, sports, description, phone_number, email, website_url,
                       service_area_type, service_area_notes, account_tier, is_featured)
  values ('Demo Turf & Field Care',
          array['Field Maintenance & Turf Management','Field Construction & Supplies'],
          array['Baseball','Softball','Soccer','Football'],
          'Field painting, infield mix, aeration and seasonal turf programs for schools and parks departments.',
          '(555) 010-2002', 'turf@example.com', 'https://example.com/turf',
          'local', 'Metro Atlanta and north Georgia', 'free', false)
  returning vendor_id into v2;

  insert into vendors (business_name, categories, sports, description, phone_number, email, website_url,
                       service_area_type, service_area_notes, account_tier, is_featured)
  values ('Demo Awards & Trophies',
          array['Awards & Recognition'],
          array['All Sports'],
          'Trophies, medals, plaques and banquet awards. Rush orders available.',
          '(555) 010-2003', 'awards@example.com', 'https://example.com/awards',
          'nationwide', null, 'free', false)
  returning vendor_id into v3;

  -- Sample quote requests from the demo coach (one open, one responded, one closed)
  insert into quote_requests (requester_id, vendor_id, sport, needed_by, details, budget, status, quoted_at)
  values
   (coach_id, v1, 'Football',  current_date + 45,
    'Need 45 game jerseys and 45 pairs of pants for varsity and JV, navy and gold. Names on the back for varsity only.',
    6500, 'open', null),
   (coach_id, v3, 'Baseball', current_date + 30,
    'Looking for 25 end-of-season medals and 3 large team trophies for our banquet.',
    900, 'responded', now() - interval '2 days'),
   (coach_id, v2, 'Softball', current_date + 14,
    'Spring infield mix, field lining and a one-time aeration for our home field.',
    1500, 'closed', now() - interval '10 days');

  -- A sample review from the demo coach
  insert into reviews (vendor_id, author_id, author_name, author_role, rating, review_text)
  values (v3, coach_id, 'Coach Demo', 'Coach, Lincoln High School Athletics', 5,
          'Great communication and the trophies arrived a week early. Will order again.');

  raise notice 'Demo data created. Coach: %  Vendor: %', coach_email, vendor_email;
end $$;

-- If the vendor cards show no star rating, your database may calculate it from reviews
-- automatically (check the vendor in the app). If it doesn't, run this once:
-- update vendors v set average_rating = (select round(avg(rating)::numeric,1) from reviews r where r.vendor_id = v.vendor_id)
--   where exists (select 1 from reviews r where r.vendor_id = v.vendor_id);
