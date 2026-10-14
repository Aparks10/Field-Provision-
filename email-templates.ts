// email-templates.ts — branded HTML for the quote-request emails.
//
// How to use: open your existing "notify-vendor-of-quote" function in Supabase
// (Edge Functions), paste these two functions at the top of it, and use their
// return values as the `html` field you already pass to Resend. Send me the
// function's current code and I'll wire it in for you.
//
// Inline styles only (email apps ignore <style> blocks).

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
export function vendorEmailHtml(p: {
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
export function coachEmailHtml(p: { coachName: string; vendorNames: string[]; sport?: string }) {
  const list = p.vendorNames.map((n) => `<li style="margin:2px 0;">${esc(n)}</li>`).join("");
  const body = `
    <p style="margin:0 0 14px;font-size:15px;line-height:1.55;">Hi ${esc(p.coachName)}, your request${p.sport ? ` for <strong>${esc(p.sport)}</strong>` : ""} was sent to:</p>
    <ul style="margin:0 0 18px;padding-left:20px;font-size:15px;">${list}</ul>
    <p style="margin:0 0 20px;font-size:14.5px;line-height:1.55;">Vendors reply to you directly by email. You can track every request in the app.</p>
    <p style="margin:0;">${button(SITE + "/?tab=requests", "View my requests")}</p>`;
  return shell("Your quote request was sent", body, "You're receiving this because you sent a quote request on Field Provisions.");
}
