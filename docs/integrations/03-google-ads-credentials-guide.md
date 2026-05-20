# Google Ads (Lead Form Extensions) — Credential Setup Guide

> Step-by-step guide for tenants to generate Google Ads API credentials and configure lead form webhook delivery.

**End result:** Client ID, Client Secret, Developer Token, Refresh Token, Customer ID, Webhook Key.

---

## ⚠️ Important — Developer Token approval

Google requires manual approval of the **Developer Token** before it can be used against production Ads accounts. Approval timeline:
- **Test access** (instant) — only works against test accounts
- **Basic access** (1–3 weeks) — needed for production; Google reviews your application by email
- **Standard access** — only after Basic Access has been live a while

You can paste your credentials into Bizzfly while Basic Access approval is pending; we'll start syncing as soon as Google approves.

---

## Prerequisites

- A Google account
- A **Google Ads Manager Account (MCC)** at ads.google.com/home/tools/manager-accounts — required for Developer Token. If you only have a regular Ads account, create an MCC and link your Ads account under it.
- A Google Cloud project (free tier is fine)
- Billing enabled on the regular Google Ads account (required to run lead form extensions in the first place)

---

## Step 1 — Create a Google Cloud Project

1. Go to **console.cloud.google.com** → sign in
2. Top-left project dropdown → **New Project**
3. Name: `Bizzfly CRM Integration` → **Create**
4. Wait for it to provision, then switch into the new project

---

## Step 2 — Enable the Google Ads API

1. Left sidebar → **APIs & Services → Library**
2. Search **"Google Ads API"** → click it → **Enable**

---

## Step 3 — Configure OAuth Consent Screen

1. Left sidebar → **APIs & Services → OAuth consent screen**
2. User Type: **External** → **Create**
3. App name: `Bizzfly CRM`
4. User support email: your email
5. Developer contact: your email
6. Save and continue
7. **Scopes**: add `https://www.googleapis.com/auth/adwords`
8. **Test users**: add your own Google account email (required while app is in Testing mode)
9. Save

---

## Step 4 — Create OAuth 2.0 Credentials

1. Left sidebar → **APIs & Services → Credentials**
2. Click **+ Create Credentials → OAuth client ID**
3. Application type: **Web application**
4. Name: `Bizzfly CRM Client`
5. Authorized redirect URIs: add `https://developers.google.com/oauthplayground`
   - We'll use OAuth Playground in Step 6 to generate the refresh token; this redirect URI is required for that.
6. Click **Create**
7. **Copy Client ID and Client Secret** from the dialog that appears

---

## Step 5 — Get the Developer Token

1. Sign in to **ads.google.com** using your **Google Ads Manager Account (MCC)**
2. Top-right → **Tools & Settings → Setup → API Center**
3. Fill out the application form:
   - Company name, website, use case description
   - Use case: *"Integrating a third-party CRM (Bizzfly) to sync lead form submissions"*
4. Submit
5. **Test access** is issued instantly (visible in API Center) — works only against test accounts
6. **Basic Access** (production) — Google reviews via email; respond promptly to any clarifying questions. Typical timeline: **1–3 weeks**
7. Once approved, **copy the Developer Token** from the API Center page

---

## Step 6 — Generate the Refresh Token via OAuth Playground

1. Go to **developers.google.com/oauthplayground**
2. Top-right **⚙ gear icon** → check **"Use your own OAuth credentials"**
3. Paste your **OAuth Client ID** and **OAuth Client secret** (from Step 4) → close
4. **Step 1** (left panel) → choose **"Input your own scopes"** → paste:
   ```
   https://www.googleapis.com/auth/adwords
   ```
5. Click **Authorize APIs**
6. Sign in with the Google account that has access to the Ads account → **Allow**
7. **Step 2** (left panel) → click **Exchange authorization code for tokens**
8. **Copy the Refresh Token** — this never expires unless explicitly revoked

---

## Step 7 — Note your Customer ID

1. Sign in to **ads.google.com**
2. Top-right corner shows a number like `123-456-7890`
3. **Customer ID** = that number with dashes removed → `1234567890`
4. If using a Manager Account (MCC), also note the **Login Customer ID** — the MCC's own ID

---

## Step 8 — Configure Lead Form Webhook in Google Ads

This is the simplest delivery method — much easier than API polling.

1. Sign in to **ads.google.com**
2. Left sidebar → **Ads & Extensions → Extensions**
3. Find your **Lead form** extension → click to edit
4. Expand **Delivery options**
5. **Webhook URL**: paste the URL Bizzfly generated for you:
   ```
   https://app.bizzfly.com/api/webhooks/google/byo/{yourWebhookToken}
   ```
6. **Key**: make up a random string (e.g. `bizzfly-google-secret-k9P2xR`). Write it down — you'll paste the same value into Bizzfly's `Webhook Key` field. Google includes this in every webhook so Bizzfly can verify the request really came from Google.
7. Click **Send test data** in Google Ads
8. Should land in Bizzfly within seconds

---

## What you paste into Bizzfly

| Field | Where to find it |
|---|---|
| Client ID | Step 4 |
| Client Secret | Step 4 |
| Developer Token | Step 5 |
| Refresh Token | Step 6 |
| Customer ID | Step 7 |
| Login Customer ID (optional) | Step 7, if using MCC |
| Webhook Key | The random string from Step 8 |
| Label (optional) | A friendly name like "Acme Realty Google Ads" |

---

## Gotchas

- **Don't skip the MCC.** Without a Manager Account, you can't apply for a Developer Token at all.
- **Test access ≠ production.** Test access only works against test accounts in the sandbox. Real lead capture requires Basic Access.
- **Refresh tokens revoke silently.** If the connected Google user changes password / enables new 2FA / revokes the app at myaccount.google.com → Security → Third-party apps, the refresh token stops working. Bizzfly will notify you to reconnect.
- **Webhook delivery vs API polling.** Bizzfly only supports webhook delivery for MVP. If you must use API polling for some reason, contact support — it's possible but requires custom setup.
- **Field mapping**: Google's lead form fields are standardized (FULL_NAME, EMAIL, PHONE_NUMBER, etc.). Bizzfly maps these automatically.
