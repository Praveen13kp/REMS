# Website Forms — Setup Guide

> The simplest integration. Drop a webhook URL into any form builder (WordPress, Webflow, Elementor, Typeform, custom HTML). Bizzfly captures the lead, validates it, and saves it.

**End result:** a unique webhook URL + signing secret for your site.

---

## How it works

1. You connect "Website Form" in Bizzfly → Bizzfly generates a **Webhook URL** and a **Signing Secret** for you
2. You paste those into your website's form integration settings
3. When someone fills your form, your site POSTs the form data to Bizzfly
4. Bizzfly verifies the signature, applies your field mapping, saves the lead, notifies you

No third-party developer accounts needed. No approval delays. Works immediately.

---

## Step 1 — Connect in Bizzfly

1. Bizzfly → **Settings → Integrations → Website Form → Connect**
2. Give it a label (e.g. "Main Website" or "Landing Page A")
3. Click **Save**
4. Bizzfly shows you:
   - **Webhook URL** — e.g. `https://app.bizzfly.com/api/webhooks/website/byo/abc123xyz789`
   - **Signing Secret** — e.g. `whsec_xyz...` (used to verify requests really came from your site, not an attacker)

Keep the Signing Secret private — anyone with it can submit fake leads.

---

## Step 2 — Configure field mapping in Bizzfly

Your form's field names won't match Bizzfly's exactly (e.g. your form might send `your-name` instead of `name`). Tell Bizzfly how to translate:

| Your form field | Bizzfly field |
|---|---|
| `your-name` | `name` |
| `mobile_no` | `phone` |
| `email_id` | `email` |
| `city_name` | `city` |
| `interested_in` | `notes` |

Add as many rows as needed. Anything not mapped goes into `notes` as raw JSON.

---

## Step 3 — Paste into your website

### WordPress (Contact Form 7 + plugin)

Install the **"CF7 to Webhook"** plugin.
1. Edit your Contact Form 7 form
2. New tab **"Webhook"** appears → enable it
3. Webhook URL: paste Bizzfly's URL
4. Headers section: add `x-bizzfly-signature: sha256=<computed at send time>`
   - Some CF7 webhook plugins compute HMAC for you automatically — paste the Signing Secret in the plugin's HMAC field. Otherwise see "manual HMAC" below.

### WordPress (WPForms)

WPForms Pro has webhooks built in.
1. Edit your form → **Settings → Webhooks → Add New Webhook**
2. Request URL: Bizzfly's webhook URL
3. Request method: POST
4. Request format: JSON
5. Secret: paste the Signing Secret (WPForms computes HMAC automatically)

### Webflow

1. Site settings → **Apps & Integrations → Webhooks → Add Webhook**
2. Trigger Type: **Form Submission**
3. Webhook URL: paste Bizzfly's URL
4. Webflow doesn't natively sign with HMAC — you can either:
   - Trust the URL's secrecy (don't share it; treat the URL itself as a secret)
   - Use a middleware (Make.com, Zapier) that adds the signature header

### Elementor Pro

1. Edit your Elementor form → **Actions After Submit → add Webhook**
2. Webhook URL: paste Bizzfly's URL
3. Advanced data: enable
4. Add custom header `x-bizzfly-signature` if your Elementor plugin supports it; otherwise treat the URL as secret

### Typeform

1. Form settings → **Connect → Webhooks → Add a webhook**
2. URL: paste Bizzfly's webhook URL
3. Secret: paste the Signing Secret (Typeform computes HMAC automatically using `Typeform-Signature` header — Bizzfly accepts both `x-bizzfly-signature` and `Typeform-Signature`)

### Raw HTML + JavaScript

```html
<form id="lead-form">
  <input name="name" required>
  <input name="phone" required>
  <input name="email" type="email">
  <button>Submit</button>
</form>

<script>
document.getElementById('lead-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  await fetch('https://app.bizzfly.com/api/webhooks/website/byo/abc123xyz789', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  alert('Thank you!');
});
</script>
```
With raw fetch you can't compute HMAC client-side without exposing the secret. Either:
- Treat the URL as secret (server-side proxy recommended)
- Compute HMAC on your backend and forward the request

### Manual HMAC (server-side proxy)

If your form posts to your own backend first, compute HMAC there before forwarding:

```js
// Node.js example
const crypto = require('crypto');
const body = JSON.stringify(formData);
const signature = crypto
  .createHmac('sha256', SIGNING_SECRET)
  .update(body)
  .digest('hex');

await fetch(BIZZFLY_WEBHOOK_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-bizzfly-signature': `sha256=${signature}`,
  },
  body,
});
```

---

## Step 4 — Test it

In Bizzfly Integrations → Website Form → click **Send Test Event**. Bizzfly simulates a submission with sample data; a Lead row should appear immediately and you'll get the bell notification.

For a real test, submit your actual form once. The Lead should land within a second.

---

## Gotchas

- **Treat the Signing Secret like a password.** Don't commit it to a public repo, don't paste it in screenshots.
- **If you don't use HMAC**, the URL itself is your only protection — don't share it. Anyone with the URL can submit fake leads.
- **Bot spam**: if you start getting spam through this URL, add a reCAPTCHA or honeypot field on your form side. Bizzfly doesn't filter spam (yet).
- **Field mapping is per-integration.** If you connect two different websites, each gets its own URL, secret, and mapping.
- **Rate limit**: 60 submissions per minute per integration. Beyond that, requests get 429. Contact support if you legitimately need more.
