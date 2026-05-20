# Integrations — Progress & Testing Log

> This is the running journal of the Lead Capture Integrations feature.
> Every phase that ships gets a section here explaining **what it does in plain words** and **exactly how to test it step-by-step**.

| Phase | Status | Date | What it gives you |
|---|---|---|---|
| 0 — Foundations | ✅ Shipped | 2026-05-19 | The shared plumbing every integration uses (storage, encryption, the single funnel where leads go in, the public webhook URL pattern, and the Settings page where tenants connect integrations) |
| 1 — Meta (Facebook + Instagram) | ✅ Shipped | 2026-05-19 | Tenants paste their own Meta App credentials. Facebook + Instagram lead-form ads then deliver leads straight into their Leads page |
| 2 — Google Ads | ✅ Shipped | 2026-05-19 | Tenants paste their Google Ads API credentials. Lead Form Extensions push leads in real time |
| 3 — Website Forms | ✅ Shipped | 2026-05-19 | Tenants get a unique webhook URL to drop into WordPress, Webflow, Elementor, Typeform, or any HTML form |
| 4 — JustDial | ✅ Shipped | 2026-05-19 | Two ways to connect — JustDial pushes leads to us, OR we pull from JustDial every few minutes |
| 5 — IndiaMART | ✅ Shipped | 2026-05-19 | Tenants paste one CRM Key. We poll IndiaMART every 5 minutes and pull new leads |
| 6 — Polish & operations | ✅ Shipped | 2026-05-19 | Stats strip, broken-integrations banner, hourly health-check cron, in-app "integration disconnected" notification, Reconnect button on broken rows, per-integration Recent Events viewer |

---

# Phase 0 — Foundations

## What this gives you

Nothing user-facing. This is the plumbing the next five phases plug into.

Concretely it gives the system three things it needs to work safely:
1. **A safe place to store tenant API keys.** When a tenant types their Meta App Secret or IndiaMART CRM Key into our UI, we lock it with strong encryption (AES-256-GCM) before saving. Even if someone got a copy of the database, they couldn't read those keys without the encryption key, which lives in environment variables outside the DB.
2. **A single doorway for every incoming lead.** No matter which provider sends us a lead — Facebook, Google, a website form, JustDial, IndiaMART — the lead goes through one shared function. That function checks for duplicates, writes the lead, and fires the "New lead!" notification to OWNER and MANAGER. One door = consistent behavior across all sources.
3. **A predictable URL pattern for incoming webhooks.** Every tenant gets their own unique URL when they connect a provider. The URL has a secret token in the path. When a webhook comes in, we look up the token to find out which tenant owns it. Tenants can never accidentally receive each other's leads.

## How it actually works

When OWNER goes to **Settings → Integrations**, they see a grid of cards — one per provider (Facebook + Instagram, Google Ads, Website Form, JustDial, IndiaMART). Available providers have a "Connect" button; the rest say "Coming soon".

When the tenant clicks Connect, the system:
1. Asks them for the credentials specific to that provider
2. Encrypts those credentials and saves them in the database
3. Generates a unique random token for their integration
4. Builds a webhook URL that includes that token, like:
   `https://app.bizzfly.com/api/webhooks/meta/byo/<random-token>`
5. Shows the URL to the tenant to copy

