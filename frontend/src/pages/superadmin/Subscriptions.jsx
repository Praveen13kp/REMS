// Platform-admin view of every Razorpay subscription across all tenants.
// Pairs with the new "MRR" KPI on the main SuperAdmin page which now sums
// active subscription amounts from this same table.

import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { CreditCard, IndianRupee, RefreshCw, Search, TrendingUp } from "lucide-react"

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

export default function Subscriptions() {
  const navigate = useNavigate()
  const [subs, setSubs] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("ACTIVE")

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
      if (!q) return true
      return (
        (s.companyName || "").toLowerCase().includes(q) ||
        (s.companyEmail || "").toLowerCase().includes(q) ||
        (s.razorpaySubscriptionId || "").toLowerCase().includes(q)
      )
    })
  }, [subs, query, statusFilter])

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
          <select
            className="select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ marginLeft: 8 }}
          >
            <option value="ACTIVE">Active</option>
            <option value="CREATED">Pending checkout</option>
            <option value="HALTED">Halted</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="EXPIRED">Expired</option>
            <option value="ALL">All</option>
          </select>
        </div>
        <div className="table-scroll">
          <table className="data">
            <thead>
              <tr>
                <th>Organisation</th>
                <th>Plan</th>
                <th>Cycle</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Period</th>
                <th>Razorpay ID</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      textAlign: "center",
                      padding: 24,
                      color: "var(--lp-text-muted)",
                    }}
                  >
                    Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      textAlign: "center",
                      padding: 24,
                      color: "var(--lp-text-muted)",
                    }}
                  >
                    No subscriptions match.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{s.companyName || "—"}</div>
                      <div className="text-xs text-muted">{s.companyEmail}</div>
                    </td>
                    <td>
                      <span className={`badge ${PLAN_BADGE[s.plan] || "badge-muted"}`}>
                        {s.plan}
                      </span>
                    </td>
                    <td style={{ textTransform: "capitalize" }}>{s.billingCycle}</td>
                    <td>
                      <span className="row" style={{ gap: 2 }}>
                        <IndianRupee size={12} />
                        {(s.amount / 100).toLocaleString("en-IN")}
                        <span className="text-xs text-muted" style={{ marginLeft: 4 }}>
                          /mo
                        </span>
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge ${STATUS_BADGE[s.status] || "badge-muted"}`}
                      >
                        {s.status}
                      </span>
                    </td>
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
                    <td>
                      <code style={{ fontSize: "0.733rem", color: "var(--lp-text-muted)" }}>
                        {s.razorpaySubscriptionId || "—"}
                      </code>
                    </td>
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
