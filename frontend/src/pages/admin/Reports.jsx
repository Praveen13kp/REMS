import { useEffect, useState } from "react"
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
  Settings2,
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

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler)

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
      legend: { labels: { color: dark ? "#A1A1AA" : "#52525B", font: { size: 11 } } },
    },
    ...extra,
  }
}

export default function Reports() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const isAgent = user?.role === "AGENT" || user?.role === "agent"
  const [leads, setLeads] = useState([])
  const [users, setUsers] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState(0)

  useEffect(() => {
    if (isAgent) {
      navigate("/dashboard", { replace: true })
      return
    }
  }, [isAgent, navigate])

  useEffect(() => {
    let cancelled = false
    Promise.all([
      api.get("/leads", { params: { pageSize: 500 } }).catch(() => null),
      api.get("/users").catch(() => null),
      api.get("/projects").catch(() => null),
    ]).then(([lRes, uRes, pRes]) => {
      if (cancelled) return
      const lItems = lRes?.data?.items ?? lRes?.data ?? lRes ?? []
      setLeads(Array.isArray(lItems) ? lItems : [])
      const uItems = uRes?.data?.items ?? uRes?.data ?? uRes?.users ?? uRes ?? []
      setUsers(Array.isArray(uItems) ? uItems : [])
      const pItems = pRes?.data?.items ?? pRes?.data ?? pRes ?? []
      setProjects(Array.isArray(pItems) ? pItems : [])
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark")
  const accent = isDark ? "#C4B5FD" : "#8B5CF6"

  // --- computed data ---
  const months = []
  const revenue = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    months.push(d.toLocaleDateString("en-IN", { month: "short" }))
    revenue.push(
      leads
        .filter(
          (l) =>
            l.status === "Booked" &&
            new Date(l.updatedAt || l.createdAt).getMonth() === d.getMonth(),
        )
        .reduce((s, l) => s + (l.budget || 0), 0) / 100000,
    )
  }

  const stages = ["New", "Contacted", "Interested", "Site Visit", "Negotiation", "Booked"]
  const counts = stages.map((s) => leads.filter((l) => stages.indexOf(l.status) >= stages.indexOf(s)).length)

  const projs = projects.map((p) => p.name)
  const projConv = projects.map(
    (p) => leads.filter((l) => (l.interestedProject?.id === p.id || l.projectId === p.id) && l.status === "Booked").length,
  )

  const agents = users.filter((u) => u.role === "AGENT" || u.role === "agent")
  const aLabels = agents.map((a) => (a.name || a.email || "").split(" ")[0])
  const calls = agents.map((a) => leads.filter((l) => l.assignedToId === a.id).length * 2)
  const books = agents.map(
    (a) => leads.filter((l) => l.assignedToId === a.id && l.status === "Booked").length,
  )

  const sources = ["Website", "Referral", "Facebook", "Instagram", "Google Ads", "99acres", "MagicBricks", "WhatsApp", "Other"]
  const sCounts = sources.map((s) => leads.filter((l) => l.source === s).length)
  const cities = ["Mumbai", "Pune", "Bengaluru", "Hyderabad", "Chennai", "Delhi", "Gurugram"]
  const cCounts = cities.map((c) => leads.filter((l) => l.city === c).length)

  const booked = leads.filter((l) => l.status === "Booked")
  const totalRev = booked.reduce((s, l) => s + (l.budget || 0), 0)
  const avg = booked.length ? Math.round(totalRev / booked.length) : 0
  const conv = leads.length ? Math.round((booked.length / leads.length) * 100) : 0

  // --- export CSV ---
  const exportCsv = () => {
    let rows
    if (tab === 1) {
      rows = agents.map((a) => {
        const ld = leads.filter((l) => l.assignedToId === a.id)
        const closed = ld.filter((l) => l.status === "Booked")
        const cr = ld.length ? Math.round((closed.length / ld.length) * 100) : 0
        return {
          Agent: a.name || a.email,
          Total: ld.length,
          Active: ld.filter((l) => l.status !== "Booked" && l.status !== "Lost").length,
          Booked: closed.length,
          "Conv. Rate": cr + "%",
          Revenue: fmt.inr(closed.reduce((s, l) => s + (l.budget || 0), 0)),
        }
      })
    } else {
      rows = leads.map((l) => ({
        Name: l.name,
        Phone: l.phone,
        Status: l.status,
        Source: l.source,
        City: l.city,
        Budget: l.budget ? fmt.inr(l.budget) : "",
        Project: l.interestedProject?.name || l.projectName || "",
      }))
    }
    const csv = Papa.unparse(rows)
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `reports-${["sales", "agents", "leads"][tab]}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
    toast.success("CSV exported")
  }

  if (isAgent) return null
  if (loading) {
    return (
      <div
        style={{
          padding: "40px 20px",
          textAlign: "center",
          color: "var(--lp-text-muted)",
          fontSize: 14,
        }}
      >
        Loading reports…
      </div>
    )
  }

  return (
    <>
      <div className="content-head">
        <div>
          <h1>Reports &amp; Analytics</h1>
          <p>Insights into sales performance and lead behaviour.</p>
        </div>
        <div className="row">
          <select className="select" style={{ width: "auto" }} defaultValue="30">
            <option value="30">Last 30 days</option>
            <option value="7">Last 7 days</option>
            <option value="q">This Quarter</option>
            <option value="y">This Year</option>
          </select>
          <button type="button" className="btn btn-secondary" onClick={exportCsv}>
            <Download size={16} /> Export
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => toast.info("Custom report builder coming soon")}
          >
            <Settings2 size={16} /> Build Report
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
            <KpiCard label="Bookings" value={booked.length} trend="+24%" icon={CheckCircle} color="green" />
            <KpiCard label="Revenue" value={fmt.inr(totalRev)} trend="+18.7%" icon={IndianRupee} color="amber" />
            <KpiCard label="Avg Deal Size" value={fmt.inr(avg)} trend="+5.2%" icon={TrendingUp} color="blue" />
            <KpiCard label="Conversion Rate" value={conv + "%"} trend="+3.1%" icon={Percent} color="purple" />
          </div>
          <div
            className="grid"
            style={{ gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 24 }}
          >
            <div className="card">
              <div className="card-title">Revenue Trend</div>
              <div className="chart-wrap tall">
                <Line
                  data={{
                    labels: months,
                    datasets: [
                      {
                        label: "Revenue (₹ lakhs)",
                        data: revenue,
                        borderColor: accent,
                        backgroundColor: "rgba(139,92,246,.12)",
                        fill: true,
                        tension: 0.35,
                        borderWidth: 2,
                        pointRadius: 3,
                      },
                    ],
                  }}
                  options={chartOpts(isDark)}
                />
              </div>
            </div>
            <div className="card">
              <div className="card-title">Funnel</div>
              <div className="chart-wrap tall">
                <Bar
                  data={{
                    labels: stages,
                    datasets: [
                      {
                        label: "Leads",
                        data: counts,
                        backgroundColor: ["#3B82F6", "#60A5FA", "#F59E0B", "#FBBF24", "#FB923C", "#10B981"],
                        borderRadius: 4,
                      },
                    ],
                  }}
                  options={chartOpts(isDark, { plugins: { legend: { display: false } }, indexAxis: "y" })}
                />
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-title">Conversion by Project</div>
            <div className="chart-wrap">
              <Bar
                data={{
                  labels: projs,
                  datasets: [
                    {
                      label: "Bookings",
                      data: projConv,
                      backgroundColor: accent,
                      borderRadius: 4,
                    },
                  ],
                }}
                options={chartOpts(isDark)}
              />
            </div>
          </div>
        </>
      )}

      {tab === 1 && (
        <>
          <div className="card mb-4">
            <div className="card-title">Calls vs Bookings (per agent)</div>
            <div className="chart-wrap">
              <Bar
                data={{
                  labels: aLabels,
                  datasets: [
                    {
                      label: "Calls",
                      data: calls,
                      backgroundColor: "rgba(59,130,246,.5)",
                      borderRadius: 4,
                    },
                    {
                      label: "Bookings",
                      data: books,
                      backgroundColor: "#10B981",
                      borderRadius: 4,
                    },
                  ],
                }}
                options={chartOpts(isDark)}
              />
            </div>
          </div>
          <div className="card">
            <div className="card-title">Detailed Performance</div>
            <div className="table-scroll">
              <table className="data">
                <thead>
                  <tr>
                    <th>Agent</th>
                    <th>Total</th>
                    <th>Active</th>
                    <th>Booked</th>
                    <th>Conv. Rate</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {agents.length === 0 ? (
                    <tr>
                      <td colSpan={6}>
                        <div
                          style={{
                            padding: "20px 12px",
                            textAlign: "center",
                            color: "var(--lp-text-muted)",
                            fontSize: 13,
                          }}
                        >
                          No agent data available.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    agents.map((a) => {
                      const ld = leads.filter((l) => l.assignedToId === a.id)
                      const closed = ld.filter((l) => l.status === "Booked")
                      const c = ld.length ? Math.round((closed.length / ld.length) * 100) : 0
                      return (
                        <tr key={a.id}>
                          <td>
                            <div className="row">
                              <div className="avatar sm">{fmt.initials(a.name || a.email || "?")}</div>
                              <span style={{ fontWeight: 600 }}>{a.name || a.email}</span>
                            </div>
                          </td>
                          <td>{ld.length}</td>
                          <td>{ld.filter((l) => l.status !== "Booked" && l.status !== "Lost").length}</td>
                          <td>{closed.length}</td>
                          <td>
                            <span className={`badge ${c > 30 ? "badge-success" : c > 15 ? "badge-warning" : "badge-error"}`}>
                              {c}%
                            </span>
                          </td>
                          <td>{fmt.inr(closed.reduce((s, l) => s + (l.budget || 0), 0))}</td>
                        </tr>
                      )
                    })
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
            <div className="chart-wrap">
              <Doughnut
                data={{
                  labels: sources,
                  datasets: [
                    {
                      data: sCounts,
                      backgroundColor: [
                        "#F59E0B", "#3B82F6", "#10B981", "#EF4444",
                        "#8B5CF6", "#EC4899", "#14B8A6", "#F97316", "#6B7280",
                      ],
                      borderWidth: 0,
                    },
                  ],
                }}
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
          </div>
          <div className="card">
            <div className="card-title">Leads by City</div>
            <div className="chart-wrap">
              <Bar
                data={{
                  labels: cities,
                  datasets: [
                    {
                      label: "Leads",
                      data: cCounts,
                      backgroundColor: "#8B5CF6",
                      borderRadius: 4,
                    },
                  ],
                }}
                options={chartOpts(isDark, { plugins: { legend: { display: false } } })}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
