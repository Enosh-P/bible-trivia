#!/usr/bin/env node
// Builds the Supabase Auth email templates (supabase/templates/*.html) from one
// shared layout: bilingual (Tamil + English), the app's colours, no images, inline
// styles only (what email apps support). Run: npm run emails
//
// Paste each file into Supabase → Authentication → Emails → Templates, with the
// subject listed in supabase/templates/README.md (also generated here).

import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = new URL('../supabase/templates/', import.meta.url);
const C = { bg: '#f1f3f5', card: '#ffffff', text: '#11181c', text2: '#5c656d', line: '#e3e7eb', green: '#3ecf8e', onGreen: '#0b2a1c', greenInk: '#1e8a5a', red: '#ce2c31' };
const FONT = "-apple-system, 'Segoe UI', Roboto, 'Noto Sans Tamil', 'Latha', Arial, sans-serif";

function button(url, en, ta) {
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0 8px"><tr><td style="border-radius:999px;background:${C.green}">
<a href="${url}" style="display:inline-block;padding:13px 24px;border-radius:999px;background:${C.green};color:${C.onGreen};font-family:${FONT};font-size:16px;font-weight:600;line-height:1.3;text-align:center;text-decoration:none">${ta} · ${en}</a>
</td></tr></table>`;
}

function code(token) {
  return `<p style="margin:20px 0 6px;font-family:${FONT};font-size:30px;font-weight:700;letter-spacing:6px;color:${C.greenInk}">${token}</p>`;
}

function layout({ preheader, tamil, english, action = '', footnoteTa, footnoteEn, warning = false }) {
  const p = (s) => `<p style="margin:0 0 12px;font-family:${FONT};font-size:15px;line-height:1.6;color:${C.text}">${s}</p>`;
  const small = (s) => `<p style="margin:0 0 6px;font-family:${FONT};font-size:13px;line-height:1.5;color:${C.text2}">${s}</p>`;
  return `<!doctype html>
<html lang="ta"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>Bible Trivia</title></head>
<body style="margin:0;padding:0;background:${C.bg}">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${preheader}</span>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${C.bg}"><tr><td align="center" style="padding:28px 14px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:520px">
<tr><td style="padding:0 6px 14px;font-family:${FONT};font-size:15px;font-weight:700;color:${C.text}">
<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${C.green};margin-right:8px"></span>வேத வினாடி வினா · Bible Trivia</td></tr>
<tr><td style="background:${C.card};border:1px solid ${C.line};border-radius:18px;padding:26px 24px${warning ? `;border-top:4px solid ${C.red}` : ''}">
${tamil.map(p).join('\n').replace(/<p /g, '<p lang="ta" ')}
<hr style="border:0;border-top:1px solid ${C.line};margin:16px 0">
${english.map(p).join('\n')}
${action}
${footnoteTa ? small(footnoteTa).replace('<p ', '<p lang="ta" ') : ''}${footnoteEn ? small(footnoteEn) : ''}
</td></tr>
<tr><td style="padding:16px 6px;font-family:${FONT};font-size:12px;line-height:1.5;color:${C.text2}">
உங்களுக்குச் சமாதானம் · Peace be with you<br>
<a href="{{ .SiteURL }}" style="color:${C.greenInk}">{{ .SiteURL }}</a>
</td></tr>
</table></td></tr></table></body></html>
`;
}

const ignoreTa = 'இதை நீங்கள் கேட்கவில்லை என்றால், இந்த மின்னஞ்சலைப் புறக்கணிக்கலாம்.';
const ignoreEn = "If you didn't ask for this, you can ignore this email.";
const notYouTa = 'இதைச் செய்தது நீங்கள் இல்லையென்றால், உடனே உங்கள் கடவுச்சொல்லை மாற்றுங்கள்.';
const notYouEn = "If this wasn't you, change your password right away.";

const templates = [
  // ---------- Authentication ----------
  {
    file: 'confirm-signup.html', where: 'Confirm sign up',
    subject: 'உங்கள் கணக்கை உறுதிசெய்யுங்கள் · Confirm your Bible Trivia account',
    html: layout({
      preheader: 'One tap to finish creating your account.',
      tamil: ['வணக்கம்!', 'வேத வினாடி வினாவில் சேர்ந்ததற்கு நன்றி. உங்கள் கணக்கை முடிக்க கீழே உள்ள பொத்தானைத் தொடுங்கள்.'],
      english: ['Welcome!', 'Thanks for joining Bible Trivia. Tap the button to finish creating your account.'],
      action: button('{{ .ConfirmationURL }}', 'Confirm', 'உறுதிசெய்'),
      footnoteTa: ignoreTa, footnoteEn: ignoreEn,
    }),
  },
  {
    file: 'invite.html', where: 'Invite user',
    subject: 'வேத வினாடி வினாவுக்கு அழைப்பு · You are invited to Bible Trivia',
    html: layout({
      preheader: 'Join Bible Trivia: questions in Tamil and English, play with family.',
      tamil: ['உங்களுக்கு ஒரு அழைப்பு!', 'தமிழிலும் ஆங்கிலத்திலும் வேதாகமக் கேள்விகள், குடும்பத்தோடு சவால்கள். சேர கீழே உள்ள பொத்தானைத் தொடுங்கள்.'],
      english: ["You're invited!", 'Bible questions in Tamil and English, and challenges with your family. Tap the button to join.'],
      action: button('{{ .ConfirmationURL }}', 'Join', 'சேர்'),
      footnoteTa: ignoreTa, footnoteEn: ignoreEn,
    }),
  },
  {
    file: 'magic-link.html', where: 'Magic link',
    subject: 'உள்நுழைவு இணைப்பு · Your Bible Trivia sign-in link',
    html: layout({
      preheader: 'Tap to sign in. No password needed.',
      tamil: ['உள்நுழைய கீழே உள்ள பொத்தானைத் தொடுங்கள். கடவுச்சொல் தேவையில்லை.', 'அல்லது இந்தக் குறியீட்டை உள்ளிடுங்கள்:'],
      english: ['Tap the button to sign in. No password needed.', 'Or enter this code:'],
      action: code('{{ .Token }}') + button('{{ .ConfirmationURL }}', 'Sign in', 'உள்நுழை'),
      footnoteTa: 'இந்த இணைப்பு சிறிது நேரத்தில் காலாவதியாகும். ' + ignoreTa, footnoteEn: 'This link expires soon. ' + ignoreEn,
    }),
  },
  {
    file: 'change-email.html', where: 'Change email address',
    subject: 'புதிய மின்னஞ்சலை உறுதிசெய்யுங்கள் · Confirm your new email',
    html: layout({
      preheader: 'Confirm the change to your Bible Trivia email address.',
      tamil: ['உங்கள் மின்னஞ்சலை <b>{{ .Email }}</b> இலிருந்து <b>{{ .NewEmail }}</b> க்கு மாற்ற உறுதிசெய்யுங்கள்.'],
      english: ['Confirm changing your email from <b>{{ .Email }}</b> to <b>{{ .NewEmail }}</b>.'],
      action: button('{{ .ConfirmationURL }}', 'Confirm', 'உறுதிசெய்'),
      footnoteTa: notYouTa, footnoteEn: notYouEn,
    }),
  },
  {
    file: 'reset-password.html', where: 'Reset password',
    subject: 'கடவுச்சொல்லை மாற்றுங்கள் · Reset your Bible Trivia password',
    html: layout({
      preheader: 'Tap to choose a new password.',
      tamil: ['கடவுச்சொல் மறந்துவிட்டதா? பரவாயில்லை.', 'கீழே உள்ள பொத்தானைத் தொடுங்கள்; செயலி திறந்து புதிய கடவுச்சொல்லைக் கேட்கும்.'],
      english: ['Forgot your password? No problem.', 'Tap the button; the app opens and asks you for a new password.'],
      action: button('{{ .ConfirmationURL }}', 'New password', 'புதிய கடவுச்சொல்'),
      footnoteTa: 'இந்த இணைப்பு ஒருமுறை மட்டுமே வேலை செய்யும், சிறிது நேரத்தில் காலாவதியாகும். ' + ignoreTa,
      footnoteEn: 'This link works once and expires soon. ' + ignoreEn,
    }),
  },
  {
    file: 'reauthentication.html', where: 'Reauthentication',
    subject: 'உறுதிப்படுத்தும் குறியீடு · Your Bible Trivia confirmation code',
    html: layout({
      preheader: 'Your code to confirm this change.',
      tamil: ['இந்த மாற்றத்தை உறுதிசெய்ய இந்தக் குறியீட்டை உள்ளிடுங்கள்:'],
      english: ['Enter this code to confirm the change:'],
      action: code('{{ .Token }}'),
      footnoteTa: notYouTa, footnoteEn: notYouEn,
    }),
  },
  // ---------- Security notifications (turn each on in the dashboard) ----------
  {
    file: 'notify-password-changed.html', where: 'Security notification: Password changed', warning: true,
    subject: 'உங்கள் கடவுச்சொல் மாற்றப்பட்டது · Your password was changed',
    html: layout({
      warning: true,
      preheader: 'Your Bible Trivia password was just changed.',
      tamil: ['<b>{{ .Email }}</b> கணக்கின் கடவுச்சொல் இப்போது மாற்றப்பட்டது.'],
      english: ['The password for <b>{{ .Email }}</b> was just changed.'],
      footnoteTa: 'இதைச் செய்தது நீங்கள் இல்லையென்றால், செயலியில் "கடவுச்சொல் மறந்ததா?" பயன்படுத்தி உடனே மாற்றுங்கள்.',
      footnoteEn: 'If this wasn\'t you, use "Forgot password?" in the app to change it right away.',
    }),
  },
  {
    file: 'notify-email-changed.html', where: 'Security notification: Email address changed', warning: true,
    subject: 'உங்கள் மின்னஞ்சல் மாற்றப்பட்டது · Your email address was changed',
    html: layout({
      warning: true,
      preheader: 'The email on your Bible Trivia account was changed.',
      tamil: ['உங்கள் கணக்கின் மின்னஞ்சல் <b>{{ .OldEmail }}</b> இலிருந்து <b>{{ .Email }}</b> க்கு மாற்றப்பட்டது.'],
      english: ['Your account email was changed from <b>{{ .OldEmail }}</b> to <b>{{ .Email }}</b>.'],
      footnoteTa: notYouTa, footnoteEn: notYouEn,
    }),
  },
  {
    file: 'notify-phone-changed.html', where: 'Security notification: Phone number changed', warning: true,
    subject: 'உங்கள் தொலைபேசி எண் மாற்றப்பட்டது · Your phone number was changed',
    html: layout({
      warning: true,
      preheader: 'The phone number on your Bible Trivia account was changed.',
      tamil: ['உங்கள் கணக்கின் தொலைபேசி எண் <b>{{ .Phone }}</b> ஆக மாற்றப்பட்டது.'],
      english: ['The phone number on your account was changed to <b>{{ .Phone }}</b>.'],
      footnoteTa: notYouTa, footnoteEn: notYouEn,
    }),
  },
  {
    file: 'notify-identity-linked.html', where: 'Security notification: Identity linked', warning: true,
    subject: 'புதிய உள்நுழைவு முறை சேர்க்கப்பட்டது · A new sign-in method was added',
    html: layout({
      warning: true,
      preheader: 'A sign-in method was linked to your Bible Trivia account.',
      tamil: ['உங்கள் கணக்கில் <b>{{ .Provider }}</b> உள்நுழைவு சேர்க்கப்பட்டது.'],
      english: ['<b>{{ .Provider }}</b> sign-in was linked to your account.'],
      footnoteTa: notYouTa, footnoteEn: notYouEn,
    }),
  },
  {
    file: 'notify-identity-unlinked.html', where: 'Security notification: Identity unlinked', warning: true,
    subject: 'உள்நுழைவு முறை நீக்கப்பட்டது · A sign-in method was removed',
    html: layout({
      warning: true,
      preheader: 'A sign-in method was removed from your Bible Trivia account.',
      tamil: ['உங்கள் கணக்கிலிருந்து <b>{{ .Provider }}</b> உள்நுழைவு நீக்கப்பட்டது.'],
      english: ['<b>{{ .Provider }}</b> sign-in was removed from your account.'],
      footnoteTa: notYouTa, footnoteEn: notYouEn,
    }),
  },
  {
    file: 'notify-mfa-enrolled.html', where: 'Security notification: MFA factor enrolled', warning: true,
    subject: 'இரண்டு-படி பாதுகாப்பு சேர்க்கப்பட்டது · Two-step sign-in was added',
    html: layout({
      warning: true,
      preheader: 'A two-step sign-in method was added to your account.',
      tamil: ['உங்கள் கணக்கில் இரண்டு-படி உள்நுழைவு (<b>{{ .FactorType }}</b>) சேர்க்கப்பட்டது.'],
      english: ['A two-step sign-in method (<b>{{ .FactorType }}</b>) was added to your account.'],
      footnoteTa: notYouTa, footnoteEn: notYouEn,
    }),
  },
  {
    file: 'notify-mfa-unenrolled.html', where: 'Security notification: MFA factor unenrolled', warning: true,
    subject: 'இரண்டு-படி பாதுகாப்பு நீக்கப்பட்டது · Two-step sign-in was removed',
    html: layout({
      warning: true,
      preheader: 'A two-step sign-in method was removed from your account.',
      tamil: ['உங்கள் கணக்கிலிருந்து இரண்டு-படி உள்நுழைவு (<b>{{ .FactorType }}</b>) நீக்கப்பட்டது.'],
      english: ['A two-step sign-in method (<b>{{ .FactorType }}</b>) was removed from your account.'],
      footnoteTa: notYouTa, footnoteEn: notYouEn,
    }),
  },
];

mkdirSync(OUT, { recursive: true });
for (const t of templates) writeFileSync(new URL(t.file, OUT), t.html);

const rows = templates.map((t) => `| ${t.where} | \`${t.file}\` | ${t.subject} |`).join('\n');
writeFileSync(
  new URL('README.md', OUT),
  `# Email templates (Supabase Auth)

Generated by \`npm run emails\` (scripts/build-email-templates.mjs). Edit the script, not these files.
Every email is bilingual (Tamil first, then English), in the app's colours, with no images.

## Where to paste them
Supabase → **Authentication → Emails → Templates**. For each one, set the subject, paste the whole file into the message body (Source), check the preview, then **Save**.
The *Security notification* emails are off by default: open each one, turn it on, then paste.

| Dashboard template | File | Subject |
|---|---|---|
${rows}

## Which ones the app uses today
- **Reset password**: "Forgot password?" on the sign-in form. The link opens the app on a "Set a new password" screen.
- **Confirm sign up**: only if "Confirm email" is on (Authentication → Sign In / Providers → Email).
- The others are ready for later (magic links, changing email, invites, two-step sign-in) and for security notices.

## Emails reaching your family (important)
Supabase's built-in sender only delivers to **your project's team members**, and only a few emails per hour. Family members won't receive reset or confirmation emails until you connect your own sender:

**Free, no domain needed: Gmail SMTP**
1. Turn on 2-Step Verification on the Gmail account you want to send from.
2. Google Account → Security → **App passwords** → create one named "Supabase".
3. Supabase → Authentication → Emails → **SMTP Settings** → Enable custom SMTP:
   - Sender email: that Gmail address · Sender name: \`Bible Trivia\`
   - Host \`smtp.gmail.com\`, port \`465\`, username: the Gmail address, password: the 16-letter app password
4. Raise **Authentication → Rate Limits → emails per hour** from the low default (for example to 30).

Gmail allows about 500 emails a day: plenty for a family app. Later, with your own domain, a service like Resend works the same way (host \`smtp.resend.com\`).

## Links
Set **Authentication → URL Configuration → Site URL** to the app's address and add it under **Redirect URLs** (\`http://localhost:5173/**\` now, the hosted address later). Email links open there.
`,
);
console.log(`wrote ${templates.length} templates + README to supabase/templates/`);
