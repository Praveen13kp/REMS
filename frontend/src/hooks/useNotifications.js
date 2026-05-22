import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { api } from "@/lib/api"

// Poll cadence for the bell badge + dropdown. 15s feels close to real-time
// for incoming intake leads without hammering the BE on long-idle tabs.
// We also refetch on tab focus and after mark-as-read so the count never
// lags the actual data. Realtime would need SSE/WebSockets — out of scope.
const POLL_MS = 15_000
const PANEL_LIMIT = 6

export function useNotifications(enabled, { router } = {}) {
  const [count, setCount] = useState(0)
  const [items, setItems] = useState([])
  // Tracks notification IDs we've already shown a popup for so polling
  // ticks don't re-toast the same row. Populated silently on first fetch
  // (so the user doesn't get a wave of toasts when they open the app),
  // then any genuinely new ID after that triggers a popup.
  const seenIdsRef = useRef(null)

  const refresh = useCallback(async () => {
    if (!enabled) return
    try {
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
          toast(n.title || "New notification", {
            description: n.body || undefined,
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
  }, [enabled, router])

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
