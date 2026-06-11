import { api } from "@/lib/api"

const unwrap = (res) => res?.data ?? res

export const journalService = {
  listByDate: (date) => api.get(`/journal?date=${date}`).then(unwrap),
  noteCounts: (from, to) => api.get(`/journal/note-counts?from=${from}&to=${to}`).then(unwrap),
  create: ({ date, title, description }) =>
    api.post("/journal", { date, title, description }).then(unwrap),
  remove: (id) => api.delete(`/journal/${id}`).then(unwrap),
  daySummary: (date) => api.get(`/journal/day-summary?date=${date}`).then(unwrap),
}
