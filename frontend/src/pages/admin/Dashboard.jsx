import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Users,
  UserPlus,
  CheckCircle,
  IndianRupee,
  Plus,
  Download,
  TrendingUp,
} from "lucide-react"
import { api } from "@/lib/api"
import { fmt } from "@/lib/format"
import { useAuthStore } from "@/stores/authStore"

// Ported from leadpro-realty/src/pages/Dashboard.jsx (AdminDashboard variant).
// Charts are stubbed — chart.js + react-chartjs-2 will be installed in S4-FE-A-01.
// TODO(S4-FE-A-01): Install chart.js & react-chartjs-2, replace .chart-wrap stubs.

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

export default function Dashboard() {
  const navigate = useNavigate()
  const currentUser = useAuthStore((s) => s.user)

  // Pull a slice of real leads to drive the KPIs + recent table.
  const [leads, setLeads] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      api.get("/leads", { params: { pageSize: 100 } }).catch(() => null),
      api.get("/users").catch(() => null),
    ]).then(([lRes, uRes]) => {
      if (cancelled) return
      const lItems = lRes?.data?.items ?? lRes?.data ?? []
      setLeads(Array.isArray(lItems) ? lItems : [])
      const uItems =
        uRes?.data?.items ?? uRes?.data ?? uRes?.users ?? uRes ?? []
      setUsers(Array.isArray(uItems) ? uItems : [])
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const stats = useMemo(() => {
    const total = leads.length
    const weekAgo = Date.now() - 7 * 86400000
    const newThisWeek = leads.filter(
      (l) => new Date(l.createdAt).getTime() >= weekAgo,
    ).length
    const converted = leads.filter((l) => l.status === "Won").length
    return { total, newThisWeek, converted }
  }, [leads])

  const recentLeads = useMemo(
    () =>
      leads
        .slice()
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 6),
    [leads],
  )

  const firstName = (currentUser?.name || "there").split(" ")[0]

  return (
    <>
      <div className="content-head">
        <div>
          <h1>Welcome back, {firstName}</h1>
          <p>Here&apos;s what&apos;s happening across your sales pipeline today.</p>
        </div>
        <div className="row">
          <button className="btn btn-secondary" type="button">
            <Download size={16} /> Export
          </button>
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => navigate("/leads")}
          >
            <Plus size={16} /> Add Lead
          </button>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi">
          <div className="kpi-head">
            <div className="l">Total Leads</div>
            <div className="kpi-icon kpi-icon-amber">
              <Users size={18} />
            </div>
          </div>
          <div className="kpi-value">{loading ? "—" : stats.total}</div>
          <div className="kpi-trend up">
            <TrendingUp size={12} /> +12.4%
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-head">
            <div className="l">New This Week</div>
            <div className="kpi-icon kpi-icon-blue">
              <UserPlus size={18} />
            </div>
          </div>
          <div className="kpi-value">{loading ? "—" : stats.newThisWeek}</div>
          <div className="kpi-trend up">
            <TrendingUp size={12} /> +8.2%
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-head">
            <div className="l">Converted</div>
            <div className="kpi-icon kpi-icon-green">
              <CheckCircle size={18} />
            </div>
          </div>
          <div className="kpi-value">{loading ? "—" : stats.converted}</div>
          <div className="kpi-trend up">
            <TrendingUp size={12} /> +24.1%
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-head">
            <div className="l">Revenue</div>
            <div className="kpi-icon kpi-icon-purple">
              <IndianRupee size={18} />
            </div>
          </div>
          <div className="kpi-value">—</div>
          <div className="kpi-trend up">
            <TrendingUp size={12} /> +18.7%
          </div>
        </div>
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
          <div
            className="chart-wrap"
            style={{
              display: "grid",
              placeItems: "center",
              color: "var(--lp-text-muted)",
            }}
          >
            Chart: Lead Activity (chart.js wiring pending)
          </div>
        </div>
        <div className="card">
          <div className="card-title">Lead Status Breakdown</div>
          <div
            className="chart-wrap"
            style={{
              display: "grid",
              placeItems: "center",
              color: "var(--lp-text-muted)",
            }}
          >
            Chart: Status Doughnut (chart.js wiring pending)
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
          <div
            className="chart-wrap"
            style={{
              display: "grid",
              placeItems: "center",
              color: "var(--lp-text-muted)",
            }}
          >
            Chart: Lead Sources (chart.js wiring pending)
          </div>
        </div>
        <div className="card">
          <div className="card-title">Monthly Bookings</div>
          <div
            className="chart-wrap"
            style={{
              display: "grid",
              placeItems: "center",
              color: "var(--lp-text-muted)",
            }}
          >
            Chart: Monthly Bookings (chart.js wiring pending)
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
                fontSize: 13,
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
                fontSize: 13,
                padding: "20px 0",
              }}
            >
              {loading ? "Loading…" : "No leads to show."}
            </p>
          ) : (
            <div className="table-scroll">
              <table className="data">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Phone</th>
                    <th>Status</th>
                    <th>Agent</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLeads.map((l) => {
                    const agent =
                      l.assignedTo ||
                      users.find((u) => u.id === l.assignedToId)
                    const badgeCls = STATUS_BADGE[l.status] || "badge-muted"
                    return (
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
                                {l.email || "—"}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>{l.phone}</td>
                        <td>
                          <span className={`badge ${badgeCls}`}>
                            {l.status || "—"}
                          </span>
                        </td>
                        <td>
                          {agent ? (
                            <span style={{ fontSize: 13 }}>
                              {agent.name || agent.email}
                            </span>
                          ) : (
                            <span
                              style={{
                                fontSize: 12,
                                color: "var(--lp-text-muted)",
                              }}
                            >
                              Unassigned
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="card">
          <div className="card-title">Top Performing Agents</div>
          <div className="stack" style={{ gap: 14 }}>
            {users.length === 0 ? (
              <p
                style={{
                  color: "var(--lp-text-muted)",
                  fontSize: 13,
                }}
              >
                {loading ? "Loading…" : "No team data yet."}
              </p>
            ) : (
              users.slice(0, 5).map((u, i) => (
                <div key={u.id} className="row">
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
                    {fmt.initials(u.name || u.email || "?")}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                      {u.name || u.email}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--lp-text-muted)",
                      }}
                    >
                      {u.role || "—"}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  )
}
