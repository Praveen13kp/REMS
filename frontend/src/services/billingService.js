import { api } from "@/lib/api"

const unwrap = (res) => res?.data ?? res

export const billingService = {
  // Returns: { plan, planName, limits, features, usage, trial, ... }
  getPlan: () => api.get("/billing/plan").then(unwrap),

  // Razorpay public key + configured-ness check (FE hides Upgrade if false)
  getConfig: () => api.get("/billing/config").then(unwrap),

  // Returns: { subscription, razorpaySubscriptionId, shortUrl }
  createSubscription: ({ plan, billingCycle }) =>
    api.post("/billing/subscriptions", { plan, billingCycle }).then(unwrap),

  // Called right after Razorpay Checkout's handler fires. Posts the
  // payment_id + subscription_id + signature so the backend can verify
  // the HMAC and mark the subscription ACTIVE locally — without it the
  // FE has to wait for the webhook, which never lands on localhost.
  verifySubscription: (payload) =>
    api.post("/billing/subscriptions/verify", payload).then(unwrap),

  // Fallback for when Razorpay's webhook never reached us (localhost,
  // tunnel down, etc.). Pulls the live state from Razorpay's API and
  // updates any non-terminal subscription rows accordingly.
  reconcileSubscriptions: () =>
    api.post("/billing/subscriptions/reconcile").then(unwrap),

  cancelSubscription: (id) =>
    api.post(`/billing/subscriptions/${id}/cancel`).then(unwrap),

  listSubscriptions: () => api.get("/billing/subscriptions").then(unwrap),

  listPayments: (limit = 20) =>
    api.get(`/billing/payments?limit=${limit}`).then(unwrap),
}

