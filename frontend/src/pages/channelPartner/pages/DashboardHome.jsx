import { useEffect, useState } from "react"
import { useOutletContext, useNavigate } from "react-router-dom"
import {
  Activity,
  Bell,
  Briefcase,
  CalendarClock,
  CheckCircle,
  ChevronRight,
  Flame,
  Plus,
  Wallet,
  Users,
} from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { fmt } from "@/lib/format"

// Channel Partner home — 7 summary cards, per-company breakdown,
// recent activity feed. Commission/deal numbers are computed where the
// data exists; everything else is real BE-backed counts.

const ZERO = { totalLeads: 0, hotLeads: 0, tasksToday: 0, sharedLeads: 0, privateLeads: 0, recentActivity: [], perCompany: [] }

export default function DashboardHome() {
  const ctx = useOutletContext()
  const navigate = useNavigate()
  const [kpis, setKpis] = useState(ZERO)
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!ctx?.activeCompanyId) return
    let cancelled = false
    setLoading(true)
    Promise.all([
      api.get(`/channel-partner/dashboard?companyId=${encodeURIComponent(ctx.activeCompanyId)}`),
      api.get("/notifications/unread-count").catch(() => ({})),
    ])
      .then(([d, n]) => {
        if (cancelled) return
        setKpis(d?.data ?? ZERO)
        setUnread(n?.data?.count ?? n?.count ?? 0)
      })
      .catch((err) => toast.error(err?.message || "Failed to load dashboard"))
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [ctx?.activeCompanyId])

  // Derive Closed Deals from the per-company groupBy where status is
  // Won/Booked. Falls back to 0 if perCompany isn't populated yet.
  const closedDeals = (kpis.perCompany || []).reduce((sum, c) => {
    const won = (c.byStatus && (c.byStatus["Won"] || 0)) || 0
    const booked = (c.byStatus && (c.byStatus["Booked"] || 0)) || 0
    return sum + won + booked
  }, 0)
  const activeLeads = (kpis.totalLeads || 0) - closedDeals

  if (!ctx?.activeCompanyId && !loading) {
    return (
      <div className="cp-empty">
        <div className="icon"><Briefcase size={28} /></div>
        <h3>Pick a company to get started</h3>
        <p>Use the company switcher at the top of the page to choose which workspace you want to manage.</p>
      </div>
    )
  }

  return (
    <>
      <div className="cp-page-head">
        <div>
          <h1>Hello{ctx?.activeCompany ? `, working in ${ctx.activeCompany.name}` : ""}</h1>
          <p>Snapshot of leads, deals, and follow-ups across your collaborations.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => navigate("/cp/my-leads?add=1")}>
          <Plus size={14} /> Add Lead
        </button>
      </div>

      <div className="cp-kpi-grid">
        <Kpi label="Total Leads" value={kpis.totalLeads ?? 0} icon={Users} />
        <Kpi label="Active Leads" value={activeLeads >= 0 ? activeLeads : 0} icon={Activity} />
        <Kpi label="Shared Leads" value={kpis.sharedLeads ?? 0} icon={Briefcase} />
        <Kpi label="Closed Deals" value={closedDeals} icon={CheckCircle} />
        <Kpi label="Hot Leads" value={kpis.hotLeads ?? 0} icon={Flame} />
        <Kpi label="Pending Follow-ups" value={kpis.tasksToday ?? 0} icon={CalendarClock} />
        <Kpi label="Notifications" value={unread} icon={Bell} />
        <Kpi label="Commission earned" value="—" icon={Wallet} hint="Coming soon" />
      </div>

      <div className="cp-dash-grid">
        <div className="cp-card">
          <div className="cp-card-title">
            <span>Companies you collaborate with</span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate("/cp/companies")}>View all →</button>
          </div>
          {(kpis.perCompany || []).length === 0 ? (
            <div className="cp-empty-mini">
              <Briefcase size={22} />
              <p>No company stats available yet.</p>
            </div>
          ) : (
            <div className="cp-company-grid">
              {(kpis.perCompany || []).map((c) => (
                <button
                  key={c.companyId}
                  type="button"
                  className="cp-company-tile"
                  onClick={() => ctx?.setActiveCompanyId?.(c.companyId)}
                >
                  <div className="cp-company-logo">{fmt.initials(c.companyName || "?")}</div>
                  <div className="cp-company-info">
                    <div className="cp-company-name">{c.companyName}</div>
                    <div className="cp-company-meta">
                      {c.totalLeads} lead{c.totalLeads === 1 ? "" : "s"}
                    </div>
                    <div className="cp-company-tags">
                      {Object.entries(c.byStatus || {}).slice(0, 4).map(([s, n]) => (
                        <span key={s} className="cp-stat-pill">{s}: {n}</span>
                      ))}
                    </div>
                  </div>
                  <ChevronRight size={18} className="cp-company-chevron" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="cp-card">
          <div className="cp-card-title">
            <span>Recent activity</span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate("/cp/activities")}>All →</button>
          </div>
          {(kpis.recentActivity || []).length === 0 ? (
            <div className="cp-empty-mini">
              <Activity size={22} />
              <p>No recent activity yet.</p>
            </div>
          ) : (
            <div className="cp-timeline">
              {(kpis.recentActivity || []).slice(0, 6).map((a) => (
                <div key={a.id} className="cp-timeline-item">
                  <div className="cp-timeline-dot" />
                  <div className="cp-timeline-time">{new Date(a.createdAt).toLocaleString()}</div>
                  <div className="cp-timeline-body">{a.content || a.type}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function Kpi({ label, value, icon: Icon, hint }) {
  return (
    <div className="cp-kpi">
      <div className="cp-kpi-icon"><Icon size={16} /></div>
      <div className="cp-kpi-label">{label}</div>
      <div className="cp-kpi-value">{value}</div>
      {hint && <div className="cp-kpi-trend" style={{ color: "var(--lp-text-muted)" }}>{hint}</div>}
    </div>
  )
}
