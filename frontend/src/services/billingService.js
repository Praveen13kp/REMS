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

  cancelSubscription: (id) =>
    api.post(`/billing/subscriptions/${id}/cancel`).then(unwrap),

  listSubscriptions: () => api.get("/billing/subscriptions").then(unwrap),

  listPayments: (limit = 20) =>
    api.get(`/billing/payments?limit=${limit}`).then(unwrap),
}

