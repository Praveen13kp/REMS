# Razorpay Dashboard Setup — Handover

> **Audience:** the person with access to the Razorpay merchant account.
> **What you do here:** generate test API keys and configure ONE webhook.
> **What you do NOT do here:** create Subscription Plans manually — our
> app creates them automatically through the Razorpay API the moment our
> SuperAdmin sets prices. No manual plan setup needed.

This is the **test mode** setup. Live mode follows the same steps once
KYC is complete and you switch the dashboard toggle to "Live".

---

## 1. Generate API keys (the only thing you need to send us)

1. Sign in to the **Razorpay Dashboard** → top-right toggle must show
   **Test Mode**.
2. **Settings** → **API Keys** → **Generate Test Key**.
3. Razorpay shows two values exactly **once**:
   - `Key Id` — looks like `rzp_test_xxxxxxxxxxxx`
   - `Key Secret` — long opaque string
4. **Copy both immediately.** Razorpay won't show the secret again.

These two values are everything we need from you on the credentials front.
The same `Key Id` is what the dashboard sometimes calls "public test
key id" — it's a single value used both on the server and the browser.
It's not a secret; only the `Key Secret` is.

---

## 2. Configure the webhook

The webhook is how Razorpay tells our backend "the customer paid" — it's
what flips a customer's plan from Basic → Pro after they pay.

1. **Settings** → **Webhooks** → **Add new webhook**.
2. **Webhook URL** — depends on where the backend is deployed. Ask the
   dev team for the exact URL. Format:
   - **Production**: `https://<our-backend-domain>/api/billing/webhooks/razorpay`
   - **Staging / Dev**: `https://<ngrok-or-tunnel-url>/api/billing/webhooks/razorpay`
3. **Secret** — generate a strong random string (40+ chars, alphanumeric).
   Easiest with a password manager. **Save this — you'll send it to us
   in §3.**
4. **Active events** — tick exactly these seven and leave everything else off:

   - ☑ `subscription.activated`
   - ☑ `subscription.charged`
   - ☑ `subscription.cancelled`
   - ☑ `subscription.completed`
   - ☑ `subscription.expired`
   - ☑ `subscription.halted`
   - ☑ `payment.captured`

5. Click **Create Webhook**. Razorpay sends a test ping immediately — it
   will fail until we add the secret on our side. That's expected.

---

## 3. Send us these three values

Paste the following into a secure channel (password manager share link,
encrypted email, **not** plain Slack/email):

```
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
```

That's it. Three values total:
- the public-and-server `Key Id` (from §1)
- the server-only `Key Secret` (from §1)
- the webhook secret you generated (from §2)

> ⚠️ Treat `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` like
> passwords. Never email them in plaintext, never commit to git, never
> paste in chat-history-retained systems.

---

## 4. What our app does automatically (no work for you)

You do NOT need to manually create the 4 Subscription Plans in the
Razorpay dashboard. Our app creates them via the Razorpay API the
moment a SuperAdmin edits a price in `/admin/plans`. Here's the flow:

1. SuperAdmin sets Pro Monthly price to ₹2,499 in our app.
2. Our backend calls `rzp.plans.create({ amount: 249900, period: "monthly", ... })`.
3. Razorpay returns a `plan_xxxxxxxx` ID.
4. We store it on the Plan row.
5. New customer signs up for Pro → uses this plan ID → Razorpay charges
   ₹2,499/mo on schedule.

You'll see the auto-created plans appear in your dashboard under
**Subscriptions → Plans** as soon as our SuperAdmin uses the feature.
You don't need to touch them.

---

## 5. Test card numbers (for QA, no real money moves)

| Type | Number | Behavior |
|---|---|---|
| Standard success | `4111 1111 1111 1111` | Charges accepted in test mode |
| 3D-Secure success | `5104 0600 0000 0008` | Triggers OTP flow then succeeds |
| Generic failure | `4242 4242 4242 4242` | Razorpay returns "payment failed" |
| Insufficient funds | `5555 5555 5555 4444` | Razorpay returns "insufficient funds" |

All test cards accept any 3-digit CVV and any future MM/YY expiry.

---

## 6. Going live (later)

When ready for real customers:

1. Razorpay dashboard → **Activate Account** → complete KYC (PAN, GSTIN,
   bank account, business proof, etc.). Takes a few days.
2. Once activated, switch the dashboard toggle from **Test** to **Live**.
3. **Re-do this entire document in live mode**: generate new live API
   keys, configure the live webhook. (Plans will be re-created
   automatically the first time SuperAdmin edits a price in live mode.)
4. Send us the new `rzp_live_*` keys + webhook secret.
5. We swap `.env` to live values and restart.

Our app shows a red "LIVE MODE" warning on the Plans page when live
keys are in use, so admins can never confuse the two environments.

---

## 7. Quick checklist before sending

Before sharing the values, confirm:

- [ ] Test API keys generated (`rzp_test_*`)
- [ ] Webhook URL set to the address we provided
- [ ] Webhook secret generated (40+ chars, random)
- [ ] All 7 webhook events ticked
- [ ] Webhook is **Active** (not paused)
- [ ] All three values (`KEY_ID`, `KEY_SECRET`, `WEBHOOK_SECRET`) shared via
      a secure channel

That's all. End of handover.
