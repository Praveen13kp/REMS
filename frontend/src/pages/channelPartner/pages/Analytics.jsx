import { useEffect, useMemo, useState } from "react"
import { useOutletContext } from "react-router-dom"
import { BarChart3, TrendingUp } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"

// Minimal but live analytics: pulls per-company status breakdown from
// the dashboard endpoint and renders a side-by-side comparison.
// Charting library isn't wired yet (would pull in recharts/visx) —
// using inline bar visuals as a usable interim.

export default function Analytics() {
  const ctx = useOutletContext()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api
      .get("/channel-partner/dashboard")
      .then((res) => setData(res?.data ?? null))
      .catch((err) => toast.error(err?.message || "Failed"))
      .finally(() => setLoading(false))
  }, [])

  const perCompany = data?.perCompany || []
  const totalLeads = perCompany.reduce((s, c) => s + (c.totalLeads || 0), 0)
  const totalWon = perCompany.reduce(
    (s, c) => s + ((c.byStatus?.Won || 0) + (c.byStatus?.Booked || 0)),
    0,
  )
  const totalLost = perCompany.reduce((s, c) => s + (c.byStatus?.Lost || 0), 0)
  const conversionRate = totalWon + totalLost > 0
    ? Math.round((totalWon / (totalWon + totalLost)) * 100)
    : 0
  const maxCompanyTotal = Math.max(1, ...perCompany.map((c) => c.totalLeads || 0))

  return (
    <>
      <div className="cp-page-head">
        <div>
          <h1>Analytics</h1>
          <p>Performance across every company you collaborate with.</p>
        </div>
      </div>

      <div className="cp-kpi-grid">
        <Kpi label="Total leads" value={totalLeads} icon={BarChart3} />
        <Kpi label="Closed deals" value={totalWon} icon={TrendingUp} />
        <Kpi label="Conversion rate" value={`${conversionRate}%`} icon={TrendingUp} />
        <Kpi label="Companies" value={perCompany.length} icon={BarChart3} />
      </div>

      <div className="cp-card" style={{ marginBottom: 16 }}>
        <div className="cp-card-title">Lead volume by company</div>
        {loading ? (
          <p className="text-muted">Loading…</p>
        ) : perCompany.length === 0 ? (
          <p className="text-muted text-sm">No data yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {perCompany.map((c) => (
              <div key={c.companyId}>
                <div className="row" style={{ justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{c.companyName}</span>
                  <span className="text-xs text-muted">{c.totalLeads} leads</span>
                </div>
                <div style={{ height: 8, background: "var(--lp-surface-2)", borderRadius: 4, overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${(c.totalLeads / maxCompanyTotal) * 100}%`,
                      height: "100%",
                      background: "linear-gradient(90deg, var(--lp-accent), #06b6d4)",
                      transition: "width .25s",
                    }}
                  />
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                  {Object.entries(c.byStatus || {}).map(([s, n]) => (
                    <span key={s} className="badge" style={{ fontSize: 11 }}>{s}: {n}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="cp-coming-soon">
        <BarChart3 size={32} style={{ opacity: 0.5 }} />
        <h2>Deeper analytics — coming soon</h2>
        <p>
          Monthly trend charts, lead-source performance, drop-off funnels,
          and per-company conversion timelines will land once the charts library
          is wired in. Numbers above are accurate snapshots from your live data.
        </p>
      </div>
    </>
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
