// Platform Overview dashboard. Wired to /api/admin/* endpoints.
// KPI banner -> /admin/stats
// System Health -> /admin/health
// Recent Sign-Ups -> /admin/signups/recent
//
// MRR will sit at ₹0 until real billing lands. MAU isn't tracked yet, so we
// show Total Users instead and label it accordingly.

import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import {
  Building,
  Users,
  IndianRupee,
  HeartPulse,
  TrendingUp,
} from "lucide-react"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js"
import { Bar } from "react-chartjs-2"
import { fmt } from "@/lib/format"
import { useAuthStore } from "@/stores/authStore"
import { adminService } from "@/services/adminService"

// chart.js v4 ships modular — register the pieces we use once at module
// load so every Bar instance picks them up.
ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

// Live plan codes are FREE / PRO / ENTERPRISE. Legacy codes are kept in the
// map so historical rows still render a readable label until they're
// migrated/normalised on the next write.
const PLAN_LABELS = {
  BASIC: "Basic",
  PRO: "Pro",
  ENTERPRISE: "Enterprise",
  FREE: "Basic",
  FREE_TRIAL: "Basic",
  STARTER: "Pro",
  PROFESSIONAL: "Pro",
}

const STATUS_TONE = {
  healthy: "badge-success",
  degraded: "badge-warning",
  down: "badge-error",
  unknown: "badge-muted",
}

function statusBadge(s) {
  const key = String(s || "unknown").toLowerCase()
  return STATUS_TONE[key] || "badge-muted"
}

