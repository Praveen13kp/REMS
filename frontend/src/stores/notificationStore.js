import { create } from "zustand"
import { api } from "@/lib/api"

export const useNotificationStore = create((set, get) => ({
  items: [],
  unreadCount: 0,
  loading: false,
  pagination: {
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 1,
    all: 0,
    unread: 0,
    read: 0,
  },

  fetchItems: async (params = {}) => {
    set({ loading: true })
    try {
      const { page = 1, pageSize = 20, filter = "all", search = "" } = params
      const res = await api.get("/notifications", { 
        params: { page, pageSize, filter, search } 
      })
      
      const data = res?.data ?? res
      const items = Array.isArray(data.items) ? data.items : []
      const total = data.total ?? 0
      const totalPages = Math.ceil(total / pageSize)
      
      set((s) => ({ 
        items, 
        pagination: { ...s.pagination, page, pageSize, total, totalPages },
        loading: false 
      }))

      get().fetchCounts()
      
      return items
    } catch {
      set({ loading: false })
      return []
    }
  },

  fetchCounts: async () => {
    try {
      const res = await api.get("/notifications/counts")
      const counts = res?.data ?? res
      set((s) => ({
        unreadCount: counts.unread ?? 0,
        pagination: {
          ...s.pagination,
          all: counts.all ?? 0,
          unread: counts.unread ?? 0,
          read: counts.read ?? 0,
        }
      }))
    } catch {}
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
    const wasUnread = prev.find((n) => n.id === id && !n.readAt)
    const stamp = new Date().toISOString()
    set((s) => ({
      items: s.items.map((n) => (n.id === id ? { ...n, readAt: stamp } : n)),
      unreadCount: Math.max(0, s.unreadCount - (wasUnread ? 1 : 0)),
      pagination: wasUnread
        ? {
            ...s.pagination,
            unread: Math.max(0, (s.pagination.unread || 0) - 1),
            read: (s.pagination.read || 0) + 1,
          }
        : s.pagination,
    }))
    try {
      await api.patch(`/notifications/${id}/read`)
    } catch {
      set((s) => ({
        items: prev,
        unreadCount: prev.filter((n) => !n.readAt).length,
        pagination: wasUnread
          ? {
              ...s.pagination,
              unread: (s.pagination.unread || 0) + 1,
              read: Math.max(0, (s.pagination.read || 0) - 1),
            }
          : s.pagination,
      }))
    }
  },

  markAllRead: async () => {
    const prev = get().items
    set((s) => ({
      items: s.items.map((n) => (n.readAt ? n : { ...n, readAt: new Date().toISOString() })),
      unreadCount: 0,
      pagination: { ...s.pagination, unread: 0, read: s.pagination.all || s.items.length },
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

  removeMultiple: async (ids) => {
    const prev = get().items
    set((s) => ({
      items: s.items.filter((n) => !ids.includes(n.id)),
    }))
    try {
      await api.post("/notifications/delete-multiple", { ids })
      get().fetchCounts()
    } catch {
      set({ items: prev })
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
