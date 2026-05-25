import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useTheme } from "next-themes"
import { Bar } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js"
import {
  Users,
  CalendarClock,
  TrendingUp,
  UserCheck,
} from "lucide-react"

import { fmt } from "@/lib/format"
import { dashboardService } from "@/services/dashboardService"
import KpiCard from "@/components/KpiCard"

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

function chartOpts(isDark) {
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
  }
}

export default function ManagerDashboard() {
  const navigate = useNavigate()
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await dashboardService.getManager()
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

  const team = data?.teamPerformance ?? []

  const teamChart = useMemo(
    () => ({
      labels: team.map((a) => (a.name || a.email || "—").split(" ")[0]),
      datasets: [
        {
          label: "Total Leads",
          data: team.map((a) => a.totalLeads),
          backgroundColor: "rgba(139,92,246,.4)",
          borderRadius: 4,
        },
        {
          label: "Booked",
          data: team.map((a) => a.booked),
          backgroundColor: "#10B981",
          borderRadius: 4,
        },
      ],
    }),
    [team],
  )

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

  return (
    <>
      <div className="content-head">
        <div>
          <h1>Team Dashboard</h1>
          <p>Manage your team&apos;s leads and performance.</p>
        </div>
        <button
          className="btn btn-primary"
          type="button"
          onClick={() => navigate("/leads")}
        >
          <UserCheck size={16} /> Assign Leads
        </button>
      </div>

      <div className="kpi-grid">
        <KpiCard
          label="Assigned Leads"
          value={totals.assignedLeads ?? 0}
          icon={Users}
          color="amber"
        />
        <KpiCard
          label="Pending Follow-Ups"
          value={totals.pendingFollowUps ?? 0}
          icon={CalendarClock}
          color="red"
        />
        <KpiCard
          label="Conversion Rate"
          value={`${totals.conversionRate ?? 0}%`}
          icon={TrendingUp}
          color="green"
        />
        <KpiCard
          label="Active Agents"
          value={totals.activeAgentsCount ?? 0}
          icon={UserCheck}
          color="blue"
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
          <div className="card-title">Team Performance</div>
          <div className="chart-wrap">
            {team.length > 0 ? (
              <Bar data={teamChart} options={chartOpts(isDark)} />
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
                No agents on the team yet.
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-title">Team Members</div>
          {team.length === 0 ? (
            <p
              style={{
                color: "var(--lp-text-muted)",
                fontSize: "0.867rem",
                padding: "20px 0",
              }}
            >
              Invite agents from the Team page to populate this list.
            </p>
          ) : (
            <div className="stack" style={{ gap: 10 }}>
              {team.map((a) => (
                <div key={a.userId} className="row">
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
                      {a.totalLeads} leads · {a.booked} booked
                    </div>
                  </div>
                  <span className="badge badge-success">
                    {a.conversionRate}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
