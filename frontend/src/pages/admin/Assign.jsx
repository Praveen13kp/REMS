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
      // Only AGENTs are eligible for assignment — owners/managers shouldn't
      // be auto-loaded with frontline leads, and shouldn't clutter the
      // manual-assign dropdown either.
      const agentList = (Array.isArray(userList) ? userList : []).filter(
        (u) => u.role === "AGENT" && u.isActive !== false,
      )
      setUnassigned(filteredUnassigned)
      setAllLeads(Array.isArray(allList) ? allList : [])
      setAgents(agentList)
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
    try {
      const res = await api.post("/leads/auto-assign", {
        leadIds: unassigned.map((l) => l.id),
      })
      const data = res?.data ?? res ?? {}
      const ok = data.successCount ?? 0
      const fail = Array.isArray(data.failures) ? data.failures.length : 0
      if (fail === 0 && ok > 0) toast.success(`Auto-assigned ${ok} leads`)
      else if (ok === 0) toast.error("Auto-assign failed")
      else toast.warning(`Assigned ${ok}, failed ${fail}`)
    } catch (err) {
      toast.error(err?.message || "Auto-assign failed")
    } finally {
      loadAll()
    }
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
            {unassigned.length} unassigned {unassigned.length === 1 ? "lead" : "leads"}. Assign manually, or use Auto-Assign to balance the load across active agents.
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
            <div style={{ fontWeight: 700 }}>Auto-balance assignment</div>
            <div className="text-muted text-sm">
              <b>Auto-Assign All</b> distributes unassigned leads to the
              least-loaded active agents (counting only open leads, ignoring
              Booked / Lost). Manually drag a lead to a specific agent if you
              want full control instead.
            </div>
          </div>
        </div>
      </div>

      <div className="table-wrap">
        <div className="table-toolbar">
          <span style={{ fontWeight: 600 }}>{unassigned.length} unassigned leads</span>
          <div style={{ marginLeft: "auto" }}>
            <span className="text-muted text-sm">Newest first</span>
          </div>
        </div>
        <div className="table-scroll">
          {isLoading ? (
            <div
              style={{
                padding: "40px 20px",
                textAlign: "center",
                color: "var(--lp-text-muted)",
                fontSize: "0.933rem",
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
                    // budget is stored as a free-text String (e.g. "₹50 L - ₹1 Cr" from the
                    // form's range dropdown, or a raw number from CSV import). Only run it
                    // through fmt.inr if it's purely numeric — otherwise show the string as-is.
                    const rawBudget = l.budget ?? l.budgetMax
                    const isNumericBudget =
                      rawBudget != null &&
                      rawBudget !== "" &&
                      !isNaN(Number(rawBudget)) &&
                      /^[\d.,\s]+$/.test(String(rawBudget))
                    const budgetDisplay = rawBudget
                      ? isNumericBudget
                        ? fmt.inr(Number(String(rawBudget).replace(/[,\s]/g, "")))
                        : String(rawBudget)
                      : "—"
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
                        <td>{budgetDisplay}</td>
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
                  <div className="avatar">
                    {a.image || a.avatar ? (
                      <img src={fmt.avatarUrl(a.image || a.avatar)} alt="" />
                    ) : (
                      fmt.initials(a.name || a.email || "?")
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: "0.933rem" }}>{a.name || a.email}</div>
                    <div className="text-xs text-muted">{a.dept || a.role || ""}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, fontSize: "1.333rem", color: "var(--accent)" }}>{c}</div>
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
