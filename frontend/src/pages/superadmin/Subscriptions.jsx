// Platform-admin view of every Razorpay subscription across all tenants.
// Pairs with the new "MRR" KPI on the main SuperAdmin page which now sums
// active subscription amounts from this same table.

import { useEffect, useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { toast } from "sonner"
import { CreditCard, IndianRupee, RefreshCw, Search, TrendingUp, Building, Filter, Columns3, ListChecks, X, Calendar, Tag, Repeat, Hash, Clock } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

import { adminService } from "@/services/adminService"
import { fmt } from "@/lib/format"

const STATUS_BADGE = {
  ACTIVE: "badge-success",
  CREATED: "badge-info",
  HALTED: "badge-warning",
  CANCELLED: "badge-error",
  EXPIRED: "badge-muted",
}

const PLAN_BADGE = {
  PRO: "badge-info",
  ENTERPRISE: "badge-warning",
}

function StatTile({ label, value, icon: Icon, tone = "kpi-icon-purple" }) {
  return (
    <div className="kpi">
      <div className="kpi-head">
        <div className="l">{label}</div>
        <div className={`kpi-icon ${tone}`}>
          <Icon size={18} />
        </div>
      </div>
      <div className="kpi-value">{value}</div>
    </div>
  )
}

const SUBS_COLUMNS = [
  { key: "organisation", label: "Organisation", icon: Building },
  { key: "plan", label: "Plan", icon: TrendingUp },
  { key: "cycle", label: "Cycle", icon: Repeat },
  { key: "amount", label: "Amount", icon: IndianRupee },
  { key: "status", label: "Status", icon: Tag },
  { key: "period", label: "Period", icon: Calendar },
  { key: "razorpayId", label: "Razorpay ID", icon: Hash },
]

export default function Subscriptions() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [subs, setSubs] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")

  const statusFilter = searchParams.get("status") ?? "ACTIVE"
  const planFilter = searchParams.get("plan") ?? ""
  const columnsParam = searchParams.get("columns") ?? ""
  const visibleColumns = useMemo(() => {
    if (!columnsParam) return SUBS_COLUMNS.map((c) => c.key)
    return columnsParam.split(",").filter((k) => SUBS_COLUMNS.some((c) => c.key === k))
  }, [columnsParam])

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

  const toggleColumn = (key) => {
    const current = new Set(visibleColumns)
    if (current.has(key)) {
      if (current.size <= 1) return
      current.delete(key)
    } else {
      current.add(key)
    }
    updateParams({ columns: [...current].join(",") || null })
  }

  const toggleAllColumns = () => {
    const allKeys = SUBS_COLUMNS.map((c) => c.key)
    const allVisible = allKeys.every((k) => visibleColumns.includes(k))
    if (allVisible) {
      updateParams({ columns: allKeys[0] })
    } else {
      updateParams({ columns: allKeys.join(",") || null })
    }
  }

  const load = async () => {
    setLoading(true)
    try {
      const [s, st] = await Promise.all([
        adminService.getSubscriptions().catch(() => []),
        adminService.getStats().catch(() => null),
      ])
      setSubs(Array.isArray(s) ? s : [])
      setStats(st)
    } catch (err) {
      toast.error(err?.message || "Failed to load subscriptions")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return subs.filter((s) => {
      if (statusFilter !== "ALL" && s.status !== statusFilter) return false
      if (planFilter && s.plan !== planFilter) return false
      if (!q) return true
      return (
        (s.companyName || "").toLowerCase().includes(q) ||
        (s.companyEmail || "").toLowerCase().includes(q) ||
        (s.razorpaySubscriptionId || "").toLowerCase().includes(q)
      )
    })
  }, [subs, query, statusFilter, planFilter])

  // Filter chips
  const chips = []
  if (statusFilter !== "ACTIVE") chips.push({ label: `Status: ${statusFilter}`, clear: () => updateParams({ status: "ACTIVE" }) })
  if (planFilter) chips.push({ label: `Plan: ${planFilter}`, clear: () => updateParams({ plan: null }) })
  const hasFilters = chips.length > 0
  const clearAllFilters = () => updateParams({ status: "ACTIVE", plan: null })

  // Row selection
  const [selected, setSelected] = useState(new Set())
  useEffect(() => { setSelected(new Set()) }, [query, statusFilter, planFilter])
  const toggleRow = (id, on) => {
    setSelected((prev) => { const next = new Set(prev); if (on) next.add(id); else next.delete(id); return next })
  }
  const toggleAll = (on) => { setSelected(on ? new Set(filtered.map((s) => s.id)) : new Set()) }
  const allSelected = filtered.length > 0 && filtered.every((s) => selected.has(s.id))

  return (
    <>
      <div className="content-head">
        <div>
          <h1>Subscriptions</h1>
          <p>
            All Razorpay subscriptions across the platform.{" "}
            {stats && (
              <>
                <b>{stats.activeSubscriptions ?? 0}</b> active ·{" "}
                <b>{stats.trialCompanies ?? 0}</b> on trial
              </>
            )}
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
            onClick={load}
            disabled={loading}
            title="Reload"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {stats && (
        <div className="kpi-grid">
          <StatTile
            label="MRR"
            value={loading ? "—" : fmt.inr(stats.mrr ?? 0)}
            icon={IndianRupee}
            tone="kpi-icon-purple"
          />
          <StatTile
            label="Active subscriptions"
            value={loading ? "—" : stats.activeSubscriptions ?? 0}
            icon={CreditCard}
            tone="kpi-icon-green"
          />
          <StatTile
            label="Pro / Enterprise"
            value={
              loading
                ? "—"
                : `${stats.proSubscriptions ?? 0} / ${stats.enterpriseSubscriptions ?? 0}`
            }
            icon={TrendingUp}
            tone="kpi-icon-blue"
          />
          <StatTile
            label="Companies on trial"
            value={loading ? "—" : stats.trialCompanies ?? 0}
            icon={CreditCard}
            tone="kpi-icon-amber"
          />
        </div>
      )}

      <div className="table-wrap">
        <div className="table-toolbar">
          <div className="topbar-search">
            <Search size={16} />
            <input
              placeholder="Search by company, email, or Razorpay ID…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="row" style={{ marginLeft: "auto", gap: 6 }}>
            {selected.size > 0 && (
              <>
                <span style={{ fontSize: "0.867rem", color: "var(--lp-text-muted)", whiteSpace: "nowrap" }}>
                  {selected.size} selected
                </span>
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => setSelected(new Set())}>
                  Clear selection
                </button>
              </>
            )}
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
              <PopoverContent align="start" className="min-w-[200px] p-2">
                <div className="stack" style={{ gap: "4px" }}>
                  <div>
                    <label className="label" style={{ fontSize: "0.75rem", marginBottom: 2, display: "block" }}>Status</label>
                    <select className="select" style={{ fontSize: "0.8rem", padding: "5px 8px" }}
                      value={statusFilter}
                      onChange={(e) => updateParams({ status: e.target.value })}
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="CREATED">Pending checkout</option>
                      <option value="HALTED">Halted</option>
                      <option value="CANCELLED">Cancelled</option>
                      <option value="EXPIRED">Expired</option>
                      <option value="ALL">All</option>
                    </select>
                  </div>
                  <div>
                    <label className="label" style={{ fontSize: "0.75rem", marginBottom: 2, display: "block" }}>Plan</label>
                    <select className="select" style={{ fontSize: "0.8rem", padding: "5px 8px" }}
                      value={planFilter}
                      onChange={(e) => updateParams({ plan: e.target.value || null })}
                    >
                      <option value="">All plans</option>
                      <option value="PRO">Pro</option>
                      <option value="ENTERPRISE">Enterprise</option>
                    </select>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" className="btn btn-sm btn-secondary">
                  <Columns3 size={14} /> Columns
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="min-w-[200px] p-2">
                <div className="stack" style={{ gap: "2px" }}>
                  <label className="column-option" style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", borderRadius: "var(--lp-radius-input)", cursor: "pointer", fontSize: "0.867rem", borderBottom: "1px solid var(--lp-border)", marginBottom: 4 }}>
                    <input type="checkbox"
                      checked={SUBS_COLUMNS.every((c) => visibleColumns.includes(c.key))}
                      onChange={toggleAllColumns}
                      style={{ accentColor: "var(--lp-accent)", width: 15, height: 15 }}
                    />
                    <ListChecks size={15} style={{ color: "var(--lp-text-muted)", flexShrink: 0 }} />
                    Select All
                  </label>
                  {SUBS_COLUMNS.map((col) => (
                    <label key={col.key} className="column-option" style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", borderRadius: "var(--lp-radius-input)", cursor: "pointer", fontSize: "0.867rem" }}>
                      <input type="checkbox"
                        checked={visibleColumns.includes(col.key)}
                        onChange={() => toggleColumn(col.key)}
                        style={{ accentColor: "var(--lp-accent)", width: 15, height: 15 }}
                      />
                      <col.icon size={15} style={{ color: "var(--lp-text-muted)", flexShrink: 0 }} />
                      {col.label}
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            {hasFilters && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={clearAllFilters}>
                Clear filters
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
        <div className="table-scroll">
          <table className="data">
            <thead>
              <tr>
                <th style={{ width: 40 }}>
                  <input type="checkbox" checked={allSelected} onChange={(e) => toggleAll(e.target.checked)} aria-label="Select all" />
                </th>
                {visibleColumns.includes("organisation") && <th>Organisation</th>}
                {visibleColumns.includes("plan") && <th>Plan</th>}
                {visibleColumns.includes("cycle") && <th>Cycle</th>}
                {visibleColumns.includes("amount") && <th>Amount</th>}
                {visibleColumns.includes("status") && <th>Status</th>}
                {visibleColumns.includes("period") && <th>Period</th>}
                {visibleColumns.includes("razorpayId") && <th>Razorpay ID</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={visibleColumns.length + 1} style={{ textAlign: "center", padding: 24, color: "var(--lp-text-muted)" }}>
                    Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length + 1} style={{ textAlign: "center", padding: 24, color: "var(--lp-text-muted)" }}>
                    No subscriptions match.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <input type="checkbox" checked={selected.has(s.id)} onChange={(e) => toggleRow(s.id, e.target.checked)} aria-label={`Select ${s.companyName || s.id}`} />
                    </td>
                    {visibleColumns.includes("organisation") && (
                      <td>
                        <div style={{ fontWeight: 600 }}>{s.companyName || "—"}</div>
                        <div className="text-xs text-muted">{s.companyEmail}</div>
                      </td>
                    )}
                    {visibleColumns.includes("plan") && (
                      <td>
                        <span className={`badge ${PLAN_BADGE[s.plan] || "badge-muted"}`}>
                          {s.plan}
                        </span>
                      </td>
                    )}
                    {visibleColumns.includes("cycle") && <td style={{ textTransform: "capitalize" }}>{s.billingCycle}</td>}
                    {visibleColumns.includes("amount") && (
                      <td>
                        <span className="row" style={{ gap: 2 }}>
                          <IndianRupee size={12} />
                          {(s.amount / 100).toLocaleString("en-IN")}
                          <span className="text-xs text-muted" style={{ marginLeft: 4 }}>
                            /mo
                          </span>
                        </span>
                      </td>
                    )}
                    {visibleColumns.includes("status") && (
                      <td>
                        <span className={`badge ${STATUS_BADGE[s.status] || "badge-muted"}`}>
                          {s.status}
                        </span>
                      </td>
                    )}
                    {visibleColumns.includes("period") && (
                      <td>
                        {s.currentPeriodStart ? (
                          <span className="text-xs">
                            {fmt.date(s.currentPeriodStart)} →{" "}
                            {fmt.date(s.currentPeriodEnd)}
                          </span>
                        ) : (
                          <span className="text-xs text-muted">—</span>
                        )}
                      </td>
                    )}
                    {visibleColumns.includes("razorpayId") && (
                      <td>
                        <code style={{ fontSize: "0.733rem", color: "var(--lp-text-muted)" }}>
                          {s.razorpaySubscriptionId || "—"}
                        </code>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
