# Testing Integrations on Localhost (Before Deployment)

> Bizzfly hasn't been deployed yet — backend runs on `localhost:5000`. This guide explains what you can and cannot test locally, and how to expose your local backend to Meta/Google/JustDial when needed.

---

## What works on localhost out of the box

| Provider | Direction | Works on localhost? |
|---|---|---|
| **IndiaMART** | Bizzfly → IndiaMART (poll) | ✅ Yes |
| **JustDial (Pull variant)** | Bizzfly → JustDial (poll) | ✅ Yes |

If your backend can reach the internet, these work — you're calling out to them, not the other way around.

---

## What needs a tunnel

Anything where the external service POSTs to *your* backend needs your localhost to be reachable from the public internet over HTTPS:

| Provider | Direction | Needs tunnel? |
|---|---|---|
| **Meta** | Meta → Bizzfly (webhook) | ⚠️ Yes |
| **Google Ads** | Google → Bizzfly (webhook) | ⚠️ Yes |
| **Website forms** | External site → Bizzfly (webhook) | ⚠️ Yes for real test; curl on localhost works for dev |
| **JustDial (Push variant)** | JustDial → Bizzfly (webhook) | ⚠️ Yes |

---

## Tunneling options (free)

### Option 1 — Cloudflare Tunnel (recommended)

Free, no rate limits, no signup required for ad-hoc tunnels, stable URL while running.

**Install on Windows:**
```powershell
winget install --id Cloudflare.cloudflared
```

**Start a tunnel pointing at your backend:**
```powershell
cloudflared tunnel --url http://localhost:5000
```

Output looks like:
```
2026-05-19T12:00:00Z INF +--------------------------------------------------------------------------------------------+
2026-05-19T12:00:00Z INF |  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):  |
2026-05-19T12:00:00Z INF |  https://random-words-here-1234.trycloudflare.com                                          |
2026-05-19T12:00:00Z INF +--------------------------------------------------------------------------------------------+
```

That HTTPS URL forwards to `http://localhost:5000`. Use it as your webhook URL in Meta/Google/JustDial settings. Tunnel stays alive until you Ctrl+C.

**Caveat:** the URL changes every restart. For long testing sessions, sign up for a free Cloudflare account and use a named tunnel for a stable URL.

### Option 2 — ngrok

Easier UI, ubiquitous in tutorials. Free tier has rate limits.

**Install:**
```powershell
winget install --id Ngrok.Ngrok
```

**Sign up + add authtoken** (free): https://dashboard.ngrok.com/get-started/your-authtoken

**Start tunnel:**
```powershell
ngrok http 5000
```

Output:
```
Forwarding   https://abc123.ngrok-free.app -> http://localhost:5000
```

Free tier: URL changes every restart, and there's a "you're using ngrok" warning page on first visit (annoying for some webhook providers — Meta's verification handshake passes through it fine, Typeform sometimes complains).

Paid tier ($8/mo): stable subdomain, no warning page.

### Option 3 — localhost.run

No install, no signup, instant. Works via SSH.

```powershell
ssh -R 80:localhost:5000 nokey@localhost.run
```

Gives you an HTTPS URL. Same caveat: URL is ephemeral.

---

## End-to-end localhost workflow for Meta

1. Run your backend: `npm run dev` in `/backend` → backend listening on `localhost:5000`
2. Start a tunnel in a separate terminal: `cloudflared tunnel --url http://localhost:5000`
3. Copy the public HTTPS URL → e.g. `https://random-words-1234.trycloudflare.com`
4. Connect Meta integration in Bizzfly with placeholder webhook token first → Bizzfly returns the per-tenant URL: `…/api/webhooks/meta/byo/abc123`
5. Substitute the tunnel domain: `https://random-words-1234.trycloudflare.com/api/webhooks/meta/byo/abc123`
6. Paste that into Meta App Dashboard → Webhooks → Callback URL
7. Use Meta's Lead Ads Testing Tool (developers.facebook.com/tools/lead-ads-testing) to submit test leads
8. Watch leads land in your local Bizzfly database

---

## End-to-end localhost workflow for Website forms

For development you don't even need a tunnel — just send curl directly:

```powershell
curl -X POST http://localhost:5000/api/webhooks/website/byo/abc123 `
  -H "Content-Type: application/json" `
  -H "x-bizzfly-signature: sha256=$signature" `
  -d '{"name":"Test User","phone":"+919999999999","email":"test@example.com"}'
```

Compute `$signature` with the signing secret if you want to test signature verification, or temporarily disable signature checking in dev.

For testing with a real WordPress / Webflow site, use a tunnel as above.

---

## End-to-end localhost workflow for IndiaMART

No tunnel needed.

1. Run backend on `localhost:5000`
2. Connect IndiaMART in Bizzfly → paste CRM Key
3. Click **Test Connection** — Bizzfly calls `mapi.indiamart.com` outbound
4. If you have real leads in your IndiaMART account, they pull in immediately

---

## Recommended dev setup

- One PowerShell window: `cd backend; npm run dev`
- One PowerShell window: `cd frontend; npm run dev`
- One PowerShell window: `cloudflared tunnel --url http://localhost:5000` (start only when needed for Meta/Google/JustDial-push testing)
- Note the tunnel URL each session; you'll re-paste it into Meta/Google webhook settings each time (or pay $8/mo for a stable URL once you're closer to launch)

---

## Production deployment note

When you eventually deploy to production:
- Webhook URLs change from `https://your-tunnel.trycloudflare.com/...` to `https://app.bizzfly.com/...`
- Every connected tenant must update their Meta/Google/JustDial webhook URLs to point at production
- Plan a migration window — ideally do this before opening to real customers, or build a "webhook URL changed" notification flow
