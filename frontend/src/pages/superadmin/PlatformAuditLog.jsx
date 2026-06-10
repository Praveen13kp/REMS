import { useEffect, useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
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
  X,
  Calendar,
} from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

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
  const [searchParams, setSearchParams] = useSearchParams()
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  const actionFilter = searchParams.get("action") ?? ""
  const dateFrom = searchParams.get("dateFrom") ?? ""
  const dateTo = searchParams.get("dateTo") ?? ""

  const updateParams = (patch) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === "" || v === undefined) next.delete(k)
        else next.set(k, String(v))
      }
      return next
    })
  }

  // Filter chips
  const chips = []
  if (actionFilter) chips.push({ label: `Action: ${ACTION_LABEL[actionFilter] || actionFilter}`, clear: () => updateParams({ action: null }) })
  if (dateFrom || dateTo) chips.push({ label: `Date: ${dateFrom || "…"} → ${dateTo || "…"}`, clear: () => updateParams({ dateFrom: null, dateTo: null }) })
  const hasFilters = chips.length > 0
  const clearAllFilters = () => updateParams({ action: null, dateFrom: null, dateTo: null })

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

      {/* Filters — popover style */}
      <div className="table-wrap" style={{ marginBottom: 14 }}>
        <div className="table-toolbar">
          <div className="topbar-search">
            <Search size={16} />
            <input
              placeholder="Search actor, company, or action…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="row" style={{ marginLeft: "auto", gap: 6 }}>
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" className="btn btn-sm btn-secondary">
                  <Filter size={14} /> Filters
                  {hasFilters && (
                    <span className="badge badge-muted" style={{ padding: "1px 6px", fontSize: "0.733rem", lineHeight: 1.4 }}>
                      {chips.length}
                    </span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="min-w-[220px] p-2">
                <div className="stack" style={{ gap: "4px" }}>
                  <div>
                    <label className="label" style={{ fontSize: "0.75rem", marginBottom: 2, display: "block" }}>Action type</label>
                    <select className="select" style={{ fontSize: "0.8rem", padding: "5px 8px", width: "100%" }}
                      value={actionFilter}
                      onChange={(e) => updateParams({ action: e.target.value || null })}
                    >
                      <option value="">All actions</option>
                      {Object.entries(ACTION_LABEL).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label" style={{ fontSize: "0.75rem", marginBottom: 2, display: "block" }}>From</label>
                    <input type="date" className="input" style={{ fontSize: "0.8rem", padding: "5px 8px", width: "100%" }}
                      value={dateFrom}
                      max={dateTo || undefined}
                      onChange={(e) => updateParams({ dateFrom: e.target.value || null })}
                    />
                  </div>
                  <div>
                    <label className="label" style={{ fontSize: "0.75rem", marginBottom: 2, display: "block" }}>To</label>
                    <input type="date" className="input" style={{ fontSize: "0.8rem", padding: "5px 8px", width: "100%" }}
                      value={dateTo}
                      min={dateFrom || undefined}
                      onChange={(e) => updateParams({ dateTo: e.target.value || null })}
                    />
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            {hasFilters && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={clearAllFilters}>
                Clear
              </button>
            )}
          </div>
        </div>
        {hasFilters && (
          <div style={{ padding: "10px 16px", display: "flex", gap: 6, flexWrap: "wrap", borderBottom: "1px solid var(--lp-border)" }}>
            {chips.map((c) => (
              <span key={c.label} className="badge badge-muted">
                {c.label}
                <button type="button" onClick={c.clear} aria-label={`Remove ${c.label}`} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, marginLeft: 6, display: "inline-flex", verticalAlign: "middle", lineHeight: 1 }}>
                  <X size={12} />
                </button>
              </span>
            ))}
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
            <div style={{ fontWeight: 600, fontSize: "0.933rem" }}>No audit entries</div>
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
                    <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>
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
                        fontSize: "0.8rem",
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
