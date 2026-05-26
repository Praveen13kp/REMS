import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useTheme } from "next-themes"
import { Line, Bar, Doughnut } from "react-chartjs-2"
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
  Users,
  UserPlus,
  CheckCircle,
  IndianRupee,
  Plus,
} from "lucide-react"

import { fmt } from "@/lib/format"
import { useAuthStore } from "@/stores/authStore"
import { dashboardService } from "@/services/dashboardService"
import KpiCard from "@/components/KpiCard"

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

const STATUS_BADGE = {
  New: "badge-info",
  Contacted: "badge-info",
  Qualified: "badge-warning",
  "Proposal Sent": "badge-warning",
  Negotiation: "badge-warning",
  Won: "badge-success",
  Lost: "badge-error",
  "Not Interested": "badge-muted",
  "Follow Up": "badge-info",
}

const DOUGHNUT_COLORS = [
  "#3B82F6",
  "#60A5FA",
  "#F59E0B",
  "#FBBF24",
  "#FB923C",
  "#10B981",
  "#EF4444",
  "#94A3B8",
  "#8B5CF6",
]

function chartOpts(isDark, extra = {}) {
  const grid = isDark ? "rgba(255,255,255,.06)" : "rgba(0,0,0,.06)"
  const text = isDark ? "#A1A1AA" : "#52525B"
  return {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { grid: { color: grid }, ticks: { color: text, font: { size: 11 } } },
      y: {
        grid: { color: grid },
        ticks: { color: text, font: { size: 11 } },
        beginAtZero: true,
      },
    },
    plugins: {
      legend: { labels: { color: text, font: { size: 11 } } },
      tooltip: {
        backgroundColor: isDark ? "#1C1C24" : "#FFFFFF",
        titleColor: isDark ? "#F8F8FA" : "#18181B",
        bodyColor: text,
        borderColor: isDark ? "#26262F" : "#E4E4E7",
        borderWidth: 1,
      },
    },
    ...extra,
  }
}

function formatDateLabel(iso) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  })
}

