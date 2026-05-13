import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Users,
  CalendarClock,
  Flame,
  CheckCircle,
  Plus,
} from "lucide-react"

import { fmt } from "@/lib/format"
import { useAuthStore } from "@/stores/authStore"
import { dashboardService } from "@/services/dashboardService"
import KpiCard from "@/components/KpiCard"

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

const PRIORITY_BADGE = {
  Hot: "badge-error",
  Warm: "badge-warning",
  Cold: "badge-muted",
}

export default function AgentDashboard() {
  const navigate = useNavigate()
  const currentUser = useAuthStore((s) => s.user)
  const firstName = (currentUser?.name || "there").split(" ")[0]

  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await dashboardService.getAgent()
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

  const myLeads = data?.myLeads?.total ?? 0
  const todayFollowUps = data?.todayFollowUps ?? 0
  const hotLeads = data?.hotLeads ?? 0
  const bookings = data?.bookings ?? 0
  const activeLeads = data?.activeLeads ?? []

  return (
    <>
      <div className="content-head">
        <div>
          <h1>Hi {firstName}, here are your leads.</h1>
          <p>Stay on top of your follow-ups today.</p>
        </div>
        <button
          className="btn btn-primary"
          type="button"
          onClick={() => navigate("/leads/new")}
        >
          <Plus size={16} /> Add Lead
        </button>
      </div>

      <div className="kpi-grid">
        <KpiCard label="My Leads" value={myLeads} icon={Users} color="amber" />
        <KpiCard
          label="Today's Follow-Ups"
          value={todayFollowUps}
          icon={CalendarClock}
          color="red"
        />
        <KpiCard label="Hot Leads" value={hotLeads} icon={Flame} color="red" />
        <KpiCard
          label="Bookings"
          value={bookings}
          icon={CheckCircle}
          color="green"
        />
      </div>

      <div className="card">
        <div className="card-title">Your Active Leads</div>
        {activeLeads.length === 0 ? (
          <p
            style={{
              color: "var(--lp-text-muted)",
              fontSize: 13,
              padding: "20px 0",
            }}
          >
            No active leads. Add one to get started.
          </p>
        ) : (
          <div className="lead-card-grid">
            {activeLeads.map((l) => (
              <div
                key={l.id}
                className="lead-card"
                onClick={() => navigate(`/leads/${l.id}`)}
              >
                <div className="lead-card-head">
                  <div style={{ minWidth: 0 }}>
                    <div className="name">{l.name}</div>
                    <div className="phone">{l.phone}</div>
                  </div>
                  {l.priority && (
                    <span
                      className={`badge ${
                        PRIORITY_BADGE[l.priority] || "badge-muted"
                      }`}
                    >
                      {l.priority}
                    </span>
                  )}
                </div>
                {l.projectName && (
                  <div className="project">{l.projectName}</div>
                )}
                {l.budget && (
                  <div
                    style={{
                      marginTop: 6,
                      color: "var(--lp-accent)",
                      fontWeight: 600,
                      fontSize: 14,
                    }}
                  >
                    {/^[0-9]/.test(String(l.budget))
                      ? fmt.inr(l.budget)
                      : l.budget}
                  </div>
                )}
                <div className="lead-card-foot">
                  <span
                    className={`badge ${
                      STATUS_BADGE[l.status] || "badge-muted"
                    }`}
                  >
                    {l.status}
                  </span>
                  <span
                    className="text-xs"
                    style={{ color: "var(--lp-text-muted)" }}
                  >
                    {fmt.ago(l.updatedAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
