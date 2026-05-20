# Meta (Facebook + Instagram) — Credential Setup Guide

> Step-by-step guide each **tenant** follows to generate the credentials they'll paste into Bizzfly. Also used as the basis for the in-app `ConnectMeta.jsx` accordion text.

**End result:** App ID, App Secret, Page ID, Page Access Token (or System User Token), Verify Token.

---

## Prerequisites

- A Facebook personal account
- A Facebook Page (the one running lead ads)
- Admin access to that Page
- A Meta Business Manager account at business.facebook.com (free)
- The Page must be added to Business Manager → Business Settings → Accounts → Pages → Add

---

## Step 1 — Create the Meta App

1. Go to **developers.facebook.com** and log in
2. Top-right → **My Apps** → **Create App**
3. Use case: **"Other"** → Next
4. App type: **"Business"** → Next
5. App name: e.g. `Acme Realty CRM Integration` (internal — never shown to leads)
6. Contact email: your business email
7. Business Account: pick your Business Manager → **Create App**
8. Solve captcha → land in the App Dashboard
9. **Copy the App ID** (visible at the top)
10. Left sidebar → **App Settings → Basic** → click **Show** next to App Secret → **copy App Secret**

---

## Step 2 — Add the Webhooks product

This is where Meta is told *where* to deliver lead events and *how* to verify the URL is yours.

1. Left sidebar → **Add Product** → find **Webhooks** → **Set Up**
2. **Object dropdown** at the top → select **`Page`**
   - This is the Meta object type we're subscribing to. `Page` is the right one for FB+IG lead ads.
3. **Callback URL**: paste the URL Bizzfly generated for you after you saved your credentials:
   ```
   https://app.bizzfly.com/api/webhooks/meta/byo/{yourWebhookToken}
   ```
   - This URL is unique per tenant; Bizzfly uses the token in the path to route incoming leads to the correct company.
4. **Verify Token**: make up a random string (e.g. `bizzfly-meta-v1-7K9pQ2rX`). Write it down — you'll paste the same value into the Bizzfly Integrations form. Meta sends this token in a verification request; Bizzfly checks that it matches the stored value before accepting the URL.
5. Click **Verify and Save**.
   - Meta sends a GET request to your URL. Bizzfly's webhook handler responds with the `hub.challenge` value from that request. If everything matches, Meta marks the URL as verified.
6. After verification, find the **`leadgen`** field in the list and click **Subscribe**.
   - This is what tells Meta: *"deliver lead form submissions to my URL"*. Without subscribing this field, your URL is verified but you'll never receive any events.

---

## Step 3 — Get the Page Access Token (option A: standard, ~60-day token)

1. Go to **developers.facebook.com/tools/explorer** (Graph API Explorer)
2. Top-right → Application dropdown → select **your app**
3. User or Page dropdown → **Get Page Access Token**
4. Pick your Page → grant requested permissions:
   - `pages_show_list`
   - `pages_read_engagement`
   - `pages_manage_metadata`
   - `leads_retrieval`
5. Token appears in the box — **copy it** (this short-lived token lasts ~1 hour)
6. Exchange for a long-lived (60-day) User Access Token by visiting:
   ```
   https://graph.facebook.com/v19.0/oauth/access_token?
     grant_type=fb_exchange_token&
     client_id=YOUR_APP_ID&
     client_secret=YOUR_APP_SECRET&
     fb_exchange_token=THE_SHORT_TOKEN
   ```
7. From the response, copy `access_token` — this is your long-lived User Token. Then call:
   ```
   https://graph.facebook.com/v19.0/me/accounts?access_token=LONG_USER_TOKEN
   ```
8. Response lists your Pages — each has its own `access_token` field. **That's your Page Access Token.**
   - Page tokens derived from a long-lived User Token are effectively non-expiring, as long as the user account remains active and doesn't revoke the app.
9. **Copy the Page ID** from the same response

---

## Step 3 — Get the Page Access Token (option B: System User Token, **recommended for production**)

System User Tokens never expire and don't break when individual user accounts change. Worth the extra 10 minutes.

1. Go to **business.facebook.com** → **Business Settings**
2. Left sidebar → **Users → System Users** → **Add**
3. Name: `Bizzfly CRM System User`, Role: **Admin** → Create
4. Click the new System User → **Add Assets** → pick your Page → grant **Manage Page** permission
5. Click **Generate New Token** → select your App
6. Select scopes:
   - `pages_show_list`
   - `pages_read_engagement`
   - `pages_manage_metadata`
   - `leads_retrieval`
   - `business_management`
7. **Token Expiration: Never** → **Generate Token**
8. **Copy the token immediately** — Meta only shows it once. There's no way to view it again.

---

## Step 4 — Subscribe the Page to leadgen webhook

In your browser address bar or Postman, run:
```
POST https://graph.facebook.com/v19.0/PAGE_ID/subscribed_apps?
  subscribed_fields=leadgen&
  access_token=PAGE_ACCESS_TOKEN
```

Successful response: `{"success": true}`. From this point on, every lead form submission on this Page will hit your Bizzfly webhook.

---

## Step 5 — Test it works

Use Meta's official testing tool (no real ad spend required):

1. Go to **developers.facebook.com/tools/lead-ads-testing**
2. Select your Page and your lead form
3. Click **Preview Form** → fill it out → submit
4. The webhook fires immediately; the lead should appear in Bizzfly's Leads page within seconds
5. If it doesn't, check Bizzfly's **Recent Webhook Events** debug view under Integrations → Meta → View Events

---

## What you paste into Bizzfly

| Field | Where to find it |
|---|---|
| App ID | Step 1, point 9 |
| App Secret | Step 1, point 10 |
| Page ID | Step 3 (either variant) |
| Page Access Token | Step 3 (either variant) |
| Verify Token | The random string you made up in Step 2 |
| Label (optional) | A friendly name like "Acme Realty Main Page" — for your own reference if you connect multiple Pages |

---

## Gotchas

- **Instagram lead ads** work automatically if the IG Business account is linked to this Facebook Page in Meta Business Suite. Same Page Access Token, same webhook field. No separate Instagram app needed.
- The Meta App **stays in Development mode** — this is fine for BYO since the tenant is the only user. No App Review needed when the app only accesses Pages owned by the app's own developer/admin.
- Multiple Pages from one Meta App is allowed — repeat Steps 3 & 4 for each Page; create a separate Bizzfly integration entry per Page.
- If the token ever stops working: most common cause is the FB user who created it changed their password or revoked the app under facebook.com/settings → Apps and Websites. Solution: regenerate, paste the new token into Bizzfly.
