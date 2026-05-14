// Notes API service — wraps /api/notes endpoints
// TODO(S4-BE-B-02): uncomment real API calls when backend notes module lands
import { api } from "@/lib/api"

const unwrap = (res) => res?.data ?? res ?? null

export const noteService = {
  list: async (leadId) => unwrap(await api.get("/notes", { params: { leadId } })),
  create: async (body) => unwrap(await api.post("/notes", body)),
  update: async (id, body) => unwrap(await api.patch(`/notes/${id}`, body)),
  delete: async (id) => unwrap(await api.delete(`/notes/${id}`)),
}