When a webhook arrives at that URL, the system:
1. Pulls the token out of the URL
2. Looks up which tenant + which provider it belongs to
3. Decrypts that tenant's credentials
4. Asks the provider-specific logic to verify the request (e.g. "is this signature valid?")
5. If valid, records the event (so identical retries don't create duplicates), fetches/parses the lead, saves it as a Lead in the right tenant's data, and notifies their team

## How to test Phase 0

You don't need any real provider account to test the plumbing. We're just checking the bones are in place.

### Test 1 — The Settings page renders all five provider cards

1. Start the backend (`cd backend; npm run dev`) and frontend (`cd frontend; npm run dev`)
2. Log in as an OWNER user
3. Go to **Settings** → click the **Integrations** tab on the left
4. Scroll past the existing "Lead intake" section (Sprint 5's older feature)
5. You should see a new section titled **"Lead source integrations"** with five cards:
   - Facebook & Instagram Lead Ads — has a Connect button
   - Google Ads Lead Forms — has a Connect button
   - Website Form — has a Connect button
   - JustDial — has a Connect button
   - IndiaMART — has a Connect button

### Test 2 — Encryption actually encrypts

1. In a terminal, in the backend folder, run:
   ```powershell
   node -e "require('dotenv').config(); const c=require('./src/modules/integrations/crypto'); const enc=c.encryptJson({secret:'my-test-secret'}); console.log('Encrypted:', enc.slice(0,20)+'...'); console.log('Decrypted:', c.decryptJson(enc));"
   ```
2. You should see:
   - An "Encrypted:" line that starts with `v1:` followed by random-looking characters
   - A "Decrypted:" line that prints `{ secret: 'my-test-secret' }` again

If both work, encryption is round-tripping correctly. If decrypted output doesn't match, something's wrong with the key.

### Test 3 — Unknown webhook tokens return a clean 404

1. With backend running, in any terminal:
   ```powershell
   curl http://localhost:4000/api/webhooks/meta/byo/this-token-does-not-exist
   ```
2. You should get back: `{"ok":false,"error":{"code":404,"message":"Not found"}}`
3. This proves the webhook router is mounted and refuses unknown tokens without leaking why (good for security — we don't tell attackers whether a token doesn't exist vs. is just disabled).

---

# Phase 1 — Meta (Facebook + Instagram Lead Ads)

## What this gives you

Each tenant can connect their **own** Facebook + Instagram lead-ad campaigns to Bizzfly. They create their own Meta Developer App, generate their own Page Access Token, paste both into our Settings page. From that moment on, every lead someone submits via the tenant's Facebook or Instagram lead-form ad lands automatically in their Bizzfly Leads page with `source = "Facebook"` and the team gets a bell notification.

Importantly: **we never share Meta credentials across tenants**. If Tenant A connects their Meta App, Tenant B's leads still go through Tenant B's own Meta App — even when both are using Bizzfly.

## How it actually works

There's a six-step wizard inside Bizzfly that walks the tenant through generating credentials on Meta's side. The summary of what happens behind the scenes:

1. **Tenant creates a Meta App** at developers.facebook.com. They copy the App ID and App Secret.
2. **Tenant sets up a webhook in Meta** pointing at a URL Bizzfly gives them. Meta will only deliver leads to URLs it has verified, so the first thing Meta does is send a GET request to Bizzfly to prove we own the URL — our backend responds with the right "challenge" answer, Meta marks the URL as verified.
3. **Tenant generates a Page Access Token** from the Graph API Explorer (or, recommended, a non-expiring "System User Token" from Meta Business Manager).
4. **Tenant pastes everything into Bizzfly's Settings page** — App ID, App Secret, Page ID, Page Access Token, and the "verify token" string they made up in step 2. Bizzfly encrypts and saves these.
5. **Tenant subscribes their Facebook Page to the `leadgen` event** — one HTTP call they make from their browser. This tells Meta "send lead notifications to my app's webhook."

From now on, when someone submits the tenant's lead form on Facebook or Instagram:
- Meta posts a tiny notification to our webhook saying "lead X exists on page Y, go fetch it." (Meta intentionally doesn't include the lead's name/phone/email in the webhook — to make sure only the app owner can read those.)
- Our backend verifies the request is really from Meta by checking the cryptographic signature it sent in the header (computed using the tenant's App Secret).
- We then call Meta back, using the tenant's Page Access Token, to fetch the actual lead fields (name, phone, email, city, plus any custom questions the tenant asked on their form).
- We map those fields into our standard Lead shape and save it as a new Lead with `source = "Facebook"` (or "Instagram" if it came from an IG account).
- OWNER + MANAGER users in that tenant get the standard "New Facebook lead!" notification.

If Meta retries the same delivery (which it does on any non-200 response), we recognize the duplicate by the lead's unique ID and skip it — no double leads.

## How to test Phase 1

You need a Facebook account, a Facebook Page, and Meta Business Manager (all free). You can use Meta's own "Lead Ads Testing Tool" to send fake leads — no real ad spend needed.

### Setup (15 minutes, one-time)

1. **Make your local backend reachable from the internet.** Meta requires HTTPS. Open a new terminal and start a tunnel:
   ```powershell
   cloudflared tunnel --url http://localhost:4000
   ```
   Cloudflare prints a public URL like `https://random-words-1234.trycloudflare.com`. **Copy it.** Leave this terminal open — closing it kills the tunnel.

2. **Generate Meta credentials.** Follow the steps in `02-meta-credentials-guide.md` (or in the in-app wizard's Step 1–4). You'll end up with five values:
   - App ID
   - App Secret
   - Page ID
   - Page Access Token
   - Verify Token (a random string you invent)

### Connect in Bizzfly

3. In Bizzfly, log in as OWNER → **Settings → Integrations**
4. Click **Connect** on "Facebook & Instagram Lead Ads"
5. The 6-step wizard opens. You can either read each step (they expand) or skip straight to the form at the bottom.
6. Fill in:
   - **Label:** any friendly name, e.g. "Acme Realty Main Page"
   - **App ID, App Secret, Page ID, Page Access Token, Verify Token** — paste the five values from step 2
7. Click **Save & continue**

Bizzfly returns a webhook URL that looks like:
`http://localhost:4000/api/webhooks/meta/byo/<long-random-token>`

8. **Replace the `localhost:4000` part with your Cloudflare tunnel URL.** Final URL example:
   `https://random-words-1234.trycloudflare.com/api/webhooks/meta/byo/<long-random-token>`
9. **Copy this final URL.**

### Tell Meta where to deliver

10. Go to your Meta App Dashboard → Webhooks → Page object → paste the URL above as Callback URL
11. Paste the same Verify Token string you typed into Bizzfly
12. Click **Verify and Save** — Meta will send a verification GET request; Bizzfly responds; you should see a green check
13. Click **Subscribe** next to the `leadgen` field

### Fire a test lead

14. Open <https://developers.facebook.com/tools/lead-ads-testing>
15. Pick your Page, pick your lead form
16. Click **Preview Form**, fill it out, click Submit
17. Within ~2 seconds:
    - A new Lead appears in your Bizzfly Leads page with `source = "Facebook"`
    - The bell icon shows a "New Facebook lead" notification

If both happen, Phase 1 is working.

### Things to also verify

- **Duplicate prevention:** submit the same test lead again. The second submission should NOT create a second Lead row — our duplicate detection by phone/email kicks in.
- **Bad signature rejection:** in a terminal, manually try to spoof a webhook:
  ```powershell
  curl -X POST http://localhost:4000/api/webhooks/meta/byo/<your-token> -H "Content-Type: application/json" -d "{}"
  ```
  You should get back `401 Verification failed` — we refused because there's no valid signature.
- **Test Connection button:** in the Integrations panel, click **Test** on your connected row. You should get a toast like "Connected as <your-page-name>" pulled live from Meta.
- **Invalid token:** click Edit on your connected row → paste a deliberately wrong Page Access Token → Save → click Test. The row's status should flip to **INVALID** with an error message.

---

# Phase 2 — Google Ads Lead Forms

## What this gives you

Same idea as Phase 1, but for Google Ads. A tenant who runs Google Ads campaigns with **Lead Form Extensions** can connect their Google Ads account to Bizzfly. Leads submitted through those forms get delivered into Bizzfly in real time with `source = "Google Ads"`.

The big caveat (and we display this prominently in the UI): **Google requires manual approval of a "Developer Token" before production use.** That approval takes 1–3 weeks of email back-and-forth with Google. We let tenants save their credentials anyway — leads start flowing the moment Google approves.

## How it actually works

Google Ads has its own way of authenticating webhooks. Unlike Meta (which signs the request with a cryptographic header), Google **puts the shared secret directly in the JSON payload** as a field called `google_key`. We compare it against what the tenant configured. It's simpler, but the tenant has to type the same secret into both Bizzfly and Google Ads.

Setup flow:
1. **Tenant creates a Google Cloud project** and turns on the Google Ads API
2. **Tenant creates OAuth credentials** (Client ID + Client Secret)
3. **Tenant applies for a Developer Token** from their Google Ads Manager Account. Google reviews this manually — takes 1–3 weeks for "Basic Access" (the production tier).
4. **Tenant generates a Refresh Token** using Google's OAuth Playground (proves they have access to their Ads account)
5. **Tenant looks up their Customer ID** from the Google Ads dashboard
6. **Tenant invents a "Webhook Key"** — any random string at least 8 characters
7. **Tenant pastes all of the above into Bizzfly** — we encrypt and save
8. **Tenant goes into their Google Ads account → Lead form extension → Delivery options** and pastes:
   - The webhook URL Bizzfly gave them
   - The same Webhook Key string

When a lead is submitted via a Google Ads Lead Form, Google POSTs the lead's fields directly to Bizzfly along with the Webhook Key in the JSON body. Bizzfly compares the key against what the tenant configured. If it matches, we map Google's standardized columns (FULL_NAME, EMAIL, PHONE_NUMBER, CITY) into our Lead fields and save. We also stamp `form_id`, `campaign_id`, and `gcl_id` into the lead's notes so the sales team can trace each lead back to a specific ad in their Google Ads dashboard.

Unlike Meta, Google's payload already contains the full lead — no second API call needed.

## How to test Phase 2

You can test this WITHOUT a Google Ads account by simulating Google's webhook with curl. To test the real flow you need a Google Ads account with at least Test Access on a Developer Token.

### Test 1 — The plumbing (no Google account)

1. In Bizzfly Settings → Integrations → click **Connect** on Google Ads
2. The wizard opens with a yellow warning banner about the 1–3 week Developer Token wait. Read it.
3. Fill in credentials with any plausible-looking values:
   - Label: "Plumbing test"
   - Client ID: any non-empty string
   - Client Secret: any non-empty string
   - Developer Token: any non-empty string
   - Refresh Token: any non-empty string
   - Customer ID: `1234567890` (exactly 10 digits)
   - Webhook Key: `plumbing-test-key-12345`
4. Click **Save**. Bizzfly returns a webhook URL.
5. Simulate a Google delivery in your terminal:
   ```powershell
   curl -X POST http://localhost:4000/api/webhooks/google/byo/<your-token> -H "Content-Type: application/json" -d '{\"lead_id\":\"test-lead-001\",\"google_key\":\"plumbing-test-key-12345\",\"form_id\":42,\"campaign_id\":99,\"user_column_data\":[{\"column_id\":\"FULL_NAME\",\"string_value\":\"Test Lead\"},{\"column_id\":\"EMAIL\",\"string_value\":\"test@example.com\"},{\"column_id\":\"PHONE_NUMBER\",\"string_value\":\"+919999999999\"},{\"column_id\":\"CITY\",\"string_value\":\"Pune\"}]}'
   ```
6. You should get `{"ok":true,"id":"<some-id>","deduped":false}` and a new Lead appears with `source = "Google Ads"`, name "Test Lead", and notes containing `form_id: 42` and `campaign_id: 99`.

### Test 2 — Wrong webhook key gets rejected

7. Same curl as above, but change `"google_key":"plumbing-test-key-12345"` to `"google_key":"wrong-key"`
8. You should get `401 Verification failed` — Bizzfly refused because the key didn't match what was stored.

### Test 3 — Duplicate delivery doesn't create double leads

9. Run the original curl from step 5 **twice in a row**.
10. The second response should be `{"ok":true,"duplicate":true}` — Bizzfly recognized the same `lead_id` and didn't create another Lead.

### Test 4 — Real Google Ads flow (requires a Google Ads account)

11. Generate real credentials following `03-google-ads-credentials-guide.md`. For testing purposes, Google's "Test Access" Developer Token (instant) is enough to test against a Test Account.
12. Connect in Bizzfly with the real credentials.
13. Click **Test Connection** in the saved row:
    - If your Developer Token is approved + the Customer ID is accessible → "Token valid; can access customer <id>"
    - If your Developer Token is still pending approval → an error like "developer-token-not-approved"
    - If your refresh token has been revoked → "Token refresh failed: invalid_grant"
14. In Google Ads → Ads & Extensions → your Lead form extension → Delivery options → paste the tunneled Bizzfly webhook URL + the same Webhook Key string.
15. Click **Send test data** in Google Ads. Within seconds you'll see the lead in Bizzfly.

---

# Phase 3 — Website Forms

## What this gives you

Every tenant can generate a unique webhook URL inside Bizzfly and drop it into any form on their website — WordPress (Contact Form 7 or WPForms), Webflow, Elementor, Typeform, raw HTML+JS, or anything custom. When someone submits their form, the data lands in Bizzfly as a Lead with `source = "Website"`.

This is the only integration with **zero third-party setup**. No Meta App, no Google Cloud project, no waiting on JustDial's account manager. Connect → paste URL into your form → done.

## How it actually works

When a tenant connects a Website Form integration in Bizzfly, the wizard does three things:
1. **Generates a random signing secret** in the browser (64 hex characters). The secret is what makes the webhook tamper-proof — only requests signed with the right secret will be accepted.
2. **Lets the tenant configure a "field map"** — they tell Bizzfly "my form's field `your-name` should map to Bizzfly's `name` field, my `mobile_no` should map to `phone`," and so on. Any field not in the map gets stashed into the lead's notes.
3. **Lets the tenant choose Signed vs Unsigned mode.** Signed mode (recommended) requires the website to compute an HMAC signature on every submission. Unsigned mode (for form builders like Webflow that can't compute signatures) treats the URL itself as the secret — anyone with the URL can submit.

After Save, Bizzfly returns the webhook URL and shows copy-paste snippets for the most common form builders (WordPress, Webflow, Typeform, raw HTML, cURL).

The wizard also has a **Send Test Event** button that fires a sample submission directly from the browser (with the signature computed on the fly) so the tenant can verify everything works without needing to set up their actual form first.

When a real submission comes in, Bizzfly:
1. Checks the Content-Type is JSON, form-encoded, or multipart (anything else gets rejected — guards against accidental GETs / browser crawlers)
2. If signed mode is on, verifies the HMAC-SHA256 signature in the `x-bizzfly-signature` header (or `Typeform-Signature` for Typeform-native signing)
3. Computes a "body hash" as the duplicate-prevention key — if the exact same body bytes arrive again, Bizzfly recognizes it as a duplicate and skips
4. Translates the form's field names to standard Lead fields using the tenant's field map (plus a built-in dictionary of common aliases: `mobile`, `mobile_no`, `phone_number`, `email_id`, `your-name`, etc. are recognized even without explicit mapping)
5. Saves the Lead, fires the notification, done

Typeform's payload has a quirky nested shape (`form_response.answers[]` with `field.ref` keys); the driver normalizes that to a flat map first.

## How to test Phase 3

You can test this entirely on localhost — no external service or tunnel needed for the basic flow.

### Test 1 — Connect and send a test event from the browser

1. Settings → Integrations → click **Connect** on Website Form
2. Fill in:
   - Label: "Localhost test"
   - Leave "Require signed requests" **ON**
   - The Signing Secret was auto-generated — **note it down**, you'll need it later
   - The Field Mapping table is pre-filled with `your-name → name`, `mobile_no → phone`, `email_id → email`, `city_name → city`. Leave as-is.
3. Click **Save & generate webhook**
4. Bizzfly returns a webhook URL. The "Saved" card appears with a **Send test event** button.
5. Click **Send test event**.
6. You should see a green toast "Test lead created" and a new Lead appears in Bizzfly with:
   - `source = "Website"`
   - Name = "Test Lead"
   - Phone = "+919999999999"
   - Email = "test@example.com"
   - City = "Pune"

### Test 2 — Send a signed request via cURL

7. With the secret you noted, run this in PowerShell (replace `<your-secret>` and `<your-token>`):
   ```powershell
   $secret = "<your-secret>"
   $body = '{"your-name":"Curl Test","mobile_no":"+918888888888","email_id":"curl@example.com","city_name":"Mumbai","custom_question_3bhk":"Yes"}'
   $hmac = New-Object System.Security.Cryptography.HMACSHA256
   $hmac.Key = [Text.Encoding]::UTF8.GetBytes($secret)
   $sig = -join ($hmac.ComputeHash([Text.Encoding]::UTF8.GetBytes($body)) | ForEach-Object { $_.ToString("x2") })
   curl -X POST "http://localhost:4000/api/webhooks/website/byo/<your-token>" -H "Content-Type: application/json" -H "x-bizzfly-signature: sha256=$sig" -d $body
   ```
8. You should get back `{"ok":true,"id":"<some-id>","deduped":false}` and see a new Lead with name "Curl Test", phone "+918888888888". The unrecognized field `custom_question_3bhk` shows up in the lead's notes as `custom_question_3bhk: Yes`.

### Test 3 — Unsigned mode (for Webflow / Elementor users)

9. In Bizzfly, click Edit on the saved row → uncheck "Require signed requests" → click Save.
10. Send a POST without any signature:
    ```powershell
    curl -X POST "http://localhost:4000/api/webhooks/website/byo/<your-token>" -H "Content-Type: application/json" -d '{"name":"Unsigned Lead","phone":"+917777777777","email":"unsigned@example.com"}'
    ```
11. You should get 200 OK and a new Lead. Notice this submission used `name`, `phone`, `email` — NOT the mapped names — and the heuristic alias matcher still resolved them correctly.

### Test 4 — Failure modes

12. **Bad signature in signed mode:** flip signed mode back on, then send a cURL with no signature header → `401 Verification failed`.
13. **Bad Content-Type:** send the request with `Content-Type: text/plain` → `415` (we refuse non-form payloads).
14. **Duplicate submission:** run the exact same successful cURL twice → second response is `{"ok":true,"duplicate":true}`; no second Lead.
15. **Typeform-style payload:**
    ```powershell
    curl -X POST "http://localhost:4000/api/webhooks/website/byo/<your-token>" -H "Content-Type: application/json" -d '{"form_response":{"answers":[{"field":{"ref":"your-name"},"text":"Typeform Lead"},{"field":{"ref":"email_id"},"email":"tf@example.com"},{"field":{"ref":"mobile_no"},"phone_number":"+916666666666"}]}}'
    ```
    Bizzfly flattens the nested shape and creates a Lead just like a regular flat submission.

### Test 5 — Real form builder (optional, requires tunnel)

16. Start a Cloudflare tunnel (see `07-localhost-testing.md`)
17. Replace `localhost:4000` in the webhook URL with the tunnel URL
18. Paste into WPForms / Webflow / Elementor / Typeform following the corresponding snippet shown in the modal
19. Submit your real form once — the Lead should land within a second

---

# Phase 4 — JustDial (Push + Pull)

## What this gives you

JustDial is the most awkward provider — they don't have a developer portal. To get API access, the tenant has to email their JustDial account manager and wait 3–7 days for credentials. Worse, the credentials JustDial returns vary by account: some tenants get **Push** setup (JustDial calls our webhook on every new lead) and others get **Pull** setup (we call JustDial's endpoint every few minutes to check for new leads).

So this phase supports both flavors. The wizard has two tabs — Push API and Pull API — and the tenant picks whichever JustDial enabled on their account.

This phase also introduces something the next phase reuses: a **background poller**. A single piece of code wakes up every 60 seconds, looks at every pull-style integration in the system, and checks "is this one due for a poll?" If yes, it calls the provider, dedupes, and ingests new leads. No per-tenant timers, no boot-time wiring per credential.

## How it actually works

### Push variant

1. Tenant emails JustDial with a copy-paste template (the wizard shows the exact wording to send)
2. JustDial replies with: a header name (typically `X-JD-Auth` or `JD-Signature`) and a fixed secret value
3. Tenant pastes both into Bizzfly's wizard. Bizzfly returns a webhook URL
4. Tenant emails the URL back to JustDial
5. JustDial configures the URL on their side. From then on, every new lead is POSTed to Bizzfly with the agreed header.
6. Bizzfly checks the incoming request has that exact header value (timing-safe comparison so attackers can't guess it character-by-character)
7. Lead is parsed (JustDial sends either JSON or XML depending on the account tier — we handle both) and saved

### Pull variant

1. Tenant emails JustDial similarly
2. JustDial replies with: an endpoint URL and auth credentials (Basic Auth username+password, or an API key in a header, or an API key in the URL)
3. Tenant pastes all of this into Bizzfly's wizard, plus the poll interval (minimum 300 seconds — JustDial rate-limits aggressive callers)
4. Bizzfly's background poller wakes up every 60 seconds. On each tick it checks every pull integration: "has `pollIntervalSec` passed since the last poll?" If yes, it calls JustDial with the credentials, gets back the list of recent leads, dedupes (by JustDial's lead ID), and ingests new ones

### Why JSON and XML both work

JustDial's response format depends on the account. Some accounts get clean JSON like `{ "leads": [...] }`; older accounts get XML like `<lead><leadid>123</leadid><name>...</name></lead>`. Bizzfly accepts whatever comes in — for inbound webhooks we check Content-Type and route to the right parser; for outbound pulls we check the response's Content-Type and parse accordingly.

The driver also has a wide alias dictionary for JustDial's column names. Different JustDial accounts return the same data with different keys: `mobile` vs `phone_number` vs `mobile_number` vs `contact_number`, `name` vs `customer_name` vs `lead_name`. The driver resolves all of these to standard Lead fields.

## How to test Phase 4

Real JustDial accounts are hard to come by for testing. The realistic path is to simulate JustDial with cURL (for push) and a local mock HTTP server (for pull).

### Test 1 — Push variant via simulated cURL

1. Connect a JustDial integration in Bizzfly:
   - Click Connect on JustDial → the **Push API** tab is selected by default
   - Label: "JD Push Test"
   - Auth header name: `X-JD-Auth` (the default)
   - Auth header value: `jd-test-secret-12345`
   - Click Save
2. Bizzfly returns a webhook URL. Note it.
3. Simulate JustDial's JSON push:
   ```powershell
   curl -X POST "http://localhost:4000/api/webhooks/justdial/byo/<your-token>" -H "Content-Type: application/json" -H "X-JD-Auth: jd-test-secret-12345" -d '{"leadid":"JD-1001","name":"Vikram Singh","mobile":"+919812345678","email":"vikram@example.com","city":"Bengaluru","category":"Real Estate","requirement":"3BHK in Whitefield"}'
   ```
4. You should get `{"ok":true,"id":"<some-id>","deduped":false}` and see a new Lead with `source = "JustDial"`, name "Vikram Singh", and notes containing `category: Real Estate` and `requirement: 3BHK in Whitefield`.

### Test 2 — Push variant XML (older JustDial accounts send this)

5. Run:
   ```powershell
   $xml = "<lead><leadid>JD-1002</leadid><customer_name>Asha Rao</customer_name><mobile_number>+919900000000</mobile_number><email_id>asha@example.com</email_id><city_name>Hyderabad</city_name></lead>"
   curl -X POST "http://localhost:4000/api/webhooks/justdial/byo/<your-token>" -H "Content-Type: application/xml" -H "X-JD-Auth: jd-test-secret-12345" -d $xml
   ```
6. You should get 200 OK. Notice the field names — `customer_name`, `mobile_number`, `email_id`, `city_name` — are all different from the JSON test, but the fuzzy mapper handles them all correctly.

### Test 3 — Bad header rejection

7. Same cURL as test 1, but change `X-JD-Auth` value to something wrong → `401 Verification failed`.

### Test 4 — Pull variant with a local mock server

8. Start a fake JustDial endpoint locally. In a NEW terminal:
   ```powershell
   node -e "const http=require('http'); http.createServer((req,res)=>{console.log('mock JD hit:', new Date().toISOString()); res.writeHead(200,{'Content-Type':'application/json'}); res.end(JSON.stringify({leads:[{leadid:'JD-'+Date.now(),name:'Mock Pull Lead',mobile:'+918888'+Math.floor(Math.random()*1000000).toString().padStart(6,'0'),email:'mock@example.com',city:'Pune',requirement:'Mock'}]}));}).listen(7777,()=>console.log('mock JustDial on :7777'));"
   ```
9. In Bizzfly, click Connect on JustDial → switch to the **Pull API** tab.
10. Fill in:
    - Label: "JD Pull Test"
    - Endpoint URL: `http://localhost:7777/leads`
    - Auth type: Basic Auth
    - Username: `test`, Password: `test`
    - Poll interval: 300
11. Click Save.
12. Click **Test Connection** — toast should say "Endpoint reachable. 1 lead(s) in last 1h."
13. Wait up to 65 seconds. The mock server's terminal should show "mock JD hit:" at least once. A new Lead "Mock Pull Lead" appears in Bizzfly with `source = "JustDial"`.

### Test 5 — Failure resilience

14. Stop the mock server (Ctrl+C in its terminal). Wait one tick (~60 seconds).
15. In Bizzfly's Integrations panel, the JustDial Pull row should show an error like "fetch failed" in its status — but the row stays ACTIVE (transient errors don't auto-disable; that's a Phase 6 job).

---

# Phase 5 — IndiaMART

## What this gives you

The simplest of the five. The tenant logs into seller.indiamart.com, clicks one button to generate a "CRM Key," pastes it into Bizzfly's wizard. That's it. From that moment on, Bizzfly polls IndiaMART every 5 minutes and pulls new leads — no webhook to configure on IndiaMART's side, no developer account, no waiting.

Only requirement: the tenant must be on a **paid IndiaMART plan** (Star tier or higher, TrustSEAL). Free listings don't include API access.

## How it actually works

IndiaMART's API is pull-only — they don't push. Every 5 minutes, Bizzfly:
1. Looks at the timestamp of the last successful poll for this integration (or 24 hours ago, if it's a fresh connection)
2. Asks IndiaMART "give me all leads between [last poll time] and now"
3. IndiaMART responds with a JSON array of recent leads, each with a unique ID, sender name, sender mobile, sender email, sender city, subject, query message
4. Bizzfly dedupes by the lead's unique ID (so retries or overlapping windows don't create duplicates)
5. Maps each lead to our standard Lead shape — name/phone/email/city become Lead columns; subject/query message/product name/sender company are stashed as notes (real-estate agents care about all of this context)
6. Saves the Lead with `source = "IndiaMART"` and fires the standard notification

Two quirks worth knowing about:
- **IndiaMART's API server is fixed at IST.** No matter what time zone our server is in, the API expects "YYYY-MM-DD HH:mm:ss" timestamps in IST. The driver converts automatically.
- **IndiaMART caps a single API call at 7 days of leads.** If an integration is paused for weeks and then re-enabled, Bizzfly breaks the catch-up backfill into week-long chunks automatically.

The background poller is the same one Phase 4 introduced — IndiaMART just plugs in alongside JustDial Pull.

## How to test Phase 5

You don't actually need an IndiaMART account to test the plumbing — a local mock endpoint works. For a real test, any IndiaMART seller account with the API tier enabled is enough.

### Test 1 — Real account (recommended if you have one)

1. Log into seller.indiamart.com → Lead Manager → Import/Export Leads → API tab → Generate API Key. Copy the long string.
2. In Bizzfly, Settings → Integrations → click Connect on IndiaMART
3. Fill in:
   - Label: "Acme IndiaMART"
   - CRM Key: paste the key from step 1
4. Click Save.
5. Click **Test Connection** in the saved row:
   - Paid plan with leads in last 24h → "Endpoint reachable. N lead(s) in last 24h."
   - Paid plan with no recent leads → "Endpoint reachable. 0 lead(s) in last 24h." (still proves the key works)
   - Free plan → IndiaMART's own error message: "Lead API not available on your current plan"
   - Bad key → IndiaMART's "Invalid CRM Key" or similar
6. Wait up to 60 seconds. If you have recent leads on IndiaMART, they'll appear in Bizzfly with `source = "IndiaMART"` and notes containing subject + query message + product name.

### Test 2 — Local mock (no IndiaMART account)

You need to temporarily change the IndiaMART endpoint URL in the driver code so it points at your local mock instead of the real IndiaMART API.

7. **Edit** `backend/src/modules/integrations/drivers/indiamart.driver.js`, find the line `const ENDPOINT = "https://mapi.indiamart.com/wservce/crm/crmListing/v2/";` and change to `const ENDPOINT = "http://localhost:7778/crm/v2/";`. Restart backend.
8. Start the mock IndiaMART server in a NEW terminal:
   ```powershell
   node -e "const http=require('http'); http.createServer((req,res)=>{const u=new URL(req.url,'http://x');console.log('mock IM hit:',u.searchParams.get('start_time'),'->',u.searchParams.get('end_time')); res.writeHead(200,{'Content-Type':'application/json'}); res.end(JSON.stringify({CODE:200,RESPONSE:[{UNIQUE_QUERY_ID:'IM-'+Date.now(),SENDER_NAME:'Mock IM Buyer',SENDER_MOBILE:'+919900000000',SENDER_EMAIL:'mock-im@example.com',SENDER_CITY:'Pune',SUBJECT:'3BHK in Baner',QUERY_MESSAGE:'Interested in possession-ready units under 1.5 Cr',QUERY_TIME:'2026-05-19 12:00:00'}]}));}).listen(7778,()=>console.log('mock IndiaMART on :7778'));"
   ```
9. Connect an IndiaMART integration in Bizzfly with any 20+ character string as the CRM Key (e.g. `test-crm-key-1234567890abcdef`).
10. Click **Test Connection** → "Endpoint reachable. 1 lead(s) in last 24h."
11. Wait up to 60 seconds. A Lead "Mock IM Buyer" appears in Bizzfly, notes containing "Subject: 3BHK in Baner" and "Query: Interested in possession-ready units under 1.5 Cr".
12. **When done, revert the ENDPOINT line back to the real IndiaMART URL** and restart backend.

### Test 3 — Failure paths

13. **Wrong CRM Key (real account):** edit the integration → paste a deliberately wrong key → Save → click Test → IndiaMART's "Invalid CRM Key" message should appear verbatim.
14. **Rate-limit safety:** the FE doesn't let tenants set a poll interval shorter than 300 seconds, AND the backend validation also rejects anything below 300. This is on purpose — IndiaMART rate-limits at 5 calls per 5 minutes per key.
15. **Long catch-up backfill (advanced):** in Prisma Studio or via SQL, set `lastPolledAt = NOW() - INTERVAL '20 days'` on the integration row. Wait one tick. The driver will chunk that 20-day range into three 7-day windows and ingest each.

---

# Phase 6 — Polish & operations

## What this gives you

Up to now, the system *works* — leads flow in, dedupe works, tenants can connect any of the five providers. Phase 6 makes the whole thing *operate* well over time:

- **A stats strip at the top of the Integrations page** showing total connections, leads received in the last 24 hours, and error count. So OWNER can glance at it and know if everything's healthy without inspecting each row.
- **A red "Needs attention" banner** when any integration is broken (status not ACTIVE), so it's impossible to miss.
- **An hourly health-check** running in the background. Every hour, Bizzfly silently re-runs Test Connection against every active integration. If a Page Access Token expires overnight, if Google revokes a refresh token, if IndiaMART rotates a key — Bizzfly notices within an hour instead of when the tenant eventually wonders why leads stopped coming.
- **An in-app "your integration is disconnected" notification** the first time a previously-working integration starts failing. OWNER + ADMIN both get pinged. Clicking the notification takes them straight to the Integrations panel. Not spammed on every subsequent failure — only on the first transition from healthy to broken.
- **A Reconnect button** that appears inline on any broken row, opening the same wizard but pre-labeled. Tenants don't have to hunt for "Edit" — the path to fix it is the most prominent button.
- **A Recent Events viewer** per integration. Click the little tree-icon and a modal shows the last 50 inbound webhook deliveries with status (PROCESSED / DUPLICATE / FAILED), timestamp, the lead's external ID, the error message if any, and a click-to-expand payload preview. This is the "why didn't my lead arrive?" tool.

## How it actually works

### The hourly health check

A second background scheduler (separate from the pull-poller from Phase 4) wakes up every hour. On each wake-up it:
1. Loads every integration whose status is currently ACTIVE
2. For each one, skips it if Test Connection was already run in the last 30 minutes (no point re-running what the tenant just clicked)
3. Otherwise calls the same `testConnection()` function the manual Test button uses — same DB updates, same notifications, same status transitions
4. Logs how many were probed and how many broke

Why hourly and not daily? Daily means a tenant could be silently broken for up to 24 hours before they get pinged. Hourly catches it within an hour. None of the providers complained about hourly probes during dev.

Why 30 minutes of skip-grace? If a tenant manually clicked Test 5 minutes ago, re-running it as part of the cron would burn API quota for no benefit.

### The "first failure" notification

The trick to not spamming the bell is detecting the **transition** — going from ACTIVE to INVALID. The cron asks the system "what was this integration's status before I called Test Connection?" If it was ACTIVE and now it's INVALID, fire the notification. If it was already INVALID and stayed INVALID, stay quiet — the user already saw the first ping. The wording is plain: "Facebook & Instagram integration disconnected — 'Acme Realty Main Page' stopped working: <reason>".

### The stats strip

When the Integrations page loads, the frontend asks the backend for a stats summary. The backend runs three quick queries:
1. Count integration rows by status (so we know how many are healthy / broken)
2. Count leads created in the last 24 hours grouped by source label (Facebook, Google Ads, Website, JustDial, IndiaMART)
3. Count webhook events with `status = FAILED` in the last 24 hours

The aggregation happens server-side so the FE just renders three number cards: total connections, leads in last 24h, errors in last 24h.

### Recent events viewer

Every inbound webhook has been recorded into a `WebhookEvent` table since Phase 0 — we use it for dedupe. Phase 6 surfaces those rows as an inspector. The endpoint returns the last 50 events for one integration with their status, timing, external ID, error message, and a truncated payload preview (500 chars). When the operator clicks a row, it expands to show the prettified JSON inline.

This is intentionally read-only. No "retry this event" button, no full-payload download. If a real customer asks for those, we add them; until then it's YAGNI.

## How to test Phase 6

You need at least one integration already connected from Phases 1–5. The easiest is Phase 3 (Website Forms) because it works on pure localhost.

### Test 1 — Stats strip renders

1. Go to **Settings → Integrations**. You should see three number cards at the top:
   - **Connections** — total count of all your integrations across providers, with a subline saying "all healthy" or "N broken"
   - **Leads · last 24h** — count of leads created from integrations in the last 24h
   - **Errors · last 24h** — count of FAILED webhook events
2. Fire a Website Forms test event (from Phase 3's test). Refresh. Leads count should go up by 1.

### Test 2 — Broken-integration banner

3. Edit a connected Meta or Google integration → paste a deliberately wrong secret → Save
4. Click **Test** on the row. Status flips to INVALID.
5. The row now shows:
   - A red triangle warning icon instead of the provider icon
   - A red background tint
   - A `invalid` badge
   - A prominent **Reconnect** button (primary blue, not just the small Edit icon)
6. A red banner appears at the top of the page: "1 integration needs attention — Look for the Reconnect buttons below…"
7. Click **Reconnect** — opens the integration's wizard for re-pasting credentials.

### Test 3 — Recent Events viewer

8. On any connected integration row, click the small **tree icon** (between Test and Edit buttons).
9. A modal opens showing the last 50 events. If you've fired test events from Phase 3 or curl-tested any provider, they'll be listed.
10. Click any row → it expands to show the JSON payload that arrived (or, for poll-based providers, the payload that was pulled from the provider).
11. Status badge colors:
    - **PROCESSED** (green) — webhook came in, dedupe was clean, Lead was created
    - **DUPLICATE** (grey) — identical external ID already seen, ignored
    - **FAILED** (red) — error during processing; error message shown
12. Click **Refresh** in the modal to pull the latest events without closing.
13. For an integration with zero events: the modal shows a helpful empty state explaining when events will appear.

### Test 4 — Hourly health-check + "disconnected" notification

This is the most fiddly to test because the cron is hourly. There's a trick — manually trigger one tick to skip the wait.

14. Make sure you have at least one **ACTIVE** integration with intentionally broken credentials. The easiest way: connect Meta or Google with realistic-looking but invalid values (e.g. Meta with App Secret = "definitely-wrong"), then DON'T click Test on it yet — so it's `ACTIVE` from the system's perspective.
15. In a terminal, manually trigger one health-check tick:
    ```powershell
    cd backend
    node -e "require('dotenv').config(); const s=require('./src/modules/integrations/pollers/healthCheck.scheduler'); s._tickForTest().then(()=>{console.log('done'); process.exit(0);});"
    ```
16. The script runs the same code path the hourly cron uses. Logs show "health-check: tick complete probed=N broke=M".
17. Go to Bizzfly → click the bell icon. You should see a notification: **"Facebook & Instagram integration disconnected — '<your label>' stopped working: <error reason>"**. Same for ADMIN role users in the same tenant.
18. Click the notification → it deep-links to `/settings?tab=integrations&reconnect=<id>` (the route works; the auto-open-reconnect-modal behavior is a polish-on-polish nice-to-have we'd add if customers ask).
19. The integration row shows INVALID status + Reconnect button + the banner appears at the top.

### Test 5 — Notification is not spammed

20. Run the same tick command again from step 15. The integration is still INVALID.
21. Check the bell — no NEW notification fires. We only ping on the ACTIVE→INVALID transition; staying INVALID doesn't re-ping.
22. Now fix the credentials (paste correct ones) → Save → Test → status flips back to ACTIVE.
23. Run the tick command once more, then break the credentials again, then tick. A NEW notification fires because it transitioned ACTIVE→INVALID again.

### Test 6 — 30-minute skip grace

24. Click Test manually on a healthy integration. `lastVerifiedAt` updates to now.
25. Run the tick command from step 15. In the logs, you should see fewer integrations probed than the previous tick — the one you just manually tested was skipped.

### Test 7 — Logging visibility

26. Watch the backend's stdout. Every hour you should see a `health-check: tick complete probed=N broke=M durationMs=…` log line. Every 60 seconds you'll see the pull-poller's similar line (from Phase 4).

## Notes & gotchas

- **The health-check scheduler reuses the same code as the manual Test Connection button.** This means a bug in the health check is also a bug in the manual button, and a fix to one helps the other. Don't duplicate the logic.
- **Notifications fire on transition only.** This is intentional — failing-then-staying-failed is one event, not N events. The flip-side: if a tenant ignores the notification and the integration stays broken for a week, they don't get a reminder. The Phase 6 banner at the top of the page is the persistent reminder; the bell ping is the one-time alert.
- **No emails yet.** Phase 6 ships in-app notifications only. The plumbing for email already exists in the project (used for invites). Wiring "integration disconnected" emails on top of the existing notification is a 2-hour change when needed; we left it for the first real customer who requests it.
- **The Reconnect button opens the same Edit wizard.** It's not a separate "rescue mode" flow. The wizard already knows how to handle blank credential fields (kept-existing). Visually we just promote the button to primary blue when status != ACTIVE so it stands out.
- **The Events viewer is the most useful debugging tool we have.** When a tenant says "the Meta integration isn't working but Bizzfly says it's healthy", check the events viewer. FAILED rows with error messages tell you exactly what went wrong in the receive→fetch→map→ingest pipeline.
- **Stats are computed live on every page load.** Aggregations are cheap at our scale. If a tenant has thousands of integrations or millions of leads in 24h, we'd need to cache or denormalize, but until then this is fine.

These quick checks don't change as phases are added — they confirm the shared plumbing is still healthy.

- [ ] Backend boots without errors (`cd backend; npm run dev`)
- [ ] Frontend builds without errors (`cd frontend; npx vite build`)
- [ ] Integration tables exist in the DB (one row in `_prisma_migrations` for `20260519030000_integrations_init`)
- [ ] Settings → Integrations page renders five provider cards
- [ ] All five providers show "Connect" (none stuck on "Coming soon" anymore)
- [ ] Test Connection on a connected row updates `lastVerifiedAt`
- [ ] Disconnecting an integration immediately stops it accepting webhooks (returns 404)
- [ ] Bell notification fires for OWNER + MANAGER on every newly created lead, regardless of which provider sent it

---

# Notes & gotchas (accumulated across phases)

Things that surprised us and might surprise you later:

- **The icon library we use is missing Facebook + Instagram + Chrome + Github brand icons.** When building UI for new providers, don't import those — they won't be there. Use generic icons (Plug, Globe) instead.
- **JavaScript's CommonJS modules can deadlock if two files require each other in a cycle.** We hit this when the driver registry tried to import each driver file and each driver file tried to import the registry to call `register()`. Fixed by having the registry call `register(require(...))` itself instead. If you add a sixth driver later, follow the same pattern — driver files only export their driver object, never import the registry.
- **Webhook requests need their original bytes preserved.** Express normally throws away the raw request body once it's parsed into JSON. For Meta's HMAC signature check (and Website Forms in signed mode) we keep the raw bytes available alongside the parsed body — but only on `/api/webhooks/*` and `/api/intake/*` paths. If you add a new path that needs raw body access, update the list.
- **JustDial sometimes sends XML, sometimes JSON, sometimes form-encoded.** The webhook router accepts all three by running parsers in sequence. If a future tenant reports their JustDial webhook isn't ingesting, check the request's Content-Type — it might be something we don't yet handle.
- **IndiaMART's API server is hardcoded to IST.** Doesn't matter what time zone the Bizzfly server is in; we always format timestamps as IST when calling IndiaMART. If a tenant reports "duplicate-heavy" polls, double-check the IST conversion isn't off.
- **The poller doesn't auto-disable a failing integration on first failure.** A 503 from JustDial or a temporary network blip shouldn't kill an integration. The poller logs the error and moves on. Auto-disabling failing integrations is a Phase 6 job (daily health check, then mark as INVALID and email the tenant).
- **The migration for the integrations tables was applied separately**, not via `npx prisma migrate dev`. If a teammate clones the repo, they'll need to either run our SQL migration manually or run the full Prisma migrate (which will also apply the unrelated global-unique-email migration). Coordinate before doing either.
