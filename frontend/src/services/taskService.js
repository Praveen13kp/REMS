// Tasks API service — wraps /api/tasks endpoints (S4-BE task module).
import { api } from "@/lib/api"

const unwrap = (res) => res?.data ?? res ?? null

export const taskService = {
  list: async (params = {}) => unwrap(await api.get("/tasks", { params })),
  create: async (body) => unwrap(await api.post("/tasks", body)),
  update: async (id, body) => unwrap(await api.patch(`/tasks/${id}`, body)),
  delete: async (id) => unwrap(await api.delete(`/tasks/${id}`)),
  complete: async (id) => unwrap(await api.post(`/tasks/${id}/complete`)),
}
