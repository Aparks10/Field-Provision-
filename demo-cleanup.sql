-- ============================================================
-- Field Provisions — remove the sample data created by demo-seed.sql
-- Run in Supabase -> SQL Editor AFTER Apple approves the app, or before real coaches arrive.
-- Then remove the two demo logins: Authentication -> Users -> delete each demo user
-- (or sign in as each and use Edit profile -> Delete my account).
-- ============================================================
do $$
declare
  coach_id uuid;
begin
  select id into coach_id from auth.users where email = 'demo.coach@fieldprovisions.app';  -- change if you used a different email

  if coach_id is not null then
    delete from quote_requests where requester_id = coach_id;
    delete from favorites where user_id = coach_id;
    delete from reviews where author_id = coach_id;
  end if;

  delete from vendors where business_name in (
    'Summit Team Outfitters','Peachtree Turf & Field','Blue Ridge Awards & Engraving','Red Clay Signs & Banners',
    'Piedmont Sports Equipment','Southern Spirit Wear Co.','Sideline Strength Systems','Gameday Scoreboards & Sound',
    'Foothills Team Photography','Booster Bridge Fundraising');

  raise notice 'Sample data removed.';
end $$;
