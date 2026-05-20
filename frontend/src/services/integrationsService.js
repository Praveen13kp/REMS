// Integrations API service — wraps /api/integrations endpoints for the
// multi-provider BYO lead capture system. See docs/integrations/.
import { api } from "@/lib/api"

const unwrap = (res, key) => res?.[key] ?? res?.data?.[key] ?? null

export const integrationsService = {
  list: async () => unwrap(await api.get("/integrations"), "integrations") || [],
  create: async (body) => unwrap(await api.post("/integrations", body), "integration"),
  update: async (id, body) => unwrap(await api.patch(`/integrations/${id}`, body), "integration"),
  delete: async (id) => api.delete(`/integrations/${id}`),
  test: async (id) => {
    const res = await api.post(`/integrations/${id}/test`)
    return res?.result ?? res?.data?.result ?? res
  },
  stats: async () => unwrap(await api.get("/integrations/stats"), "stats"),
  events: async (id, limit = 50) =>
    unwrap(await api.get(`/integrations/${id}/events`, { params: { limit } }), "events") || [],
}
