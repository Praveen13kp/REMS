import { useCallback, useEffect, useState } from "react"
import {
  CheckCheck,
  Trash2,
  BellOff,
  Info,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { useNotificationStore } from "@/stores/notificationStore"
import { fmt } from "@/lib/format"

const ICONS = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle,
}
const COLORS = {
  info: "blue",
  success: "green",
  warning: "amber",
  error: "red",
}

export default function Notifications() {
  const storeItems = useNotificationStore((s) => s.items)
  const fetchItems = useNotificationStore((s) => s.fetchItems)
  const markRead = useNotificationStore((s) => s.markRead)
  const markAllRead = useNotificationStore((s) => s.markAllRead)
  const removeItem = useNotificationStore((s) => s.remove)
  const clearAll = useNotificationStore((s) => s.clearAll)

  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({
    status: "all",
    type: "all",
    search: "",
  })
  const [clearOpen, setClearOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchItems().finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [fetchItems])

  useEffect(() => {
    const poll = async () => {
      if (document.visibilityState !== "visible") return
      await fetchItems()
    }
    const id = setInterval(poll, 60000)
    return () => clearInterval(id)
  }, [fetchItems])

  const all = storeItems
    .slice()
    .sort((a, b) => new Date(b.ts || b.createdAt) - new Date(a.ts || a.createdAt))
  const isUnread = (n) => !n.readAt
  const totalUnread = all.filter(isUnread).length
  const totalRead = all.length - totalUnread

  let ns = all
  if (filter.status === "unread") ns = ns.filter(isUnread)
  else if (filter.status === "read") ns = ns.filter((n) => !isUnread(n))
  if (filter.type !== "all") ns = ns.filter((n) => n.type === filter.type)
  if (filter.search) {
    const q = filter.search.toLowerCase()
    ns = ns.filter((n) =>
      ((n.title || "") + (n.desc || "")).toLowerCase().includes(q),
    )
  }

  const handleMarkRead = (id) => {
    markRead(id)
  }

  const handleMarkAll = async () => {
    await markAllRead()
    toast.success("Marked all read")
  }

  const handleClearAll = () => {
    setClearOpen(false)
    clearAll()
    toast.success("Cleared all notifications")
  }

  const handleRemove = (id) => {
    removeItem(id)
    toast.info("Notification deleted")
  }

  const hasFilter =
    filter.status !== "all" || filter.type !== "all" || filter.search

  return (
    <>
      <div className="content-head">
        <div>
          <h1>Notifications</h1>
          <p>
            {totalUnread} unread of {all.length} total.
          </p>
        </div>
        <div className="row">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleMarkAll}
            disabled={totalUnread === 0}
          >
            <CheckCheck size={14} /> Mark all read
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setClearOpen(true)}
            disabled={all.length === 0}
          >
            <Trash2 size={14} /> Clear all
          </button>
        </div>
      </div>

      <div className="card card-pad-0">
        <div
          className="table-toolbar"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
            {[
              ["all", "All", all.length],
              ["unread", "Unread", totalUnread],
              ["read", "Read", totalRead],
            ].map(([k, l, c]) => (
              <button
                key={k}
                type="button"
                className={`btn btn-sm ${
                  filter.status === k ? "btn-primary" : "btn-secondary"
                }`}
                onClick={() => setFilter({ ...filter, status: k })}
              >
                {l}{" "}
                <span
                  style={{
                    marginLeft: 4,
                    padding: "1px 8px",
                    borderRadius: 999,
                    background:
                      filter.status === k
                        ? "rgba(0,0,0,.15)"
                        : "var(--surface-3)",
                    color:
                      filter.status === k ? "#0A0A0F" : "var(--text-muted)",
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  {c}
                </span>
              </button>
            ))}
          </div>
          <input
            className="input"
            style={{ flex: 1, minWidth: 160, maxWidth: 280 }}
            value={filter.search}
            placeholder="Search notifications…"
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
          />
          {hasFilter && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() =>
                setFilter({ status: "all", type: "all", search: "" })
              }
            >
              Clear
            </button>
          )}
        </div>

        <div className="notif-list">
          {loading ? (
            <div
              style={{
                padding: "40px 20px",
                textAlign: "center",
                color: "var(--lp-text-muted)",
                fontSize: 14,
              }}
            >
              Loading notifications…
            </div>
          ) : ns.length === 0 ? (
            <div className="empty-state">
              <div className="icon">
                <BellOff size={28} />
              </div>
              <h3>{all.length === 0 ? "No notifications" : "No matches"}</h3>
              <p>
                {all.length === 0
                  ? "You're all caught up."
                  : "Try clearing filters."}
              </p>
            </div>
          ) : (
            ns.map((n) => {
              const Ic = ICONS[n.type] || Info
              return (
                <div
                  key={n.id}
                  className={`notif ${n.readAt ? "" : "unread"}`}
                  onClick={() => handleMarkRead(n.id)}
                >
                  <div
                    className="row"
                    style={{ gap: 12, alignItems: "flex-start" }}
                  >
                    <div
                      className={`kpi-icon kpi-icon-${
                        COLORS[n.type] || "amber"
                      }`}
                      style={{ width: 32, height: 32, flexShrink: 0 }}
                    >
                      <Ic size={14} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="t">{n.title}</div>
                      <div className="d">{n.desc}</div>
                      <div className="ts">
                        {fmt.ago(n.ts || n.createdAt || Date.now())}
                      </div>
                    </div>
                    {!n.readAt && (
                      <span
                        className="badge badge-purple"
                        style={{ flexShrink: 0 }}
                      >
                        New
                      </span>
                    )}
                    <button
                      type="button"
                      className="btn-icon btn-ghost"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemove(n.id)
                      }}
                      title="Delete"
                      style={{ flexShrink: 0 }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {clearOpen && (
        <div className="modal-backdrop" onClick={() => setClearOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Clear all notifications?</h3>
            </div>
            <div className="modal-body">
              <p className="text-muted text-sm">This cannot be undone.</p>
            </div>
            <div className="modal-foot">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setClearOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleClearAll}
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
