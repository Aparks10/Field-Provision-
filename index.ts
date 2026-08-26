// Supabase Edge Function: delete-account
//
// Apple requires any app that lets people create an account to also let
// them delete it from inside the app (App Store Review Guideline 5.1.1(v)).
// This function is what the "Delete My Account" button in index.html
// calls. It runs with the SERVICE ROLE key (server-side only) because
// deleting an auth user requires admin privileges — the app's normal
// anon-key client can never do this directly, which is exactly why this
// needs to be its own function rather than a plain client-side call.
//
// IMPORTANT: keep "Verify JWT" turned ON for this function (unlike
// stripe-webhook and the pg_cron-triggered functions) — this one must
// only ever run on behalf of a real signed-in user deleting themselves,
// never an anonymous caller.
//
// What it removes, for the calling user's own account only:
//   - their favorites
//   - their reviews (reviews they wrote)
//   - their quote requests (requests they sent as a coach)
//   - unclaims any vendor listing they manage (the vendor listing itself
//     stays — it's a business, not personal data — but it's no longer
//     tied to this person's account)
//   - their profiles row
//   - the actual Supabase Auth user (so they can never sign back in)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

// Every response — including error responses — needs these headers, or the
// browser/WKWebView blocks the response entirely before our JS ever sees it
// (shows up to the user as a generic "Load failed" / "Failed to fetch").
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  // Browsers send a preflight OPTIONS request before the real POST because
  // this call includes an Authorization header. Without this, the browser
  // never even sends the POST — it just fails locally with "Load failed".
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization') || '';
    const jwt = authHeader.replace('Bearer ', '');
    if (!jwt) {
      return new Response(JSON.stringify({ error: 'Not signed in' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify who's calling using their own JWT against the anon client —
    // this confirms the token is real and gets us their user id, without
    // ever trusting a user id passed in from the client itself.
    const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await callerClient.auth.getUser(jwt);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Could not verify your account' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = userData.user.id;

    // From here on, use the service role client — this is the only thing
    // in the app allowed to delete an auth user.
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    await admin.from('favorites').delete().eq('user_id', userId);
    await admin.from('reviews').delete().eq('author_id', userId);
    await admin.from('quote_requests').delete().eq('requester_id', userId);
    await admin.from('vendors').update({ claimed_by_vendor_id: null }).eq('claimed_by_vendor_id', userId);
    await admin.from('profiles').delete().eq('id', userId);

    const { error: deleteUserError } = await admin.auth.admin.deleteUser(userId);
    if (deleteUserError) {
      return new Response(JSON.stringify({ error: deleteUserError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ deleted: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
