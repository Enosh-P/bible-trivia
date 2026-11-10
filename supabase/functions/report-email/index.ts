// Supabase Edge Function: emails each new player report to the admin.
// Triggered by a Database Webhook on INSERT into public.question_reports.
//
// Secrets (Supabase → Edge Functions → Secrets, or `supabase secrets set`):
//   ADMIN_EMAIL     where reports go
//   RESEND_API_KEY  from resend.com (free tier is plenty)
//   REPORT_FROM     optional sender, e.g. "Bible Trivia <reports@yourdomain.com>"
//                   (defaults to Resend's test sender, which can only mail your own address)
//   WEBHOOK_SECRET  any long random string; also set as the webhook's x-webhook-secret header
// SUPABASE_URL and SUPABASE_SECRET_KEYS (or the legacy SUPABASE_SERVICE_ROLE_KEY) are provided automatically.

interface Report {
  id: number;
  question_id: string;
  kind: string;
  category: string;
  lang: string;
  reason: string | null;
  contact: string | null;
  snapshot: Record<string, unknown> | null;
  app_version: string | null;
  created_at: string;
}

const CATEGORY: Record<string, string> = {
  wrong_answer: 'Wrong answer',
  typo: 'Spelling / typo',
  tamil: 'Tamil translation',
  confusing: 'Confusing question',
  other: 'Other',
};

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function render(r: Report): { subject: string; html: string; text: string } {
  const snap = r.snapshot ?? {};
  const rows = Object.entries(snap)
    .map(([k, v]) => `<tr><td style="padding:4px 10px 4px 0;color:#667;vertical-align:top">${esc(k)}</td><td style="padding:4px 0">${esc(typeof v === 'string' ? v : JSON.stringify(v))}</td></tr>`)
    .join('');
  const subject = `Report: ${CATEGORY[r.category] ?? r.category} · ${r.question_id}`;
  const html = `<div style="font-family:system-ui,sans-serif;max-width:640px">
  <h2 style="margin:0 0 8px">${esc(CATEGORY[r.category] ?? r.category)}</h2>
  <p style="margin:0 0 12px;color:#556">${esc(r.kind)} <b>${esc(r.question_id)}</b> · language ${esc(r.lang)} · ${esc(new Date(r.created_at).toUTCString())}</p>
  ${r.reason ? `<p style="padding:12px;background:#f2f4f7;border-radius:8px">${esc(r.reason)}</p>` : ''}
  <table style="border-collapse:collapse;font-size:14px">${rows}</table>
  ${r.contact ? `<p>Player contact: ${esc(r.contact)}</p>` : ''}
  <p style="color:#889;font-size:12px">Report #${r.id}${r.app_version ? ` · app ${esc(r.app_version)}` : ''}. Fix the question in Supabase → questions, then set this report's status to fixed or dismissed.</p>
</div>`;
  const text = `${subject}\n\n${r.reason ?? ''}\n\n${JSON.stringify(snap, null, 2)}\n\nContact: ${r.contact ?? '-'}\nReport #${r.id}`;
  return { subject, html, text };
}

/** The project's default secret key (new format), or the legacy service_role key. */
function secretKey(): string | undefined {
  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}') as Record<string, string>;
    if (keys.default) return keys.default;
  } catch {
    /* not set */
  }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? undefined;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });
  const secret = Deno.env.get('WEBHOOK_SECRET');
  if (!secret || req.headers.get('x-webhook-secret') !== secret) return new Response('unauthorized', { status: 401 });

  const payload = await req.json().catch(() => null);
  const report = payload?.record as Report | undefined;
  if (payload?.type !== 'INSERT' || payload?.table !== 'question_reports' || !report) {
    return new Response('ignored', { status: 200 });
  }

  const to = Deno.env.get('ADMIN_EMAIL');
  const key = Deno.env.get('RESEND_API_KEY');
  if (!to || !key) return new Response('ADMIN_EMAIL / RESEND_API_KEY not set', { status: 500 });

  const { subject, html, text } = render(report);
  const sent = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: Deno.env.get('REPORT_FROM') ?? 'Bible Trivia <onboarding@resend.dev>',
      to: [to],
      subject,
      html,
      text,
      ...(report.contact?.includes('@') ? { reply_to: report.contact } : {}),
    }),
  });
  if (!sent.ok) return new Response(`email failed: ${sent.status} ${await sent.text()}`, { status: 502 });

  // Record that the admin was told.
  const url = Deno.env.get('SUPABASE_URL');
  const secret = secretKey();
  if (url && secret) {
    await fetch(`${url}/rest/v1/question_reports?id=eq.${report.id}`, {
      method: 'PATCH',
      // New secret keys are not JWTs: send them in the apikey header only.
      headers: { apikey: secret, 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailed_at: new Date().toISOString() }),
    }).catch(() => {});
  }
  return new Response('sent', { status: 200 });
});
