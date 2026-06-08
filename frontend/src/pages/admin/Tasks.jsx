import { useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUpDown,
  Columns3,
  Download,
  Filter,
  ListChecks,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
  Type,
  UserCheck,
  User,
  Building2,
  CalendarClock,
} from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { taskService } from "@/services/taskService"
import { useAuthStore } from "@/stores/authStore"
import { useRowSelection } from "@/hooks/useRowSelection"
import { fmt } from "@/lib/format"
import { readFormDraft, writeFormDraft, clearFormDraft } from "@/hooks/useFormDraft"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const NEW_TASK_DRAFT_KEY = "tasks:create"

const CAN_DELETE_ROLES = new Set(["OWNER", "ADMIN", "SUPER_ADMIN"])
const CAN_CREATE_ROLES = new Set(["OWNER", "ADMIN", "MANAGER"])

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, "All"]
const ALL_PAGE_SIZE = 1000

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

const ALL_COLUMNS = [
  { key: "title",    label: "Title",        width: "24%", default: true,  required: true,  csv: (t) => t.title || "" },
  { key: "assignee", label: "Assigned to",  width: "14%", default: true,  csv: (t) => t.assignedTo?.name || t.assignedTo?.email || "" },
  { key: "lead",     label: "Lead",         width: "14%", default: true,  csv: (t) => t.lead?.name || "" },
  { key: "project",  label: "Project",      width: "14%", default: true,  csv: (t) => t.project?.name || "" },
  { key: "due",      label: "Due",          width: "10%", default: true,  csv: (t) => (t.dueAt ? new Date(t.dueAt).toISOString().slice(0, 10) : "") },
  { key: "status",   label: "Status",       width: "10%", default: true,  csv: (t) => t.status || "" },
  { key: "created",  label: "Created",      width: "10%", default: false, csv: (t) => (t.createdAt ? new Date(t.createdAt).toISOString() : "") },
]

const SORTABLE_COLUMNS = new Set(["title", "due", "created"])

function SortIcon({ field, sort }) {
  const [curField, curDir] = sort.split(":")
  if (curField !== field) return <ChevronsUpDown size={12} />
  return curDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />
}

const cellTruncate = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
}

function CreateTaskModal({ open, onClose, onCreated, users, leads, projects }) {
  const d = readFormDraft(NEW_TASK_DRAFT_KEY) || {}
  const [title, setTitle] = useState(d.title || "")
  const [description, setDescription] = useState(d.description || "")
  const [assignedToId, setAssignedToId] = useState(d.assignedToId || "")
  const [leadId, setLeadId] = useState(d.leadId || "")
  const [projectId, setProjectId] = useState(d.projectId || "")
  const [dueAt, setDueAt] = useState(d.dueAt || "")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    writeFormDraft(NEW_TASK_DRAFT_KEY, {
      title,
      description,
      assignedToId,
      leadId,
      projectId,
      dueAt,
    })
  }, [title, description, assignedToId, leadId, projectId, dueAt])

  if (!open) return null

  const reset = () => {
    setTitle("")
    setDescription("")
    setAssignedToId("")
    setLeadId("")
    setProjectId("")
    setDueAt("")
    clearFormDraft(NEW_TASK_DRAFT_KEY)
  }

  const submit = async () => {
    if (title.trim().length < 2) {
      toast.error("Title must be at least 2 characters")
      return
    }
    setSaving(true)
    try {
      const body = {
        title: title.trim(),
        description: description.trim() || null,
        assignedToId: assignedToId || null,
        leadId: leadId || null,
        projectId: projectId || null,
        dueAt: dueAt ? new Date(dueAt).toISOString() : null,
      }
      const task = await taskService.create(body)
      toast.success("Task created")
      onCreated(task)
      reset()
      onClose()
    } catch (err) {
      toast.error(err?.message || "Failed to create task")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>New Task</h3>
          <button type="button" className="btn-icon btn-ghost" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="modal-body">
          <div className="field">
            <label className="label">Title <span className="req">*</span></label>
            <span className="input-icon">
              <Type size={16} />
              <input
                className="input"
                placeholder="Call lead, prepare proposal, etc."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
            </span>
          </div>
          <div className="field">
            <label className="label">Description</label>
            <textarea
              className="textarea"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-2" style={{ gap: "0 16px" }}>
            <div className="field">
              <label className="label">Assign to</label>
              <span className="input-icon">
                <UserCheck size={16} />
                <select
                  className="select"
                  value={assignedToId}
                  onChange={(e) => setAssignedToId(e.target.value)}
                >
                  <option value="">— Me —</option>
                  {users
                    .filter((u) => u.status !== "PENDING")
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name || u.email}
                        {u.role ? ` — ${u.role}` : ""}
                      </option>
                    ))}
                </select>
              </span>
            </div>
            <div className="field">
              <label className="label">Linked lead</label>
              <span className="input-icon">
                <User size={16} />
                <select
                  className="select"
                  value={leadId}
                  onChange={(e) => setLeadId(e.target.value)}
                >
                  <option value="">— None —</option>
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                      {l.phone ? ` · ${fmt.phone(l.phone)}` : ""}
                    </option>
                  ))}
                </select>
              </span>
            </div>
            <div className="field">
              <label className="label">CRM Project</label>
              <span className="input-icon">
                <Building2 size={16} />
                <select
                  className="select"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                >
                  <option value="">— None —</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </span>
            </div>
            <div className="field">
              <label className="label">Due date</label>
              <span className="input-icon">
                <CalendarClock size={16} />
                <input
                  className="input"
                  type="date"
                  value={dueAt}
                  onChange={(e) => setDueAt(e.target.value)}
                />
              </span>
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button type="button" className="btn btn-secondary" onClick={() => { reset(); onClose() }}>Cancel</button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={saving || title.trim().length < 2}
            onClick={submit}
          >
            {saving ? "Saving…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  )
}

