import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import {
  Activity,
  Building,
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCw,
  Search,
  Shield,
} from "lucide-react"

import { adminService } from "@/services/adminService"
import { fmt } from "@/lib/format"

// Platform-admin audit feed. Every cross-tenant action a platform admin
// has taken — org create/suspend/delete, user disable, super-admin logins
// — in one feed for compliance + investigation.

const ACTION_LABEL = {
  COMPANY_CREATED: "Created organisation",
  COMPANY_SUSPENDED: "Suspended organisation",
  COMPANY_ACTIVATED: "Reactivated organisation",
  COMPANY_DELETED: "Deleted organisation",
  SUPER_ADMIN_LOGIN: "Platform admin signed in",
  SUPER_ADMIN_LOGIN_FAILED: "Platform admin sign-in failed",
  USER_DISABLED: "Disabled user",
  USER_ENABLED: "Re-enabled user",
  USER_UPDATED: "Updated user",
}

const ACTION_BADGE = {
  COMPANY_CREATED: "badge-success",
  COMPANY_SUSPENDED: "badge-error",
  COMPANY_ACTIVATED: "badge-success",
  COMPANY_DELETED: "badge-error",
  SUPER_ADMIN_LOGIN: "badge-info",
  SUPER_ADMIN_LOGIN_FAILED: "badge-warning",
  USER_DISABLED: "badge-error",
  USER_ENABLED: "badge-success",
  USER_UPDATED: "badge-info",
}

const PAGE_SIZE = 30

export default function PlatformAuditLog() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [actionFilter, setActionFilter] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  const load = async (p = page) => {
    setLoading(true)
    try {
      const data = await adminService.getPlatformAudit({
        page: p,
        pageSize: PAGE_SIZE,
        action: actionFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      })
      setItems(data?.items || [])
      setTotal(data?.total || 0)
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
  }, [actionFilter, dateFrom, dateTo])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const filtered = items.filter((i) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      (i.actor?.name || "").toLowerCase().includes(q) ||
      (i.actor?.email || "").toLowerCase().includes(q) ||
      (i.targetCompany?.name || "").toLowerCase().includes(q) ||
      (i.action || "").toLowerCase().includes(q)
    )
  })

  return (
    <>
      <div className="content-head">
        <div>
          <h1>Platform audit log</h1>
          <p>
            Every cross-tenant action a platform admin has taken — sign-ins,
            org create/suspend, user disable. Useful for compliance + incident
            investigation.
          </p>
        </div>
        <div className="row">
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => navigate("/admin")}
          >
            Back to overview
          </button>
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => load(page)}
            disabled={loading}
            title="Reload"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(220px, 2fr) minmax(180px, 1fr) minmax(140px, 1fr) minmax(140px, 1fr)",
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
                placeholder="Actor, company, or action…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted" style={{ marginBottom: 4, display: "block" }}>
              Action type
            </label>
            <select
              className="select"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              style={{ width: "100%" }}
            >
              <option value="">All actions</option>
              {Object.entries(ACTION_LABEL).map(([k, v]) => (
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
        {(actionFilter || dateFrom || dateTo) && (
          <div style={{ marginTop: 10 }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setActionFilter("")
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
            <Shield size={16} style={{ verticalAlign: "middle", marginRight: 8 }} />
            Audit entries
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
            <Activity
              size={28}
              style={{ color: "var(--lp-text-muted)", opacity: 0.5, marginBottom: 10 }}
            />
            <div style={{ fontWeight: 600, fontSize: 14 }}>No audit entries</div>
            <p className="text-muted text-sm" style={{ margin: "6px 0 0" }}>
              Cross-tenant platform actions will appear here.
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
                  <Activity size={14} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    className="row"
                    style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}
                  >
                    <span style={{ fontWeight: 600, fontSize: 13.5 }}>
                      {a.actor?.name || a.actor?.email || "system"}
                    </span>
                    <span className={`badge ${ACTION_BADGE[a.action] || "badge-muted"}`}>
                      {ACTION_LABEL[a.action] || a.action}
                    </span>
                    {a.targetCompany && (
                      <span
                        className="text-xs text-muted"
                        style={{ display: "inline-flex", gap: 4, alignItems: "center" }}
                      >
                        <Building size={11} />
                        {a.targetCompany.name}
                      </span>
                    )}
                  </div>
                  {a.metadata && (Object.keys(a.metadata).length > 0) && (
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--lp-text-muted)",
                        marginTop: 4,
                        fontFamily: "var(--lp-font-mono, monospace)",
                        wordBreak: "break-word",
                      }}
                    >
                      {Object.entries(a.metadata)
                        .filter(([, v]) => v != null && v !== "")
                        .slice(0, 4)
                        .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
                        .join("  ·  ")}
                    </div>
                  )}
                  <div className="text-xs text-muted" style={{ marginTop: 4 }}>
                    {fmt.ago ? fmt.ago(a.createdAt) : fmt.date(a.createdAt)}
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
