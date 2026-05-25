import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Bar, Line, Doughnut } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js"
import {
  Download,
  CheckCircle,
  IndianRupee,
  TrendingUp,
  Percent,
} from "lucide-react"
import { toast } from "sonner"
import Papa from "papaparse"

import { api } from "@/lib/api"
import { fmt } from "@/lib/format"
import KpiCard from "@/components/common/KpiCard"
import { useAuthStore } from "@/stores/authStore"

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
)

const RANGE_OPTIONS = [
  { value: "7", label: "Last 7 days", days: 7 },
  { value: "30", label: "Last 30 days", days: 30 },
  { value: "90", label: "Last 90 days", days: 90 },
  { value: "y", label: "This year", days: null },
]

function rangeToDates(value) {
  const to = new Date()
  to.setHours(23, 59, 59, 999)
  if (value === "y") {
    const from = new Date(to.getFullYear(), 0, 1)
    from.setHours(0, 0, 0, 0)
    return { from, to }
  }
  const cfg = RANGE_OPTIONS.find((r) => r.value === value) || RANGE_OPTIONS[1]
  const from = new Date()
  from.setDate(from.getDate() - (cfg.days - 1))
  from.setHours(0, 0, 0, 0)
  return { from, to }
}

function chartOpts(dark, extra = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        grid: { color: dark ? "rgba(255,255,255,.06)" : "rgba(0,0,0,.06)" },
        ticks: { color: dark ? "#A1A1AA" : "#52525B", font: { size: 11 } },
      },
      y: {
        grid: { color: dark ? "rgba(255,255,255,.06)" : "rgba(0,0,0,.06)" },
        ticks: { color: dark ? "#A1A1AA" : "#52525B", font: { size: 11 } },
        beginAtZero: true,
      },
    },
    plugins: {
      legend: {
        labels: { color: dark ? "#A1A1AA" : "#52525B", font: { size: 11 } },
      },
    },
    ...extra,
  }
}

function fmtDelta(d) {
  if (d == null || Number.isNaN(d)) return null
  const sign = d > 0 ? "+" : ""
  return `${sign}${d}% vs prev`
}

