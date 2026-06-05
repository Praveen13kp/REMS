import { useEffect, useMemo, useState } from "react"
import { useNavigate, useOutletContext } from "react-router-dom"
import { AlertTriangle, CalendarClock, CheckCircle, Clock, Search } from "lucide-react"
import { api } from "@/lib/api"
import { fmt } from "@/lib/format"
import Pagination from "@/components/common/Pagination"

// Reuses GET /api/leads?nextFollowUpFrom/To. The CP scope is enforced
// server-side by lead.service.js (channelPartner sees only leads they
// can read across all linked companies).

export default function FollowUps() {
  const ctx = useOutletContext()
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("")

  useEffect(() => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 2, 0)
    const params = new URLSearchParams({
      nextFollowUpFrom: start.toISOString(),
      nextFollowUpTo: end.toISOString(),
      pageSize: "200",
      sort: "nextFollowUpAt:asc",
    })
    if (ctx?.activeCompanyId) params.set("companyId", ctx.activeCompanyId)
    api
      .get(`/leads?${params.toString()}`)
      .then((res) => {
        const list = res?.data?.items ?? res?.items ?? []
        setItems(Array.isArray(list) ? list : [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [ctx?.activeCompanyId])

  const statusOptions = useMemo(
    () => [...new Set(items.map((l) => l.status).filter(Boolean))].sort(),
    [items],
  )

  // Search (name/phone) + status filter apply across all three urgency
  // buckets so a filtered view stays consistent end to end (KPIs included).
  const filteredItems = useMemo(() => {
    let rows = items
    if (status) rows = rows.filter((l) => (l.status || "") === status)
    if (search) {
      const q = search.toLowerCase()
      rows = rows.filter(
        (l) => (l.name || "").toLowerCase().includes(q) || (l.phone || "").includes(q),
      )
    }
    return rows
  }, [items, search, status])

  const hasFilters = !!(search || status)
  const clearFilters = () => {
    setSearch("")
    setStatus("")
  }

  const today = filteredItems.filter((l) => isToday(l.nextFollowUpAt))
  const overdue = filteredItems.filter((l) => isOverdue(l.nextFollowUpAt))
  const upcoming = filteredItems.filter((l) => !isToday(l.nextFollowUpAt) && !isOverdue(l.nextFollowUpAt))

  return (
    <>
      <div className="cp-page-head">
        <div>
          <h1>Follow-ups</h1>
          <p>Stay on top of every lead you've committed to call back.</p>
        </div>
      </div>

      <div className="cp-table-toolbar" style={{ borderRadius: 14, border: "1px solid var(--lp-border)", marginBottom: 16 }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 320 }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: 11, color: "var(--lp-text-muted)" }} />
          <input
            className="input"
            placeholder="Search name or phone…"
            style={{ paddingLeft: 32 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="select" style={{ maxWidth: 180 }} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {statusOptions.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        {hasFilters && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={clearFilters}>
            Clear
          </button>
        )}
        <div style={{ marginLeft: "auto", fontSize: 12, color: "var(--lp-text-muted)" }}>
          {filteredItems.length} of {items.length}
        </div>
      </div>

      <div className="cp-kpi-grid">
        <Kpi label="Due Today" value={today.length} icon={Clock} />
        <Kpi label="Overdue" value={overdue.length} icon={AlertTriangle} />
        <Kpi label="Upcoming" value={upcoming.length} icon={CalendarClock} />
        <Kpi label="Total" value={filteredItems.length} icon={CheckCircle} />
      </div>

      <Section title="Overdue" rows={overdue} loading={loading} onClick={(l) => navigate(`/cp/leads/${l.id}`)} />
      <Section title="Today" rows={today} loading={loading} onClick={(l) => navigate(`/cp/leads/${l.id}`)} />
      <Section title="Upcoming" rows={upcoming} loading={loading} onClick={(l) => navigate(`/cp/leads/${l.id}`)} />
    </>
  )
}

function Section({ title, rows, loading, onClick }) {
  // Each section paginates independently. Reset to page 1 whenever the
  // section's rows change (a reload or a shift between urgency buckets).
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  useEffect(() => {
    setPage(1)
  }, [rows])
  const paged = rows.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="cp-card" style={{ marginBottom: 16 }}>
      <div className="cp-card-title">
        <span>{title} ({rows.length})</span>
      </div>
      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-muted text-sm">Nothing here.</p>
      ) : (
        <>
          <table className="cp-table">
            <thead>
              <tr>
                <th>Lead</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Follow-up at</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((l) => (
                <tr key={l.id} onClick={() => onClick(l)} style={{ cursor: "pointer" }}>
                  <td>{l.name}</td>
                  <td>{fmt.phone(l.phone)}</td>
                  <td><span className="badge">{l.status}</span></td>
                  <td>{l.nextFollowUpAt ? new Date(l.nextFollowUpAt).toLocaleString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination
            page={page}
            pageSize={pageSize}
            total={rows.length}
            onPageChange={setPage}
            onPageSizeChange={(s) => {
              setPageSize(s)
              setPage(1)
            }}
            itemLabel="follow-ups"
          />
        </>
      )}
    </div>
  )
}

function Kpi({ label, value, icon: Icon }) {
  return (
    <div className="cp-kpi">
      <div className="cp-kpi-icon"><Icon size={16} /></div>
      <div className="cp-kpi-label">{label}</div>
      <div className="cp-kpi-value">{value}</div>
    </div>
  )
}

function isToday(d) {
  if (!d) return false
  const x = new Date(d)
  const n = new Date()
  return x.getFullYear() === n.getFullYear() && x.getMonth() === n.getMonth() && x.getDate() === n.getDate()
}
function isOverdue(d) {
  if (!d) return false
  return new Date(d).getTime() < new Date().setHours(0, 0, 0, 0)
}
