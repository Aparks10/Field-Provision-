// Supabase Edge Function: notify-vendor-of-quote  (branded emails version)
// Fires when a new row is inserted into quote_requests (Database Webhook).
// Pro vendors are emailed immediately; Free vendors are emailed ~20 min later by
// send-delayed-vendor-notifications. The coach confirmation always goes out right away.
// Same logic as before; only the email HTML changed (and user text is now escaped).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const FROM_EMAIL = 'Field Provisions <hello@fieldprovisions.app>';

// ---------- Branded email templates ----------
const BRAND = { green: "#3B5D3A", ink: "#1B2430", gray: "#DCDEE1", muted: "#6C7075" };
const SITE = "https://fieldprovisions.app";

const esc = (v: unknown) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

function shell(title: string, body: string, footerNote: string) {
  return `<!doctype html><html><body style="margin:0;background:${BRAND.gray};font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${BRAND.ink};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.gray};padding:24px 12px;"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;">
      <tr><td style="padding:20px 28px;border-bottom:4px solid ${BRAND.green};">
        <img src="${SITE}/icon-192.png" width="40" height="40" alt="" style="vertical-align:middle;border-radius:8px;">
        <span style="font-size:18px;font-weight:700;letter-spacing:.02em;margin-left:10px;vertical-align:middle;text-transform:uppercase;">Field Provisions</span>
      </td></tr>
      <tr><td style="padding:28px;">
        <h1 style="margin:0 0 14px;font-size:21px;line-height:1.25;">${title}</h1>
        ${body}
      </td></tr>
      <tr><td style="padding:18px 28px;background:#F4F5F2;font-size:12.5px;line-height:1.5;color:${BRAND.muted};">
        ${footerNote}<br>Field Provisions &mdash; The team behind your team. <a href="${SITE}" style="color:${BRAND.green};">fieldprovisions.app</a>
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
}

const row = (label: string, value: unknown) =>
  value ? `<tr><td style="padding:6px 14px 6px 0;color:${BRAND.muted};font-size:14px;vertical-align:top;white-space:nowrap;">${label}</td><td style="padding:6px 0;font-size:14px;">${esc(value)}</td></tr>` : "";

const button = (href: string, label: string) =>
  `<a href="${esc(href)}" style="display:inline-block;background:${BRAND.green};color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:8px;">${label}</a>`;

// Email to the VENDOR when a coach sends a quote request.
function vendorEmailHtml(p: {
  vendorName: string; coachName: string; coachOrg?: string; coachEmail?: string;
  sport?: string; neededBy?: string; budget?: string | number; details: string;
}) {
  const body = `
    <p style="margin:0 0 16px;font-size:15px;line-height:1.55;">Hi ${esc(p.vendorName)}, <strong>${esc(p.coachName)}</strong>${p.coachOrg ? ` from ${esc(p.coachOrg)}` : ""} asked for a quote.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
      ${row("Sport", p.sport)}${row("Needed by", p.neededBy)}${row("Budget", p.budget ? "$" + p.budget : "")}
    </table>
    <div style="background:#F4F5F2;border-radius:8px;padding:14px 16px;font-size:14.5px;line-height:1.55;margin:0 0 20px;white-space:pre-wrap;">${esc(p.details)}</div>
    <p style="margin:0 0 20px;">${button(p.coachEmail ? "mailto:" + p.coachEmail : SITE, p.coachEmail ? "Reply to " + esc(p.coachName) : "View request")}</p>
    <p style="margin:0;font-size:13.5px;color:${BRAND.muted};line-height:1.5;">After you reply, open <a href="${SITE}" style="color:${BRAND.green};">Field Provisions</a> &rarr; My Requests and tap &ldquo;Quote Sent&rdquo; so the coach knows you responded.</p>`;
  return shell("New quote request", body, "You're receiving this because a coach contacted your Field Provisions listing.");
}

// Confirmation email to the COACH after sending a request.
function coachEmailHtml(p: { coachName: string; vendorName: string; vendorEmail?: string | null; vendorPhone?: string | null; sport?: string }) {
  const body = `
    <p style="margin:0 0 14px;font-size:15px;line-height:1.55;">Hi ${esc(p.coachName)}, we let <strong>${esc(p.vendorName)}</strong> know you're looking for ${p.sport ? `<strong>${esc(p.sport)}</strong>` : "their services"}. They have your contact info and will reach out by email.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 18px;">
      ${row("Email", p.vendorEmail)}${row("Phone", p.vendorPhone)}
    </table>
    <p style="margin:0 0 20px;">${p.vendorEmail ? button("mailto:" + p.vendorEmail, "Email " + esc(p.vendorName)) : button(SITE, "Open Field Provisions")}</p>
    <p style="margin:0;font-size:13.5px;color:${BRAND.muted};line-height:1.5;">Track this request any time in <a href="${SITE}" style="color:${BRAND.green};">Field Provisions</a> &rarr; My Requests.</p>`;
  return shell("Your quote request was sent", body, "You're receiving this because you sent a quote request on Field Provisions.");
}

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html, reply_to: 'Fieldprovisionsapp@gmail.com' }),
  });
  if (!res.ok) {
    console.error('Resend failed:', await res.text());
    return false;
  }
  return true;
}

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const newRequest = payload.record;
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const { data: vendor, error: vendorError } = await supabase
      .from('vendors')
      .select('business_name, email, phone_number, claimed_by_vendor_id, account_tier')
      .eq('vendor_id', newRequest.vendor_id)
      .single();
    if (vendorError || !vendor) {
      return new Response(JSON.stringify({ skipped: 'vendor not found' }), { status: 200 });
    }

    let vendorEmail = vendor.email;
    if (!vendorEmail && vendor.claimed_by_vendor_id) {
      const { data: ownerProfile } = await supabase
        .from('profiles').select('email').eq('id', vendor.claimed_by_vendor_id).single();
      vendorEmail = ownerProfile ? ownerProfile.email : null;
    }

    const { data: requester } = await supabase
      .from('profiles')
      .select('full_name, email, phone, school_or_organization')
      .eq('id', newRequest.requester_id)
      .single();

    const requesterName = requester?.full_name || 'A coach';
    const requesterEmail = requester?.email || null;

    let sentToVendorNow = false;
    if (vendorEmail && vendor.account_tier === 'pro') {
      const html = vendorEmailHtml({
        vendorName: vendor.business_name,
        coachName: requesterName,
        coachOrg: requester?.school_or_organization || undefined,
        coachEmail: requesterEmail || undefined,
        sport: newRequest.sport,
        neededBy: newRequest.needed_by,
        budget: newRequest.budget,
        details: newRequest.details,
      });
      sentToVendorNow = await sendEmail(vendorEmail, `New quote request from ${requesterName}`, html);
      if (sentToVendorNow) {
        await supabase.from('quote_requests')
          .update({ vendor_notified_at: new Date().toISOString() })
          .eq('request_id', newRequest.request_id);
      }
    }

    if (requesterEmail) {
      const html = coachEmailHtml({
        coachName: requesterName,
        vendorName: vendor.business_name,
        vendorEmail,
        vendorPhone: vendor.phone_number,
        sport: newRequest.sport,
      });
      await sendEmail(requesterEmail, `We've notified ${vendor.business_name} about your request`, html);
    }

    return new Response(JSON.stringify({ sent_to_vendor_now: sentToVendorNow, sent_to_coach: !!requesterEmail }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
  }
});
