// delete-account — lets a signed-in user permanently delete their own account.
// Required by Apple App Store Guideline 5.1.1(v).
//
// Deploy: Supabase dashboard -> Edge Functions -> Deploy a new function -> name it
// exactly "delete-account" -> paste this file -> Deploy.
// Leave "Verify JWT" ON. SUPABASE_URL, SUPABASE_ANON_KEY and
// SUPABASE_SERVICE_ROLE_KEY are provided to every function automatically.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Not signed in" }, 401);

  const url = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Identify the caller from their own token — never trust an id sent in the body.
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) return json({ error: "Invalid session" }, 401);
  const uid = userData.user.id;

  // Delete the user's data. Each step is best-effort so a table that cascades
  // (or doesn't have a given column) can't block the account deletion.
  const attempt = async (label: string, fn: () => PromiseLike<{ error: unknown }>) => {
    try {
      const { error } = await fn();
      if (error) console.warn(`delete-account: ${label}:`, error);
    } catch (e) {
      console.warn(`delete-account: ${label} threw`, e);
    }
  };

  // Vendor listings this user owns (and everything hanging off them)
  const { data: myVendors } = await admin.from("vendors").select("vendor_id").eq("claimed_by_vendor_id", uid);
  const vendorIds = (myVendors ?? []).map((v: { vendor_id: string }) => v.vendor_id);
  if (vendorIds.length) {
    await attempt("quote_requests (to my vendors)", () => admin.from("quote_requests").delete().in("vendor_id", vendorIds));
    await attempt("reviews (of my vendors)", () => admin.from("reviews").delete().in("vendor_id", vendorIds));
    await attempt("favorites (of my vendors)", () => admin.from("favorites").delete().in("vendor_id", vendorIds));
    await attempt("vendors", () => admin.from("vendors").delete().in("vendor_id", vendorIds));
  }

  // The user's own activity
  await attempt("quote_requests (sent)", () => admin.from("quote_requests").delete().eq("requester_id", uid));
  await attempt("reviews (written)", () => admin.from("reviews").delete().eq("author_id", uid));
  await attempt("favorites", () => admin.from("favorites").delete().eq("user_id", uid));
  await attempt("profiles", () => admin.from("profiles").delete().eq("id", uid));

  const { error: delErr } = await admin.auth.admin.deleteUser(uid);
  if (delErr) return json({ error: delErr.message }, 500);

  return json({ ok: true });
});
