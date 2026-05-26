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
  const pagination = useNotificationStore((s) => s.pagination)
  const fetchItems = useNotificationStore((s) => s.fetchItems)
  const markRead = useNotificationStore((s) => s.markRead)
  const markAllRead = useNotificationStore((s) => s.markAllRead)
  const removeItem = useNotificationStore((s) => s.remove)
  const removeMultiple = useNotificationStore((s) => s.removeMultiple)
  const clearAll = useNotificationStore((s) => s.clearAll)

  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({
    status: "all",
    search: "",
    pageSize: 50,
  })
  const [selected, setSelected] = useState([])
  const [selectionMode, setSelectionMode] = useState(false)
  const [clearOpen, setClearOpen] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    await fetchItems({ 
      page: 1, 
      pageSize: filter.pageSize,
      filter: filter.status, 
      search: filter.search 
    })
    setLoading(false)
    setSelected([])
    setSelectionMode(false)
  }, [fetchItems, filter.pageSize, filter.status, filter.search])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    const poll = async () => {
      if (document.visibilityState !== "visible") return
      // Silently refresh in the background
      await fetchItems({ 
        page: 1, 
        pageSize: filter.pageSize,
        filter: filter.status, 
        search: filter.search 
      })
    }
    const id = setInterval(poll, 60000)
    return () => clearInterval(id)
  }, [fetchItems, filter.pageSize, filter.status, filter.search])

  const handleMarkRead = (id) => {
    if (selectionMode) {
      setSelected((prev) =>
        prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
      )
      return
    }
    markRead(id)
  }

  const handleMarkAll = async () => {
    await markAllRead()
    toast.success("Marked all read")
    refresh()
  }

  const handleClearAll = () => {
    setClearOpen(false)
    clearAll()
    toast.success("Cleared all notifications")
    setSelected([])
    setSelectionMode(false)
  }

  const handleRemove = async (id) => {
    await removeItem(id)
    toast.info("Notification deleted")
    refresh()
  }

  const handleBatchDelete = async () => {
    if (selected.length === 0) return
    await removeMultiple(selected)
    toast.success(`Deleted ${selected.length} notifications`)
    setSelected([])
    setSelectionMode(false)
    refresh()
  }

  const toggleSelect = (e, id) => {
    e.stopPropagation()
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    )
  }

  const toggleSelectAll = () => {
    if (selected.length === storeItems.length) {
      setSelected([])
    } else {
      setSelected(storeItems.map((n) => n.id))
    }
  }

  const enterSelectionMode = () => {
    setSelectionMode(true)
    setSelected([])
  }

  const exitSelectionMode = () => {
    setSelectionMode(false)
    setSelected([])
  }

  const hasFilter = filter.status !== "all" || filter.search || filter.pageSize !== 50

  return (
    <>
      <div className="content-head">
        <div>
          <h1>Notifications</h1>
          <p>
            {pagination.unread} unread of {pagination.all} total.
          </p>
        </div>
        <div className="row">
          {!selectionMode && storeItems.length > 0 && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={enterSelectionMode}
            >
              Select
            </button>
          )}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleMarkAll}
            disabled={pagination.unread === 0}
          >
            <CheckCheck size={14} /> Mark all read
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setClearOpen(true)}
            disabled={pagination.all === 0}
          >
            <Trash2 size={14} /> Clear all
          </button>
        </div>
      </div>

      <div className="card card-pad-0">
        {selectionMode ? (
          <div
            className="table-toolbar"
            style={{ 
              background: "var(--lp-accent-subtle, rgba(63, 131, 248, 0.1))",
              borderBottom: "1px solid var(--border)"
            }}
          >
            <div className="row" style={{ gap: 12 }}>
              <span className="text-sm font-medium">
                {selected.length} selected
              </span>
            </div>
            <div className="row">
              <button 
                className="btn btn-danger btn-sm"
                onClick={handleBatchDelete}
                disabled={selected.length === 0}
              >
                <Trash2 size={14} /> Delete Selected
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={exitSelectionMode}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div
            className="table-toolbar"
            style={{ borderBottom: "1px solid var(--border)", gap: 12 }}
          >
            <div className="row" style={{ gap: 6, flexWrap: "wrap", flex: 1 }}>
              {[
                ["all", "All", pagination.all],
                ["unread", "Unread", pagination.unread],
                ["read", "Read", pagination.read],
              ].map(([k, l, c]) => (
                <button
                  key={k}
                  type="button"
                  className={`btn btn-sm ${
                    filter.status === k ? "btn-primary" : "btn-secondary"
                  }`}
                  onClick={() => {
                    setFilter({ ...filter, status: k })
                  }}
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

            <div className="row" style={{ gap: 8 }}>
              <span className="text-xs text-muted">Show:</span>
              <select
                className="select btn-sm"
                style={{ width: "auto", padding: "2px 24px 2px 8px", height: 32 }}
                value={filter.pageSize}
                onChange={(e) => setFilter({ ...filter, pageSize: Number(e.target.value) })}
              >
                {[10, 50, 100, 250, 500, 1000].map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            <input
              className="input"
              style={{ flex: "none", width: 200 }}
              value={filter.search}
              placeholder="Search…"
              onChange={(e) => {
                setFilter({ ...filter, search: e.target.value })
              }}
            />
            {hasFilter && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setFilter({ status: "all", search: "", pageSize: 50 })
                }}
              >
                Reset
              </button>
            )}
          </div>
        )}

        <div className="notif-list">
          {loading ? (
            <div
              style={{
                padding: "40px 20px",
                textAlign: "center",
                color: "var(--lp-text-muted)",
                fontSize: "0.933rem",
              }}
            >
              Loading notifications…
            </div>
          ) : storeItems.length === 0 ? (
            <div className="empty-state">
              <div className="icon">
                <BellOff size={28} />
              </div>
              <h3>{pagination.all === 0 ? "No notifications" : "No matches"}</h3>
              <p>
                {pagination.all === 0
                  ? "You're all caught up."
                  : "Try clearing filters."}
              </p>
            </div>
          ) : (
            <>
              {storeItems.map((n) => {
                const Ic = ICONS[n.type] || Info
                return (
                  <div
                    key={n.id}
                    className={`notif ${n.readAt ? "" : "unread"} ${selected.includes(n.id) ? "selected" : ""}`}
                    onClick={() => handleMarkRead(n.id)}
                    style={{ position: 'relative' }}
                  >
                    <div
                      className="row"
                      style={{ gap: 12, alignItems: "flex-start" }}
                    >
                      {selectionMode && (
                        <input 
                          type="checkbox" 
                          className="checkbox mt-2"
                          checked={selected.includes(n.id)}
                          onChange={(e) => toggleSelect(e, n.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}
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
                        <div className="d">{n.body}</div>
                        <div className="ts">
                          {fmt.ago(n.createdAt)}
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
                      {!selectionMode && (
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
                      )}
                    </div>
                  </div>
                )
              })}

              {pagination.total > filter.pageSize && (
                <div style={{ padding: "12px 16px", textAlign: "center", borderTop: "1px solid var(--border)" }}>
                  <p className="text-xs text-muted">
                    Showing top {storeItems.length} of {pagination.total} notifications. 
                    Increase the "Show" limit to see more.
                  </p>
                </div>
              )}
            </>
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
