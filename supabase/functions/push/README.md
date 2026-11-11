# Push notifications

What people can get (each one switchable in Settings → Notifications, in Tamil or English):

| Notification | When |
|---|---|
| Verse of the Day | at the hour they choose (default 7 am, their own time zone) |
| Daily Challenge reminder | at the hour they choose (default 7 pm), only if they haven't played today |
| Streak about to end | 8 pm, only if they have a 2+ day streak and haven't played today |
| Friend request / request accepted | right away |
| New challenge / challenge finished (with the winner) | right away |

Works on Android, Windows/Mac browsers, and iPhone/iPad (iOS 16.4+) once the app is added to the Home Screen.

## Setup (one time, about 15 minutes)

**1. Make a key pair** (on your computer, in the project folder):
```bash
npm run push:keys
```
It prints a **Public Key** and a **Private Key**.
- Public key → `.env.local` as `VITE_VAPID_PUBLIC_KEY=...` (and later in your host's environment variables).
- Private key → only into Supabase secrets (next step). Never commit it.

**2. Run `supabase/setup.sql`** in the SQL Editor again (adds the notification tables; safe to re-run).

**3. Deploy the function and its secrets:**
```bash
supabase functions deploy push --no-verify-jwt
supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:you@example.com WEBHOOK_SECRET=...
```
(Or in the dashboard: Edge Functions → Deploy new function → name `push` → paste `index.ts`; turn **off** "Verify JWT"; then Edge Functions → Secrets.) `WEBHOOK_SECRET` can be the same one the report-email function uses.

**4. Daily schedule (Supabase Cron):** Integrations → **Cron** → enable → Create job:
- Name `push-scheduled`, schedule `*/30 * * * *` (every 30 minutes)
- Type **Supabase Edge Function** → `push`, method POST
- Header `x-webhook-secret` = your WEBHOOK_SECRET
- Body `{"task":"scheduled"}`

**5. Instant friend notifications:** Database → **Webhooks** → Create:
- Table `notification_queue`, event **Insert**
- Type **Supabase Edge Functions** → `push`, method POST, header `x-webhook-secret` = your WEBHOOK_SECRET

**6. Try it:** `npm run dev`, sign in, Settings → Notifications → turn on → **Send a test**. Then send a friend request from another account and watch it arrive.

## How it works
- The phone's subscription is saved in `push_subscriptions`; choices, language and time zone in `notification_prefs`.
- Friend and challenge events are added to `notification_queue` by database triggers.
- Every 30 minutes the cron job asks `queue_scheduled_notifications()` which daily messages are due in each person's own time zone (at most one of each kind a day), then sends everything waiting.
- Phones that were uninstalled or turned notifications off are removed automatically.
