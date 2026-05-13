import { api } from "@/lib/api"

const unwrap = (res) => res?.data ?? res ?? null

export const dashboardService = {
  getOwner: async () => unwrap(await api.get("/dashboard/owner")),
  getAgent: async () => unwrap(await api.get("/dashboard/agent")),
  getManager: async () => unwrap(await api.get("/dashboard/manager")),
}
