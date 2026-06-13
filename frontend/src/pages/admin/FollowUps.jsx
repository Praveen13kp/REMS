import { useEffect, useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Calendar,
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Clock,
  Columns3,
  Flag,
  Folder,
  Filter,
  ListChecks,
  MapPin,
  MessageSquare,
  MoreHorizontal,
  Phone,
  PhoneCall,
  Radio,
  Search,
  Tag,
  Trash2,
  User,
  UserCircle,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { api } from "@/lib/api"
import { fmt } from "@/lib/format"
import { LEAD_STATUS_VALUES, LEAD_SOURCES } from "@/lib/constants"
import KpiCard from "@/components/common/KpiCard"
import { useAuthStore } from "@/stores/authStore"
import { leadPiiMasked, NON_SELECTABLE_STYLE } from "@/lib/privacy"
import { useRowSelection } from "@/hooks/useRowSelection"
import { Dash } from "@/components/ui/dash"

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

const STATUS_BADGE = {
  New: "badge-info",
  Contacted: "badge-info",
  Qualified: "badge-warning",
  "Proposal Sent": "badge-warning",
  Negotiation: "badge-warning",
  Won: "badge-success",
  Booked: "badge-success",
  Lost: "badge-error",
  "Not Interested": "badge-muted",
  "Follow Up": "badge-info",
}
const PRIORITY_BADGE = {
  Hot: "badge-hot",
  Warm: "badge-warm",
  Cold: "badge-cold",
}
const statusCls = (s) => STATUS_BADGE[s] || "badge-muted"
const priorityCls = (p) => PRIORITY_BADGE[p] || "badge-muted"
const PRIORITIES = ["Hot", "Warm", "Cold"]

const OUTCOMES = [
  { value: "CALLED", label: "Called — spoke to lead" },
  { value: "NO_ANSWER", label: "Called — no answer" },
  { value: "WHATSAPP", label: "WhatsApp / SMS sent" },
  { value: "EMAILED", label: "Emailed" },
  { value: "MET", label: "Met in person / site visit" },
  { value: "OTHER", label: "Other" },
]

function stripNonDigits(s) {
  return (s || "").replace(/\D/g, "")
}

async function dialViaAutoDialer(leadId) {
  try {
    const res = await api.post(`/leads/${leadId}/call`)
    const callId = res?.data?.callId
    toast.success(
      callId ? `Auto-dialer connecting… (${callId})` : "Auto-dialer connecting…",
    )
  } catch (err) {
    toast.error(err?.message || "Failed to place call")
  }
}

function toLocalDateTimeInput(date) {
  const pad = (n) => String(n).padStart(2, "0")
  const d = date instanceof Date ? date : new Date(date)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

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

function buildPaginationItems(current, total, siblings = 1) {
  if (total <= 1) return [1]
  const window = siblings * 2 + 3
  if (total <= window + 2) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  const left = Math.max(current - siblings, 2)
  const right = Math.min(current + siblings, total - 1)
  const showLeftDots = left > 2
  const showRightDots = right < total - 1
  const items = [1]
  if (showLeftDots) items.push("…")
  for (let i = left; i <= right; i++) items.push(i)
  if (showRightDots) items.push("…")
  items.push(total)
  return items
}

function SortIcon({ field, sort }) {
  const [curField, curDir] = (sort || "").split(":")
  if (curField !== field) return <ChevronsUpDown size={12} />
  return curDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />
}

const COLUMNS_CONFIG = [
  { key: "name", label: "Customer", icon: User },
  { key: "phone", label: "Phone", icon: Phone },
  { key: "project", label: "Project", icon: Folder },
  { key: "scheduledAt", label: "Due", icon: CalendarClock },
  { key: "status", label: "Status", icon: Tag },
  { key: "priority", label: "Priority", icon: Flag },
  { key: "lastContactedAt", label: "Last Contact", icon: Clock },
  { key: "assignedTo", label: "Assigned", icon: UserCircle },
  { key: "source", label: "Source", icon: Radio },
  { key: "city", label: "City", icon: MapPin },
]

function RescheduleModal({ followUp, onClose, onSaved }) {
  const initial = followUp.scheduledAt
    ? toLocalDateTimeInput(new Date(followUp.scheduledAt))
    : toLocalDateTimeInput(new Date(Date.now() + 86400000))
  const [value, setValue] = useState(initial)
  const [saving, setSaving] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!value) {
      toast.error("Pick a date and time")
      return
    }
    setSaving(true)
    try {
      const iso = new Date(value).toISOString()
      const res = await api.patch(`/follow-ups/${followUp.id}`, {
        scheduledAt: iso,
      })
      toast.success("Follow-up rescheduled")
      onSaved(res?.data || { ...followUp, scheduledAt: iso })
    } catch (err) {
      toast.error(err?.message || "Failed to reschedule")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 420 }}
      >
        <form onSubmit={submit}>
          <div className="modal-head">
            <h3>Reschedule follow-up</h3>
          </div>
          <div className="modal-body">
            <div style={{ marginBottom: 10, fontSize: "0.867rem", color: "var(--lp-text-muted)" }}>
              For <b>{followUp.lead?.name}</b>
            </div>
            <label className="text-xs text-muted">New date &amp; time</label>
            <input
              type="datetime-local"
              className="input"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoFocus
            />
          </div>
          <div className="modal-foot">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function CompleteModal({ followUp, onClose, onSaved }) {
  const [outcome, setOutcome] = useState("CALLED")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await api.post(`/follow-ups/${followUp.id}/complete`, {
        outcome,
        notes: notes.trim() || null,
      })
      toast.success("Follow-up marked done")
      onSaved(res?.data || followUp)
    } catch (err) {
      toast.error(err?.message || "Failed to update")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 460 }}
      >
        <form onSubmit={submit}>
          <div className="modal-head">
            <h3>Mark follow-up done</h3>
          </div>
          <div className="modal-body">
            <div style={{ marginBottom: 12, fontSize: "0.867rem", color: "var(--lp-text-muted)" }}>
              For <b>{followUp.lead?.name}</b>
            </div>
            <label className="text-xs text-muted">Outcome</label>
            <select
              className="input"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              style={{ marginBottom: 10 }}
            >
              {OUTCOMES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <label className="text-xs text-muted">Notes (optional)</label>
            <textarea
              className="input"
              rows={3}
              placeholder="What happened on this call/visit?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="modal-foot">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving…" : "Mark done"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function FollowUps() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const user = useAuthStore((s) => s.user)
  const role = user?.role

  const [isLoading, setIsLoading] = useState(true)
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [kpiToday, setKpiToday] = useState(0)
  const [kpiMissed, setKpiMissed] = useState(0)
  const [kpiUpcoming, setKpiUpcoming] = useState(0)
  const [kpiTotal, setKpiTotal] = useState(0)

  const [rescheduleTarget, setRescheduleTarget] = useState(null)
  const [completeTarget, setCompleteTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [users, setUsers] = useState([])
  const [projects, setProjects] = useState([])
  const [refreshKey, setRefreshKey] = useState(0)

  // URL-state
  const urlSearch = searchParams.get("search") ?? ""
  const [searchInput, setSearchInput] = useState(urlSearch)
  useEffect(() => { setSearchInput(urlSearch) }, [urlSearch])
  useEffect(() => {
    if (searchInput === urlSearch) return
    const t = setTimeout(() => {
      updateParams({ search: searchInput || null, page: null })
    }, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput])

  const status = searchParams.get("status") ?? ""
  const priority = searchParams.get("priority") ?? ""
  const source = searchParams.get("source") ?? ""
  const assignedToId = searchParams.get("assignedToId") ?? ""
  const projectId = searchParams.get("projectId") ?? ""
  const scheduledFrom = searchParams.get("scheduledFrom") ?? ""
  const scheduledTo = searchParams.get("scheduledTo") ?? ""
  const datePreset = matchPreset(scheduledFrom, scheduledTo)
  const page = parseInt(searchParams.get("page") ?? "1", 10) || 1
  const rawPageSize = searchParams.get("pageSize") ?? "50"
  const pageSize = parseInt(rawPageSize, 10) || 50
  const sort = searchParams.get("sort") ?? "scheduledAt:asc"

  const showCompleted = searchParams.get("completed") === "true"
  const queryParams = useMemo(() => {
    const p = { page, pageSize, sort, _ref: refreshKey }
    if (!showCompleted) p.completed = false
    if (urlSearch) p.search = urlSearch
    if (status) p.status = status
    if (priority) p.priority = priority
    if (source) p.source = source
    if (assignedToId) p.assignedToId = assignedToId
    if (projectId) p.projectId = projectId
    if (scheduledFrom) p.scheduledFrom = scheduledFrom
    if (scheduledTo) p.scheduledTo = scheduledTo
    return p
  }, [showCompleted, urlSearch, status, priority, source, assignedToId, projectId, scheduledFrom, scheduledTo, page, pageSize, sort, refreshKey])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const curPage = Math.min(page, totalPages)
  const startRow = total === 0 ? 0 : (curPage - 1) * pageSize + 1
  const endRow = Math.min(curPage * pageSize, total)

  // Load KPI data
  useEffect(() => {
    Promise.all([
      api.get("/follow-ups", { params: { bucket: "today", pageSize: 1 } }),
      api.get("/follow-ups", { params: { bucket: "missed", pageSize: 1 } }),
      api.get("/follow-ups", { params: { bucket: "upcoming", pageSize: 1 } }),
    ]).then(([t, m, u]) => {
      const bodyT = t?.data ?? []
      const bodyM = m?.data ?? []
      const bodyU = u?.data ?? []
      setKpiToday(Array.isArray(bodyT) ? bodyT.length : 0)
      setKpiMissed(Array.isArray(bodyM) ? bodyM.length : 0)
      setKpiUpcoming(Array.isArray(bodyU) ? bodyU.length : 0)
    }).catch(() => {})
  }, [refreshKey])

  // Load filter dropdown data
  useEffect(() => {
    let cancelled = false
    Promise.all([
      api.get("/users").catch(() => null),
      api.get("/projects", { params: { pageSize: 100 } }).catch(() => null),
    ]).then(([uRes, pRes]) => {
      if (cancelled) return
      const uList = uRes?.data?.items ?? uRes?.data ?? uRes?.users ?? uRes ?? []
      setUsers(Array.isArray(uList) ? uList : [])
      const pList = pRes?.data?.items ?? pRes?.data ?? []
      setProjects(Array.isArray(pList) ? pList : [])
    })
    return () => { cancelled = true }
  }, [])

  // Load main list
  useEffect(() => {
    setIsLoading(true)
    api.get("/follow-ups", { params: queryParams })
      .then((res) => {
        const body = res?.data ?? {}
        const list = body?.items ?? (Array.isArray(body) ? body : [])
        setItems(Array.isArray(list) ? list : [])
        setTotal(body?.total ?? (Array.isArray(body) ? body.length : 0))
      })
      .catch((err) => {
        toast.error(err?.message || "Failed to load follow-ups")
      })
      .finally(() => setIsLoading(false))
  }, [queryParams])

  function updateParams(patch) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === "" || v === undefined) next.delete(k)
        else next.set(k, String(v))
      }
      return next
    })
  }

  const onSort = (field) => {
    const [curField, curDir] = sort.split(":")
    const nextDir = curField === field && curDir === "asc" ? "desc" : "asc"
    updateParams({ sort: `${field}:${nextDir}` })
  }

  // Columns
  const columnsParam = searchParams.get("columns") ?? ""
  const visibleColumns = useMemo(() => {
    if (!columnsParam) return COLUMNS_CONFIG.map((c) => c.key)
    return columnsParam.split(",").filter((k) => COLUMNS_CONFIG.some((c) => c.key === k))
  }, [columnsParam])

  const toggleColumn = (key) => {
    const current = new Set(visibleColumns)
    if (current.has(key)) {
      if (current.size <= 1) return
      current.delete(key)
    } else {
      current.add(key)
    }
    updateParams({ columns: [...current].join(",") || null })
  }

  const toggleAllColumns = () => {
    const allKeys = COLUMNS_CONFIG.map((c) => c.key)
    const allVisible = allKeys.every((k) => visibleColumns.includes(k))
    if (allVisible) {
      updateParams({ columns: allKeys[0] })
    } else {
      updateParams({ columns: allKeys.join(",") || null })
    }
  }

  // Bulk selection
  const selection = useRowSelection(items, (fu) => fu.id)

  const bulkMarkDone = async () => {
    for (const id of selection.ids) {
      try {
        await api.post(`/follow-ups/${id}/complete`, { outcome: "CALLED" })
      } catch { /* skip failures */ }
    }
    toast.success(`Marked ${selection.count} done`)
    selection.clear()
  }

  const bulkDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      for (const id of deleteTarget.ids) {
        await api.delete(`/follow-ups/${id}`)
      }
      toast.success(`Deleted ${deleteTarget.ids.length} follow-up${deleteTarget.ids.length > 1 ? "s" : ""}`)
      setDeleteTarget(null)
      selection.clear()
      setRefreshKey((k) => k + 1)
    } catch (err) {
      toast.error(err?.message || "Failed to delete")
    } finally {
      setDeleting(false)
    }
  }

  // Per-row handlers
  const handleMarkDone = (fu) => setCompleteTarget(fu)
  const handleReschedule = (fu) => setRescheduleTarget(fu)

  const handleDelete = async (fu) => {
    if (!window.confirm(`Cancel this follow-up for ${fu.lead?.name}?`)) return
    try {
      await api.delete(`/follow-ups/${fu.id}`)
      setItems((p) => p.filter((x) => x.id !== fu.id))
      toast.success("Follow-up cancelled")
    } catch (err) {
      toast.error(err?.message || "Failed to cancel")
    }
  }

  const handleSaved = () => {
    setRescheduleTarget(null)
    setCompleteTarget(null)
    setRefreshKey((k) => k + 1)
  }

  // Filter chips
  const chips = []
  if (urlSearch) chips.push({ label: `Search: "${urlSearch}"`, clear: () => { setSearchInput(""); updateParams({ search: null, page: null }) } })
  if (status) chips.push({ label: `Status: ${status}`, clear: () => updateParams({ status: null, page: null }) })
  if (priority) chips.push({ label: `Priority: ${priority}`, clear: () => updateParams({ priority: null, page: null }) })
  if (source) chips.push({ label: `Source: ${source}`, clear: () => updateParams({ source: null, page: null }) })
  if (assignedToId) {
    const u = users.find((x) => x.id === assignedToId)
    chips.push({ label: `Assigned: ${u?.name || u?.email || assignedToId}`, clear: () => updateParams({ assignedToId: null, page: null }) })
  }
  if (projectId) {
    const p = projects.find((x) => x.id === projectId)
    chips.push({ label: `Project: ${p?.name || projectId}`, clear: () => updateParams({ projectId: null, page: null }) })
  }
  if (scheduledFrom || scheduledTo) {
    const presetLabel = DATE_PRESETS.find((p) => p.key === datePreset)?.label
    const rangeLabel = presetLabel || (scheduledFrom && scheduledTo ? scheduledFrom === scheduledTo ? scheduledFrom : `${scheduledFrom} → ${scheduledTo}` : scheduledFrom ? `From ${scheduledFrom}` : `Until ${scheduledTo}`)
    chips.push({ label: `Due: ${rangeLabel}`, clear: () => updateParams({ scheduledFrom: null, scheduledTo: null, page: null }) })
  }
  if (showCompleted) chips.push({ label: "Show completed", clear: () => updateParams({ completed: null, page: null }) })
  const hasFilters = chips.length > 0

  const clearAllFilters = () => {
    setSearchInput("")
    updateParams({ search: null, status: null, priority: null, source: null, assignedToId: null, projectId: null, scheduledFrom: null, scheduledTo: null, completed: null, page: null })
  }

  const paginationItems = buildPaginationItems(curPage, totalPages)

  return (
    <>
      <div className="content-head">
        <div>
          <h1>Follow-Ups</h1>
          <p>Stay on top of every customer touchpoint.</p>
        </div>
      </div>

      <div className="kpi-grid">
        <KpiCard label="Due Today" value={kpiToday} icon={PhoneCall} color="amber" />
        <KpiCard label="Missed" value={kpiMissed} icon={AlertTriangle} color="red" />
        <KpiCard label="Upcoming" value={kpiUpcoming} icon={Calendar} color="blue" />
        <KpiCard label="Total Active" value={kpiTotal || kpiToday + kpiMissed + kpiUpcoming} icon={ListChecks} color="green" />
      </div>

      <div className="table-wrap">
        <div className="table-toolbar">
          <div className="topbar-search">
            <Search size={16} />
            <input
              value={searchInput}
              placeholder="Search name, phone, email…"
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <div className="row" style={{ marginLeft: "auto", gap: 6 }}>
            {selection.count > 0 && (
              <span className="row" style={{ gap: 6 }}>
                <span style={{ fontSize: "0.867rem", color: "var(--lp-text-muted)" }}>{selection.count} selected</span>
                <button type="button" className="btn btn-sm btn-danger" onClick={() => setDeleteTarget({ ids: [...selection.ids], label: `${selection.count} follow-up${selection.count > 1 ? "s" : ""}` })}>
                  <Trash2 size={14} /> Delete
                </button>
                <button type="button" className="btn btn-sm btn-ghost" onClick={selection.clear}>Clear</button>
                <button type="button" className="btn btn-sm btn-secondary" onClick={bulkMarkDone}><Check size={14} /> Mark done</button>
              </span>
            )}
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" className="btn btn-sm btn-secondary">
                  <Filter size={14} /> Filters
                  {hasFilters && (
                    <span className="badge badge-muted" style={{ padding: "1px 6px", fontSize: "0.733rem", lineHeight: 1.4 }}>
                      {chips.length}
                    </span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="min-w-[200px] p-2">
                <div className="stack" style={{ gap: "4px" }}>
                  <div>
                    <label className="label" style={{ fontSize: "0.75rem", marginBottom: 2, display: "block" }}>Status</label>
                    <select className="select" style={{ fontSize: "0.8rem", padding: "5px 8px" }} value={status} onChange={(e) => updateParams({ status: e.target.value || null, page: null })}>
                      <option value="">All Statuses</option>
                      {LEAD_STATUS_VALUES.map((s) => (<option key={s} value={s}>{s}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="label" style={{ fontSize: "0.75rem", marginBottom: 2, display: "block" }}>Priority</label>
                    <select className="select" style={{ fontSize: "0.8rem", padding: "5px 8px" }} value={priority} onChange={(e) => updateParams({ priority: e.target.value || null, page: null })}>
                      <option value="">All Priorities</option>
                      {PRIORITIES.map((p) => (<option key={p} value={p}>{p}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="label" style={{ fontSize: "0.75rem", marginBottom: 2, display: "block" }}>Source</label>
                    <select className="select" style={{ fontSize: "0.8rem", padding: "5px 8px" }} value={source} onChange={(e) => updateParams({ source: e.target.value || null, page: null })}>
                      <option value="">All Sources</option>
                      {LEAD_SOURCES.map((s) => (<option key={s} value={s}>{s}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="label" style={{ fontSize: "0.75rem", marginBottom: 2, display: "block" }}>Assigned To</label>
                    <select className="select" style={{ fontSize: "0.8rem", padding: "5px 8px" }} value={assignedToId} onChange={(e) => updateParams({ assignedToId: e.target.value || null, page: null })}>
                      <option value="">Anyone</option>
                      {users.map((u) => (<option key={u.id} value={u.id}>{u.name || u.email}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="label" style={{ fontSize: "0.75rem", marginBottom: 2, display: "block" }}>Project</label>
                    <select className="select" style={{ fontSize: "0.8rem", padding: "5px 8px" }} value={projectId} onChange={(e) => updateParams({ projectId: e.target.value || null, page: null })}>
                      <option value="">All Projects</option>
                      {projects.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="label" style={{ fontSize: "0.75rem", marginBottom: 2, display: "block" }}>Due date</label>
                    <select className="select" style={{ fontSize: "0.8rem", padding: "5px 8px" }} value={datePreset} onChange={(e) => {
                      const key = e.target.value
                      if (key === "custom") return
                      const { from, to } = presetRange(key)
                      updateParams({ scheduledFrom: from, scheduledTo: to, page: null })
                    }}>
                      <option value="">All time</option>
                      {DATE_PRESETS.map((p) => (<option key={p.key} value={p.key}>{p.label}</option>))}
                      <option value="custom">Custom range</option>
                    </select>
                    <div className="row" style={{ gap: 4, marginTop: 4 }}>
                      <input type="date" className="input" style={{ fontSize: "0.75rem", padding: "4px 6px" }} aria-label="From date" value={scheduledFrom} max={scheduledTo || undefined} onChange={(e) => updateParams({ scheduledFrom: e.target.value || null, page: null })} />
                      <input type="date" className="input" style={{ fontSize: "0.75rem", padding: "4px 6px" }} aria-label="To date" value={scheduledTo} min={scheduledFrom || undefined} onChange={(e) => updateParams({ scheduledTo: e.target.value || null, page: null })} />
                    </div>
                  </div>
                  <label className="column-option" style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", borderRadius: "var(--lp-radius-input)", cursor: "pointer", fontSize: "0.867rem" }}>
                    <input type="checkbox" checked={showCompleted} onChange={(e) => updateParams({ completed: e.target.checked ? "true" : null, page: null })} style={{ accentColor: "var(--lp-accent)", width: 15, height: 15 }} />
                    <ListChecks size={15} style={{ color: "var(--lp-text-muted)", flexShrink: 0 }} />
                    Show completed
                  </label>
                </div>
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" className="btn btn-sm btn-secondary">
                  <Columns3 size={14} /> Columns
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="min-w-[200px] p-2">
                <div className="stack" style={{ gap: "2px" }}>
                  <label className="column-option" style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", borderRadius: "var(--lp-radius-input)", cursor: "pointer", fontSize: "0.867rem", borderBottom: "1px solid var(--lp-border)", marginBottom: 4 }}>
                    <input type="checkbox" checked={COLUMNS_CONFIG.every((c) => visibleColumns.includes(c.key))} onChange={toggleAllColumns} style={{ accentColor: "var(--lp-accent)", width: 15, height: 15 }} />
                    <ListChecks size={15} style={{ color: "var(--lp-text-muted)", flexShrink: 0 }} />
                    Select All
                  </label>
                  {COLUMNS_CONFIG.map((col) => (
                    <label key={col.key} className="column-option" style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", borderRadius: "var(--lp-radius-input)", cursor: "pointer", fontSize: "0.867rem" }}>
                      <input type="checkbox" checked={visibleColumns.includes(col.key)} onChange={() => toggleColumn(col.key)} style={{ accentColor: "var(--lp-accent)", width: 15, height: 15 }} />
                      <col.icon size={15} style={{ color: "var(--lp-text-muted)", flexShrink: 0 }} />
                      {col.label}
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            <select className="select" style={{ width: "auto", fontSize: "0.8rem" }} value={rawPageSize} onChange={(e) => updateParams({ pageSize: e.target.value === "50" ? null : e.target.value, page: null })}>
              {PAGE_SIZE_OPTIONS.map((s) => (<option key={s} value={s}>{s}</option>))}
            </select>
            {hasFilters && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={clearAllFilters}>Clear</button>
            )}
          </div>
        </div>

        {hasFilters && (
          <div style={{ padding: "10px 16px", display: "flex", gap: 6, flexWrap: "wrap", borderBottom: "1px solid var(--lp-border)" }}>
            {chips.map((c) => (
              <span key={c.label} className="badge badge-muted">
                {c.label}
                <button type="button" onClick={c.clear} aria-label={`Remove ${c.label}`} style={{ marginLeft: 4, background: "transparent", border: 0, cursor: "pointer", display: "inline-flex", alignItems: "center", color: "inherit" }}>
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="table-scroll">
          {isLoading ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--lp-text-muted)", fontSize: "0.933rem" }}>
              Loading follow-ups…
            </div>
          ) : items.length === 0 ? (
            <div className="empty-state">
              <div className="icon"><CalendarClock size={28} /></div>
              <h3>{hasFilters ? "No follow-ups match" : "No follow-ups yet"}</h3>
              <p>{hasFilters ? "Try clearing some filters." : "Schedule a follow-up from any lead detail page."}</p>
            </div>
          ) : (
            <table className="data">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <input type="checkbox" checked={selection.allSelected} ref={(el) => { if (el) el.indeterminate = selection.someSelected }} onChange={(e) => selection.toggleAll(e.target.checked)} aria-label="Select all" />
                  </th>
                  {visibleColumns.includes("name") && (
                    <th style={{ cursor: "pointer" }} onClick={() => onSort("name")}>
                      <span className="row" style={{ gap: 4 }}>Customer <SortIcon field="name" sort={sort} /></span>
                    </th>
                  )}
                  {visibleColumns.includes("phone") && <th>Phone</th>}
                  {visibleColumns.includes("project") && <th>Project</th>}
                  {visibleColumns.includes("scheduledAt") && (
                    <th style={{ cursor: "pointer" }} onClick={() => onSort("scheduledAt")}>
                      <span className="row" style={{ gap: 4 }}>Due <SortIcon field="scheduledAt" sort={sort} /></span>
                    </th>
                  )}
                  {visibleColumns.includes("status") && (
                    <th style={{ cursor: "pointer" }} onClick={() => onSort("status")}>
                      <span className="row" style={{ gap: 4 }}>Status <SortIcon field="status" sort={sort} /></span>
                    </th>
                  )}
                  {visibleColumns.includes("priority") && (
                    <th style={{ cursor: "pointer" }} onClick={() => onSort("priority")}>
                      <span className="row" style={{ gap: 4 }}>Priority <SortIcon field="priority" sort={sort} /></span>
                    </th>
                  )}
                  {visibleColumns.includes("lastContactedAt") && (
                    <th style={{ cursor: "pointer" }} onClick={() => onSort("lastContactedAt")}>
                      <span className="row" style={{ gap: 4 }}>Last Contact <SortIcon field="lastContactedAt" sort={sort} /></span>
                    </th>
                  )}
                  {visibleColumns.includes("assignedTo") && <th>Assigned</th>}
                  {visibleColumns.includes("source") && <th>Source</th>}
                  {visibleColumns.includes("city") && <th>City</th>}
                  <th className="col-actions" style={{ width: 56, textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((fu) => {
                  const l = fu.lead || {}
                  return (
                    <tr key={fu.id} className={selection.isSelected(fu.id) ? "selected" : ""}>
                      <td onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={selection.isSelected(fu.id)} onChange={(e) => selection.toggleRow(fu.id, e.target.checked)} aria-label={`Select ${l.name || "follow-up"}`} />
                      </td>
                      {visibleColumns.includes("name") && (
                        <td>
                          <div className="row" style={{ cursor: "pointer" }} onClick={() => navigate(`/leads/${l.id}`)}>
                            <div className="avatar sm">{fmt.initials(l.name || "?")}</div>
                            <div>
                              <div style={{ fontWeight: 600 }}>{l.name}</div>
                              {l.email && <div style={{ fontSize: "0.8rem", color: "var(--lp-text-muted)" }}>{l.email}</div>}
                            </div>
                          </div>
                        </td>
                      )}
                      {visibleColumns.includes("phone") && (
                        <td style={leadPiiMasked(l, role) ? NON_SELECTABLE_STYLE : undefined}
                          onCopy={leadPiiMasked(l, role) ? (e) => e.preventDefault() : undefined}>
                          {fmt.phone(l.phone)}
                        </td>
                      )}
                      {visibleColumns.includes("project") && <td>{l.interestedProject?.name || <Dash />}</td>}
                      {visibleColumns.includes("scheduledAt") && (
                        <td style={{ fontSize: "0.8rem", color: "var(--lp-text-muted)", whiteSpace: "nowrap" }}>
                          {fmt.date(fu.scheduledAt)}
                          {fu.completedAt && <span className="badge badge-success" style={{ marginLeft: 6, fontSize: "0.65rem" }}>Done</span>}
                        </td>
                      )}
                      {visibleColumns.includes("status") && (
                        <td><span className={`badge ${statusCls(l.status)}`}>{l.status || <Dash />}</span></td>
                      )}
                      {visibleColumns.includes("priority") && (
                        <td>{l.priority ? <span className={`badge ${priorityCls(l.priority)}`}>{l.priority}</span> : <Dash />}</td>
                      )}
                      {visibleColumns.includes("lastContactedAt") && (
                        <td style={{ fontSize: "0.8rem", color: "var(--lp-text-muted)" }}>{l.lastContactedAt ? fmt.ago(l.lastContactedAt) : <Dash />}</td>
                      )}
                      {visibleColumns.includes("assignedTo") && (
                        <td style={{ fontSize: "0.867rem" }}>{l.assignedTo?.name || l.assignedTo?.email || <span style={{ fontSize: "0.8rem", color: "var(--lp-text-muted)" }}>Unassigned</span>}</td>
                      )}
                      {visibleColumns.includes("source") && (
                        <td style={{ fontSize: "0.867rem", color: "var(--lp-text-muted)" }}>{l.source || <Dash />}</td>
                      )}
                      {visibleColumns.includes("city") && (
                        <td style={{ fontSize: "0.867rem", color: "var(--lp-text-muted)" }}>{l.city || <Dash />}</td>
                      )}
                      <td className="col-actions" style={{ textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button type="button" className="btn-icon btn-ghost" aria-label="Row actions" title="Actions">
                              <MoreHorizontal size={16} />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent align="end" className="row-menu p-0" style={{ width: "auto" }}>
                            {leadPiiMasked(l, role) ? (
                              <button type="button" className="row-menu-item" onClick={() => dialViaAutoDialer(l.id)}>
                                <Phone size={14} /> Call (auto-dialer)
                              </button>
                            ) : (
                              <>
                                <a href={`tel:${l.phone}`} className="row-menu-item"><Phone size={14} /> Call</a>
                                <a href={`https://wa.me/${stripNonDigits(l.phone)}`} target="_blank" rel="noopener noreferrer" className="row-menu-item"><MessageSquare size={14} /> WhatsApp</a>
                              </>
                            )}
                            <button type="button" className="row-menu-item" onClick={() => handleReschedule(fu)}>
                              <Clock size={14} /> Reschedule
                            </button>
                            <button type="button" className="row-menu-item" onClick={() => handleMarkDone(fu)}>
                              <Check size={14} /> Mark done
                            </button>
                            <div className="row-menu-sep" />
                            <button type="button" className="row-menu-item danger" onClick={() => handleDelete(fu)}>
                              <Trash2 size={14} /> Cancel follow-up
                            </button>
                          </PopoverContent>
                        </Popover>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {total > 0 && (
          <div className="table-foot">
            <div>
              {startRow}–{endRow} of {total} follow-ups
            </div>
            <div className="pagination">
              <button type="button" onClick={() => updateParams({ page: Math.max(1, curPage - 1) })} disabled={curPage <= 1} aria-label="Previous page">
                <ChevronLeft size={14} />
              </button>
              {paginationItems.map((item, i) =>
                item === "…" ? (
                  <span key={`dots-${i}`} style={{ padding: "4px 8px", color: "var(--lp-text-muted)" }}>…</span>
                ) : (
                  <button key={item} type="button" className={item === curPage ? "active" : ""} onClick={() => updateParams({ page: item })}>
                    {item}
                  </button>
                )
              )}
              <button type="button" onClick={() => updateParams({ page: Math.min(totalPages, curPage + 1) })} disabled={curPage >= totalPages} aria-label="Next page">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {rescheduleTarget && (
        <RescheduleModal followUp={rescheduleTarget} onClose={() => setRescheduleTarget(null)} onSaved={handleSaved} />
      )}
      {completeTarget && (
        <CompleteModal followUp={completeTarget} onClose={() => setCompleteTarget(null)} onSaved={handleSaved} />
      )}

      {deleteTarget && (
        <div className="modal-backdrop" onClick={() => !deleting && setDeleteTarget(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-head">
              <div className="row" style={{ gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 999, background: "rgba(220,38,38,0.12)", color: "var(--lp-error)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                  <AlertTriangle size={18} />
                </div>
                <h3 style={{ margin: 0 }}>Delete {deleteTarget.label}?</h3>
              </div>
              <button type="button" className="btn-icon btn-ghost" onClick={() => setDeleteTarget(null)} disabled={deleting} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ margin: 0 }}>
                This will permanently remove {deleteTarget.ids.length > 1 ? `${deleteTarget.ids.length} follow-ups` : `this follow-up`}. This cannot be undone.
              </p>
            </div>
            <div className="modal-foot">
              <button type="button" className="btn btn-secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</button>
              <button type="button" className="btn btn-danger" onClick={bulkDelete} disabled={deleting}>{deleting ? "Deleting…" : "Delete"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