export default function Reports() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const isAgent = user?.role === "AGENT" || user?.role === "agent"
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState(0)
  const [range, setRange] = useState("30")

  useEffect(() => {
    if (isAgent) navigate("/dashboard", { replace: true })
  }, [isAgent, navigate])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const { from, to } = rangeToDates(range)
    api
      .get("/dashboard/reports", {
        params: { from: from.toISOString(), to: to.toISOString() },
      })
      .then((res) => {
        if (cancelled) return
        setData(res?.data ?? null)
      })
      .catch((err) => {
        if (!cancelled) toast.error(err?.message || "Failed to load reports")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [range])

  const isDark =
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark")
  const accent = isDark ? "#C4B5FD" : "#8B5CF6"

  const exportCsv = () => {
    if (!data) return
    let rows
    let name
    if (tab === 1) {
      rows = data.agentPerformance.map((a) => ({
        Agent: a.name,
        "Leads Assigned": a.leads,
        Active: a.active,
        Booked: a.booked,
        Calls: a.calls,
        WhatsApp: a.whatsapps,
        Emails: a.emails,
        "Conv. Rate": a.conversionRate + "%",
        Revenue: fmt.inr(a.revenue),
      }))
      name = "agents"
    } else if (tab === 2) {
      rows = [
        ...data.leadsBySource.map((s) => ({ Group: "Source", Label: s.source, Count: s.count })),
        ...data.leadsByCity.map((c) => ({ Group: "City", Label: c.city, Count: c.count })),
      ]
      name = "lead-analytics"
    } else {
      rows = [
        ...data.funnel.map((f) => ({ Group: "Funnel", Label: f.stage, Count: f.count })),
        ...data.projectConversion.map((p) => ({
          Group: "Project",
          Label: p.name,
          Count: p.booked,
          Leads: p.leads,
          ConversionRate: p.conversionRate + "%",
        })),
        ...data.revenueTrend.map((m) => ({
          Group: "Revenue trend",
          Label: m.label,
          Revenue: fmt.inr(m.revenue),
          Bookings: m.bookings,
        })),
      ]
      name = "sales"
    }
    const csv = Papa.unparse(rows)
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `reports-${name}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
    toast.success("CSV exported")
  }

  const charts = useMemo(() => {
    if (!data) return null
    return {
      revenueTrend: {
        labels: data.revenueTrend.map((m) => m.label),
        datasets: [
          {
            label: "Revenue (₹)",
            data: data.revenueTrend.map((m) => m.revenue),
            borderColor: accent,
            backgroundColor: "rgba(139,92,246,.12)",
            fill: true,
            tension: 0.35,
            borderWidth: 2,
            pointRadius: 3,
          },
        ],
      },
      funnel: {
        labels: data.funnel.map((f) => f.stage),
        datasets: [
          {
            label: "Leads",
            data: data.funnel.map((f) => f.count),
            backgroundColor: [
              "#3B82F6",
              "#60A5FA",
              "#F59E0B",
              "#FBBF24",
              "#FB923C",
              "#10B981",
              "#A78BFA",
            ],
            borderRadius: 4,
          },
        ],
      },
      projectConv: {
        labels: data.projectConversion.map((p) => p.name),
        datasets: [
          {
            label: "Bookings",
            data: data.projectConversion.map((p) => p.booked),
            backgroundColor: accent,
            borderRadius: 4,
          },
        ],
      },
      agents: {
        labels: data.agentPerformance.map((a) => (a.name || "").split(" ")[0]),
        datasets: [
          {
            label: "Calls",
            data: data.agentPerformance.map((a) => a.calls),
            backgroundColor: "rgba(59,130,246,.6)",
            borderRadius: 4,
          },
          {
            label: "WhatsApp",
            data: data.agentPerformance.map((a) => a.whatsapps),
            backgroundColor: "rgba(16,185,129,.6)",
            borderRadius: 4,
          },
          {
            label: "Bookings",
            data: data.agentPerformance.map((a) => a.booked),
            backgroundColor: "#8B5CF6",
            borderRadius: 4,
          },
        ],
      },
      sources: {
        labels: data.leadsBySource.map((s) => s.source),
        datasets: [
          {
            data: data.leadsBySource.map((s) => s.count),
            backgroundColor: [
              "#F59E0B",
              "#3B82F6",
              "#10B981",
              "#EF4444",
              "#8B5CF6",
              "#EC4899",
              "#14B8A6",
              "#F97316",
              "#6B7280",
            ],
            borderWidth: 0,
          },
        ],
      },
      cities: {
        labels: data.leadsByCity.map((c) => c.city),
        datasets: [
          {
            label: "Leads",
            data: data.leadsByCity.map((c) => c.count),
            backgroundColor: "#8B5CF6",
            borderRadius: 4,
          },
        ],
      },
    }
  }, [data, accent])

  if (isAgent) return null
  if (loading || !data) {
    return (
      <div
        style={{
          padding: "40px 20px",
          textAlign: "center",
          color: "var(--lp-text-muted)",
          fontSize: "0.933rem",
        }}
      >
        Loading reports…
      </div>
    )
  }

  const { kpis, agentPerformance, projectConversion } = data

  return (
    <>
      <div className="content-head">
        <div>
          <h1>Reports &amp; Analytics</h1>
          <p>Insights into sales performance and lead behaviour.</p>
        </div>
        <div className="row">
          <select
            className="select"
            style={{ width: "auto" }}
            value={range}
            onChange={(e) => setRange(e.target.value)}
          >
            {RANGE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <button type="button" className="btn btn-secondary" onClick={exportCsv}>
            <Download size={16} /> Export
          </button>
        </div>
      </div>

      <div className="tabs">
        {["Sales Analytics", "Agent Performance", "Lead Analytics"].map((t, i) => (
          <button
            key={t}
            type="button"
            className={`tab ${tab === i ? "active" : ""}`}
            onClick={() => setTab(i)}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 0 && (
        <>
          <div className="kpi-grid">
            <KpiCard
              label="Bookings"
              value={kpis.bookings.value}
              trend={fmtDelta(kpis.bookings.delta)}
              icon={CheckCircle}
              color="green"
            />
            <KpiCard
              label="Revenue"
              value={fmt.inr(kpis.revenue.value)}
              trend={fmtDelta(kpis.revenue.delta)}
              icon={IndianRupee}
              color="amber"
            />
            <KpiCard
              label="Avg Deal Size"
              value={fmt.inr(kpis.avgDeal.value)}
              trend={fmtDelta(kpis.avgDeal.delta)}
              icon={TrendingUp}
              color="blue"
            />
            <KpiCard
              label="Conversion Rate"
              value={kpis.conversion.value + "%"}
              trend={fmtDelta(kpis.conversion.delta)}
              icon={Percent}
              color="purple"
            />
          </div>
          <div
            className="grid"
            style={{ gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 24 }}
          >
            <div className="card">
              <div className="card-title">Revenue Trend (last 6 months)</div>
              <div className="chart-wrap tall">
                <Line data={charts.revenueTrend} options={chartOpts(isDark)} />
              </div>
            </div>
            <div className="card">
              <div className="card-title">Funnel</div>
              <div className="chart-wrap tall">
                <Bar
                  data={charts.funnel}
                  options={chartOpts(isDark, {
                    plugins: { legend: { display: false } },
                    indexAxis: "y",
                  })}
                />
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-title">Conversion by Project</div>
            {projectConversion.length === 0 ? (
              <p className="text-muted text-sm" style={{ padding: "14px 0" }}>
                No project data in this range.
              </p>
            ) : (
              <div className="chart-wrap">
                <Bar data={charts.projectConv} options={chartOpts(isDark)} />
              </div>
            )}
          </div>
        </>
      )}

      {tab === 1 && (
        <>
          <div className="card mb-4">
            <div className="card-title">Activity vs Bookings (per agent)</div>
            {agentPerformance.length === 0 ? (
              <p className="text-muted text-sm" style={{ padding: "14px 0" }}>
                No agents with activity in this range.
              </p>
            ) : (
              <div className="chart-wrap">
                <Bar data={charts.agents} options={chartOpts(isDark)} />
              </div>
            )}
          </div>
          <div className="card">
            <div className="card-title">Detailed Performance</div>
            <div className="table-scroll">
              <table className="data">
                <thead>
                  <tr>
                    <th>Agent</th>
                    <th>Leads</th>
                    <th>Active</th>
                    <th>Booked</th>
                    <th>Calls</th>
                    <th>WhatsApp</th>
                    <th>Emails</th>
                    <th>Conv. Rate</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {agentPerformance.length === 0 ? (
                    <tr>
                      <td colSpan={9}>
                        <div
                          style={{
                            padding: "20px 12px",
                            textAlign: "center",
                            color: "var(--lp-text-muted)",
                            fontSize: "0.867rem",
                          }}
                        >
                          No agent data available for this range.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    agentPerformance.map((a) => (
                      <tr key={a.userId}>
                        <td>
                          <div className="row">
                            <div className="avatar sm">
                              {fmt.initials(a.name || "?")}
                            </div>
                            <span style={{ fontWeight: 600 }}>{a.name}</span>
                          </div>
                        </td>
                        <td>{a.leads}</td>
                        <td>{a.active}</td>
                        <td>{a.booked}</td>
                        <td>{a.calls}</td>
                        <td>{a.whatsapps}</td>
                        <td>{a.emails}</td>
                        <td>
                          <span
                            className={`badge ${
                              a.conversionRate > 30
                                ? "badge-success"
                                : a.conversionRate > 15
                                  ? "badge-warning"
                                  : "badge-error"
                            }`}
                          >
                            {a.conversionRate}%
                          </span>
                        </td>
                        <td>{fmt.inr(a.revenue)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 2 && (
        <div className="grid grid-2" style={{ gap: 16 }}>
          <div className="card">
            <div className="card-title">Leads by Source</div>
            {data.leadsBySource.length === 0 ? (
              <p className="text-muted text-sm" style={{ padding: "14px 0" }}>
                No source data in this range.
              </p>
            ) : (
              <div className="chart-wrap">
                <Doughnut
                  data={charts.sources}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: "bottom",
                        labels: {
                          color: isDark ? "#A1A1AA" : "#52525B",
                          font: { size: 11 },
                          boxWidth: 12,
                        },
                      },
                    },
                    cutout: "62%",
                  }}
                />
              </div>
            )}
          </div>
          <div className="card">
            <div className="card-title">Leads by City</div>
            {data.leadsByCity.length === 0 ? (
              <p className="text-muted text-sm" style={{ padding: "14px 0" }}>
                No city data in this range.
              </p>
            ) : (
              <div className="chart-wrap">
                <Bar
                  data={charts.cities}
                  options={chartOpts(isDark, {
                    plugins: { legend: { display: false } },
                  })}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
