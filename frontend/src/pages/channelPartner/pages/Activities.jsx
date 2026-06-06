import { useEffect, useMemo, useState } from "react"
import { useNavigate, useOutletContext } from "react-router-dom"
import { Activity, ArrowRight, Search } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"

export default function Activities() {
  const ctx = useOutletContext()
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [type, setType] = useState("")

  useEffect(() => {
    if (!ctx?.activeCompanyId) return
    setLoading(true)
    api
      .get(`/channel-partner/dashboard?companyId=${encodeURIComponent(ctx.activeCompanyId)}`)
      .then((res) => setItems(res?.data?.recentActivity ?? []))
      .catch((err) => toast.error(err?.message || "Failed"))
      .finally(() => setLoading(false))
  }, [ctx?.activeCompanyId])

  // Type options derived from the loaded feed so the dropdown only ever
  // offers values that can actually match.
  const typeOptions = useMemo(
    () => [...new Set(items.map((a) => a.type).filter(Boolean))].sort(),
    [items],
  )

  const filtered = useMemo(() => {
    let rows = items
    if (type) rows = rows.filter((a) => (a.type || "") === type)
    if (search) {
      const q = search.toLowerCase()
      rows = rows.filter((a) => (a.content || "").toLowerCase().includes(q))
    }
    return rows
  }, [items, type, search])

  const hasFilters = !!(search || type)
  const clearFilters = () => {
    setSearch("")
    setType("")
  }

  return (
    <>
      <div className="cp-page-head">
        <div>
          <h1>Activity Timeline</h1>
          <p>Status changes, notes, shares, and deal updates in chronological order.</p>
        </div>
      </div>

      <div className="cp-card">
        <div className="cp-table-toolbar" style={{ border: 0, padding: "0 0 16px", background: "transparent" }}>
          <div style={{ position: "relative", flex: 1, maxWidth: 320 }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: 11, color: "var(--lp-text-muted)" }} />
            <input
              className="input"
              placeholder="Search activity…"
              style={{ paddingLeft: 32 }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="select" style={{ maxWidth: 180 }} value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All types</option>
            {typeOptions.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          {hasFilters && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={clearFilters}>
              Clear
            </button>
          )}
          <div style={{ marginLeft: "auto", fontSize: 12, color: "var(--lp-text-muted)" }}>
            {filtered.length} of {items.length}
          </div>
        </div>

        {loading ? (
          <p className="text-muted">Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="cp-empty">
            <div className="icon"><Activity size={28} /></div>
            {hasFilters && items.length > 0 ? (
              <>
                <h3>No activity matches your filters</h3>
                <p>Try adjusting or clearing the filters above.</p>
              </>
            ) : (
              <>
                <h3>No activity yet</h3>
                <p>As you work leads in this company, every change shows up here.</p>
              </>
            )}
          </div>
        ) : (
          <div className="cp-timeline">
            {filtered.map((a) => (
              <div key={a.id} className="cp-timeline-item">
                <div className="cp-timeline-dot" />
                <div className="cp-timeline-time">{new Date(a.createdAt).toLocaleString()}</div>
                <div className="cp-timeline-body">
                  <span className="badge" style={{ marginRight: 8 }}>{a.type}</span>
                  {a.content || "—"}
                  {a.leadId && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ marginLeft: 8 }}
                      onClick={() => navigate(`/cp/leads/${a.leadId}`)}
                    >
                      View lead <ArrowRight size={11} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
