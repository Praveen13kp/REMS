import { api } from "@/lib/api"

const unwrap = (res) => res?.data ?? res ?? null

export const subscriptionService = {
  getMe: async () => unwrap(await api.get("/subscriptions/me")),
  checkout: async (plan) => unwrap(await api.post("/subscriptions/checkout", { plan })),
  confirm: async ({ plan, transactionId, paymentProvider = "MANUAL" }) =>
    unwrap(await api.post("/subscriptions/confirm", { plan, transactionId, paymentProvider })),
}
