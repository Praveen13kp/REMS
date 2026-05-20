# JustDial — Credential Setup Guide

> JustDial does not have a self-serve developer portal. Credentials come from JustDial's account management team after you formally request API access. Format varies per account — Bizzfly accepts both push and pull variants.

**End result:** Either (Push) webhook secret/header value, or (Pull) endpoint URL + credentials.

---

## Prerequisites

- An active **paid JustDial advertiser account** (Verified Listing or higher tier). Free listings cannot use the API.
- Direct contact with your JustDial Account Manager (phone or email). If you don't know who that is, call JustDial customer support and ask: *"I want API integration to send my leads to my CRM. Who do I speak to?"*

---

## Step 1 — Request API access from JustDial

Email or call your JustDial Account Manager with this message (copy-paste):

> Subject: API access request for CRM integration
>
> Hi,
>
> I want to integrate my JustDial leads with my CRM (Bizzfly). Please enable Push API delivery for my account.
>
> My CRM's webhook URL is:
> `https://app.bizzfly.com/api/webhooks/justdial/byo/{yourWebhookToken}`
>
> Please configure this URL on your end and send me the authentication header / secret I should expect on incoming requests.
>
> If Push API is not available on my plan, please send me the Pull API endpoint URL and credentials instead.
>
> Thanks.

JustDial typically responds within **3–7 business days**.

---

## Step 2 — Receive credentials

JustDial will email you one of two response shapes:

### Variant A — Push API (preferred)

JustDial confirms they've configured your webhook URL on their side and sends you:
- A **header name** (commonly `Authorization`, `JD-Signature`, or `X-JD-Auth`)
- A **value** for that header (a fixed string they'll include on every call)

From this point, JustDial will POST to your Bizzfly URL every time a lead comes in.

### Variant B — Pull API

JustDial sends you:
- An **API endpoint URL** (something like `https://api.justdial.com/leads/v2/...`)
- Either a **username + password** OR an **API key** for authentication

You'll configure Bizzfly to poll this endpoint every 5–10 minutes.

---

## Step 3 — Paste into Bizzfly

In Bizzfly → **Settings → Integrations → JustDial → Connect**, pick the matching tab:

### If you got Push API credentials

| Field | Value |
|---|---|
| Header name | The header JustDial said they'd send (e.g. `JD-Signature`) |
| Header value | The secret value JustDial provided |
| Label | A friendly name (e.g. "Mumbai office leads") |

Bizzfly will verify every inbound request has this header with this exact value before saving the lead.

### If you got Pull API credentials

| Field | Value |
|---|---|
| Endpoint URL | The URL JustDial provided |
| Auth type | Basic Auth / API Key in header / API Key in query string (whichever matches what they told you) |
| Username + Password OR API Key | The credentials JustDial provided |
| Poll interval | Default 5 minutes (don't go lower; JustDial rate-limits) |
| Label | Friendly name |

Bizzfly will call this endpoint every N minutes, dedupe leads by their unique ID, and save new ones.

---

## Step 4 — Test it

### Push variant
Ask JustDial to send a test lead, or wait for the first real lead. Push API doesn't have a self-serve test tool.

### Pull variant
In Bizzfly → Integrations → JustDial → click **Test Connection**. Bizzfly calls the endpoint for the last 24 hours and shows you a count of leads found. If it returns leads → working. If 401/403 → credentials wrong. If 200 with empty → no leads in last 24h (try a real submission).

---

## Gotchas

- **JustDial's payload format varies.** Some accounts get JSON, some get XML. Bizzfly's parser handles both — no action needed from you, but if Bizzfly says "couldn't parse" check the **Recent Webhook Events** debug view and email support with the payload.
- **No standardized field names.** JustDial's column names differ across accounts (`name` vs `customer_name` vs `lead_name`). Bizzfly uses a fuzzy mapper but may need a manual field mapping override — check the Field Mapping section after first lead arrives.
- **Rate limits (Pull)**: don't poll faster than every 5 minutes. JustDial will rate-limit or suspend the account if you hammer them.
- **Account manager turnover**: JustDial account managers change frequently. Save the email thread for future reconnections.
- **Bizzfly doesn't currently support multiple JustDial accounts under one tenant.** If you have separate JustDial accounts per city, connect them as separate integrations with different labels.
