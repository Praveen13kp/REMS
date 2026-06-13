import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  CheckCircle,
  Columns3,
  Filter,
  Flag,
  Folder,
  ListChecks,
  Phone,
  Radio,
  Search,
  Sparkles,
  Trash2,
  User,
} from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { LEAD_SOURCES } from "@/lib/constants"
import { fmt, priorityCls } from "@/lib/format"
import SourceIcon from "@/components/leads/SourceIcon"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useRowSelection } from "@/hooks/useRowSelection"
import { Dash } from "@/components/ui/dash"

// Visual port from leadpro-realty/src/pages/Assign.jsx.
// useApp replaced with local state + real API calls.

function priorityFromScore(score) {
  if (score == null) return "Cold"
  if (score >= 70) return "Hot"
  if (score >= 40) return "Warm"
  return "Cold"
}

const COLUMNS_CONFIG = [
  { key: "name", label: "Lead", icon: User },
  { key: "phone", label: "Phone", icon: Phone },
  { key: "project", label: "Project", icon: Folder },
  { key: "budget", label: "Budget", icon: Sparkles },
  { key: "source", label: "Source", icon: Radio },
  { key: "priority", label: "Priority", icon: Flag },
]

function toISODate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

const DATE_PRESETS = [
  { key: "today", label: "Today" },
  { key: "thisMonth", label: "This month" },
  { key: "lastMonth", label: "Last month" },
  { key: "last7", label: "Last 7 days" },
  { key: "last30", label: "Last 30 days" },
]

function presetRange(key) {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const d = now.getDate()
  switch (key) {
    case "today":
      return { from: toISODate(now), to: toISODate(now) }
    case "thisMonth":
      return {
        from: toISODate(new Date(y, m, 1)),
        to: toISODate(new Date(y, m + 1, 0)),
      }
    case "lastMonth":
      return {
        from: toISODate(new Date(y, m - 1, 1)),
        to: toISODate(new Date(y, m, 0)),
      }
    case "last7":
      return { from: toISODate(new Date(y, m, d - 6)), to: toISODate(now) }
    case "last30":
      return { from: toISODate(new Date(y, m, d - 29)), to: toISODate(now) }
    default:
      return { from: null, to: null }
  }
}

function matchPreset(from, to) {
  if (!from && !to) return ""
  for (const { key } of DATE_PRESETS) {
    const r = presetRange(key)
    if (r.from === from && r.to === to) return key
  }
  return "custom"
}

