import { create } from "zustand"
import { api } from "@/lib/api"

export const useNotificationStore = create((set, get) => ({
  items: [],
  unreadCount: 0,
  loading: false,

  fetchItems: async () => {
    try {
      const res = await api.get("/notifications", { params: { pageSize: 50 } })
      const list = res?.data?.items ?? res?.items ?? []
      const items = Array.isArray(list) ? list : []
      const unreadCount = items.filter((n) => !n.readAt).length
      set({ items, unreadCount })
      return items
    } catch {
      return []
    }
  },

  fetchUnreadCount: async () => {
    try {
      const res = await api.get("/notifications/unread-count")
      const count = res?.data?.count ?? res?.count ?? 0
      set({ unreadCount: count })
      return count
    } catch {
      return 0
    }
  },

  markRead: async (id) => {
    const prev = get().items
    const stamp = new Date().toISOString()
    set((s) => ({
      items: s.items.map((n) => (n.id === id ? { ...n, readAt: stamp } : n)),
      unreadCount: Math.max(0, s.unreadCount - 1),
    }))
    try {
      await api.patch(`/notifications/${id}/read`)
    } catch {
      set((s) => ({
        items: prev,
        unreadCount: prev.filter((n) => !n.readAt).length,
      }))
    }
  },

  markAllRead: async () => {
    const prev = get().items
    set((s) => ({
      items: s.items.map((n) => (n.readAt ? n : { ...n, readAt: new Date().toISOString() })),
      unreadCount: 0,
    }))
    try {
      await api.patch("/notifications/read-all")
    } catch {
      set({
        items: prev,
        unreadCount: prev.filter((n) => !n.readAt).length,
      })
    }
  },

  remove: async (id) => {
    const prev = get().items
    const target = prev.find((n) => n.id === id)
    set((s) => ({
      items: s.items.filter((n) => n.id !== id),
      unreadCount: target && !target.readAt ? s.unreadCount - 1 : s.unreadCount,
    }))
    try {
      await api.delete(`/notifications/${id}`)
    } catch {
      set({ items: prev, unreadCount: prev.filter((n) => !n.readAt).length })
    }
  },

  clearAll: async () => {
    const prev = get().items
    set({ items: [], unreadCount: 0 })
    try {
      await api.delete("/notifications")
    } catch {
      set({ items: prev, unreadCount: prev.filter((n) => !n.readAt).length })
    }
  },
}))
