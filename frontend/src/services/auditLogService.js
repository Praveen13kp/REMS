import { api } from "@/lib/api"

const unwrap = (res) => res?.data ?? res ?? null

export const auditLogService = {
  // Tenant-wide audit log feed for OWNER/ADMIN.
  list: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v != null && v !== ""),
    ).toString()
    return api.get(`/audit-log${qs ? `?${qs}` : ""}`).then(unwrap)
  },
}
