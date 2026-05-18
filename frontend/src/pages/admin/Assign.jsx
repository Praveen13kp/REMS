import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Sparkles, CheckCircle } from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { fmt, priorityCls } from "@/lib/format"

// Visual port from leadpro-realty/src/pages/Assign.jsx.
// useApp replaced with local state + real API calls.

function priorityFromScore(score) {
  if (score == null) return "Cold"
  if (score >= 70) return "Hot"
  if (score >= 40) return "Warm"
  return "Cold"
}

export default function Assign() {
  const navigate = useNavigate() // eslint-disable-line no-unused-vars
  const [unassigned, setUnassigned] = useState([])
  const [agents, setAgents] = useState([])
  const [allLeads, setAllLeads] = useState([])
  const [picks, setPicks] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [pendingId, setPendingId] = useState(null)

  const loadAll = async () => {
    setIsLoading(true)
    try {
      // TODO: prefer dedicated GET /leads/unassigned endpoint when it lands.
      const [unRes, allRes, userRes] = await Promise.all([
        api.get("/leads", { params: { assignedToId: "null", pageSize: 200 } }).catch(() => null),
        api.get("/leads", { params: { pageSize: 500 } }).catch(() => null),
        api.get("/users").catch(() => null),
      ])
      const unList = unRes?.data?.items ?? unRes?.items ?? unRes?.data ?? []
      const allList = allRes?.data?.items ?? allRes?.items ?? allRes?.data ?? []
      const userList = userRes?.data?.items ?? userRes?.data ?? userRes?.users ?? userRes ?? []
      // Defensive: if the assignedToId=null filter isn't supported server-side,
      // fall back to client-side filtering of the full list.
      const filteredUnassigned = Array.isArray(unList) && unList.length
        ? unList.filter((l) => !l.assignedTo && !l.assignedToId)
        : (Array.isArray(allList) ? allList : []).filter(
            (l) => !l.assignedTo && !l.assignedToId && l.status !== "Booked" && l.status !== "Won" && l.status !== "Lost",
          )
      setUnassigned(filteredUnassigned)
      setAllLeads(Array.isArray(allList) ? allList : [])
      setAgents(Array.isArray(userList) ? userList : [])
    } catch (err) {
      toast.error(err?.message || "Failed to load assignment data")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  const setPick = (lid, aid) => setPicks((p) => ({ ...p, [lid]: aid }))

  const assign = async (lid) => {
    const aid = picks[lid] || agents[0]?.id
    if (!aid) {
      toast.error("No agent available")
      return
    }
    setPendingId(lid)
    try {
      await api.patch(`/leads/${lid}`, { assignedToId: aid })
      const a = agents.find((u) => u.id === aid)
      toast.success(`Assigned to ${(a?.name || a?.email || "agent").split(" ")[0]}`)
      setUnassigned((rows) => rows.filter((r) => r.id !== lid))
    } catch (err) {
      toast.error(err?.message || "Assign failed")
    } finally {
      setPendingId(null)
    }
  }

  const autoAll = async () => {
    if (!agents.length || !unassigned.length) return
    // TODO: requires POST /leads/auto-assign endpoint — stubbed client-side round-robin.
    const counts = Object.fromEntries(
      agents.map((a) => [
        a.id,
        allLeads.filter(
          (l) =>
            (l.assignedToId || l.assignedTo?.id) === a.id &&
            l.status !== "Booked" &&
            l.status !== "Won" &&
            l.status !== "Lost",
        ).length,
      ]),
    )
    const updates = unassigned.map((l) => {
      const a = agents.slice().sort((x, y) => counts[x.id] - counts[y.id])[0]
      counts[a.id]++
      return { id: l.id, aid: a.id }
    })
    let ok = 0
    let fail = 0
    for (const u of updates) {
      try {
        await api.patch(`/leads/${u.id}`, { assignedToId: u.aid })
        ok++
      } catch {
        fail++
      }
    }
    if (fail === 0) toast.success(`Auto-assigned ${ok} leads`)
    else if (ok === 0) toast.error("Auto-assign failed")
    else toast.warning(`Assigned ${ok}, failed ${fail}`)
    loadAll()
  }

  // TODO: GET /users/workload — using locally-computed counts for now.
  const workload = useMemo(() => {
    const map = {}
    for (const a of agents) {
      map[a.id] = allLeads.filter(
        (l) =>
          (l.assignedToId || l.assignedTo?.id) === a.id &&
          l.status !== "Booked" &&
          l.status !== "Won" &&
          l.status !== "Lost",
      ).length
    }
    return map
  }, [agents, allLeads])

  return (
    <>
      <div className="content-head">
        <div>
          <h1>Assign Leads</h1>
          <p>
            {unassigned.length} unassigned {unassigned.length === 1 ? "lead" : "leads"}. Use AI scoring to prioritise hot prospects.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={autoAll}
          disabled={isLoading || !unassigned.length || !agents.length}
        >
          <Sparkles size={16} /> Auto-Assign All
        </button>
      </div>

      <div
        className="card mb-4"
        style={{
          background: "linear-gradient(135deg,rgba(139,92,246,.08),rgba(139,92,246,.02))",
          borderColor: "rgba(139,92,246,.3)",
        }}
      >
        <div className="row" style={{ gap: 14 }}>
          <div className="kpi-icon kpi-icon-amber" style={{ width: 42, height: 42 }}>
            <Sparkles size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700 }}>AI Lead Scoring is on</div>
            <div className="text-muted text-sm">
              Leads scored by source, budget, recency, and engagement signals.{" "}
              <span className="badge badge-hot">Hot</span> = score &ge; 70 ·{" "}
              <span className="badge badge-warm">Warm</span> = 40–69 ·{" "}
              <span className="badge badge-cold">Cold</span> = &lt; 40
            </div>
          </div>
        </div>
      </div>

      <div className="table-wrap">
        <div className="table-toolbar">
          <span style={{ fontWeight: 600 }}>{unassigned.length} unassigned leads</span>
          <div style={{ marginLeft: "auto" }}>
            <span className="text-muted text-sm">Sorted by AI score (highest first)</span>
          </div>
        </div>
        <div className="table-scroll">
          {isLoading ? (
            <div
              style={{
                padding: "40px 20px",
                textAlign: "center",
                color: "var(--lp-text-muted)",
                fontSize: 14,
              }}
            >
              Loading…
            </div>
          ) : unassigned.length === 0 ? (
            <div className="empty-state">
              <div className="icon">
                <CheckCircle size={28} />
              </div>
              <h3>All caught up!</h3>
              <p>No leads waiting for assignment.</p>
            </div>
          ) : (
            <table className="data">
              <thead>
                <tr>
                  <th>Lead</th>
                  <th>Project</th>
                  <th>Budget</th>
                  <th>Source</th>
                  <th>AI Score</th>
                  <th>Priority</th>
                  <th>Available Agents</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {unassigned
                  .slice()
                  .sort((a, b) => (b.score || 0) - (a.score || 0))
                  .map((l) => {
                    const score = l.score ?? 0
                    const priority = l.priority || priorityFromScore(score)
                    const projectName = l.interestedProject?.name || l.projectName || "—"
                    const budget = l.budget ?? l.budgetMax ?? 0
                    return (
                      <tr key={l.id}>
                        <td>
                          <div className="row">
                            <div className="avatar sm">{fmt.initials(l.name || "?")}</div>
                            <div>
                              <div style={{ fontWeight: 600 }}>{l.name}</div>
                              <div className="text-xs text-muted">{fmt.phone(l.phone)}</div>
                            </div>
                          </div>
                        </td>
                        <td>{projectName}</td>
                        <td>{budget ? fmt.inr(budget) : "—"}</td>
                        <td>{l.source || "—"}</td>
                        <td>
                          <div className="row" style={{ gap: 6 }}>
                            <div
                              style={{
                                width: 80,
                                height: 6,
                                background: "var(--surface-3)",
                                borderRadius: 3,
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  width: score + "%",
                                  height: "100%",
                                  background:
                                    score >= 70 ? "#EF4444" : score >= 40 ? "#F59E0B" : "#3B82F6",
                                }}
                              />
                            </div>
                            <span className="text-xs" style={{ fontWeight: 600 }}>
                              {score}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${priorityCls(priority)}`}>{priority}</span>
                        </td>
                        <td>
                          <select
                            className="select"
                            style={{ minWidth: 160 }}
                            value={picks[l.id] || agents[0]?.id || ""}
                            onChange={(e) => setPick(l.id, e.target.value)}
                          >
                            {agents.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.name || a.email}
                                {a.dept ? ` · ${a.dept}` : ""}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            disabled={pendingId === l.id || !agents.length}
                            onClick={() => assign(l.id)}
                          >
                            {pendingId === l.id ? "Assigning…" : "Assign"}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="card mt-4">
        <div className="card-title">Agent Workload</div>
        <div className="grid grid-3" style={{ gap: 12 }}>
          {agents.map((a) => {
            const c = workload[a.id] || 0
            const pct = Math.min(100, c * 10)
            return (
              <div key={a.id} className="card" style={{ background: "var(--surface-2)", padding: 14 }}>
                <div className="row" style={{ gap: 10 }}>
                  <div className="avatar">{a.avatar || fmt.initials(a.name || a.email || "?")}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{a.name || a.email}</div>
                    <div className="text-xs text-muted">{a.dept || a.role || ""}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, fontSize: 20, color: "var(--accent)" }}>{c}</div>
                    <div className="text-xs text-muted">active</div>
                  </div>
                </div>
                <div
                  style={{
                    marginTop: 10,
                    height: 6,
                    background: "var(--surface-3)",
                    borderRadius: 3,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: pct + "%",
                      height: "100%",
                      background: pct > 70 ? "#EF4444" : pct > 40 ? "#F59E0B" : "#10B981",
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
