import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import {
  Bell,
  CheckCircle2,
  Camera,
  ExternalLink,
  Globe,
  Share2,
  Sparkles,
  UserPlus,
  X,
} from "lucide-react"
import { api } from "@/lib/api"

// Pick an icon + accent shade based on what the notification is about.
// Falls back to a generic bell so even an unknown `type` still renders
// something on-brand instead of a blank circle.
function getToastPalette(n) {
  const type = (n?.type || "").toUpperCase()
  const title = (n?.title || "").toLowerCase()
  const body = (n?.body || "").toLowerCase()
  const haystack = `${type} ${title} ${body}`

  if (/facebook/i.test(haystack)) {
    return { Icon: Share2, tint: "#1877F2", label: "Facebook lead" }
  }
  if (/instagram/i.test(haystack)) {
    return { Icon: Camera, tint: "#E4405F", label: "Instagram lead" }
  }
  if (/website|landing|webform|web form/i.test(haystack)) {
    return { Icon: Globe, tint: "#10B981", label: "Website lead" }
  }
  if (type.includes("LEAD") || /new .* lead/i.test(haystack)) {
    return { Icon: UserPlus, tint: "#6366F1", label: "New lead" }
  }
  if (type.includes("TASK") && /completed/i.test(haystack)) {
    return { Icon: CheckCircle2, tint: "#10B981", label: "Task completed" }
  }
  if (type.includes("TASK")) {
    return { Icon: Sparkles, tint: "#8B5CF6", label: "Task update" }
  }
  return { Icon: Bell, tint: "var(--lp-accent, #6366F1)", label: "Notification" }
}

function LeadToast({ n, onView, onDismiss }) {
  const { Icon, tint, label } = getToastPalette(n)
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "relative",
        display: "flex",
        alignItems: "stretch",
        gap: 0,
        minWidth: 320,
        maxWidth: 400,
        background: "var(--lp-surface, #ffffff)",
        color: "var(--lp-text, #0f172a)",
        border: "1px solid var(--lp-border, rgba(148,163,184,0.25))",
        borderRadius: 14,
        boxShadow:
          "0 18px 38px -10px rgba(15, 23, 42, 0.45), 0 4px 10px -4px rgba(15, 23, 42, 0.25)",
        overflow: "hidden",
        backdropFilter: "blur(12px)",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 4,
          flexShrink: 0,
          background: `linear-gradient(180deg, ${tint}, ${tint}99)`,
        }}
      />

      <div style={{ padding: "12px 0 12px 14px", display: "flex", alignItems: "flex-start" }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: `${tint}1A`,
            color: tint,
            flexShrink: 0,
            boxShadow: `inset 0 0 0 1px ${tint}33`,
          }}
        >
          <Icon size={18} />
        </div>
      </div>

      <div
        style={{
          flex: 1,
          padding: "12px 14px",
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
          <span
            style={{
              fontSize: 10,
              letterSpacing: 0.8,
              textTransform: "uppercase",
              fontWeight: 700,
              color: tint,
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </span>
          <span
            aria-hidden="true"
            style={{
              flex: 1,
              height: 1,
              background:
                "linear-gradient(90deg, var(--lp-border, rgba(148,163,184,0.35)), transparent)",
            }}
          />
        </div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            lineHeight: 1.25,
            color: "var(--lp-text, #0f172a)",
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 1,
            WebkitBoxOrient: "vertical",
          }}
        >
          {n.title || "New notification"}
        </div>
        {n.body && (
          <div
            style={{
              fontSize: 12.5,
              lineHeight: 1.35,
              color: "var(--lp-text-muted, #64748b)",
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              wordBreak: "break-word",
            }}
          >
            {n.body}
          </div>
        )}
        {onView && (
          <div style={{ marginTop: 4 }}>
            <button
              type="button"
              onClick={onView}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: tint,
                color: "#ffffff",
                border: 0,
                borderRadius: 8,
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: `0 6px 14px -6px ${tint}`,
              }}
            >
              View <ExternalLink size={12} />
            </button>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          width: 22,
          height: 22,
          borderRadius: 6,
          border: 0,
          background: "transparent",
          color: "var(--lp-text-muted, #94a3b8)",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <X size={13} />
      </button>
    </div>
  )
}

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
          toast.custom(
            (id) => (
              <LeadToast
                n={n}
                onView={
                  n.link
                    ? () => {
                        toast.dismiss(id)
                        if (router?.navigate) router.navigate(n.link)
                        else window.location.assign(n.link)
                      }
                    : undefined
                }
                onDismiss={() => toast.dismiss(id)}
              />
            ),
            { duration: 6000 },
          )
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
