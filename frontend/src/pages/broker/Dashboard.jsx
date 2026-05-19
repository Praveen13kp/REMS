import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import {
  Briefcase,
  Building2,
  CalendarClock,
  Flame,
  LogOut,
  Users,
} from "lucide-react"

import { api } from "@/lib/api"
import { useAuthStore } from "@/stores/authStore"
import KpiCard from "@/components/common/KpiCard"
import { fmt } from "@/lib/format"

const ALL = "__all__"

export default function BrokerDashboard() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const signOut = useAuthStore((s) => s.signOut)

  const [companies, setCompanies] = useState([])
  const [selected, setSelected] = useState(ALL)
  const [kpis, setKpis] = useState({
    totalLeads: 0,
    hotLeads: 0,
    tasksToday: 0,
    recentActivity: [],
  })
  const [tab, setTab] = useState("assigned")
  const [leads, setLeads] = useState([])
  const [loadingLeads, setLoadingLeads] = useState(false)

  // Load linked companies once.
  useEffect(() => {
    let cancelled = false
    api
      .get("/broker/companies")
      .then((res) => {
        if (!cancelled) setCompanies(res?.data ?? [])
      })
      .catch((err) => toast.error(err?.message || "Failed to load companies"))
    return () => {
      cancelled = true
    }
  }, [])

  const companyIdParam = selected === ALL ? null : selected
  const activeCompanies = useMemo(
    () => companies.filter((c) => c.status === "ACTIVE"),
    [companies],
  )

  // KPIs whenever the company filter changes.
  useEffect(() => {
    let cancelled = false
    const url = companyIdParam
      ? `/broker/dashboard?companyId=${encodeURIComponent(companyIdParam)}`
      : "/broker/dashboard"
    api
      .get(url)
      .then((res) => {
        if (!cancelled) setKpis(res?.data ?? {})
      })
      .catch((err) => toast.error(err?.message || "Failed to load KPIs"))
    return () => {
      cancelled = true
    }
  }, [companyIdParam])

  // Leads list when filter or tab changes.
  useEffect(() => {
    let cancelled = false
    setLoadingLeads(true)
    const params = new URLSearchParams()
    if (companyIdParam) params.set("companyId", companyIdParam)
    params.set("scope", tab === "own" ? "own" : "assigned")
    api
      .get(`/broker/leads?${params.toString()}`)
      .then((res) => {
        if (!cancelled) setLeads(res?.data ?? [])
      })
      .catch((err) => {
        if (!cancelled) toast.error(err?.message || "Failed to load leads")
      })
      .finally(() => {
        if (!cancelled) setLoadingLeads(false)
      })
    return () => {
      cancelled = true
    }
  }, [companyIdParam, tab])

  const handleSignOut = async () => {
    await signOut()
    navigate("/login", { replace: true })
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--lp-bg)" }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 24px",
          borderBottom: "1px solid var(--lp-border)",
          background: "var(--lp-surface)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "var(--lp-surface-2)",
              border: "1px solid var(--lp-border)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--lp-accent)",
            }}
          >
            <Briefcase size={16} />
          </span>
          <div>
            <div style={{ fontWeight: 600 }}>Broker Workspace</div>
            <div className="text-sm text-muted">{user?.email}</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <select
            className="input"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            style={{ minWidth: 220 }}
          >
            <option value={ALL}>All companies</option>
            {activeCompanies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleSignOut}
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </header>

      <main style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
        {companies.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="kpi-grid" style={{ marginBottom: 20 }}>
              <KpiCard
                label="Leads assigned to me"
                value={kpis.totalLeads ?? 0}
                icon={Users}
                color="amber"
              />
              <KpiCard
                label="Hot leads"
                value={kpis.hotLeads ?? 0}
                icon={Flame}
                color="red"
              />
              <KpiCard
                label="Tasks due today"
                value={kpis.tasksToday ?? 0}
                icon={CalendarClock}
                color="blue"
              />
              <KpiCard
                label="Linked companies"
                value={activeCompanies.length}
                icon={Building2}
                color="purple"
              />
            </div>

            <div
              style={{
                display: "flex",
                gap: 6,
                marginBottom: 12,
              }}
            >
              <TabButton
                active={tab === "assigned"}
                onClick={() => setTab("assigned")}
              >
                Assigned to me
              </TabButton>
              <TabButton active={tab === "own"} onClick={() => setTab("own")}>
                My own leads
              </TabButton>
            </div>

            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              {loadingLeads ? (
                <div style={{ padding: 24, color: "var(--lp-text-muted)" }}>
                  Loading…
                </div>
              ) : leads.length === 0 ? (
                <div style={{ padding: 24, color: "var(--lp-text-muted)" }}>
                  No leads to show.
                </div>
              ) : (
                <LeadTable
                  leads={leads}
                  showCompany={selected === ALL}
                  onRowClick={(lead) => navigate(`/broker/leads/${lead.id}`)}
                />
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "8px 14px",
        borderRadius: 8,
        border: "1px solid var(--lp-border)",
        background: active ? "var(--lp-accent)" : "var(--lp-surface)",
        color: active ? "#0A0A0F" : "var(--lp-text)",
        fontWeight: 600,
        fontSize: 13,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  )
}

function LeadTable({ leads, showCompany, onRowClick }) {
  return (
    <table className="table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Phone</th>
          <th>Status</th>
          <th>Priority</th>
          {showCompany && <th>Company</th>}
          <th>Updated</th>
        </tr>
      </thead>
      <tbody>
        {leads.map((l) => (
          <tr
            key={l.id}
            onClick={() => onRowClick(l)}
            style={{ cursor: "pointer" }}
          >
            <td>{l.name}</td>
            <td>{fmt.phone(l.phone)}</td>
            <td>{l.status}</td>
            <td>{l.priority || "—"}</td>
            {showCompany && <td>{l.company?.name}</td>}
            <td>{new Date(l.updatedAt).toLocaleDateString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function EmptyState() {
  return (
    <div
      className="card"
      style={{
        textAlign: "center",
        padding: 48,
        marginTop: 32,
      }}
    >
      <Building2 size={32} style={{ opacity: 0.5 }} />
      <h2 style={{ marginTop: 12 }}>No linked companies yet</h2>
      <p className="text-muted">
        When a brokerage invites you and you accept, this dashboard will show
        their leads here.
      </p>
    </div>
  )
}