function EditTaskModal({ open, task, onClose, onUpdated, users, leads, projects }) {
  const [title, setTitle] = useState(task?.title || "")
  const [description, setDescription] = useState(task?.description || "")
  const [assignedToId, setAssignedToId] = useState(task?.assignedTo?.id || "")
  const [leadId, setLeadId] = useState(task?.lead?.id || "")
  const [projectId, setProjectId] = useState(task?.project?.id || "")
  const [dueAt, setDueAt] = useState(task?.dueAt ? task.dueAt.slice(0, 10) : "")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (task) {
      setTitle(task.title || "")
      setDescription(task.description || "")
      setAssignedToId(task.assignedTo?.id || "")
      setLeadId(task.lead?.id || "")
      setProjectId(task.project?.id || "")
      setDueAt(task.dueAt ? task.dueAt.slice(0, 10) : "")
    }
  }, [task])

  if (!open || !task) return null

  const submit = async () => {
    if (title.trim().length < 2) {
      toast.error("Title must be at least 2 characters")
      return
    }
    setSaving(true)
    try {
      const body = {
        title: title.trim(),
        description: description.trim() || null,
        assignedToId: assignedToId || null,
        leadId: leadId || null,
        projectId: projectId || null,
        dueAt: dueAt ? new Date(dueAt).toISOString() : null,
      }
      const updated = await taskService.update(task.id, body)
      toast.success("Task updated")
      onUpdated(updated)
      onClose()
    } catch (err) {
      toast.error(err?.message || "Failed to update task")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Edit Task</h3>
          <button type="button" className="btn-icon btn-ghost" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="modal-body">
          <div className="field">
            <label className="label">Title <span className="req">*</span></label>
            <span className="input-icon">
              <Type size={16} />
              <input
                className="input"
                placeholder="Call lead, prepare proposal, etc."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
            </span>
          </div>
          <div className="field">
            <label className="label">Description</label>
            <textarea
              className="textarea"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-2" style={{ gap: "0 16px" }}>
            <div className="field">
              <label className="label">Assign to</label>
              <span className="input-icon">
                <UserCheck size={16} />
                <select
                  className="select"
                  value={assignedToId}
                  onChange={(e) => setAssignedToId(e.target.value)}
                >
                  <option value="">— Me —</option>
                  {users
                    .filter((u) => u.status !== "PENDING")
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name || u.email}
                        {u.role ? ` — ${u.role}` : ""}
                      </option>
                    ))}
                </select>
              </span>
            </div>
            <div className="field">
              <label className="label">Linked lead</label>
              <span className="input-icon">
                <User size={16} />
                <select
                  className="select"
                  value={leadId}
                  onChange={(e) => setLeadId(e.target.value)}
                >
                  <option value="">— None —</option>
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                      {l.phone ? ` · ${fmt.phone(l.phone)}` : ""}
                    </option>
                  ))}
                </select>
              </span>
            </div>
            <div className="field">
              <label className="label">CRM Project</label>
              <span className="input-icon">
                <Building2 size={16} />
                <select
                  className="select"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                >
                  <option value="">— None —</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </span>
            </div>
            <div className="field">
              <label className="label">Due date</label>
              <span className="input-icon">
                <CalendarClock size={16} />
                <input
                  className="input"
                  type="date"
                  value={dueAt}
                  onChange={(e) => setDueAt(e.target.value)}
                />
              </span>
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={saving || title.trim().length < 2}
            onClick={submit}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  )
}

