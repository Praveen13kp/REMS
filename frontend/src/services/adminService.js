// Platform Admin API service — wraps /api/admin/* endpoints
// TODO(S4-BE-A-03): replace stubs with real API calls when backend endpoints are ready
import { api } from "@/lib/api"

const unwrap = (res) => res?.data ?? res ?? null

export const adminService = {
  getStats: async () => unwrap(await api.get("/admin/stats")),
  getHealth: async () => unwrap(await api.get("/admin/health")),
  getCompanies: async () => unwrap(await api.get("/admin/companies")),
  getCompany: async (id) => unwrap(await api.get(`/admin/companies/${id}`)),
  patchCompany: async (id, body) => unwrap(await api.patch(`/admin/companies/${id}`, body)),
  getRecentSignups: async () => unwrap(await api.get("/admin/signups/recent")),
  getSignupsWeekly: async () => unwrap(await api.get("/admin/signups/weekly")),
  getActivity: async () => unwrap(await api.get("/admin/activity")),
}