export default function OwnerDashboard() {
  const navigate = useNavigate()
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  const currentUser = useAuthStore((s) => s.user)
  const firstName = (currentUser?.name || "there").split(" ")[0]

  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await dashboardService.getOwner()
      setData(res)
    } catch (err) {
      setError(err?.message || "Failed to load dashboard")
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const accent = isDark ? "#C4B5FD" : "#8B5CF6"

  const trendChart = useMemo(() => {
    const series = data?.leadsTrend ?? []
    return {
      labels: series.map((p) => formatDateLabel(p.date)),
      datasets: [
        {
          label: "New leads",
          data: series.map((p) => p.count),
          borderColor: accent,
          backgroundColor: "rgba(139,92,246,.12)",
          fill: true,
          tension: 0.35,
          pointRadius: 0,
          borderWidth: 2,
        },
      ],
    }
  }, [data, accent])

  const statusChart = useMemo(() => {
    const series = data?.leadsByStatus ?? []
    return {
      labels: series.map((s) => s.status),
      datasets: [
        {
          data: series.map((s) => s.count),
          backgroundColor: series.map(
            (_, i) => DOUGHNUT_COLORS[i % DOUGHNUT_COLORS.length],
          ),
          borderWidth: 0,
        },
      ],
    }
  }, [data])

  const sourceChart = useMemo(() => {
    const series = data?.leadsBySource ?? []
    return {
      labels: series.map((s) => s.source),
      datasets: [
        {
          data: series.map((s) => s.count),
          backgroundColor: accent,
          borderRadius: 4,
        },
      ],
    }
  }, [data, accent])

  const bookingsChart = useMemo(() => {
    const series = data?.monthlyBookings ?? []
    return {
      labels: series.map((m) => m.month),
      datasets: [
        {
          label: "Bookings",
          data: series.map((m) => m.count),
          backgroundColor: "rgba(16,185,129,.7)",
          borderRadius: 6,
        },
      ],
    }
  }, [data])

  if (isLoading) {
    return (
      <div
        style={{
          padding: "60px 20px",
          textAlign: "center",
          color: "var(--lp-text-muted)",
        }}
      >
        Loading dashboard…
      </div>
    )
  }

  if (error) {
    return (
      <div className="stack" style={{ padding: 40, alignItems: "center" }}>
        <p style={{ color: "var(--lp-error)" }}>{error}</p>
        <button type="button" className="btn btn-secondary" onClick={fetchData}>
          Retry
        </button>
      </div>
    )
  }

  const totals = data?.totals ?? {}
  const recentLeads = data?.recentLeads ?? []
  const topAgents = data?.topAgents ?? []
  const hasAnyLeads = (totals.totalLeads ?? 0) > 0

  return (
    <>
      <div className="content-head">
        <div>
          <h1>Hello, {firstName}</h1>
          <p>Here&apos;s what&apos;s happening across your sales pipeline today.</p>
        </div>
        <div className="row">
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => navigate("/leads/new")}
          >
            <Plus size={16} /> Add Lead
          </button>
        </div>
      </div>

      <div className="kpi-grid">
        <KpiCard
          label="Total Leads"
          value={totals.totalLeads ?? 0}
          icon={Users}
          color="amber"
        />
        <KpiCard
          label="New This Week"
          value={totals.newLeadsThisWeek ?? 0}
          icon={UserPlus}
          color="blue"
        />
        <KpiCard
          label="Converted"
          value={totals.convertedCount ?? 0}
          icon={CheckCircle}
          color="green"
        />
        <KpiCard
          label="Revenue"
          value={fmt.inr(totals.revenueBooked ?? 0)}
          icon={IndianRupee}
          color="purple"
        />
      </div>

      <div
        className="grid"
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div className="card">
          <div className="card-title">Lead Activity (last 30 days)</div>
          <div className="chart-wrap">
            <Line
              data={trendChart}
              options={chartOpts(isDark, {
                plugins: { legend: { display: false } },
              })}
            />
          </div>
        </div>
        <div className="card">
          <div className="card-title">Lead Status Breakdown</div>
          <div className="chart-wrap">
            {hasAnyLeads ? (
              <Doughnut
                data={statusChart}
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
            ) : (
              <div
                style={{
                  display: "grid",
                  placeItems: "center",
                  height: "100%",
                  color: "var(--lp-text-muted)",
                  fontSize: "0.867rem",
                }}
              >
                No leads yet.
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        className="grid"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div className="card">
          <div className="card-title">Lead Sources</div>
          <div className="chart-wrap">
            <Bar
              data={sourceChart}
              options={chartOpts(isDark, {
                indexAxis: "y",
                plugins: { legend: { display: false } },
              })}
            />
          </div>
        </div>
        <div className="card">
          <div className="card-title">Monthly Bookings</div>
          <div className="chart-wrap">
            <Bar
              data={bookingsChart}
              options={chartOpts(isDark, {
                plugins: { legend: { display: false } },
              })}
            />
          </div>
        </div>
      </div>

      <div
        className="grid"
        style={{
          display: "grid",
          gridTemplateColumns: "1.4fr 1fr",
          gap: 16,
        }}
      >
        <div className="card">
          <div className="card-title">
            Recent Leads
            <a
              onClick={() => navigate("/leads")}
              style={{
                color: "var(--lp-accent)",
                fontSize: "0.867rem",
                cursor: "pointer",
              }}
            >
              View all →
            </a>
          </div>
          {recentLeads.length === 0 ? (
            <p
              style={{
                color: "var(--lp-text-muted)",
                fontSize: "0.867rem",
                padding: "20px 0",
              }}
            >
              No leads to show.
            </p>
          ) : (
            <div className="table-scroll">
              <table className="data">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Project</th>
                    <th>Status</th>
                    <th>Agent</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLeads.map((l) => (
                    <tr
                      key={l.id}
                      style={{ cursor: "pointer" }}
                      onClick={() => navigate(`/leads/${l.id}`)}
                    >
                      <td>
                        <div className="row">
                          <div className="avatar sm">
                            {fmt.initials(l.name || "?")}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600 }}>{l.name}</div>
                            <div
                              className="text-xs"
                              style={{ color: "var(--lp-text-muted)" }}
                            >
                              {l.phone ? fmt.phone(l.phone) : "—"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: "0.867rem" }}>
                        {l.projectName || (
                          <span style={{ color: "var(--lp-text-muted)" }}>
                            —
                          </span>
                        )}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            STATUS_BADGE[l.status] || "badge-muted"
                          }`}
                        >
                          {l.status || "—"}
                        </span>
                      </td>
                      <td>
                        {l.assignedTo ? (
                          <div className="row" style={{ gap: 6 }}>
                            <div className="avatar sm">
                              {l.assignedTo.image || l.assignedTo.avatar ? (
                                <img src={fmt.avatarUrl(l.assignedTo.image || l.assignedTo.avatar)} alt="" />
                              ) : (
                                fmt.initials(
                                  l.assignedTo.name ||
                                    l.assignedTo.email ||
                                    "?",
                                )
                              )}
                            </div>
                            <span style={{ fontSize: "0.867rem" }}>
                              {(l.assignedTo.name || l.assignedTo.email).split(
                                " ",
                              )[0]}
                            </span>
                          </div>
                        ) : (
                          <span
                            style={{
                              fontSize: "0.8rem",
                              color: "var(--lp-text-muted)",
                            }}
                          >
                            Unassigned
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-title">Top Performing Agents</div>
          {topAgents.length === 0 ? (
            <p
              style={{
                color: "var(--lp-text-muted)",
                fontSize: "0.867rem",
                padding: "20px 0",
              }}
            >
              No agent activity yet.
            </p>
          ) : (
            <div className="stack" style={{ gap: 14 }}>
              {topAgents.map((a, i) => (
                <div key={a.userId} className="row">
                  <div
                    style={{
                      width: 24,
                      fontWeight: 700,
                      color: "var(--lp-text-muted)",
                    }}
                  >
                    {i + 1}
                  </div>
                  <div className="avatar">
                    {a.image || a.avatar ? (
                      <img src={fmt.avatarUrl(a.image || a.avatar)} alt="" />
                    ) : (
                      fmt.initials(a.name || a.email || "?")
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: "0.933rem" }}>
                      {a.name || a.email}
                    </div>
                    <div
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--lp-text-muted)",
                      }}
                    >
                      {a.booked} bookings · {a.leads} leads
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        fontWeight: 700,
                        color: "var(--lp-accent)",
                        fontSize: "0.933rem",
                      }}
                    >
                      {fmt.inr(a.revenue ?? 0)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
