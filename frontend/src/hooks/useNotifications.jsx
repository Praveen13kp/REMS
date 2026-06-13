import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { useAuthStore } from "@/stores/authStore"

// Poll cadence for the bell badge + dropdown. 15s feels close to real-time
// for incoming intake leads without hammering the BE on long-idle tabs.
// We also refetch on tab focus and after mark-as-read so the count never
// lags the actual data. Realtime would need SSE/WebSockets — out of scope.
const POLL_MS = 15_000
const PANEL_LIMIT = 6

export function useNotifications(enabled, { router } = {}) {
  const [count, setCount] = useState(0)
  const [items, setItems] = useState([])
  const user = useAuthStore((s) => s.user)
  const isOwner = user?.role === "OWNER"
  const prefsRef = useRef(null)
  const seenIdsRef = useRef(null)

  const refresh = useCallback(async () => {
    if (!enabled) return
    try {
      // Fetch notification preferences once for the user to respect
      // in-app notification toggles.
      if (user?.id && prefsRef.current == null) {
        try {
          const prefsRes = await api.get("/notification-preferences")
          prefsRef.current = prefsRes?.data ?? prefsRes ?? {}
        } catch {
          prefsRef.current = {}
        }
      }

      const [countRes, listRes] = await Promise.all([
        api.get("/notifications/unread-count"),
        api.get("/notifications", { params: { pageSize: PANEL_LIMIT } }),
      ])
      setCount(Number(countRes?.count ?? countRes?.data?.count ?? 0) || 0)
      const list =
        listRes?.items ?? listRes?.data?.items ?? listRes?.data ?? []
      const arr = Array.isArray(list) ? list : []
      setItems(arr)

      // Toast popups for newly-arrived UNREAD notifications. We only toast
      // for items we haven't seen before AND that are still unread — read
      // ones we already handled or the user opened in another tab.
      const newlyUnread = arr.filter((n) => !n.readAt)
      if (seenIdsRef.current == null) {
        // First fetch — just seed the seen-set, don't fire popups for the
        // existing backlog (user may have ignored these for hours).
        seenIdsRef.current = new Set(arr.map((n) => n.id))
      } else {
        for (const n of newlyUnread) {
          if (seenIdsRef.current.has(n.id)) continue
          seenIdsRef.current.add(n.id)

          // Respect inapp preference for notification types that have a
          // preference entry. Types without a preference (e.g. NOTE_ADDED,
          // SYSTEM) always show a toast.
          if (prefsRef.current) {
            const typeKey = (n.type || "").toLowerCase()
            const pref = prefsRef.current[typeKey]
            if (pref && !pref.inapp) continue
          }

          toast.success(n.title || "New notification", {
            description: n.body,
            duration: 6000,
            action: n.link
              ? {
                  label: "View",
                  onClick: () => {
                    if (router?.navigate) router.navigate(n.link)
                    else window.location.assign(n.link)
                  },
                }
              : undefined,
          })
        }
        // Keep the seen-set bounded so it doesn't grow forever.
        if (seenIdsRef.current.size > 200) {
          const arr = [...seenIdsRef.current]
          seenIdsRef.current = new Set(arr.slice(-200))
        }
      }
    } catch {
      // ignore — preserves last value, retries on next tick
    }
  }, [enabled, router, user?.id])

  useEffect(() => {
    if (!enabled) return undefined
    refresh()
    const id = setInterval(refresh, POLL_MS)
    const onFocus = () => {
      if (document.visibilityState === "visible") refresh()
    }
    document.addEventListener("visibilitychange", onFocus)
    window.addEventListener("focus", refresh)
    return () => {
      clearInterval(id)
      document.removeEventListener("visibilitychange", onFocus)
      window.removeEventListener("focus", refresh)
    }
  }, [enabled, refresh])

  const markRead = useCallback(
    async (id) => {
      setItems((cur) =>
        cur.map((n) =>
          n.id === id && !n.readAt
            ? { ...n, readAt: new Date().toISOString() }
            : n,
        ),
      )
      setCount((c) => Math.max(0, c - 1))
      try {
        await api.patch(`/notifications/${id}/read`)
      } catch {
        refresh()
      }
    },
    [refresh],
  )

  const markAllRead = useCallback(async () => {
    setItems((cur) =>
      cur.map((n) =>
        n.readAt ? n : { ...n, readAt: new Date().toISOString() },
      ),
    )
    setCount(0)
    try {
      await api.patch("/notifications/read-all")
    } catch {
      refresh()
    }
  }, [refresh])

  return { count, items, refresh, markRead, markAllRead }
}
