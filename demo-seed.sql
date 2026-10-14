-- ============================================================
-- Field Provisions — sample data for Apple App Review
-- Paste into Supabase -> SQL Editor -> Run. Safe to run again (it resets its own sample rows).
--
-- STEP 0 — run add-verified.sql first (adds the "Verified" badge column).
-- STEP 1 — create two users: Authentication -> Users -> Add user -> Create new user
--          (tick "Auto Confirm User"):
--            demo.coach@fieldprovisions.app    (or any address you control)
--            demo.vendor@fieldprovisions.app
--          Give Apple these logins and the password you chose.
-- STEP 2 — if you used different emails, change the two lines below, then run this.
--
-- IMPORTANT: this adds sample vendors to your LIVE directory, so real coaches would see them.
-- Run demo-cleanup.sql after Apple approves the app (or before real coaches arrive).
-- No fake reviews are added on purpose — reviews should come from real experiences.
-- Apple's reviewer can post a test review with the demo coach account.
--
-- Quote requests fire your email webhook. Sample vendors have no email on file, so only the
-- demo vendor listing (your demo vendor email) receives mail. Use an inbox you control.
-- ============================================================

do $$
declare
  coach_email  text := 'demo.coach@fieldprovisions.app';
  vendor_email text := 'demo.vendor@fieldprovisions.app';
  coach_id   uuid;
  vendor_uid uuid;
  v_apparel uuid; v_turf uuid; v_awards uuid; v_signs uuid; v_equip uuid; v_spirit uuid;
