import { useEffect, useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
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
  Filter,
  Flag,
  Folder,
  MapPin,
  Phone,
  Plus,
  Radio,
  Search,
  Tag,
  Trash2,
  Upload,
  User,
  UserCog,
  UserCircle,
  Users,
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

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

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
  const pageSize = parseInt(searchParams.get("pageSize") ?? "20", 10) || 20
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
    setSelected(on ? new Set(items.map((l) => l.id)) : new Set())
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
  const bulkDelete = async () => {
    if (selected.size === 0) return
    if (
      !window.confirm(
        `Permanently delete ${selected.size} lead${selected.size > 1 ? "s" : ""}? This cannot be undone.`,
      )
    )
      return
    setIsBulkDeleting(true)
    const ids = [...selected]
    let ok = 0
    let fail = 0
    for (const id of ids) {
      try {
        await api.delete(`/leads/${id}`)
        ok++
      } catch {
        fail++
      }
    }
    setIsBulkDeleting(false)
    setSelected(new Set())
    refetch()
    if (fail === 0) toast.success(`Deleted ${ok} lead${ok > 1 ? "s" : ""}`)
    else if (ok === 0) toast.error(`Failed to delete leads`)
    else toast.warning(`Deleted ${ok}, failed ${fail}`)
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

  // Page-number window for pagination (max 5 buttons).
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => Math.abs(p - curPage) <= 2,
  )

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
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                disabled={isBulkAssigning}
                onClick={() => setBulkAssignOpen(true)}
              >
                <UserCog size={14} /> Assign
              </button>
              <button
                type="button"
                className="btn btn-sm btn-danger"
                disabled={isBulkDeleting}
                onClick={bulkDelete}
              >
                <Trash2 size={14} /> Delete
              </button>
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
                </tr>
              </thead>
              <tbody>
                {items.map((l) => {
                  const isSelected = selected.has(l.id)
                  return (
                    <tr
                      key={l.id}
                      className={isSelected ? "selected" : ""}
                      onClick={() => navigate(`/leads/${l.id}`)}
                      style={{ cursor: "pointer" }}
                    >
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => toggleRow(l.id, e.target.checked)}
                          aria-label={`Select ${l.name}`}
                        />
                      </td>
                      {visibleColumns.includes("name") && (
                        <td>
                          <div className="row">
                            <div className="avatar sm">
                              {fmt.initials(l.name || "?")}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600 }}>{l.name}</div>
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
              Showing {startRow}–{endRow} of {total}
            </div>
            <div className="row">
              <select
                className="select"
                style={{ width: "auto" }}
                value={pageSize}
                onChange={(e) =>
                  updateParams({ pageSize: e.target.value, page: null })
                }
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <span style={{ color: "var(--lp-text-muted)" }}>per page</span>
              <div className="pagination">
                <button
                  type="button"
                  onClick={() => updateParams({ page: 1 })}
                  disabled={curPage === 1}
                  aria-label="First page"
                >
                  <ChevronsLeft size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => updateParams({ page: curPage - 1 })}
                  disabled={curPage === 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={14} />
                </button>
                {pageNumbers.map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={p === curPage ? "active" : ""}
                    onClick={() => updateParams({ page: p })}
                  >
                    {p}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => updateParams({ page: curPage + 1 })}
                  disabled={curPage === totalPages}
                  aria-label="Next page"
                >
                  <ChevronRight size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => updateParams({ page: totalPages })}
                  disabled={curPage === totalPages}
                  aria-label="Last page"
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
    </>
  )
}