const csvCell = (raw) => {
  const v = raw == null ? "" : String(raw)
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
}

export default function Tasks() {
  const currentUser = useAuthStore((s) => s.user)
  const canDelete = CAN_DELETE_ROLES.has(currentUser?.role)
  const canCreate = CAN_CREATE_ROLES.has(currentUser?.role)
  const [searchParams, setSearchParams] = useSearchParams()

  // URL state
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

  const tab = searchParams.get("tab") ?? "ALL"
  const assigneeFilter = searchParams.get("assignee") ?? ""
  const projectFilter = searchParams.get("project") ?? ""
  const leadFilter = searchParams.get("lead") ?? ""
  const sort = searchParams.get("sort") ?? "created:desc"
  const page = parseInt(searchParams.get("page") ?? "1", 10) || 1
  const rawPageSize = searchParams.get("pageSize") ?? "20"
  const isAllPageSize = rawPageSize === "all"
  const pageSize = isAllPageSize ? ALL_PAGE_SIZE : parseInt(rawPageSize, 10) || 20
  const columnsParam = searchParams.get("columns") ?? ""

  const visibleCols = useMemo(() => {
    if (!columnsParam) return new Set(ALL_COLUMNS.filter((c) => c.default).map((c) => c.key))
    return new Set(columnsParam.split(",").filter((k) => ALL_COLUMNS.some((c) => c.key === k)))
  }, [columnsParam])

  const [tasks, setTasks] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [users, setUsers] = useState([])
  const [leads, setLeads] = useState([])
  const [projects, setProjects] = useState([])

  const selection = useRowSelection(tasks, (t) => t.id)

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

  const setTab = (t) => updateParams({ tab: t === "ALL" ? null : t, page: null })

  const queryParams = useMemo(() => {
    const p = { page, pageSize, sort }
    if (urlSearch) p.search = urlSearch
    if (tab !== "ALL") p.status = tab
    if (assigneeFilter) p.assignedToId = assigneeFilter
    if (projectFilter) p.projectId = projectFilter
    if (leadFilter) p.leadId = leadFilter
    return p
  }, [page, pageSize, sort, urlSearch, tab, assigneeFilter, projectFilter, leadFilter])

  const load = () => {
    setLoading(true)
    taskService
      .list(queryParams)
      .then((data) => {
        const items = data?.items ?? data ?? []
        setTasks(Array.isArray(items) ? items : [])
        setTotal(data?.total ?? items.length)
      })
      .catch((err) => toast.error(err?.message || "Failed to load tasks"))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [JSON.stringify(queryParams)])

  useEffect(() => {
    api
      .get("/users")
      .then((res) => {
        const list = res?.data?.items ?? res?.data ?? res?.users ?? res ?? []
        setUsers(Array.isArray(list) ? list : [])
      })
      .catch(() => {})
    api
      .get("/leads", { params: { pageSize: 100 } })
      .then((res) => {
        const list = res?.data?.items ?? res?.items ?? res?.data ?? []
        setLeads(Array.isArray(list) ? list : [])
      })
      .catch(() => {})
    api
      .get("/projects", { params: { pageSize: 100 } })
      .then((res) => {
        const list = res?.data?.items ?? res?.items ?? res?.data ?? []
        setProjects(Array.isArray(list) ? list : [])
      })
      .catch(() => {})
  }, [])

  const onSort = (field) => {
    const [curField, curDir] = sort.split(":")
    const nextDir = curField === field && curDir === "asc" ? "desc" : "asc"
    updateParams({ sort: `${field}:${nextDir}`, page: null })
  }

  // Chips
  const chips = []
  if (urlSearch)
    chips.push({
      label: `Search: "${urlSearch}"`,
      clear: () => { setSearchInput(""); updateParams({ search: null, page: null }) },
    })
  if (assigneeFilter) {
    const u = users.find((x) => x.id === assigneeFilter)
    chips.push({
      label: `Assignee: ${u?.name || u?.email || assigneeFilter}`,
      clear: () => updateParams({ assignee: null, page: null }),
    })
  }
  if (projectFilter) {
    const p = projects.find((x) => x.id === projectFilter)
    chips.push({
      label: `Project: ${p?.name || projectFilter}`,
      clear: () => updateParams({ project: null, page: null }),
    })
  }
  if (leadFilter) {
    const l = leads.find((x) => x.id === leadFilter)
    chips.push({
      label: `Lead: ${l?.name || leadFilter}`,
      clear: () => updateParams({ lead: null, page: null }),
    })
  }
  const hasFilters = chips.length > 0
  const clearAllFilters = () => {
    setSearchInput("")
    updateParams({ search: null, assignee: null, project: null, lead: null, page: null })
  }

  // Pagination
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const curPage = Math.min(page, totalPages)
  const startRow = total === 0 ? 0 : (curPage - 1) * pageSize + 1
  const endRow = Math.min(curPage * pageSize, total)
  const paginationItems = buildPaginationItems(curPage, totalPages)

  const onComplete = async (task) => {
    try {
      const updated = await taskService.complete(task.id)
      toast.success("Task completed")
      load()
    } catch (err) {
      toast.error(err?.message || "Failed to complete task")
    }
  }

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const onDelete = (task) => {
    setDeleteTarget({ ids: [task.id], label: `"${task.title}"` })
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    let ok = 0
    let fail = 0
    for (const id of deleteTarget.ids) {
      try {
        await taskService.delete(id)
        ok++
      } catch {
        fail++
      }
    }
    load()
    selection.clear()
    setDeleteTarget(null)
    setDeleting(false)
    if (fail === 0) toast.success(`Deleted ${ok} task${ok > 1 ? "s" : ""}`)
    else if (ok === 0) toast.error("Failed to delete tasks")
    else toast.warning(`Deleted ${ok}, failed ${fail}`)
  }

  const onExport = () => {
    const cols = ALL_COLUMNS.filter((c) => visibleCols.has(c.key))
    const rows = tasks
    if (rows.length === 0) {
      toast.info("Nothing to export")
      return
    }
    const header = cols.map((c) => csvCell(c.label)).join(",")
    const body = rows.map((t) => cols.map((c) => csvCell(c.csv(t))).join(",")).join("\n")
    const csv = `${header}\n${body}\n`
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `tasks-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    toast.success(`Exported ${rows.length} task${rows.length > 1 ? "s" : ""}`)
  }

  const toggleColumn = (key) => {
    const current = new Set(visibleCols)
    if (current.has(key)) {
      if (current.size <= 1) return
      current.delete(key)
    } else {
      current.add(key)
    }
    updateParams({ columns: [...current].join(",") || null })
  }

  const toggleAllColumns = () => {
    const togglable = ALL_COLUMNS.filter((c) => !c.required)
    const allVisible = togglable.every((c) => visibleCols.has(c.key))
    updateParams({
      columns: allVisible
        ? togglable.map((c) => c.key).slice(0, 1).join(",")
        : ALL_COLUMNS.map((c) => c.key).join(","),
    })
  }

  const renderCell = (t, key) => {
    switch (key) {
      case "title":
        return (
          <>
            <div style={cellTruncate} title={t.title}>{t.title}</div>
            {t.description && (
              <div
                className="text-xs text-muted"
                style={{ ...cellTruncate, fontWeight: 400, marginTop: 2 }}
                title={t.description}
              >
                {t.description}
              </div>
            )}
          </>
        )
      case "assignee": {
        const a = t.assignedTo?.name || t.assignedTo?.email || "—"
        return <div style={cellTruncate} title={a}>{a}</div>
      }
      case "lead":
        return <div style={cellTruncate} title={t.lead?.name || ""}>{t.lead?.name || "—"}</div>
      case "project":
        return <div style={cellTruncate} title={t.project?.name || ""}>{t.project?.name || "—"}</div>
      case "due":
        return t.dueAt ? fmt.date(t.dueAt) : "—"
      case "status":
        return (
          <span className={`badge ${t.status === "COMPLETED" ? "badge-success" : "badge-info"}`}>
            {t.status}
          </span>
        )
      case "created":
        return <span className="text-xs text-muted">{t.createdAt ? fmt.ago(t.createdAt) : "—"}</span>
      default:
        return null
    }
  }

  const cols = ALL_COLUMNS.filter((c) => visibleCols.has(c.key))

  return (
    <>
      <div className="content-head">
        <div>
          <h1>Tasks</h1>
          <p>
            {total === 0 && !hasFilters
              ? "No tasks yet."
              : `${total} ${total === 1 ? "task" : "tasks"}${hasFilters ? " matching filters" : ""}.`}
          </p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onExport}
            title="Export visible rows to CSV"
          >
            <Download size={14} /> Export
          </button>
          {canCreate && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setCreateOpen(true)}
            >
              <Plus size={16} /> New Task
            </button>
          )}
        </div>
      </div>

      <div className="row row-between" style={{ alignItems: "center", gap: 12, marginBottom: 8 }}>
        <div />
        <div className="row" style={{ gap: 6 }}>
          {["ALL", "PENDING", "COMPLETED"].map((k) => (
            <button
              key={k}
              type="button"
              className={`btn btn-sm ${tab === k ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setTab(k)}
            >
              {k === "ALL" ? "All" : k === "PENDING" ? "Pending" : "Completed"}
            </button>
          ))}
        </div>
      </div>

      <div className="table-wrap">
        <div className="table-toolbar">
          <div className="topbar-search" style={{ flex: "1 1 240px", maxWidth: 360 }}>
            <Search size={14} />
            <input
              type="text"
              value={searchInput}
              placeholder="Search title, assignee, lead, project…"
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <div className="row" style={{ marginLeft: "auto", gap: 6 }}>
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
                    <label className="label" style={{ fontSize: "0.75rem", marginBottom: 2, display: "block" }}>
                      Assignee
                    </label>
                    <select
                      className="select"
                      style={{ fontSize: "0.8rem", padding: "5px 8px" }}
                      value={assigneeFilter}
                      onChange={(e) => updateParams({ assignee: e.target.value || null, page: null })}
                    >
                      <option value="">All</option>
                      {users
                        .filter((u) => u.status !== "PENDING")
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name || u.email}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="label" style={{ fontSize: "0.75rem", marginBottom: 2, display: "block" }}>
                      Project
                    </label>
                    <select
                      className="select"
                      style={{ fontSize: "0.8rem", padding: "5px 8px" }}
                      value={projectFilter}
                      onChange={(e) => updateParams({ project: e.target.value || null, page: null })}
                    >
                      <option value="">All</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label" style={{ fontSize: "0.75rem", marginBottom: 2, display: "block" }}>
                      Lead
                    </label>
                    <select
                      className="select"
                      style={{ fontSize: "0.8rem", padding: "5px 8px" }}
                      value={leadFilter}
                      onChange={(e) => updateParams({ lead: e.target.value || null, page: null })}
                    >
                      <option value="">All</option>
                      {leads.map((l) => (
                        <option key={l.id} value={l.id}>{l.name}</option>
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
                  <label className="column-option"
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", borderRadius: "var(--lp-radius-input)", cursor: "pointer", fontSize: "0.867rem", borderBottom: "1px solid var(--lp-border)", marginBottom: 4 }}>
                    <input type="checkbox"
                      checked={ALL_COLUMNS.filter((c) => !c.required).every((c) => visibleCols.has(c.key))}
                      onChange={toggleAllColumns}
                      style={{ accentColor: "var(--lp-accent)", width: 15, height: 15 }} />
                    <ListChecks size={15} style={{ color: "var(--lp-text-muted)", flexShrink: 0 }} />
                    Select All
                  </label>
                  {ALL_COLUMNS.map((c) => {
                    const checked = visibleCols.has(c.key)
                    const disabled = c.required
                    return (
                      <label key={c.key} className="column-option"
                        style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", borderRadius: "var(--lp-radius-input)", cursor: disabled ? "not-allowed" : "pointer", fontSize: "0.867rem", opacity: disabled ? 0.6 : 1 }}>
                        <input type="checkbox"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => toggleColumn(c.key)}
                          style={{ accentColor: "var(--lp-accent)", width: 15, height: 15 }} />
                        {c.label}
                      </label>
                    )
                  })}
                </div>
              </PopoverContent>
            </Popover>
            {hasFilters && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={clearAllFilters}>
                Clear
              </button>
            )}
          </div>
          {selection.count > 0 && (
            <div style={{ marginLeft: "auto" }} className="row">
              <span style={{ fontSize: "0.867rem", color: "var(--lp-text-muted)" }}>
                {selection.count} selected
              </span>
              {canDelete && (
                <button
                  type="button"
                  className="btn btn-sm btn-danger"
                  onClick={() =>
                    setDeleteTarget({
                      ids: [...selection.ids],
                      label: `${selection.count} task${selection.count > 1 ? "s" : ""}`,
                    })
                  }
                >
                  <Trash2 size={14} /> Delete
                </button>
              )}
              <button type="button" className="btn btn-sm btn-ghost" onClick={selection.clear}>
                Clear
              </button>
            </div>
          )}
        </div>

        {hasFilters && (
          <div style={{ padding: "10px 16px", display: "flex", gap: 6, flexWrap: "wrap", borderBottom: "1px solid var(--lp-border)" }}>
            {chips.map((c) => (
              <span key={c.label} className="badge badge-muted">
                {c.label}
                <button type="button" onClick={c.clear} aria-label={`Remove ${c.label}`}
                  style={{ marginLeft: 4, background: "transparent", border: 0, cursor: "pointer", display: "inline-flex", alignItems: "center", color: "inherit" }}>
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="table-scroll">
          {loading ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--lp-text-muted)", fontSize: "0.933rem" }}>
              Loading tasks…
            </div>
          ) : tasks.length === 0 ? (
            <div className="empty-state">
              <div className="icon"><ListChecks size={28} /></div>
              <h3>{hasFilters ? "No tasks match" : "No tasks yet"}</h3>
              <p className="text-muted text-sm">
                {hasFilters
                  ? "Try clearing some filters."
                  : tab === "PENDING" ? "Nothing pending — nice work." : "No tasks to show."}
              </p>
            </div>
          ) : (
            <table className="data" style={{ tableLayout: "fixed" }}>
              <colgroup>
                <col style={{ width: 36 }} />
                {cols.map((c) => (
                  <col key={c.key} style={{ width: c.width }} />
                ))}
                <col style={{ width: 180 }} />
              </colgroup>
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={selection.allSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = selection.someSelected
                      }}
                      onChange={(e) => selection.toggleAll(e.target.checked)}
                      aria-label="Select all tasks"
                    />
                  </th>
                  {cols.map((c) => (
                    <th key={c.key}
                      style={SORTABLE_COLUMNS.has(c.key) ? { cursor: "pointer" } : undefined}
                      onClick={SORTABLE_COLUMNS.has(c.key) ? () => onSort(c.key === "created" ? "createdAt" : c.key === "due" ? "dueAt" : c.key) : undefined}>
                      <span className="row" style={{ gap: 4 }}>
                        {c.label}
                        {SORTABLE_COLUMNS.has(c.key) && <SortIcon field={c.key === "created" ? "createdAt" : c.key === "due" ? "dueAt" : c.key} sort={sort} />}
                      </span>
                    </th>
                  ))}
                  <th className="col-actions" style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => (
                  <tr key={t.id} className={selection.isSelected(t.id) ? "selected" : ""}>
                    <td onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selection.isSelected(t.id)}
                        onChange={(e) => selection.toggleRow(t.id, e.target.checked)}
                        aria-label={`Select task ${t.title}`}
                      />
                    </td>
                    {cols.map((c) => (
                      <td key={c.key}>{renderCell(t, c.key)}</td>
                    ))}
                    <td className="col-actions" style={{ textAlign: "right" }}>
                      <div className="row" style={{ justifyContent: "flex-end", gap: 6 }}>
                        {t.status !== "COMPLETED" && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => onComplete(t)}
                          >
                            <CheckCircle2 size={14} /> Complete
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn-icon btn-ghost"
                          title="Edit"
                          onClick={() => setEditTarget(t)}
                        >
                          <Pencil size={14} />
                        </button>
                        {canDelete && (
                          <button
                            type="button"
                            className="btn-icon btn-ghost"
                            title="Delete"
                            onClick={() => onDelete(t)}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {total > 0 && (
          <div className="table-foot">
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--lp-text-muted)", fontSize: "0.867rem" }}>
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
            <div className="row" style={{ gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.867rem", color: "var(--lp-text-muted)" }}>
                Rows
                <select
                  className="select"
                  style={{ width: "auto", paddingRight: 24 }}
                  value={isAllPageSize ? "all" : pageSize}
                  onChange={(e) => updateParams({ pageSize: e.target.value, page: null })}
                  aria-label="Rows per page"
                >
                  {PAGE_SIZE_OPTIONS.map((n) => {
                    const value = n === "All" ? "all" : String(n)
                    return <option key={value} value={value}>{n}</option>
                  })}
                </select>
              </label>
              <div className="pagination" role="navigation" aria-label="Pagination">
                <button type="button" onClick={() => updateParams({ page: 1 })} disabled={curPage === 1} aria-label="First page" title="First page">
                  <ChevronsLeft size={14} />
                </button>
                <button type="button" onClick={() => updateParams({ page: curPage - 1 })} disabled={curPage === 1} aria-label="Previous page" title="Previous page">
                  <ChevronLeft size={14} />
                </button>
                {paginationItems.map((item, idx) =>
                  item === "…" ? (
                    <span key={`ellipsis-${idx}`} aria-hidden
                      style={{ width: 32, height: 32, display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--lp-text-muted)", fontWeight: 600, userSelect: "none" }}>
                      …
                    </span>
                  ) : (
                    <button key={item} type="button" className={item === curPage ? "active" : ""}
                      onClick={() => updateParams({ page: item })}
                      aria-current={item === curPage ? "page" : undefined} aria-label={`Page ${item}`}>
                      {item}
                    </button>
                  ),
                )}
                <button type="button" onClick={() => updateParams({ page: curPage + 1 })} disabled={curPage === totalPages} aria-label="Next page" title="Next page">
                  <ChevronRight size={14} />
                </button>
                <button type="button" onClick={() => updateParams({ page: totalPages })} disabled={curPage === totalPages} aria-label="Last page" title="Last page">
                  <ChevronsRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <CreateTaskModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(task) => {
          load()
        }}
        users={users}
        leads={leads}
        projects={projects}
      />

      <EditTaskModal
        open={!!editTarget}
        task={editTarget}
        onClose={() => setEditTarget(null)}
        onUpdated={(task) => {
          load()
        }}
        users={users}
        leads={leads}
        projects={projects}
      />

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
                This will permanently remove{" "}
                {deleteTarget.ids.length > 1 ? `${deleteTarget.ids.length} tasks` : `the task ${deleteTarget.label}`}
                . This cannot be undone.
              </p>
            </div>
            <div className="modal-foot">
              <button type="button" className="btn btn-secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                Cancel
              </button>
              <button type="button" className="btn btn-danger" onClick={confirmDelete} disabled={deleting}>
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
