import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import {
  ArrowDown,
  ArrowUp,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUpDown,
  Columns3,
  Eye,
  Filter,
  Flag,
  Folder,
  MapPin,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  Radio,
  Search,
  Tag,
  Download,
  Trash2,
  Upload,
  User,
  UserCog,
  UserCircle,
  Users,
  UserPlus,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { LEAD_SOURCES, LEAD_STATUS_VALUES } from "@/lib/constants"
import { fmt } from "@/lib/format"
import { useLeads } from "@/hooks/useLeads"
import { useAuthStore } from "@/stores/authStore"
import { leadPiiMasked, NON_SELECTABLE_STYLE } from "@/lib/privacy"
import KanbanBoard from "@/components/leads/KanbanBoard"
import LeadsCalendar from "@/components/leads/LeadsCalendar"
import ImportModal from "@/components/leads/ImportModal"
import SourceIcon from "@/components/leads/SourceIcon"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

// Visual port from leadpro-realty/src/pages/Leads.jsx with the existing
// useLeads + URL-state + bulk delete wiring kept intact.

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, "All"]
// "All" maps to a high page-size on the server so the entire result set
// comes back in one shot. Capped at 1000 to keep the round-trip sane —
// beyond that the user should refine filters instead.
const ALL_PAGE_SIZE = 1000

