// Platform Admin API service — wraps /api/admin/* endpoints
// TODO(S4-BE-A-03): replace stubs with real API calls when backend endpoints are ready
import { api } from "@/lib/api"

const unwrap = (res) => res?.data ?? res ?? null

export const adminService = {
  getStats: async () => unwrap(await api.get("/admin/stats")),
  getHealth: async () => unwrap(await api.get("/admin/health")),
  getCompanies: async () => unwrap(await api.get("/admin/companies")),
  getCompany: async (id) => unwrap(await api.get(`/admin/companies/${id}`)),
  createCompany: async (body) => unwrap(await api.post("/admin/companies", body)),
  patchCompany: async (id, body) => unwrap(await api.patch(`/admin/companies/${id}`, body)),
  deleteCompany: async (id) => unwrap(await api.delete(`/admin/companies/${id}`)),
  getRecentSignups: async () => unwrap(await api.get("/admin/signups/recent")),
  getSignupsWeekly: async () => unwrap(await api.get("/admin/signups/weekly")),
  getActivity: async () => unwrap(await api.get("/admin/activity")),
  getSubscriptions: async () => unwrap(await api.get("/admin/subscriptions")),
  getUsers: async (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v != null && v !== ""),
    ).toString()
    return unwrap(await api.get(`/admin/users${qs ? `?${qs}` : ""}`))
  },
  getUser: async (id) => unwrap(await api.get(`/admin/users/${id}`)),
  patchUser: async (id, body) => unwrap(await api.patch(`/admin/users/${id}`, body)),
  getPlatformAudit: async (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v != null && v !== ""),
    ).toString()
    return unwrap(await api.get(`/admin/audit-log${qs ? `?${qs}` : ""}`))
  },
  // SuperAdmin drill-in: read-only view of one company's tenant Activity.
  getInvoices: async (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v != null && v !== ""),
    ).toString()
    return unwrap(await api.get(`/admin/invoices${qs ? `?${qs}` : ""}`))
  },
  getPlans: async () => unwrap(await api.get("/admin/plans")),
  updatePlan: async (code, body) =>
    unwrap(await api.patch(`/admin/plans/${code}`, body)),
  getCompanyAuditLog: async (companyId, params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v != null && v !== ""),
    ).toString()
    return unwrap(
      await api.get(`/admin/companies/${companyId}/audit-log${qs ? `?${qs}` : ""}`),
    )
  },
}
