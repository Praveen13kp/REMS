# IndiaMART — Credential Setup Guide

> The simplest of the five integrations. One field, no waiting on approvals, fully self-serve from the IndiaMART seller dashboard.

**End result:** A single **CRM Key**.

---

## Prerequisites

- An active **paid IndiaMART seller account** (Star tier, TrustSEAL, or any paid plan). **Free listings cannot use the Lead API.**
- Login access to the IndiaMART seller dashboard at **seller.indiamart.com**

---

## Step 1 — Generate the CRM Key

1. Log in to **seller.indiamart.com**
2. Top menu → **Lead Manager**
3. Look for **Import/Export Leads** → click the **API** tab
   - If you can't find it, use the search bar at the top of the dashboard and type *"Lead API"* or *"CRM Integration"*
4. Click **"Generate API Key"** or **"Get CRM Key"** (button label varies)
5. IndiaMART shows a long alphanumeric string — that's your **CRM Key**
6. **Copy it immediately** and store it somewhere safe (you can regenerate, but doing so invalidates the old key and breaks any in-flight integrations)

---

## Step 2 — Paste into Bizzfly

In Bizzfly → **Settings → Integrations → IndiaMART → Connect**:

| Field | Value |
|---|---|
| CRM Key | The string from Step 1 |
| Label | A friendly name (e.g. "Primary IndiaMART account") |
| Initial backfill | Pulls last 7 days of leads on first connect (recommended ON) |

Click **Save**.

---

## Step 3 — Test it

Click **Test Connection** in Bizzfly. Bizzfly pulls the last 24 hours of leads from your IndiaMART account and shows a preview. If you see leads → working. If you see an error → CRM Key is wrong or your IndiaMART plan doesn't include API access.

After saving, Bizzfly automatically polls IndiaMART every **5 minutes** for new leads, dedupes by `UNIQUE_QUERY_ID`, and saves new ones to your Leads page.

---

## How it works under the hood

Unlike Meta and Google, IndiaMART doesn't push leads to Bizzfly — Bizzfly pulls from IndiaMART on a schedule. The endpoint Bizzfly calls is:

```
GET https://mapi.indiamart.com/wservce/crm/crmListing/v2/?
  glusr_crm_key=YOUR_CRM_KEY&
  start_time=YYYY-MM-DD HH:mm:ss&
  end_time=YYYY-MM-DD HH:mm:ss
```

Response:
```json
{
  "CODE": 200,
  "RESPONSE": [
    {
      "UNIQUE_QUERY_ID": "...",
      "SENDER_NAME": "...",
      "SENDER_MOBILE": "...",
      "SENDER_EMAIL": "...",
      "SUBJECT": "...",
      "QUERY_TIME": "..."
    }
  ]
}
```

Bizzfly handles the rest — windowing, dedupe, rate-limit respect, field mapping.

---

## Gotchas

- **Rate limit: 5 calls per 5 minutes per CRM key.** Bizzfly polls every 5 minutes (1 call per 5 min) so you're well within the limit. Don't connect the same CRM Key to multiple tools at once — they'll compete for the budget.
- **Max date range per call: 7 days.** Initial backfill paginates by week if you request a longer range.
- **Free plan returns "API not available on your plan"** — there's no workaround except upgrading.
- **CRM Key regeneration breaks the integration.** If you regenerate inside IndiaMART, paste the new key into Bizzfly immediately, or leads stop syncing.
- **Time zone**: IndiaMART API returns timestamps in IST (UTC+5:30). Bizzfly converts to your tenant's configured timezone automatically.
- **One key = all your IndiaMART leads.** Unlike Meta where you might have separate Pages, IndiaMART gives you one key per seller account that covers every product category and city you operate in.
