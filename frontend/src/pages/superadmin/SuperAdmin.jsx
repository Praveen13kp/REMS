// TODO(S4-BE-A-03): requires /admin/stats, /admin/health, /admin/companies, /admin/activity
// Ported from leadpro-realty/src/pages/SuperAdmin.jsx. Spec adapted per task brief:
// KPI banner (Total Orgs, MAU, MRR, Health) + System Health (CPU/Memory/Disk/DB latency
// progress bars) + Recent Sign-Ups + Platform Activity. No API calls in Phase 5;
// inline stub data only. chart.js not installed — using .chart-wrap placeholder.
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import {
  Building,
  Users,
  IndianRupee,
  Activity,
  HeartPulse,
  TrendingUp,
} from "lucide-react"
import { fmt } from "@/lib/format"
import { useAuthStore } from "@/stores/authStore"

// --- Stub data (replace with API responses in S4-BE-A-03) -------------------
const STUB_KPIS = {
  totalOrgs: 128,
  mau: 1842,
  mrr: 639872,
  healthScore: 98.6,
}

const STUB_HEALTH = [
  { label: "CPU", value: 42, suffix: "%" },
  { label: "Memory", value: 67, suffix: "%" },
  { label: "Disk", value: 38, suffix: "%" },
  { label: "DB Latency", value: 18, suffix: "ms", max: 200 },
]

const STUB_SIGNUPS = [
  { id: "o1", name: "Aurum Realty Group", userCount: 14, plan: "Pro", createdAt: Date.now() - 1000 * 60 * 32 },
  { id: "o2", name: "Skyline Estates", userCount: 6, plan: "Starter", createdAt: Date.now() - 1000 * 60 * 60 * 4 },
  { id: "o3", name: "Pinecrest Properties", userCount: 22, plan: "Enterprise", createdAt: Date.now() - 1000 * 60 * 60 * 26 },
  { id: "o4", name: "Marina Homes", userCount: 9, plan: "Pro", createdAt: Date.now() - 1000 * 60 * 60 * 50 },
]

const STUB_ACTIVITY = [
  { id: "a1", actor: "system", action: "Nightly backup completed", ts: Date.now() - 1000 * 60 * 12, ip: "10.0.0.4" },
  { id: "a2", actor: "Riya Mehta", action: "Suspended org 'Lotus Builders'", ts: Date.now() - 1000 * 60 * 47, ip: "203.0.113.21" },
  { id: "a3", actor: "Arjun Verma", action: "Promoted user to admin", ts: Date.now() - 1000 * 60 * 90, ip: "203.0.113.7" },
  { id: "a4", actor: "system", action: "Plan auto-renewed for Aurum Realty", ts: Date.now() - 1000 * 60 * 60 * 3, ip: "10.0.0.4" },
  { id: "a5", actor: "Priya Shah", action: "Reset password for support@skylineestates.com", ts: Date.now() - 1000 * 60 * 60 * 8, ip: "203.0.113.55" },
]

export default function SuperAdmin() {
  const navigate = useNavigate()
  const currentUser = useAuthStore((s) => s.user)
  const [kpis] = useState(STUB_KPIS)
  const [health] = useState(STUB_HEALTH)
  const [signups] = useState(STUB_SIGNUPS)
  const [activity] = useState(STUB_ACTIVITY)

  const firstName = (currentUser?.name || "Admin").split(" ")[0]

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
          <div className="kpi-value">{kpis.totalOrgs}</div>
          <div className="kpi-trend up">
            <TrendingUp size={12} /> +2 this week
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-head">
            <div className="l">MAU</div>
            <div className="kpi-icon kpi-icon-blue">
              <Users size={18} />
            </div>
          </div>
          <div className="kpi-value">{kpis.mau.toLocaleString("en-IN")}</div>
          <div className="kpi-trend up">
            <TrendingUp size={12} /> +18.4%
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-head">
            <div className="l">MRR</div>
            <div className="kpi-icon kpi-icon-purple">
              <IndianRupee size={18} />
            </div>
          </div>
          <div className="kpi-value">{fmt.inr(kpis.mrr)}</div>
          <div className="kpi-trend up">
            <TrendingUp size={12} /> +12.4%
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-head">
            <div className="l">Health</div>
            <div className="kpi-icon kpi-icon-green">
              <HeartPulse size={18} />
            </div>
          </div>
          <div className="kpi-value">{kpis.healthScore}%</div>
          <div className="kpi-trend up">
            <TrendingUp size={12} /> All systems nominal
          </div>
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
          <div className="stack" style={{ gap: 16 }}>
            {health.map((h) => {
              const max = h.max ?? 100
              const pct = Math.min(100, Math.round((h.value / max) * 100))
              const tone =
                pct >= 80
                  ? "badge-error"
                  : pct >= 60
                    ? "badge-warning"
                    : "badge-success"
              return (
                <div key={h.label}>
                  <div
                    className="row row-between"
                    style={{ marginBottom: 6 }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 600 }}>
                      {h.label}
                    </span>
                    <span className={`badge ${tone}`}>
                      {h.value}
                      {h.suffix}
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
                        width: `${pct}%`,
                        height: "100%",
                        background: "var(--lp-accent, #f59e0b)",
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ marginTop: 18 }}>
            <div className="card-title" style={{ fontSize: 13 }}>
              Throughput (24h)
            </div>
            <div
              className="chart-wrap"
              style={{
                display: "grid",
                placeItems: "center",
                color: "var(--lp-text-muted)",
              }}
            >
              System Throughput (chart.js wiring pending)
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-title">Recent Sign-Ups</div>
          {signups.map((o) => (
            <div
              key={o.id}
              className="row"
              style={{
                padding: "10px 0",
                borderBottom: "1px solid var(--border)",
              }}
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
                  {o.userCount} users · {o.plan}
                </div>
              </div>
              <span className="text-xs text-muted">{fmt.ago(o.createdAt)}</span>
            </div>
          ))}
          <button
            className="btn btn-ghost"
            type="button"
            style={{ marginTop: 12 }}
            onClick={() => {
              toast.message("Org directory coming soon")
              navigate("/admin/orgs")
            }}
          >
            View all organisations →
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Platform Activity</div>
        {activity.map((a) => (
          <div key={a.id} className="activity-item">
            <div className="activity-dot">
              <Activity size={14} style={{ color: "var(--accent)" }} />
            </div>
            <div style={{ flex: 1 }}>
              <div className="text-sm">
                <b>{a.actor}</b> — {a.action}
              </div>
              <div className="activity-meta">
                {fmt.ago(a.ts)} · {a.ip}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
