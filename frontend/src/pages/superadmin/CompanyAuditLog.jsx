// SuperAdmin drill-in: read-only view of a single company's tenant
// Activity feed. Reached from the "View audit" icon on /admin/orgs.

import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"
import {
  Activity as ActivityIcon,
  ArrowLeft,
  Building,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  Shield,
  User as UserIcon,
} from "lucide-react"

import { adminService } from "@/services/adminService"
import { fmt } from "@/lib/format"

const TYPE_LABELS = {
  SYSTEM: "System",
  STATUS_CHANGE: "Status change",
  ASSIGNMENT: "Assignment",
  CALL: "Call",
  WHATSAPP: "WhatsApp",
  EMAIL: "Email",
  NOTE: "Note",
  FILE: "File",
}

const TYPE_BADGE = {
  SYSTEM: "badge-muted",
  STATUS_CHANGE: "badge-info",
  ASSIGNMENT: "badge-warning",
  CALL: "badge-success",
  WHATSAPP: "badge-success",
  EMAIL: "badge-info",
  NOTE: "badge-muted",
  FILE: "badge-muted",
}

const PAGE_SIZE = 30

export default function CompanyAuditLog() {
  const navigate = useNavigate()
  const { id: companyId } = useParams()
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [company, setCompany] = useState(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  const load = async (p = page) => {
    setLoading(true)
    try {
      const data = await adminService.getCompanyAuditLog(companyId, {
        page: p,
        pageSize: PAGE_SIZE,
        type: typeFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      })
      setItems(data?.items || [])
      setTotal(data?.total || 0)
      setCompany(data?.company || null)
    } catch (err) {
      toast.error(err?.message || "Failed to load audit log")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(1)
    setPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, dateFrom, dateTo, companyId])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter(
      (a) =>
        (a.content || "").toLowerCase().includes(q) ||
        (a.user?.name || "").toLowerCase().includes(q) ||
        (a.user?.email || "").toLowerCase().includes(q) ||
        (a.lead?.name || "").toLowerCase().includes(q),
    )
  }, [items, search])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <>
      <div className="content-head">
        <div>
          <div
            className="row"
            style={{ alignItems: "center", gap: 8, marginBottom: 6 }}
          >
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => navigate("/admin/orgs")}
            >
              <ArrowLeft size={14} /> Back to Orgs
            </button>
          </div>
          <h1
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 4,
            }}
          >
            <Building size={20} style={{ color: "var(--lp-accent)" }} />
            {company?.name || "Company"} · Audit log
          </h1>
          <p>
            <Shield
              size={12}
              style={{ verticalAlign: "middle", marginRight: 4 }}
            />
            Read-only view of this tenant&apos;s internal activity. SuperAdmin
            access — your view does not log into the tenant&apos;s feed.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(220px, 2fr) minmax(140px, 1fr) minmax(140px, 1fr) minmax(140px, 1fr)",
            gap: 10,
            alignItems: "end",
          }}
        >
          <div>
            <label className="text-xs text-muted" style={{ marginBottom: 4, display: "block" }}>
              Search
            </label>
            <div className="topbar-search" style={{ width: "100%" }}>
              <Search size={14} />
              <input
                placeholder="Content, user, lead…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted" style={{ marginBottom: 4, display: "block" }}>
              Type
            </label>
            <select
              className="select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{ width: "100%" }}
            >
              <option value="">All types</option>
              {Object.entries(TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted" style={{ marginBottom: 4, display: "block" }}>
              From
            </label>
            <input
              type="date"
              className="input"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={{ width: "100%" }}
            />
          </div>
          <div>
            <label className="text-xs text-muted" style={{ marginBottom: 4, display: "block" }}>
              To
            </label>
            <input
              type="date"
              className="input"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={{ width: "100%" }}
            />
          </div>
        </div>
        {(typeFilter || dateFrom || dateTo) && (
          <div style={{ marginTop: 10 }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setTypeFilter("")
                setDateFrom("")
                setDateTo("")
              }}
            >
              <Filter size={12} /> Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Feed */}
      <div className="card">
        <div
          className="row row-between"
          style={{ alignItems: "center", marginBottom: 12 }}
        >
          <div className="card-title" style={{ marginBottom: 0 }}>
            <ActivityIcon size={16} style={{ verticalAlign: "middle", marginRight: 8 }} />
            Activity feed
          </div>
          <span className="text-xs text-muted">
            {total} entr{total === 1 ? "y" : "ies"}
          </span>
        </div>

        {loading ? (
          <p className="text-muted text-sm" style={{ padding: "20px 0" }}>
            Loading…
          </p>
        ) : filtered.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px 20px",
              border: "1px dashed var(--lp-border)",
              borderRadius: 8,
            }}
          >
            <ActivityIcon
              size={28}
              style={{ color: "var(--lp-text-muted)", opacity: 0.5, marginBottom: 10 }}
            />
            <div style={{ fontWeight: 600, fontSize: "0.933rem" }}>No activity yet</div>
            <p className="text-muted text-sm" style={{ margin: "6px 0 0" }}>
              This company hasn&apos;t recorded any activity for the chosen filters.
            </p>
          </div>
        ) : (
          <div>
            {filtered.map((a) => (
              <div
                key={a.id}
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-start",
                  padding: "12px 0",
                  borderBottom: "1px solid var(--lp-border)",
                }}
              >
                <div
                  className="kpi-icon kpi-icon-purple"
                  style={{ width: 32, height: 32, flex: "none" }}
                >
                  <ActivityIcon size={14} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    className="row"
                    style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}
                  >
                    <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                      {a.user?.name || a.user?.email || "System"}
                    </span>
                    <span className={`badge ${TYPE_BADGE[a.type] || "badge-muted"}`}>
                      {TYPE_LABELS[a.type] || a.type}
                    </span>
                    {a.lead && (
                      <span className="text-xs text-muted">
                        on lead{" "}
                        <b style={{ color: "var(--lp-text)" }}>{a.lead.name}</b>
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: "0.867rem",
                      color: "var(--lp-text)",
                      marginTop: 4,
                      wordBreak: "break-word",
                    }}
                  >
                    {a.content}
                  </div>
                  <div
                    className="row"
                    style={{ gap: 12, alignItems: "center", marginTop: 6 }}
                  >
                    <span
                      className="text-xs text-muted"
                      style={{ display: "inline-flex", gap: 4, alignItems: "center" }}
                    >
                      <CalendarClock size={11} />
                      {fmt.ago ? fmt.ago(a.createdAt) : fmt.date(a.createdAt)}
                    </span>
                    {a.user?.role && (
                      <span
                        className="text-xs text-muted"
                        style={{ display: "inline-flex", gap: 4, alignItems: "center" }}
                      >
                        <UserIcon size={11} />
                        {a.user.role}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div
            className="row row-between"
            style={{ alignItems: "center", marginTop: 14 }}
          >
            <span className="text-xs text-muted">
              Page {page} of {totalPages}
            </span>
            <div className="row" style={{ gap: 6 }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={page <= 1 || loading}
                onClick={() => {
                  const p = page - 1
                  setPage(p)
                  load(p)
                }}
              >
                <ChevronLeft size={14} /> Prev
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={page >= totalPages || loading}
                onClick={() => {
                  const p = page + 1
                  setPage(p)
                  load(p)
                }}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
