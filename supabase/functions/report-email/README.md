# Report emails

Every report a player sends is stored in `question_reports` and emailed to the admin.

## One-time setup (about 10 minutes)

1. **Email service:** create a free account at [resend.com](https://resend.com), then create an API key.
   Without your own domain, Resend can only send to the address you signed up with. That's fine if the admin is you.
2. **Deploy the function** (Supabase CLI):
   ```bash
   supabase functions deploy report-email --no-verify-jwt
   supabase secrets set ADMIN_EMAIL=you@example.com RESEND_API_KEY=re_... WEBHOOK_SECRET=$(openssl rand -hex 24)
   ```
   Or in the dashboard: Edge Functions → Deploy a new function → paste `index.ts`, then Secrets → add the same values.
3. **Connect it to new reports:** Supabase → Database → Webhooks → Create:
   - Table `question_reports`, event **Insert**
   - Type **Supabase Edge Functions** → `report-email`, method POST
   - HTTP header `x-webhook-secret` = the same `WEBHOOK_SECRET`

Test it by tapping the flag on any question in the app.

The function finds the project's secret key by itself (`SUPABASE_SECRET_KEYS`, provided by Supabase), so there's no key to copy for that.

## Handling reports

- Open reports: SQL editor → `select * from open_reports;`
- Fix the question in Table editor → `questions`, then set the report's `status` to `fixed` (or `dismissed`).
- Each email has a link back to the question id and shows exactly what the player saw.

## Before Supabase is connected

If the app has no Supabase settings yet but `VITE_ADMIN_EMAIL` is set in `.env`, the report button opens the player's email app with the report already filled in.
