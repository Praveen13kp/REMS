import { api } from "@/lib/api"

const unwrap = (res) => res?.data ?? res ?? null

export const billingInvoiceService = {
  list: async (params) => unwrap(await api.get("/billing/invoices", { params })),
  getById: async (id) => unwrap(await api.get(`/billing/invoices/${id}`)),
}

export const billingPaymentService = {
  list: async (params) => unwrap(await api.get("/billing/invoice-payments", { params })),
  getById: async (id) => unwrap(await api.get(`/billing/invoice-payments/${id}`)),
}


