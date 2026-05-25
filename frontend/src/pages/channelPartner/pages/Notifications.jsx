import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Bell, CheckCheck } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"

export default function Notifications() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    api
      .get("/notifications?pageSize=50")
      .then((res) => {
        const list = res?.data?.items ?? res?.items ?? []
        setItems(Array.isArray(list) ? list : [])
      })
      .catch((err) => toast.error(err?.message || "Failed"))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const markAll = async () => {
    try {
      await api.post("/notifications/mark-all-read")
      toast.success("Marked all as read")
      load()
    } catch (err) {
      toast.error(err?.message || "Failed")
    }
  }

  return (
    <>
      <div className="cp-page-head">
        <div>
          <h1>Notifications</h1>
          <p>Lead updates, follow-up reminders, and company messages.</p>
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={markAll}>
          <CheckCheck size={14} /> Mark all read
        </button>
      </div>

      <div className="cp-card">
        {loading ? (
          <p className="text-muted">Loading…</p>
        ) : items.length === 0 ? (
          <div className="cp-empty">
            <div className="icon"><Bell size={28} /></div>
            <h3>You're all caught up</h3>
            <p>New shares, status updates, and reminders will appear here.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {items.map((n) => (
              <Link
                key={n.id}
                to={n.link || "/cp"}
                className="cp-card"
                style={{
                  padding: "12px 14px",
                  background: n.readAt ? "var(--lp-surface)" : "var(--lp-surface-2)",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    background: n.readAt ? "var(--lp-text-dim)" : "var(--lp-accent)",
                    marginTop: 6,
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{n.title}</div>
                  {n.body && <div className="text-xs text-muted" style={{ marginTop: 2 }}>{n.body}</div>}
                  <div className="text-xs text-muted" style={{ marginTop: 4 }}>
                    {new Date(n.createdAt).toLocaleString()}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
