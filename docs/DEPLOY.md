# Putting Bible Trivia online (Cloudflare Pages)

Free hosting with HTTPS, unlimited visitors and bandwidth, and automatic updates:
every `git push` to `main` publishes the new version in about two minutes.

## 1. Create the site (once, about 10 minutes)

1. Sign up or sign in at **dash.cloudflare.com** (the free plan is enough).
2. **Workers & Pages → Create → Pages → Connect to Git.**
3. Allow Cloudflare to see your GitHub account, then pick **Enosh-P/bible-trivia**.
4. **Project name:** `bible-trivia`. This becomes the address `https://bible-trivia.pages.dev`
   (if the name is taken, Cloudflare adds a few letters; you can use any name).
5. **Build settings:**

   | Setting | Value |
   |---|---|
   | Production branch | `main` |
   | Framework preset | `None` (or `React (Vite)`) |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
   | Root directory | leave empty |

6. **Environment variables** (open "Environment variables (advanced)"), the same values as in your `.env.local`:

   | Name | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | `https://<your-ref>.supabase.co` |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` |
   | `VITE_VAPID_PUBLIC_KEY` | your VAPID public key (for notifications) |
   | `VITE_ADMIN_EMAIL` | optional |

   Only these `VITE_` values. **Never** add `SUPABASE_SECRET_KEY` or the VAPID private key here:
   anything starting with `VITE_` is visible to anyone who opens the app.
   Node 22 is picked up from the `.node-version` file.
7. **Save and Deploy.** When it finishes, open `https://bible-trivia.pages.dev`.

Changed a variable later? Settings → Environment variables, then **Deployments → ⋯ → Retry deployment**
(the values are built into the app, so a new build is needed).

### Cloudflare showed "Set up your application" with `npx wrangler deploy`?

That's the newer **Workers** setup, which Cloudflare now offers first. It works the same way
(the project's `wrangler.jsonc` tells it to serve the built app):

| Setting | Value |
|---|---|
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` (already filled in) |
| Advanced settings → **Build variables** | the `VITE_` values from the table above |

The address is then `https://bible-trivia.<your-account>.workers.dev`. A custom domain goes under
the Worker's **Settings → Domains & Routes → Add → Custom domain**. Use that address in step 2.

## 2. Tell Supabase and Google about the new address

Sign-in, password reset and Google sign-in only work on addresses they know.

**Supabase → Authentication → URL Configuration**
- **Site URL:** `https://bible-trivia.pages.dev` (password-reset and confirmation emails link here)
- **Redirect URLs:** add `https://bible-trivia.pages.dev/**` (keep `http://localhost:5173/**` for testing)

**Google Cloud Console → APIs & Services → Credentials → your OAuth client**
- **Authorized JavaScript origins:** add `https://bible-trivia.pages.dev`
- **Authorized redirect URIs:** no change (it stays the Supabase `/auth/v1/callback` address)

Then test on a phone: open the address, tap **Install**, sign in with Google, play a round,
open Friends → **My QR** and scan it from a second phone, and turn on notifications in Settings.

## 3. A custom domain (optional)

**Free:** the `*.pages.dev` address is free forever, with HTTPS. There's no longer a reliable free
custom domain (the old free providers have closed); free subdomain services like eu.org exist but
can take weeks to approve.

**Cheap (recommended if you want your own name):** about US$10 a year for a `.com`.
Cloudflare Registrar sells domains at cost, with no markup.

### Domain bought at Cloudflare
1. Cloudflare → **Domain Registration → Register Domains**, search and buy (e.g. `vedaquiz.com`).
2. **Workers & Pages → bible-trivia → Custom domains → Set up a custom domain.**
3. Enter `vedaquiz.com` (or a subdomain like `app.vedaquiz.com`) → **Activate domain**.
   Cloudflare adds the DNS record and the HTTPS certificate itself (a few minutes).

### Domain bought elsewhere (GoDaddy, Namecheap, Hostinger…)
- **Whole domain** (`vedaquiz.com`): in Cloudflare **Add a site** → enter the domain → Free plan →
  Cloudflare shows two nameservers → set those at your registrar (replacing theirs) → wait until
  Cloudflare says "Active" (minutes to a day) → then step 2–3 above.
- **Only a subdomain** (`quiz.mydomain.com`): in Pages **Custom domains** enter it first, then at your
  registrar add a **CNAME** record: name `quiz`, target `bible-trivia.pages.dev`.

### After adding a domain
Repeat step 2 with the new address (Supabase Site URL and Redirect URLs, Google JavaScript origins).
The `pages.dev` address keeps working too.

**Choose the final address before sharing the app.** An installed app belongs to its address: if it
moves later, people reinstall, and things kept only on the phone (practice history, saved
questions, memory verses) stay with the old address. Accounts, XP, streaks and friends are in
Supabase and follow them.

## Everyday use

- Change something → `git push` → live in about two minutes. Installed apps show
  **"New version ready – Reload"** the next time they're opened.
- **Deployments** in Cloudflare lists every version; **⋯ → Rollback** restores an older one instantly.
- Pushes to other branches get their own preview address, handy for trying changes first.