export default function Assign() {
  const navigate = useNavigate() // eslint-disable-line no-unused-vars
  const [unassigned, setUnassigned] = useState([])
  const [agents, setAgents] = useState([])
  const [allLeads, setAllLeads] = useState([])
  const [picks, setPicks] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [pendingId, setPendingId] = useState(null)
  const [search, setSearch] = useState("")
  const [filterSource, setFilterSource] = useState("")
  const [filterPriority, setFilterPriority] = useState("")
  const [createdFrom, setCreatedFrom] = useState("")
  const [createdTo, setCreatedTo] = useState("")
  const [visibleColumns, setVisibleColumns] = useState(COLUMNS_CONFIG.map((c) => c.key))

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
      // manual-assign dropdown either. Pending invites (status === "PENDING",
      // isActive === null) are excluded: an invited-but-not-yet-accepted user
      // has no real account/login and must not be assignable or counted as an
      // active agent in the workload card.
      const agentList = (Array.isArray(userList) ? userList : []).filter(
        (u) => u.role === "AGENT" && u.status !== "PENDING" && u.isActive !== false,
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

  const datePreset = matchPreset(createdFrom, createdTo)

  const filteredSorted = useMemo(() => {
    let rows = unassigned
    if (search) {
      const q = search.toLowerCase()
      rows = rows.filter(
        (l) =>
          (l.name || "").toLowerCase().includes(q) ||
          (l.email || "").toLowerCase().includes(q) ||
          (l.phone || "").includes(q),
      )
    }
    if (filterSource) {
      rows = rows.filter(
        (l) => (l.source || "").toLowerCase() === filterSource.toLowerCase(),
      )
    }
    if (filterPriority) {
      rows = rows.filter((l) => {
        const p = l.priority || priorityFromScore(l.score)
        return p.toLowerCase() === filterPriority.toLowerCase()
      })
    }
    if (createdFrom) {
      const from = new Date(createdFrom)
      rows = rows.filter((l) => l.createdAt && new Date(l.createdAt) >= from)
    }
    if (createdTo) {
      const to = new Date(createdTo)
      to.setHours(23, 59, 59, 999)
      rows = rows.filter((l) => l.createdAt && new Date(l.createdAt) <= to)
    }
    return rows.slice().sort((a, b) => (b.score || 0) - (a.score || 0))
  }, [unassigned, search, filterSource, filterPriority, createdFrom, createdTo])

  const hasFilters = !!(search || filterSource || filterPriority || createdFrom || createdTo)
  const selection = useRowSelection(filteredSorted, (l) => l.id)

  const bulkDelete = async () => {
    if (!selection.count) return
    try {
      await Promise.all([...selection.ids].map((id) => api.delete(`/leads/${id}`)))
      toast.success(`Deleted ${selection.count} lead${selection.count > 1 ? "s" : ""}`)
      selection.clear()
      loadAll()
    } catch (err) {
      toast.error(err?.message || "Delete failed")
    }
  }

  return (
    <>
      <div className="content-head">
        <div>
          <h1>Assign Leads</h1>
          <p>
            {unassigned.length} unassigned {unassigned.length === 1 ? "lead" : "leads"}{hasFilters ? ` · ${filteredSorted.length} shown` : ""}. Assign manually, or use Auto-Assign to balance the load across active agents.
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
          <div className="topbar-search">
            <Search size={16} />
            <input
              value={search}
              placeholder="Search name, phone, email…"
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="row" style={{ marginLeft: "auto", gap: 6 }}>
            {selection.count > 0 && (
              <span className="row" style={{ gap: 6 }}>
                <span style={{ fontSize: "0.867rem", color: "var(--lp-text-muted)" }}>{selection.count} selected</span>
                <button type="button" className="btn btn-sm btn-danger" onClick={bulkDelete}>
                  <Trash2 size={14} /> Delete
                </button>
                <button type="button" className="btn btn-sm btn-ghost" onClick={selection.clear}>Clear</button>
              </span>
            )}
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" className="btn btn-sm btn-secondary">
                  <Filter size={14} /> Filters
                  {hasFilters && (
                    <span className="badge badge-muted" style={{ padding: "1px 6px", fontSize: "0.733rem", lineHeight: 1.4 }}>
                      {(search ? 1 : 0) + (filterSource ? 1 : 0) + (filterPriority ? 1 : 0) + (createdFrom || createdTo ? 1 : 0)}
                    </span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="min-w-[200px] p-2">
                <div className="stack" style={{ gap: "4px" }}>
                  <div>
                    <label className="label" style={{ fontSize: "0.75rem", marginBottom: 2, display: "block" }}>Source</label>
                    <select
                      className="select"
                      style={{ fontSize: "0.8rem", padding: "5px 8px" }}
                      value={filterSource}
                      onChange={(e) => setFilterSource(e.target.value || "")}
                    >
                      <option value="">All Sources</option>
                      {LEAD_SOURCES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label" style={{ fontSize: "0.75rem", marginBottom: 2, display: "block" }}>Priority</label>
                    <select
                      className="select"
                      style={{ fontSize: "0.8rem", padding: "5px 8px" }}
                      value={filterPriority}
                      onChange={(e) => setFilterPriority(e.target.value || "")}
                    >
                      <option value="">All Priorities</option>
                      <option value="Hot">Hot</option>
                      <option value="Warm">Warm</option>
                      <option value="Cold">Cold</option>
                    </select>
                  </div>
                  <div>
                    <label className="label" style={{ fontSize: "0.75rem", marginBottom: 2, display: "block" }}>Date received</label>
                    <select
                      className="select"
                      style={{ fontSize: "0.8rem", padding: "5px 8px" }}
                      value={datePreset}
                      onChange={(e) => {
                        const key = e.target.value
                        if (key === "custom") return
                        const { from, to } = presetRange(key)
                        setCreatedFrom(from || "")
                        setCreatedTo(to || "")
                      }}
                    >
                      <option value="">All time</option>
                      {DATE_PRESETS.map((p) => (
                        <option key={p.key} value={p.key}>{p.label}</option>
                      ))}
                      <option value="custom">Custom range</option>
                    </select>
                    <div className="row" style={{ gap: 4, marginTop: 4 }}>
                      <input
                        type="date"
                        className="input"
                        style={{ fontSize: "0.75rem", padding: "4px 6px" }}
                        aria-label="From date"
                        value={createdFrom}
                        max={createdTo || undefined}
                        onChange={(e) => setCreatedFrom(e.target.value || "")}
                      />
                      <input
                        type="date"
                        className="input"
                        style={{ fontSize: "0.75rem", padding: "4px 6px" }}
                        aria-label="To date"
                        value={createdTo}
                        min={createdFrom || undefined}
                        onChange={(e) => setCreatedTo(e.target.value || "")}
                      />
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" className="btn btn-sm btn-secondary">
                  <Columns3 size={14} /> Columns
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="min-w-[180px] p-2">
                <div className="stack" style={{ gap: "2px" }}>
                  <label
                    className="column-option"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "7px 10px",
                      borderRadius: "var(--lp-radius-input)",
                      cursor: "pointer",
                      fontSize: "0.867rem",
                      borderBottom: "1px solid var(--lp-border)",
                      marginBottom: 4,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={COLUMNS_CONFIG.every((c) => visibleColumns.includes(c.key))}
                      onChange={() => {
                        const allKeys = COLUMNS_CONFIG.map((c) => c.key)
                        const allVisible = allKeys.every((k) => visibleColumns.includes(k))
                        setVisibleColumns(allVisible ? [allKeys[0]] : allKeys)
                      }}
                      style={{ accentColor: "var(--lp-accent)", width: 15, height: 15 }}
                    />
                    <ListChecks size={15} style={{ color: "var(--lp-text-muted)", flexShrink: 0 }} />
                    Select All
                  </label>
                  {COLUMNS_CONFIG.map((col) => (
                    <label
                      key={col.key}
                      className="column-option"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "7px 10px",
                        borderRadius: "var(--lp-radius-input)",
                        cursor: "pointer",
                        fontSize: "0.867rem",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={visibleColumns.includes(col.key)}
                        onChange={() => {
                          const current = new Set(visibleColumns)
                          if (current.has(col.key)) {
                            if (current.size <= 1) return
                            current.delete(col.key)
                          } else {
                            current.add(col.key)
                          }
                          setVisibleColumns([...current])
                        }}
                        style={{ accentColor: "var(--lp-accent)", width: 15, height: 15 }}
                      />
                      <col.icon size={15} style={{ color: "var(--lp-text-muted)", flexShrink: 0 }} />
                      {col.label}
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            {hasFilters && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setSearch("")
                  setFilterSource("")
                  setFilterPriority("")
                  setCreatedFrom("")
                  setCreatedTo("")
                }}
              >
                Clear
              </button>
            )}
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
          ) : filteredSorted.length === 0 ? (
            <div className="empty-state">
              <div className="icon">
                <CheckCircle size={28} />
              </div>
              <h3>{hasFilters ? "No leads match" : "All caught up!"}</h3>
              <p>{hasFilters ? "Try clearing some filters." : "No leads waiting for assignment."}</p>
            </div>
          ) : (
            <table className="data">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <input
                      type="checkbox"
                      checked={selection.allSelected}
                      ref={(el) => { if (el) el.indeterminate = selection.someSelected }}
                      onChange={(e) => selection.toggleAll(e.target.checked)}
                      aria-label="Select all leads"
                    />
                  </th>
                  {visibleColumns.includes("name") && <th>Lead</th>}
                  {visibleColumns.includes("phone") && <th>Phone</th>}
                  {visibleColumns.includes("project") && <th>Project</th>}
                  {visibleColumns.includes("budget") && <th>Budget</th>}
                  {visibleColumns.includes("source") && <th>Source</th>}
                  {visibleColumns.includes("priority") && <th>Priority</th>}
                  <th>Available Agents</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredSorted.map((l) => {
                    const score = l.score ?? 0
                    const priority = l.priority || priorityFromScore(score)
                    const projectName = l.interestedProject?.name || l.projectName
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
                      : null
                    return (
                      <tr key={l.id} className={selection.isSelected(l.id) ? "selected" : ""}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selection.isSelected(l.id)}
                            onChange={() => selection.toggle(l.id)}
                            aria-label={`Select ${l.name || "lead"}`}
                          />
                        </td>
                        {visibleColumns.includes("name") && (
                          <td>
                            <div className="row">
                              <div className="avatar sm">{fmt.initials(l.name || "?")}</div>
                              <div>
                                <div style={{ fontWeight: 600 }}>{l.name}</div>
                                <div className="text-xs text-muted">{l.email || ""}</div>
                              </div>
                            </div>
                          </td>
                        )}
                        {visibleColumns.includes("phone") && (
                          <td><span className="text-xs text-muted">{fmt.phone(l.phone)}</span></td>
                        )}
                        {visibleColumns.includes("project") && <td>{projectName || <Dash />}</td>}
                        {visibleColumns.includes("budget") && <td>{budgetDisplay ?? <Dash />}</td>}
                        {visibleColumns.includes("source") && (
                          <td>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.867rem", color: "var(--lp-text-muted)" }}>
                              <SourceIcon source={l.source} />
                              {l.source || <Dash />}
                            </span>
                          </td>
                        )}
                        {visibleColumns.includes("priority") && (
                          <td><span className={`badge ${priorityCls(priority)}`}>{priority}</span></td>
                        )}
                        <td>
                          <select
                            className="select"
                            style={{ minWidth: 160, fontSize: "0.8rem", padding: "5px 8px" }}
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