begin
  select id into coach_id   from auth.users where email = coach_email;
  select id into vendor_uid from auth.users where email = vendor_email;
  if coach_id is null or vendor_uid is null then
    raise exception 'Create both demo users in Authentication -> Users first (emails must match the two lines above).';
  end if;

  -- Profiles
  insert into profiles (id, full_name, email, user_role, school_or_organization)
  values (coach_id, 'Taylor Reed', coach_email, 'coach', 'Lincoln High School Athletics')
  on conflict (id) do update
    set full_name = excluded.full_name, user_role = 'coach', school_or_organization = excluded.school_or_organization;

  insert into profiles (id, full_name, email, user_role)
  values (vendor_uid, 'Jordan Blake', vendor_email, 'vendor')
  on conflict (id) do update set full_name = excluded.full_name, user_role = 'vendor';

  -- Reset any earlier sample rows
  delete from quote_requests where requester_id = coach_id;
  delete from favorites where user_id = coach_id;
  delete from vendors where business_name in (
    'Summit Team Outfitters','Peachtree Turf & Field','Blue Ridge Awards & Engraving','Red Clay Signs & Banners',
    'Piedmont Sports Equipment','Southern Spirit Wear Co.','Sideline Strength Systems','Gameday Scoreboards & Sound',
    'Foothills Team Photography','Booster Bridge Fundraising');

  -- Vendors. The first (Pro, Featured) is owned by the demo vendor account.
  insert into vendors (business_name, categories, sports, description, phone_number, email, website_url,
                       service_area_type, service_area_notes, claimed_by_vendor_id, account_tier, is_featured, promotion)
  values ('Summit Team Outfitters',
          array['Team Uniforms & Apparel','Spirit Wear & Fan Gear'],
          array['All Sports'],
          'Custom uniforms, warm-ups and practice gear for school and club teams. Free design mockups and a two-week turnaround on most orders.',
          '(555) 010-0142', vendor_email, '',
          'nationwide', 'Ships nationwide; free local delivery within 50 miles of Atlanta, GA',
          vendor_uid, 'pro', true, '10% off team orders of 15 or more through the end of the season')
  returning vendor_id into v_apparel;

  insert into vendors (business_name, categories, sports, description, phone_number, email, website_url,
                       service_area_type, service_area_notes, account_tier, is_featured, promotion)
  values ('Peachtree Turf & Field', array['Field Maintenance & Turf Management','Field Construction & Supplies'],
          array['Baseball','Softball','Soccer','Football'],
          'Field painting, infield mix, aeration and seasonal turf programs for schools, leagues and parks departments.',
          '(555) 010-0178', '', '', 'local', 'Metro Atlanta and north Georgia', 'pro', true,
          'Free field-lining consultation for new customers this spring')
  returning vendor_id into v_turf;

  insert into vendors (business_name, categories, sports, description, phone_number, email, website_url,
                       service_area_type, service_area_notes, account_tier, is_featured)
  values ('Blue Ridge Awards & Engraving', array['Awards & Recognition'], array['All Sports'],
          'Trophies, medals, plaques and banquet awards, engraved in house. Rush orders available.',
          '(555) 010-0113', '', '', 'nationwide', 'Ships nationwide', 'free', false)
  returning vendor_id into v_awards;

  insert into vendors (business_name, categories, sports, description, phone_number, email, website_url,
                       service_area_type, service_area_notes, account_tier, is_featured)
  values ('Red Clay Signs & Banners', array['Signs, Banners & Displays','Graphic Design & Branding'], array['All Sports'],
          'Outfield banners, stadium signage, senior-night posters and team branding. Design help included.',
          '(555) 010-0127', '', '', 'local', 'Athens, GA and surrounding counties', 'free', false);

  insert into vendors (business_name, categories, sports, description, phone_number, email, website_url,
                       service_area_type, service_area_notes, account_tier, is_featured)
  values ('Piedmont Sports Equipment', array['Sporting Goods & Equipment','Protective Equipment & Safety'],
          array['Baseball','Softball','Soccer','Boys Basketball','Girls Basketball','Volleyball'],
          'Team ordering for balls, nets, goals, bases and protective gear, with school and booster-club pricing.',
          '(555) 010-0165', '', '', 'nationwide', 'Ships nationwide; local pickup in Macon, GA', 'free', false)
  returning vendor_id into v_equip;

  insert into vendors (business_name, categories, sports, description, phone_number, email, website_url,
                       service_area_type, service_area_notes, account_tier, is_featured)
  values ('Southern Spirit Wear Co.', array['Spirit Wear & Fan Gear'], array['Cheerleading','Football','Girls Basketball','Boys Basketball'],
          'Spirit shirts, hoodies and fan gear for school stores and booster fundraisers. No minimums on reorders.',
          '(555) 010-0191', '', '', 'nationwide', 'Ships nationwide', 'free', false)
  returning vendor_id into v_spirit;

  insert into vendors (business_name, categories, sports, description, phone_number, email, website_url,
                       service_area_type, service_area_notes, account_tier, is_featured)
  values ('Sideline Strength Systems', array['Strength & Conditioning','Athletic Training & Performance'],
          array['Football','Wrestling','Track & Field','Lacrosse'],
          'Weight room design, equipment and in-season conditioning programs for high school athletic departments.',
          '(555) 010-0136', '', '', 'local', 'Georgia and South Carolina', 'free', false);

  insert into vendors (business_name, categories, sports, description, phone_number, email, website_url,
                       service_area_type, service_area_notes, account_tier, is_featured)
  values ('Gameday Scoreboards & Sound', array['Scoreboards & Game Day Electronics'], array['All Sports'],
          'Scoreboards, sound systems and shot clocks, installed and serviced. Financing available for schools.',
          '(555) 010-0158', '', '', 'nationwide', 'Ships nationwide; installation in the Southeast', 'free', false);

  insert into vendors (business_name, categories, sports, description, phone_number, email, website_url,
                       service_area_type, service_area_notes, account_tier, is_featured)
  values ('Foothills Team Photography', array['Photography & Video Production'], array['All Sports'],
          'Team and individual photo days, banners, and game-film packages for schools and travel teams.',
          '(555) 010-0184', '', '', 'local', 'Northeast Georgia', 'free', false);

  insert into vendors (business_name, categories, sports, description, phone_number, email, website_url,
                       service_area_type, service_area_notes, account_tier, is_featured)
  values ('Booster Bridge Fundraising', array['Fundraising'], array['All Sports'],
          'Turnkey fundraisers for teams and booster clubs: online campaigns, product sales and event support.',
          '(555) 010-0119', '', '', 'nationwide', 'Serves teams nationwide', 'free', false);

  -- Quote requests from the demo coach: a realistic mix of open / responded / closed
  insert into quote_requests (requester_id, vendor_id, sport, needed_by, details, budget, status, quoted_at, created_at)
  values
   (coach_id, v_apparel, 'Football',        current_date + 45,
    'We need 45 game jerseys and 45 pairs of pants for varsity and JV, navy and gold. Names on the back for varsity only. Can you quote with and without numbers on the sleeves?',
    6500, 'open', null, now() - interval '1 day'),
   (coach_id, v_apparel, 'Girls Basketball', current_date + 30,
    '14 warm-up shirts and 14 shooting shirts for the varsity girls team. Crimson with white lettering. Please include a mockup if possible.',
    1800, 'responded', now() - interval '2 days', now() - interval '6 days'),
   (coach_id, v_apparel, 'Cheerleading',     current_date - 20,
    'Spirit wear order for the cheer squad: 20 hoodies and 20 tees.',
    1200, 'closed', now() - interval '25 days', now() - interval '32 days'),
   (coach_id, v_turf, 'Softball',            current_date + 14,
    'Spring infield mix, field lining and a one-time aeration for our home field before the season opens.',
    1500, 'open', null, now() - interval '3 days'),
   (coach_id, v_awards, 'Baseball',          current_date + 30,
    'Looking for 25 end-of-season medals and 3 large team trophies for our banquet. Engraving on the medals.',
    900, 'responded', now() - interval '4 days', now() - interval '9 days'),
   (coach_id, v_equip, 'Soccer',             current_date + 21,
    'Two full-size portable goals and two dozen match balls for the JV program.',
    2400, 'open', null, now() - interval '5 hours'),
   (coach_id, v_spirit, 'Football',          current_date - 5,
    'Booster-club spirit shirts for the home opener, around 150 shirts.',
    1500, 'closed', now() - interval '20 days', now() - interval '28 days');

  -- Two saved favorites for the coach
  insert into favorites (user_id, vendor_id) values (coach_id, v_apparel), (coach_id, v_turf);

  -- Mark a few listings Verified (skipped quietly if add-verified.sql has not been run)
  begin
    update vendors set is_verified = true
    where business_name in ('Summit Team Outfitters','Peachtree Turf & Field','Blue Ridge Awards & Engraving','Piedmont Sports Equipment');
  exception when undefined_column then
    raise notice 'is_verified column not found - run add-verified.sql, then run this file again.';
  end;

  raise notice 'Sample data ready. Coach login: %   Vendor login: %', coach_email, vendor_email;
end $$;