// Build the page-number sequence shown in the pagination control. Items
// are either page numbers (Number) or the literal string "…" for gaps.
//
//   1 … 4 [5] 6 … 20    ← typical mid-range view
//   [1] 2 3 4 5 … 20    ← near the start (no leading ellipsis)
//   1 … 16 17 18 [19] 20  ← near the end (no trailing ellipsis)
//
// `siblings` controls how many neighbours show on each side of current;
// 1 keeps the bar compact (max 7 items) and matches GitHub/Linear/Stripe.
function buildPaginationItems(current, total, siblings = 1) {
  if (total <= 1) return [1]
  const window = siblings * 2 + 3 // first + siblings + current + siblings + last
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

function statusBadgeCls(s) {
  return STATUS_BADGE[s] || "badge-muted"
}

const PRIORITY_BADGE = {
  Hot: "badge-error",
  Warm: "badge-warning",
  Cold: "badge-muted",
}
const PRIORITIES = ["Hot", "Warm", "Cold"]

function priorityBadgeCls(p) {
  return PRIORITY_BADGE[p] || "badge-muted"
}

const COLUMNS_CONFIG = [
  { key: "name", label: "Customer", icon: User },
  { key: "phone", label: "Phone", icon: Phone },
  { key: "city", label: "City", icon: MapPin },
  { key: "status", label: "Status", icon: Tag },
  { key: "priority", label: "Priority", icon: Flag },
  { key: "source", label: "Source", icon: Radio },
  { key: "assigned", label: "Assigned", icon: UserCircle },
  { key: "project", label: "Project", icon: Folder },
  { key: "createdAt", label: "Created", icon: Calendar },
]

function SortIcon({ field, sort }) {
  const [curField, curDir] = sort.split(":")
  if (curField !== field) return <ChevronsUpDown size={12} />
  return curDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />
}

export default function Leads() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const role = useAuthStore((s) => s.user?.role)

  // --- URL-state wiring (preserved) ---
  const urlSearch = searchParams.get("search") ?? ""
  const [searchInput, setSearchInput] = useState(urlSearch)
  useEffect(() => {
    setSearchInput(urlSearch)
  }, [urlSearch])

  useEffect(() => {
    if (searchInput === urlSearch) return
    const t = setTimeout(() => {
      updateParams({ search: searchInput || null, page: null })
    }, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput])

  const status = searchParams.get("status") ?? ""
  const source = searchParams.get("source") ?? ""
  const priority = searchParams.get("priority") ?? ""
  const assignedToId = searchParams.get("assignedToId") ?? ""
  const interestedProjectId = searchParams.get("interestedProjectId") ?? ""
  const page = parseInt(searchParams.get("page") ?? "1", 10) || 1
  // pageSize is stored in the URL as a number OR the literal "all". When
  // "all" is selected we send ALL_PAGE_SIZE to the server in one go.
  const rawPageSize = searchParams.get("pageSize") ?? "20"
  const isAllPageSize = rawPageSize === "all"
  const pageSize = isAllPageSize
    ? ALL_PAGE_SIZE
    : parseInt(rawPageSize, 10) || 20
  const sort = searchParams.get("sort") ?? "createdAt:desc"
  const viewParam = searchParams.get("view")
  const view =
    viewParam === "kanban" || viewParam === "calendar" ? viewParam : "table"

  const effectiveAssignedToId = assignedToId

  const queryParams = useMemo(() => {
    const p = { page, pageSize, sort }
    if (urlSearch) p.search = urlSearch
    if (status) p.status = status
    if (source) p.source = source
    if (priority) p.priority = priority
    if (effectiveAssignedToId) p.assignedToId = effectiveAssignedToId
    if (interestedProjectId) p.interestedProjectId = interestedProjectId
    return p
  }, [
    page,
    pageSize,
    sort,
    urlSearch,
    status,
    source,
    priority,
    effectiveAssignedToId,
    interestedProjectId,
  ])

  const { items, total, isLoading, refetch } = useLeads(queryParams)

  const [importOpen, setImportOpen] = useState(false)

  // Filter dropdown data (users + projects).
  const [users, setUsers] = useState([])
  const [projects, setProjects] = useState([])
  useEffect(() => {
    let cancelled = false
    Promise.all([
      api.get("/users").catch(() => null),
      api.get("/projects", { params: { pageSize: 100 } }).catch(() => null),
    ]).then(([uRes, pRes]) => {
      if (cancelled) return
      const uList =
        uRes?.data?.items ?? uRes?.data ?? uRes?.users ?? uRes ?? []
      setUsers(Array.isArray(uList) ? uList : [])
      const pList = pRes?.data?.items ?? pRes?.data ?? []
      setProjects(Array.isArray(pList) ? pList : [])
    })
    return () => {
      cancelled = true
    }
  }, [])

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

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const curPage = Math.min(page, totalPages)
  const startRow = total === 0 ? 0 : (curPage - 1) * pageSize + 1
  const endRow = Math.min(curPage * pageSize, total)

  // Visible columns state (persisted in URL).
  const columnsParam = searchParams.get("columns") ?? ""
  const visibleColumns = useMemo(() => {
    if (!columnsParam) return COLUMNS_CONFIG.map((c) => c.key)
    return columnsParam
      .split(",")
      .filter((k) => COLUMNS_CONFIG.some((c) => c.key === k))
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

  // Bulk selection (preserved).
  const [selected, setSelected] = useState(new Set())
  useEffect(() => {
    setSelected(new Set())
  }, [
    urlSearch,
    status,
    source,
    priority,
    effectiveAssignedToId,
    interestedProjectId,
    page,
    pageSize,
    sort,
  ])

  const toggleRow = (id, on) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })
  }
  const toggleAll = (on) => {
    // Inactive (soft-deleted) rows are excluded from bulk selection — the
    // bulk Delete CTA shouldn't accidentally hard-delete already-Trashed leads.
    setSelected(
      on ? new Set(items.filter((l) => !l.deletedAt).map((l) => l.id)) : new Set(),
    )
  }
  const allSelected =
    items.length > 0 && items.every((l) => selected.has(l.id))

  const [bulkAssignOpen, setBulkAssignOpen] = useState(false)
  const [bulkAssignTo, setBulkAssignTo] = useState("")
  const [isBulkAssigning, setIsBulkAssigning] = useState(false)
  const bulkAssign = async () => {
    if (selected.size === 0 || !bulkAssignTo) return
    setIsBulkAssigning(true)
    try {
      const res = await api.post("/leads/bulk-assign", {
        leadIds: [...selected],
        assignedToId: bulkAssignTo,
      })
      const data = res?.data ?? res ?? {}
      const ok = data.successCount ?? 0
      const fail = data.failures?.length ?? 0
      if (fail === 0)
        toast.success(`Assigned ${ok} lead${ok === 1 ? "" : "s"}`)
      else if (ok === 0) toast.error("Failed to assign leads")
      else toast.warning(`Assigned ${ok}, failed ${fail}`)
      setSelected(new Set())
      setBulkAssignOpen(false)
      setBulkAssignTo("")
      refetch()
    } catch (err) {
      toast.error(err?.message || "Failed to assign leads")
    } finally {
      setIsBulkAssigning(false)
    }
  }

  const [isBulkDeleting, setIsBulkDeleting] = useState(false)
  const [bulkDeleteModal, setBulkDeleteModal] = useState(false)
  // Single-row action state — backs the per-row Actions column. Kept
  // separate from the bulk-* state so a per-row delete doesn't get
  // entangled with whatever rows are checkbox-selected for bulk ops.
  const [rowAssignTarget, setRowAssignTarget] = useState(null) // lead obj
  const [rowAssignTo, setRowAssignTo] = useState("")
  const [rowAssigning, setRowAssigning] = useState(false)
  const [rowDeleteTarget, setRowDeleteTarget] = useState(null) // lead obj
  const [rowDeleting, setRowDeleting] = useState(false)

  const openRowAssign = (l) => {
    setRowAssignTarget(l)
    setRowAssignTo(l.assignedToId || l.assignedTo?.id || "")
  }
  const submitRowAssign = async () => {
    if (!rowAssignTarget || !rowAssignTo) return
    setRowAssigning(true)
    try {
      await api.post(`/leads/${rowAssignTarget.id}/assign`, {
        assignedToId: rowAssignTo,
      })
      toast.success("Lead assigned")
      setRowAssignTarget(null)
      refetch()
    } catch (err) {
      toast.error(err?.message || "Assign failed")
    } finally {
      setRowAssigning(false)
    }
  }
  const submitRowDelete = async (mode = "soft") => {
    if (!rowDeleteTarget) return
    setRowDeleting(true)
    try {
      await api.delete(`/leads/${rowDeleteTarget.id}?mode=${mode}`)
      toast.success(mode === "hard" ? "Lead deleted" : "Moved to Trash")
      setRowDeleteTarget(null)
      refetch()
    } catch (err) {
      toast.error(err?.message || "Delete failed")
    } finally {
      setRowDeleting(false)
    }
  }
  // Picks the destructive path chosen in BulkDeleteModal and applies it
  // across every selected lead. "soft" → 30-day Trash (recoverable),
  // "hard" → row + lead-owned children removed immediately.
  const runBulkDelete = async (mode) => {
    if (selected.size === 0) return
    setBulkDeleteModal(false)
    setIsBulkDeleting(true)
    const ids = [...selected]
    let ok = 0
    let fail = 0
    for (const id of ids) {
      try {
        await api.delete(`/leads/${id}?mode=${mode}`)
        ok++
      } catch {
        fail++
      }
    }
    setIsBulkDeleting(false)
    setSelected(new Set())
    const hard = mode === "hard"
    const verb = hard ? "Deleted" : "Moved to Trash"
    if (fail === 0) toast.success(`${verb} ${ok} lead${ok > 1 ? "s" : ""}`)
    else if (ok === 0) toast.error(`Failed to ${hard ? "delete" : "trash"} leads`)
    else toast.warning(`${verb} ${ok}, failed ${fail}`)
  }

  // CSV export — applies the SAME filters the user has on screen so
  // the downloaded file matches what they're looking at. Server caps
  // at 10k rows to keep the request bounded.
  const [isExporting, setIsExporting] = useState(false)
  const exportCsv = async () => {
    setIsExporting(true)
    try {
      const params = new URLSearchParams()
      if (urlSearch) params.set("search", urlSearch)
      if (status) params.set("status", status)
      if (source) params.set("source", source)
      if (priority) params.set("priority", priority)
      if (effectiveAssignedToId) params.set("assignedToId", effectiveAssignedToId)
      if (interestedProjectId) params.set("interestedProjectId", interestedProjectId)
      const res = await api.get(`/leads/export?${params.toString()}`, {
        responseType: "blob",
      })
      const blob = res instanceof Blob ? res : new Blob([res], { type: "text/csv" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success("Export ready")
    } catch (err) {
      toast.error(err?.message || "Failed to export")
    } finally {
      setIsExporting(false)
    }
  }

  // Filter chips.
  const chips = []
  if (urlSearch)
    chips.push({
      label: `Search: "${urlSearch}"`,
      clear: () => {
        setSearchInput("")
        updateParams({ search: null, page: null })
      },
    })
  if (status)
    chips.push({
      label: `Status: ${status}`,
      clear: () => updateParams({ status: null, page: null }),
    })
  if (source)
    chips.push({
      label: `Source: ${source}`,
      clear: () => updateParams({ source: null, page: null }),
    })
  if (priority)
    chips.push({
      label: `Priority: ${priority}`,
      clear: () => updateParams({ priority: null, page: null }),
    })
  if (assignedToId) {
    const u = users.find((x) => x.id === assignedToId)
    chips.push({
      label: `Assigned: ${u?.name || u?.email || assignedToId}`,
      clear: () => updateParams({ assignedToId: null, page: null }),
    })
  }
  if (interestedProjectId) {
    const p = projects.find((x) => x.id === interestedProjectId)
    chips.push({
      label: `Project: ${p?.name || interestedProjectId}`,
      clear: () =>
        updateParams({ interestedProjectId: null, page: null }),
    })
  }
  const hasFilters = chips.length > 0
  const clearAllFilters = () => {
    setSearchInput("")
    updateParams({
      search: null,
      status: null,
      source: null,
      priority: null,
      assignedToId: null,
      interestedProjectId: null,
      page: null,
    })
  }

  // Pagination items: always anchor on first + last, show a ±1 window
  // around the current page, and drop "…" placeholders into the gaps.
  // Matches the pattern used by GitHub, Linear, and Stripe — clear "you
  // are here" plus one-click access to the ends of the list.
  const paginationItems = buildPaginationItems(curPage, totalPages)

  return (
    <>
      <div className="content-head">
        <div>
          <h1>Leads</h1>
          <p>
            {total === 0 && !hasFilters
              ? "No leads yet."
              : `${total} ${total === 1 ? "lead" : "leads"}${
                  hasFilters ? " matching filters" : " in your pipeline"
                }.`}
          </p>
        </div>
        <div className="row">
          {/* Import + Add Lead are owned by OWNER/ADMIN/MANAGER. Agents
              receive leads via assignment, they don't source them. The
              backend also rejects POST /leads + /leads/import for AGENT. */}
          {(role === "OWNER" || role === "ADMIN") && (
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => navigate("/leads/trash")}
              title="Restore recently deleted leads"
            >
              <Trash2 size={16} /> Trash
            </button>
          )}
          <button
            className="btn btn-secondary"
            type="button"
            onClick={exportCsv}
            disabled={isExporting || total === 0}
            title="Download the current view as CSV"
          >
            <Download size={16} /> {isExporting ? "Exporting…" : "Export"}
          </button>
          {role !== "AGENT" && (
            <>
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => setImportOpen(true)}
              >
                <Upload size={16} /> Import
              </button>
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => navigate("/leads/new")}
              >
                <Plus size={16} /> Add Lead
              </button>
            </>
          )}
        </div>
      </div>

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => refetch()}
      />

      <div
        className="row row-between"
        style={{ alignItems: "center", gap: 12, marginBottom: 8 }}
      >
        <div />

        <div className="row" style={{ gap: 6 }}>
          <button
            type="button"
            className={`btn btn-sm ${view === "table" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => updateParams({ view: null })}
            aria-pressed={view === "table"}
          >
            Table
          </button>
          <button
            type="button"
            className={`btn btn-sm ${view === "kanban" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => updateParams({ view: "kanban" })}
            aria-pressed={view === "kanban"}
          >
            Kanban
          </button>
          <button
            type="button"
            className={`btn btn-sm ${view === "calendar" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => updateParams({ view: "calendar" })}
            aria-pressed={view === "calendar"}
          >
            Calendar
          </button>
        </div>
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
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" className="btn btn-sm btn-secondary">
                  <Filter size={14} /> Filters
                  {hasFilters && (
                    <span
                      className="badge badge-muted"
                      style={{
                        padding: "1px 6px",
                        fontSize: "0.733rem",
                        lineHeight: 1.4,
                      }}
                    >
                      {chips.length}
                    </span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="min-w-[280px] p-3">
                <div className="stack" style={{ gap: "8px" }}>
                  <div>
                    <label
                      className="label"
                      style={{ fontSize: "0.8rem", marginBottom: 4, display: "block" }}
                    >
                      Status
                    </label>
                    <select
                      className="select"
                      value={status}
                      onChange={(e) =>
                        updateParams({ status: e.target.value || null, page: null })
                      }
                    >
                      <option value="">All Statuses</option>
                      {LEAD_STATUS_VALUES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      className="label"
                      style={{ fontSize: "0.8rem", marginBottom: 4, display: "block" }}
                    >
                      Source
                    </label>
                    <select
                      className="select"
                      value={source}
                      onChange={(e) =>
                        updateParams({ source: e.target.value || null, page: null })
                      }
                    >
                      <option value="">All Sources</option>
                      {LEAD_SOURCES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      className="label"
                      style={{ fontSize: "0.8rem", marginBottom: 4, display: "block" }}
                    >
                      Priority
                    </label>
                    <select
                      className="select"
                      value={priority}
                      onChange={(e) =>
                        updateParams({ priority: e.target.value || null, page: null })
                      }
                    >
                      <option value="">All Priorities</option>
                      {PRIORITIES.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      className="label"
                      style={{ fontSize: "0.8rem", marginBottom: 4, display: "block" }}
                    >
                      Assigned To
                    </label>
                    <select
                      className="select"
                      value={assignedToId}
                      onChange={(e) =>
                        updateParams({ assignedToId: e.target.value || null, page: null })
                      }
                    >
                      <option value="">Anyone</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>{u.name || u.email}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      className="label"
                      style={{ fontSize: "0.8rem", marginBottom: 4, display: "block" }}
                    >
                      Project
                    </label>
                    <select
                      className="select"
                      value={interestedProjectId}
                      onChange={(e) =>
                        updateParams({ interestedProjectId: e.target.value || null, page: null })
                      }
                    >
                      <option value="">All Projects</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
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
              <PopoverContent align="start" className="min-w-[200px] p-2">
                <div className="stack" style={{ gap: "2px" }}>
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
                        onChange={() => toggleColumn(col.key)}
                        style={{
                          accentColor: "var(--lp-accent)",
                          width: 15,
                          height: 15,
                        }}
                      />
                      <col.icon
                        size={15}
                        style={{ color: "var(--lp-text-muted)", flexShrink: 0 }}
                      />
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
                onClick={clearAllFilters}
              >
                Clear
              </button>
            )}
          </div>
          {selected.size > 0 && (
            <div
              style={{ marginLeft: "auto" }}
              className="row"
            >
              <span
                style={{ fontSize: "0.867rem", color: "var(--lp-text-muted)" }}
              >
                {selected.size} selected
              </span>
              {role !== "AGENT" && (
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  disabled={isBulkAssigning}
                  onClick={() => setBulkAssignOpen(true)}
                >
                  <UserCog size={14} /> Assign
                </button>
              )}
              {role !== "AGENT" && (
                <button
                  type="button"
                  className="btn btn-sm btn-danger"
                  disabled={isBulkDeleting}
                  onClick={() => setBulkDeleteModal(true)}
                >
                  <Trash2 size={14} /> Delete
                </button>
              )}
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => setSelected(new Set())}
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {hasFilters && (
          <div
            style={{
              padding: "10px 16px",
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
              borderBottom: "1px solid var(--lp-border)",
            }}
          >
            {chips.map((c) => (
              <span key={c.label} className="badge badge-muted">
                {c.label}
                <button
                  type="button"
                  onClick={c.clear}
                  aria-label={`Remove ${c.label}`}
                  style={{
                    marginLeft: 4,
                    background: "transparent",
                    border: 0,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    color: "inherit",
                  }}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}

        {view === "kanban" ? (
          <div style={{ padding: 12 }}>
            <KanbanBoard
              filters={{
                ...(urlSearch ? { search: urlSearch } : {}),
                // status intentionally omitted — Kanban columns ARE the
                // statuses; filtering by status would empty all but one.
                ...(source ? { source } : {}),
                ...(priority ? { priority } : {}),
                ...(effectiveAssignedToId
                  ? { assignedToId: effectiveAssignedToId }
                  : {}),
                ...(interestedProjectId ? { interestedProjectId } : {}),
              }}
            />
          </div>
        ) : view === "calendar" ? (
          <div style={{ padding: 12 }}>
            <LeadsCalendar
              filters={{
                ...(urlSearch ? { search: urlSearch } : {}),
                ...(status ? { status } : {}),
                ...(source ? { source } : {}),
                ...(priority ? { priority } : {}),
                ...(effectiveAssignedToId
                  ? { assignedToId: effectiveAssignedToId }
                  : {}),
                ...(interestedProjectId ? { interestedProjectId } : {}),
              }}
            />
          </div>
        ) : (
        <>
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
              Loading leads…
            </div>
          ) : items.length === 0 ? (
            <div className="empty-state">
              <div className="icon">
                <Users size={28} />
              </div>
              <h3>{hasFilters ? "No leads match" : "No leads yet"}</h3>
              <p>
                {hasFilters
                  ? "Try clearing some filters."
                  : "Add your first lead to get started."}
              </p>
            </div>
          ) : (
            <table className="data">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={(e) => toggleAll(e.target.checked)}
                      aria-label="Select all on this page"
                    />
                  </th>
                  {visibleColumns.includes("name") && (
                    <th
                      style={{ cursor: "pointer" }}
                      onClick={() => onSort("name")}
                    >
                      <span className="row" style={{ gap: 4 }}>
                        Customer <SortIcon field="name" sort={sort} />
                      </span>
                    </th>
                  )}
                  {visibleColumns.includes("phone") && <th>Phone</th>}
                  {visibleColumns.includes("city") && <th>City</th>}
                  {visibleColumns.includes("status") && <th>Status</th>}
                  {visibleColumns.includes("priority") && <th>Priority</th>}
                  {visibleColumns.includes("source") && <th>Source</th>}
                  {visibleColumns.includes("assigned") && <th>Assigned</th>}
                  {visibleColumns.includes("project") && <th>Project</th>}
                  {visibleColumns.includes("createdAt") && (
                    <th
                      style={{ cursor: "pointer" }}
                      onClick={() => onSort("createdAt")}
                    >
                      <span className="row" style={{ gap: 4 }}>
                        Created <SortIcon field="createdAt" sort={sort} />
                      </span>
                    </th>
                  )}
                  <th
                    className="col-actions"
                    style={{ width: 56, textAlign: "right" }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((l) => {
                  const isSelected = selected.has(l.id)
                  const isInactive = !!l.deletedAt
                  return (
                    <tr
                      key={l.id}
                      className={isSelected ? "selected" : ""}
                      onClick={() => navigate(`/leads/${l.id}`)}
                      style={
                        isInactive
                          ? {
                              cursor: "pointer",
                              opacity: 0.6,
                              // Use the theme's secondary surface for the
                              // diagonal stripe so the pattern reads
                              // correctly in both light and dark mode.
                              background:
                                "repeating-linear-gradient(135deg, transparent, transparent 8px, var(--lp-surface-2) 8px, var(--lp-surface-2) 16px)",
                              borderLeft: "3px solid var(--lp-text-muted)",
                              filter: "grayscale(0.6)",
                            }
                          : { cursor: "pointer" }
                      }
                      title={
                        isInactive
                          ? "Inactive — deactivated lead, in Trash"
                          : undefined
                      }
                    >
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={isInactive}
                          onChange={(e) => toggleRow(l.id, e.target.checked)}
                          aria-label={`Select ${l.name}`}
                          title={
                            isInactive
                              ? "Restore this lead before selecting it"
                              : undefined
                          }
                        />
                      </td>
                      {visibleColumns.includes("name") && (
                        <td>
                          <div className="row">
                            <div className="avatar sm">
                              {fmt.initials(l.name || "?")}
                            </div>
                            <div>
                              <div
                                style={{
                                  fontWeight: 600,
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                }}
                              >
                                <Link
                                  to={`/leads/${l.id}`}
                                  onClick={(e) => e.stopPropagation()}
                                  style={{
                                    color: "var(--lp-text)",
                                    textDecoration:
                                      isInactive ? "line-through" : "none",
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.color =
                                      "var(--lp-accent)"
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.color =
                                      "var(--lp-text)"
                                  }}
                                >
                                  {l.name}
                                </Link>
                                {isInactive && (
                                  <span
                                    className="badge"
                                    style={{
                                      background: "var(--lp-surface-2)",
                                      color: "var(--lp-text-muted)",
                                      border: "1px solid var(--lp-border)",
                                      fontSize: "0.65rem",
                                      fontWeight: 700,
                                      letterSpacing: 0.5,
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 5,
                                      padding: "2px 7px",
                                    }}
                                  >
                                    <span
                                      aria-hidden
                                      style={{
                                        width: 6,
                                        height: 6,
                                        borderRadius: 999,
                                        background: "var(--lp-text-muted)",
                                        display: "inline-block",
                                      }}
                                    />
                                    INACTIVE
                                  </span>
                                )}
                              </div>
                              {l.email && (
                                <div
                                  style={{
                                    fontSize: "0.8rem",
                                    color: "var(--lp-text-muted)",
                                  }}
                                >
                                  {l.email}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      )}
                      {visibleColumns.includes("phone") && (
                        <td
                          style={
                            leadPiiMasked(l, role) ? NON_SELECTABLE_STYLE : undefined
                          }
                          onCopy={
                            leadPiiMasked(l, role)
                              ? (e) => e.preventDefault()
                              : undefined
                          }
                        >
                          {fmt.phone(l.phone)}
                        </td>
                      )}
                      {visibleColumns.includes("city") && (
                        <td style={{ fontSize: "0.867rem", color: "var(--lp-text-muted)" }}>
                          {l.city || "—"}
                        </td>
                      )}
                      {visibleColumns.includes("status") && (
                        <td>
                          <span
                            className={`badge ${statusBadgeCls(l.status)}`}
                          >
                            {l.status || "—"}
                          </span>
                        </td>
                      )}
                      {visibleColumns.includes("priority") && (
                        <td>
                          {l.priority ? (
                            <span
                              className={`badge ${priorityBadgeCls(l.priority)}`}
                            >
                              {l.priority}
                            </span>
                          ) : (
                            <span
                              style={{
                                fontSize: "0.8rem",
                                color: "var(--lp-text-muted)",
                              }}
                            >
                              —
                            </span>
                          )}
                        </td>
                      )}
                      {visibleColumns.includes("source") && (
                        <td>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              fontSize: "0.867rem",
                              color: "var(--lp-text-muted)",
                            }}
                          >
                            <SourceIcon source={l.source} />
                            {l.source || "—"}
                          </span>
                        </td>
                      )}
                      {visibleColumns.includes("assigned") && (
                        <td>
                          {l.assignedTo ? (
                            <span style={{ fontSize: "0.867rem" }}>
                              {l.assignedTo.name || l.assignedTo.email}
                            </span>
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
                      )}
                      {visibleColumns.includes("project") && (
                        <td>
                          {l.interestedProject ? (
                            l.interestedProject.name
                          ) : (
                            <span
                              style={{
                                fontSize: "0.8rem",
                                color: "var(--lp-text-muted)",
                              }}
                            >
                              —
                            </span>
                          )}
                        </td>
                      )}
                      {visibleColumns.includes("createdAt") && (
                        <td
                          style={{
                            fontSize: "0.8rem",
                            color: "var(--lp-text-muted)",
                          }}
                        >
                          {fmt.ago(l.createdAt)}
                        </td>
                      )}
                      {/* Per-row Actions. stopPropagation so the row's
                          navigate-to-detail click doesn't fire. AGENT
                          only gets View; OWNER/ADMIN/MANAGER get the
                          full set. Inactive (trashed) leads are
                          read-only here — they belong in /leads/trash. */}
                      <td
                        className="col-actions"
                        style={{ textAlign: "right" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="btn-icon btn-ghost"
                              title="Actions"
                              aria-label="Row actions"
                            >
                              <MoreHorizontal size={16} />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent
                            align="end"
                            className="row-menu p-0"
                            style={{ width: "auto" }}
                          >
                            <button
                              type="button"
                              className="row-menu-item"
                              onClick={() => navigate(`/leads/${l.id}`)}
                            >
                              <Eye size={14} /> View
                            </button>
                            {!isInactive && (role === "OWNER" || role === "ADMIN" || role === "MANAGER") && (
                              <>
                                <button
                                  type="button"
                                  className="row-menu-item"
                                  onClick={() => navigate(`/leads/${l.id}/edit`)}
                                >
                                  <Pencil size={14} /> Edit
                                </button>
                                <button
                                  type="button"
                                  className="row-menu-item"
                                  onClick={() => openRowAssign(l)}
                                >
                                  <UserPlus size={14} />{" "}
                                  {l.assignedTo ? "Reassign" : "Assign"}
                                </button>
                              </>
                            )}
                            {!isInactive && (role === "OWNER" || role === "ADMIN") && (
                              <>
                                <div className="row-menu-sep" />
                                <button
                                  type="button"
                                  className="row-menu-item danger"
                                  onClick={() => setRowDeleteTarget(l)}
                                >
                                  <Trash2 size={14} /> Delete
                                </button>
                              </>
                            )}
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
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "var(--lp-text-muted)",
                fontSize: "0.867rem",
              }}
            >
              <span>
                Showing <b style={{ color: "var(--lp-text)" }}>{startRow}–{endRow}</b>{" "}
                of <b style={{ color: "var(--lp-text)" }}>{total.toLocaleString("en-IN")}</b>
              </span>
              <span aria-hidden style={{ opacity: 0.4 }}>·</span>
              <span>
                Page <b style={{ color: "var(--lp-text)" }}>{curPage}</b> of{" "}
                <b style={{ color: "var(--lp-text)" }}>{totalPages}</b>
              </span>
            </div>
            <div
              className="row"
              style={{ gap: 12, alignItems: "center", flexWrap: "wrap" }}
            >
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: "0.867rem",
                  color: "var(--lp-text-muted)",
                }}
              >
                Rows
                <select
                  className="select"
                  style={{ width: "auto", paddingRight: 24 }}
                  value={isAllPageSize ? "all" : pageSize}
                  onChange={(e) =>
                    updateParams({ pageSize: e.target.value, page: null })
                  }
                  aria-label="Rows per page"
                >
                  {PAGE_SIZE_OPTIONS.map((n) => {
                    const value = n === "All" ? "all" : String(n)
                    return (
                      <option key={value} value={value}>
                        {n}
                      </option>
                    )
                  })}
                </select>
              </label>

              <div
                className="pagination"
                role="navigation"
                aria-label="Pagination"
              >
                <button
                  type="button"
                  onClick={() => updateParams({ page: 1 })}
                  disabled={curPage === 1}
                  aria-label="First page"
                  title="First page"
                >
                  <ChevronsLeft size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => updateParams({ page: curPage - 1 })}
                  disabled={curPage === 1}
                  aria-label="Previous page"
                  title="Previous page"
                >
                  <ChevronLeft size={14} />
                </button>
                {paginationItems.map((item, idx) =>
                  item === "…" ? (
                    <span
                      key={`ellipsis-${idx}`}
                      aria-hidden
                      style={{
                        width: 32,
                        height: 32,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--lp-text-muted)",
                        fontWeight: 600,
                        userSelect: "none",
                      }}
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={item}
                      type="button"
                      className={item === curPage ? "active" : ""}
                      onClick={() => updateParams({ page: item })}
                      aria-current={item === curPage ? "page" : undefined}
                      aria-label={`Page ${item}`}
                    >
                      {item}
                    </button>
                  ),
                )}
                <button
                  type="button"
                  onClick={() => updateParams({ page: curPage + 1 })}
                  disabled={curPage === totalPages}
                  aria-label="Next page"
                  title="Next page"
                >
                  <ChevronRight size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => updateParams({ page: totalPages })}
                  disabled={curPage === totalPages}
                  aria-label="Last page"
                  title="Last page"
                >
                  <ChevronsRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}
        </>
        )}
      </div>

      {/* Single-row Assign modal — same shape as the bulk one but
          scoped to one lead. */}
      {rowAssignTarget && (
        <div
          className="modal-backdrop"
          onClick={() => !rowAssigning && setRowAssignTarget(null)}
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 460 }}
          >
            <div className="modal-head">
              <h3>Assign {rowAssignTarget.name}</h3>
              <button
                type="button"
                onClick={() => setRowAssignTarget(null)}
                disabled={rowAssigning}
                aria-label="Close"
                style={{
                  background: "transparent",
                  border: 0,
                  cursor: "pointer",
                  color: "var(--lp-text-muted)",
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="field">
                <label className="label">Assign to</label>
                <select
                  className="select"
                  value={rowAssignTo}
                  onChange={(e) => setRowAssignTo(e.target.value)}
                >
                  <option value="">— Select a user —</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name || u.email}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-foot">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setRowAssignTarget(null)}
                disabled={rowAssigning}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!rowAssignTo || rowAssigning}
                onClick={submitRowAssign}
              >
                {rowAssigning ? "Assigning…" : "Assign"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single-row Delete confirm. Defaults to soft-delete (30-day
          Trash); an Owner can hard-delete with the secondary button. */}
      {rowDeleteTarget && (
        <div
          className="modal-backdrop"
          onClick={() => !rowDeleting && setRowDeleteTarget(null)}
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 460 }}
          >
            <div className="modal-head">
              <h3>Delete {rowDeleteTarget.name}?</h3>
              <button
                type="button"
                onClick={() => setRowDeleteTarget(null)}
                disabled={rowDeleting}
                aria-label="Close"
                style={{
                  background: "transparent",
                  border: 0,
                  cursor: "pointer",
                  color: "var(--lp-text-muted)",
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ margin: 0 }}>
                Move to Trash for 30 days (recoverable), or delete permanently.
              </p>
            </div>
            <div className="modal-foot">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setRowDeleteTarget(null)}
                disabled={rowDeleting}
              >
                Cancel
              </button>
              {role === "OWNER" && (
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => submitRowDelete("hard")}
                  disabled={rowDeleting}
                >
                  Delete permanently
                </button>
              )}
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => submitRowDelete("soft")}
                disabled={rowDeleting}
              >
                {rowDeleting ? "Working…" : "Move to Trash"}
              </button>
            </div>
          </div>
        </div>
      )}

      {bulkAssignOpen && (
        <div
          className="modal-backdrop"
          onClick={() => !isBulkAssigning && setBulkAssignOpen(false)}
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 460 }}
          >
            <div className="modal-head">
              <h3>
                Assign {selected.size} lead{selected.size === 1 ? "" : "s"}
              </h3>
              <button
                type="button"
                onClick={() => setBulkAssignOpen(false)}
                disabled={isBulkAssigning}
                aria-label="Close"
                style={{
                  background: "transparent",
                  border: 0,
                  cursor: "pointer",
                  color: "var(--lp-text-muted)",
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="field">
                <label className="label">Assign to</label>
                <select
                  className="select"
                  value={bulkAssignTo}
                  onChange={(e) => setBulkAssignTo(e.target.value)}
                >
                  <option value="">— Select a user —</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name || u.email}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-foot">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setBulkAssignOpen(false)}
                disabled={isBulkAssigning}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!bulkAssignTo || isBulkAssigning}
                onClick={bulkAssign}
              >
                {isBulkAssigning ? "Assigning…" : "Assign"}
              </button>
            </div>
          </div>
        </div>
      )}

      {bulkDeleteModal && (
        <BulkDeleteLeadsModal
          count={selected.size}
          busy={isBulkDeleting}
          onClose={() => setBulkDeleteModal(false)}
          onSoftDelete={() => runBulkDelete("soft")}
          onHardDelete={() => runBulkDelete("hard")}
        />
      )}
    </>
  )
}

// Two-option destructive modal used for bulk delete from the Leads list.
// Mirrors DeleteLeadModal in LeadDetail.jsx — "Deactivate" is the primary
// CTA (recoverable for 30 days), "Delete permanently" is a quieter,
// two-step action so power-deleting doesn't become muscle memory.
function BulkDeleteLeadsModal({ count, busy, onClose, onSoftDelete, onHardDelete }) {
  const [confirmHard, setConfirmHard] = useState(false)
  const noun = `${count} lead${count > 1 ? "s" : ""}`
  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{ maxWidth: 520 }}
      >
        <div className="modal-head">
          <h3>Delete {noun}?</h3>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        <div className="modal-body">
          <p className="text-muted text-sm" style={{ marginTop: 0 }}>
            Choose how to remove the selected {noun}.
          </p>

          <button
            type="button"
            onClick={onSoftDelete}
            disabled={busy}
            className="card"
            style={{
              width: "100%",
              textAlign: "left",
              padding: 14,
              marginBottom: 10,
              cursor: busy ? "wait" : "pointer",
              borderColor: "var(--lp-accent)",
              background: "rgba(139,92,246,0.06)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 4,
              }}
            >
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: "rgba(139,92,246,0.18)",
                  color: "var(--lp-accent)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Trash2 size={14} />
              </span>
              <div style={{ fontWeight: 700 }}>
                Deactivate for 30 days{" "}
                <span
                  style={{
                    marginLeft: 6,
                    fontSize: "0.7rem",
                    color: "var(--lp-accent)",
                    fontWeight: 600,
                  }}
                >
                  RECOMMENDED
                </span>
              </div>
            </div>
            <div
              className="text-xs text-muted"
              style={{ marginLeft: 38, lineHeight: 1.5 }}
            >
              Hidden from active pipelines and shown as <b>inactive</b> in
              your Leads list. Recoverable from Trash for <b>30 days</b>,
              after which it&apos;s automatically deleted.
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              if (confirmHard) onHardDelete()
              else setConfirmHard(true)
            }}
            disabled={busy}
            className="card"
            style={{
              width: "100%",
              textAlign: "left",
              padding: 14,
              cursor: busy ? "wait" : "pointer",
              borderColor: confirmHard
                ? "var(--lp-error)"
                : "var(--lp-border)",
              background: confirmHard
                ? "rgba(220,38,38,0.08)"
                : "transparent",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 4,
              }}
            >
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: "rgba(220,38,38,0.14)",
                  color: "var(--lp-error)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Trash2 size={14} />
              </span>
              <div style={{ fontWeight: 700, color: "var(--lp-error)" }}>
                {confirmHard
                  ? `Click again to permanently delete ${noun}`
                  : "Delete permanently"}
              </div>
            </div>
            <div
              className="text-xs text-muted"
              style={{ marginLeft: 38, lineHeight: 1.5 }}
            >
              Removes {noun} and their notes immediately. Tasks and files
              stay but are detached. <b>This cannot be undone.</b>
            </div>
          </button>
        </div>
        <div className="modal-foot">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