export default function SuperAdmin() {
  const navigate = useNavigate()
  const currentUser = useAuthStore((s) => s.user)
  const [stats, setStats] = useState(null)
  const [health, setHealth] = useState(null)
  const [signups, setSignups] = useState([])
  const [weekly, setWeekly] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      adminService.getStats().catch(() => null),
      adminService.getHealth().catch(() => null),
      adminService.getRecentSignups().catch(() => []),
      adminService.getSignupsWeekly().catch(() => []),
    ])
      .then(([s, h, r, w]) => {
        if (cancelled) return
        setStats(s)
        setHealth(h)
        setSignups(Array.isArray(r) ? r : r?.items ?? [])
        setWeekly(Array.isArray(w) ? w : w?.items ?? [])
      })
      .catch((err) => {
        if (!cancelled) toast.error(err?.message || "Failed to load dashboard")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const firstName = (currentUser?.name || "Admin").split(" ")[0]

  // Chart data: BE returns rows of { week: "YYYY-MM-DD" (week start), count }.
  // Memoised so chart.js doesn't re-mount on unrelated state changes.
  const chartData = useMemo(() => {
    const labels = weekly.map((w) => {
      const d = new Date(w.week)
      return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
    })
    return {
      labels,
      datasets: [
        {
          label: "New organisations",
          data: weekly.map((w) => w.count ?? 0),
          backgroundColor: "rgba(139, 92, 246, 0.6)",
          borderColor: "rgba(139, 92, 246, 1)",
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    }
  }, [weekly])

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => `Week of ${items[0].label}`,
            label: (ctx) => `${ctx.parsed.y} new org${ctx.parsed.y === 1 ? "" : "s"}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: "var(--lp-text-muted)", font: { size: 11 } },
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: "var(--lp-text-muted)",
            font: { size: 11 },
            precision: 0,
            stepSize: 1,
          },
          grid: { color: "rgba(255,255,255,0.05)" },
        },
      },
    }),
    [],
  )

  const weeklyTotal = weekly.reduce((sum, w) => sum + (w.count ?? 0), 0)

  const totalOrgs = stats?.totalCompanies ?? 0
  const totalUsers = stats?.totalUsers ?? 0
  const newOrgs7d = stats?.newSignups7d ?? 0
  const mrr = stats?.mrr ?? 0

  // Derive an overall health rollup from the per-service statuses.
  const healthSummary = (() => {
    if (!health) return { label: "Unknown", tone: "badge-muted" }
    const statuses = [health.database, health.emailService].filter(Boolean)
    if (statuses.some((s) => String(s).toLowerCase() === "down")) {
      return { label: "Degraded", tone: "badge-error" }
    }
    if (statuses.some((s) => String(s).toLowerCase() === "degraded")) {
      return { label: "Degraded", tone: "badge-warning" }
    }
    return { label: "Healthy", tone: "badge-success" }
  })()

  return (
    <>
      <div className="content-head">
        <div>
          <h1>Platform Overview</h1>
          <p>System-wide metrics across all organisations, {firstName}.</p>
        </div>
        <div className="row">
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => navigate("/admin/orgs")}
          >
            View Organisations
          </button>
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => navigate("/admin/subscriptions")}
          >
            View Subscriptions
          </button>
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => navigate("/admin/users")}
          >
            All Users
          </button>
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => navigate("/admin/audit-log")}
          >
            Audit Log
          </button>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi">
          <div className="kpi-head">
            <div className="l">Total Orgs</div>
            <div className="kpi-icon kpi-icon-amber">
              <Building size={18} />
            </div>
          </div>
          <div className="kpi-value">
            {loading ? "—" : totalOrgs.toLocaleString("en-IN")}
          </div>
          <div className="kpi-trend up">
            <TrendingUp size={12} />
            {newOrgs7d > 0
              ? ` +${newOrgs7d} this week`
              : " No new orgs this week"}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-head">
            <div className="l">Total Users</div>
            <div className="kpi-icon kpi-icon-blue">
              <Users size={18} />
            </div>
          </div>
          <div className="kpi-value">
            {loading ? "—" : totalUsers.toLocaleString("en-IN")}
          </div>
          <div className="kpi-trend">
            <span className="text-xs text-muted">
              Across all organisations
            </span>
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-head">
            <div className="l">MRR</div>
            <div className="kpi-icon kpi-icon-purple">
              <IndianRupee size={18} />
            </div>
          </div>
          <div className="kpi-value">{loading ? "—" : fmt.inr(mrr)}</div>
          <div className="kpi-trend">
            <span className="text-xs text-muted">
              {loading
                ? "—"
                : `${stats?.activeSubscriptions ?? 0} active subscription${(stats?.activeSubscriptions ?? 0) === 1 ? "" : "s"}`}
            </span>
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-head">
            <div className="l">Platform Health</div>
            <div className="kpi-icon kpi-icon-green">
              <HeartPulse size={18} />
            </div>
          </div>
          <div className="kpi-value" style={{ fontSize: 22 }}>
            <span className={`badge ${healthSummary.tone}`}>
              {healthSummary.label}
            </span>
          </div>
          <div className="kpi-trend">
            <span className="text-xs text-muted">
              {health?.apiUptime
                ? `API uptime ${health.apiUptime}`
                : "Status unknown"}
            </span>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div
          className="row row-between"
          style={{ alignItems: "center", marginBottom: 8 }}
        >
          <div>
            <div className="card-title" style={{ marginBottom: 2 }}>
              Sign-ups (last 12 weeks)
            </div>
            <p className="text-xs text-muted" style={{ margin: 0 }}>
              New organisations registered each week.
            </p>
          </div>
          {!loading && (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 20, fontWeight: 700 }}>
                {weeklyTotal}
              </div>
              <div className="text-xs text-muted">total in window</div>
            </div>
          )}
        </div>
        <div style={{ height: 220, position: "relative" }}>
          {loading ? (
            <div
              style={{
                display: "grid",
                placeItems: "center",
                height: "100%",
                color: "var(--lp-text-muted)",
                fontSize: 13,
              }}
            >
              Loading…
            </div>
          ) : weekly.length === 0 ? (
            <div
              style={{
                display: "grid",
                placeItems: "center",
                height: "100%",
                color: "var(--lp-text-muted)",
                fontSize: 13,
              }}
            >
              No sign-up data yet.
            </div>
          ) : (
            <Bar data={chartData} options={chartOptions} />
          )}
        </div>
      </div>

      <div
        className="grid grid-2"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 14,
          marginBottom: 24,
        }}
      >
        <div className="card">
          <div className="card-title">System Health</div>
          {loading ? (
            <p className="text-muted text-sm">Loading…</p>
          ) : !health ? (
            <p className="text-muted text-sm">No health data.</p>
          ) : (
            <div className="stack" style={{ gap: 14 }}>
              <div className="row row-between">
                <div>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>API Uptime</span>
                  <div className="text-xs text-muted">Since process start</div>
                </div>
                <span className="badge badge-success">{health.apiUptime}</span>
              </div>
              <div className="row row-between">
                <div>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Database</span>
                  {typeof health.databaseLatencyMs === "number" && (
                    <div className="text-xs text-muted">
                      {health.databaseLatencyMs} ms ping
                    </div>
                  )}
                </div>
                <span className={`badge ${statusBadge(health.database)}`}>
                  {health.database}
                </span>
              </div>
              <div className="row row-between">
                <div>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>
                    Email Service
                  </span>
                  {health.emailMode && (
                    <div className="text-xs text-muted">
                      {health.emailMode === "smtp"
                        ? "SMTP transport"
                        : "Console fallback (SMTP not configured)"}
                    </div>
                  )}
                </div>
                <span className={`badge ${statusBadge(health.emailService)}`}>
                  {health.emailService}
                </span>
              </div>
              <div className="row row-between">
                <div>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>
                    Webhook Backlog
                  </span>
                  <div className="text-xs text-muted">
                    Unprocessed inbound webhook events
                  </div>
                </div>
                <span
                  className={`badge ${
                    (health.jobs?.queued ?? 0) > 10
                      ? "badge-warning"
                      : "badge-muted"
                  }`}
                >
                  {health.jobs?.queued ?? 0}
                </span>
              </div>
              {typeof health.storage?.usedPct === "number" && (
                <div>
                  <div
                    className="row row-between"
                    style={{ marginBottom: 6 }}
                  >
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>
                        Storage Used
                      </span>
                      {typeof health.storage.usedBytes === "number" && (
                        <div className="text-xs text-muted">
                          {fmt.bytes
                            ? fmt.bytes(health.storage.usedBytes)
                            : `${(health.storage.usedBytes / (1024 * 1024)).toFixed(1)} MB`}{" "}
                          of{" "}
                          {typeof health.storage.quotaBytes === "number"
                            ? `${(health.storage.quotaBytes / (1024 * 1024 * 1024)).toFixed(0)} GB`
                            : "quota"}
                        </div>
                      )}
                    </div>
                    <span
                      className={`badge ${
                        health.storage.usedPct >= 80
                          ? "badge-error"
                          : health.storage.usedPct >= 60
                            ? "badge-warning"
                            : "badge-success"
                      }`}
                    >
                      {health.storage.usedPct}%
                    </span>
                  </div>
                  <div
                    style={{
                      height: 8,
                      borderRadius: 999,
                      background: "var(--lp-surface-2, #1f2330)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.min(100, health.storage.usedPct)}%`,
                        height: "100%",
                        background: "var(--lp-accent, #f59e0b)",
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-title">Recent Sign-Ups</div>
          {loading ? (
            <p className="text-muted text-sm">Loading…</p>
          ) : signups.length === 0 ? (
            <p className="text-muted text-sm" style={{ padding: "14px 0" }}>
              No sign-ups yet.
            </p>
          ) : (
            signups.slice(0, 5).map((o) => (
              <div
                key={o.id}
                className="row"
                style={{
                  padding: "10px 0",
                  borderBottom: "1px solid var(--border)",
                  cursor: "pointer",
                }}
                onClick={() => navigate("/admin/orgs")}
              >
                <div
                  className="kpi-icon kpi-icon-amber"
                  style={{ width: 32, height: 32 }}
                >
                  <Building size={14} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{o.name}</div>
                  <div className="text-xs text-muted">
                    {(o._count?.users ?? o.userCount ?? 0)} user
                    {(o._count?.users ?? o.userCount ?? 0) === 1 ? "" : "s"} ·{" "}
                    {PLAN_LABELS[o.subscriptionPlan] || o.subscriptionPlan || "—"}
                  </div>
                </div>
                <span className="text-xs text-muted">{fmt.ago(o.createdAt)}</span>
              </div>
            ))
          )}
          <button
            className="btn btn-ghost"
            type="button"
            style={{ marginTop: 12 }}
            onClick={() => navigate("/admin/orgs")}
          >
            View all organisations →
          </button>
        </div>
      </div>

    </>
  )
}
