import { useEffect, useMemo, useRef, useState } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  Columns3,
  Download,
  Filter,
  ListChecks,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { taskService } from "@/services/taskService"
import { useAuthStore } from "@/stores/authStore"
import { useRowSelection } from "@/hooks/useRowSelection"
import { fmt } from "@/lib/format"
import { readFormDraft, writeFormDraft, clearFormDraft } from "@/hooks/useFormDraft"

const NEW_TASK_DRAFT_KEY = "tasks:create"

const TABS = [
  { key: "ALL", label: "All" },
  { key: "PENDING", label: "Pending" },
  { key: "COMPLETED", label: "Completed" },
]

const CAN_DELETE_ROLES = new Set(["OWNER", "ADMIN", "SUPER_ADMIN"])
const CAN_CREATE_ROLES = new Set(["OWNER", "ADMIN", "MANAGER"])

// Column registry: drives the Columns chooser, header row, body row, and
// CSV export. Adding a column = one entry here, no scattered edits.
const ALL_COLUMNS = [
  { key: "title",    label: "Title",        width: "24%", default: true,  required: true,  csv: (t) => t.title || "" },
  { key: "assignee", label: "Assigned to",  width: "14%", default: true,  csv: (t) => t.assignedTo?.name || t.assignedTo?.email || "" },
  { key: "lead",     label: "Lead",         width: "14%", default: true,  csv: (t) => t.lead?.name || "" },
  { key: "project",  label: "Project",      width: "14%", default: true,  csv: (t) => t.project?.name || "" },
  { key: "due",      label: "Due",          width: "10%", default: true,  csv: (t) => (t.dueAt ? new Date(t.dueAt).toISOString().slice(0, 10) : "") },
  { key: "status",   label: "Status",       width: "10%", default: true,  csv: (t) => t.status || "" },
  { key: "created",  label: "Created",      width: "10%", default: false, csv: (t) => (t.createdAt ? new Date(t.createdAt).toISOString() : "") },
]

const cellTruncate = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
}

function CreateTaskModal({ open, onClose, onCreated, users, leads, projects }) {
  // Seed from a persisted draft so a dismissed/navigated-away form is restored
  // on reopen. Cleared only on Cancel or a successful create.
  const d = readFormDraft(NEW_TASK_DRAFT_KEY) || {}
  const [title, setTitle] = useState(d.title || "")
  const [description, setDescription] = useState(d.description || "")
  const [assignedToId, setAssignedToId] = useState(d.assignedToId || "")
  const [leadId, setLeadId] = useState(d.leadId || "")
  const [projectId, setProjectId] = useState(d.projectId || "")
  const [dueAt, setDueAt] = useState(d.dueAt || "")
  const [saving, setSaving] = useState(false)

  // Persist every change so the draft survives a close/navigation.
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
            <input
              className="input"
              placeholder="Call lead, prepare proposal, etc."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
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
            </div>
            <div className="field">
              <label className="label">Linked lead</label>
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
            </div>
            <div className="field">
              <label className="label">CRM Project</label>
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
            </div>
            <div className="field">
              <label className="label">Due date</label>
              <input
                className="input"
                type="date"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
              />
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

// CSV escaping — wrap in quotes if value contains `,` `"` or newline; double
// any inner quotes. Matches the convention the Leads export uses.
const csvCell = (raw) => {
  const v = raw == null ? "" : String(raw)
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
}

export default function Tasks() {
  const currentUser = useAuthStore((s) => s.user)
  const canDelete = CAN_DELETE_ROLES.has(currentUser?.role)
  const canCreate = CAN_CREATE_ROLES.has(currentUser?.role)
  const [tab, setTab] = useState("ALL")
  const [tasks, setTasks] = useState([])
  const selection = useRowSelection(tasks, (t) => t.id)
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [users, setUsers] = useState([])
  const [leads, setLeads] = useState([])
  const [projects, setProjects] = useState([])

  // Toolbar state — mirrors Leads page UX.
  const [search, setSearch] = useState("")
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [columnsOpen, setColumnsOpen] = useState(false)
  const [assigneeFilter, setAssigneeFilter] = useState("")
  const [projectFilter, setProjectFilter] = useState("")
  const [leadFilter, setLeadFilter] = useState("")
  const [visibleCols, setVisibleCols] = useState(
    () => new Set(ALL_COLUMNS.filter((c) => c.default).map((c) => c.key)),
  )

  const filtersRef = useRef(null)
  const columnsRef = useRef(null)

  // Close the two popovers on outside click / Escape.
  useEffect(() => {
    if (!filtersOpen && !columnsOpen) return
    const onDown = (e) => {
      if (filtersOpen && filtersRef.current && !filtersRef.current.contains(e.target)) setFiltersOpen(false)
      if (columnsOpen && columnsRef.current && !columnsRef.current.contains(e.target)) setColumnsOpen(false)
    }
    const onKey = (e) => {
      if (e.key !== "Escape") return
      setFiltersOpen(false)
      setColumnsOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [filtersOpen, columnsOpen])

  const load = (status) => {
    setLoading(true)
    const params = {}
    if (status && status !== "ALL") params.status = status
    taskService
      .list(params)
      .then((data) => {
        const items = data?.items ?? data ?? []
        setTasks(Array.isArray(items) ? items : [])
      })
      .catch((err) => toast.error(err?.message || "Failed to load tasks"))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load(tab)
  }, [tab])

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

  // Client-side filtering. Lists are typically small enough that this is
  // free, and it lets the search box feel instant without round-tripping
  // every keystroke. Swap to a server-side `q` param if list grows large.
  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase()
    return tasks.filter((t) => {
      if (assigneeFilter && t.assignedToId !== assigneeFilter) return false
      if (projectFilter && t.projectId !== projectFilter) return false
      if (leadFilter && t.leadId !== leadFilter) return false
      if (!q) return true
      const hay = [
        t.title,
        t.description,
        t.assignedTo?.name,
        t.assignedTo?.email,
        t.lead?.name,
        t.project?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return hay.includes(q)
    })
  }, [tasks, search, assigneeFilter, projectFilter, leadFilter])

  const activeFilterCount =
    (assigneeFilter ? 1 : 0) + (projectFilter ? 1 : 0) + (leadFilter ? 1 : 0)

  const onComplete = async (task) => {
    try {
      const updated = await taskService.complete(task.id)
      toast.success("Task completed")
      setTasks((prev) =>
        tab === "PENDING"
          ? prev.filter((t) => t.id !== task.id)
          : prev.map((t) => (t.id === task.id ? { ...t, ...updated } : t)),
      )
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
    setTasks((prev) => prev.filter((t) => !deleteTarget.ids.includes(t.id)))
    selection.clear()
    setDeleteTarget(null)
    setDeleting(false)
    if (fail === 0) toast.success(`Deleted ${ok} task${ok > 1 ? "s" : ""}`)
    else if (ok === 0) toast.error("Failed to delete tasks")
    else toast.warning(`Deleted ${ok}, failed ${fail}`)
  }

  // Export the currently-visible rows (after search + filters), respecting
  // the column-visibility toggles. Limits to the same view the user is
  // looking at so "what you see is what you get".
  const onExport = () => {
    const cols = ALL_COLUMNS.filter((c) => visibleCols.has(c.key))
    const rows = filteredTasks
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
    setVisibleCols((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const toggleAllColumns = () => {
    const togglable = ALL_COLUMNS.filter((c) => !c.required)
    const allVisible = togglable.every((c) => visibleCols.has(c.key))
    setVisibleCols((prev) => {
      const next = new Set(prev)
      if (allVisible) {
        togglable.forEach((c) => next.delete(c.key))
      } else {
        togglable.forEach((c) => next.add(c.key))
      }
      return next
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
          <p>Track your follow-ups, calls, and to-dos.</p>
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

      {/* Tab switcher */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        {TABS.map((t) => {
          const active = tab === t.key
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={active ? "btn btn-primary btn-sm" : "btn btn-secondary btn-sm"}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Toolbar: search + filters + columns */}
      <div
        className="card"
        style={{
          marginBottom: 12,
          padding: "10px 12px",
          display: "flex",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div className="topbar-search" style={{ flex: "1 1 240px", maxWidth: 360 }}>
          <Search size={14} />
          <input
            type="text"
            value={search}
            placeholder="Search title, assignee, lead, project…"
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div ref={filtersRef} style={{ position: "relative", marginLeft: "auto" }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => { setFiltersOpen((v) => !v); setColumnsOpen(false) }}
          >
            <Filter size={14} /> Filters
            {activeFilterCount > 0 && (
              <span
                className="badge badge-info"
                style={{ marginLeft: 6, fontSize: 10, padding: "1px 6px" }}
              >
                {activeFilterCount}
              </span>
            )}
          </button>
          {filtersOpen && (
            <div
              role="dialog"
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                right: 0,
                zIndex: 30,
                minWidth: 260,
                padding: 12,
                borderRadius: 10,
                background: "var(--lp-surface, #fff)",
                border: "1px solid var(--lp-border)",
                boxShadow: "0 12px 28px rgba(0,0,0,0.22)",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div className="field" style={{ marginBottom: 0 }}>
                <label className="label" style={{ fontSize: 11 }}>Assignee</label>
                <select
                  className="select"
                  value={assigneeFilter}
                  onChange={(e) => setAssigneeFilter(e.target.value)}
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
              <div className="field" style={{ marginBottom: 0 }}>
                <label className="label" style={{ fontSize: 11 }}>Project</label>
                <select
                  className="select"
                  value={projectFilter}
                  onChange={(e) => setProjectFilter(e.target.value)}
                >
                  <option value="">All</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label className="label" style={{ fontSize: 11 }}>Lead</label>
                <select
                  className="select"
                  value={leadFilter}
                  onChange={(e) => setLeadFilter(e.target.value)}
                >
                  <option value="">All</option>
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setAssigneeFilter("")
                    setProjectFilter("")
                    setLeadFilter("")
                  }}
                  style={{ alignSelf: "flex-end" }}
                >
                  Clear all
                </button>
              )}
            </div>
          )}
        </div>

        <div ref={columnsRef} style={{ position: "relative" }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => { setColumnsOpen((v) => !v); setFiltersOpen(false) }}
          >
            <Columns3 size={14} /> Columns
          </button>
          {columnsOpen && (
            <div
              role="dialog"
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                right: 0,
                zIndex: 30,
                minWidth: 200,
                padding: 8,
                borderRadius: 10,
                background: "var(--lp-surface, #fff)",
                border: "1px solid var(--lp-border)",
                boxShadow: "0 12px 28px rgba(0,0,0,0.22)",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 8px",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 13,
                  borderBottom: "1px solid var(--lp-border)",
                  marginBottom: 4,
                }}
              >
                <input
                  type="checkbox"
                  checked={ALL_COLUMNS.filter((c) => !c.required).every((c) => visibleCols.has(c.key))}
                  onChange={toggleAllColumns}
                />
                <ListChecks size={15} />
                Select All
              </label>
              {ALL_COLUMNS.map((c) => {
                const checked = visibleCols.has(c.key)
                const disabled = c.required
                return (
                  <label
                    key={c.key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 8px",
                      borderRadius: 6,
                      cursor: disabled ? "not-allowed" : "pointer",
                      opacity: disabled ? 0.6 : 1,
                      fontSize: 13,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggleColumn(c.key)}
                    />
                    {c.label}
                  </label>
                )
              })}
            </div>
          )}
        </div>

        <span style={{ width: "100%", textAlign: "right", fontSize: 12, color: "var(--lp-text-muted)", order: 99 }}>
          {loading
            ? "Loading…"
            : `${filteredTasks.length} of ${tasks.length} task${tasks.length === 1 ? "" : "s"}`}
        </span>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--lp-text-muted)" }}>
          Loading tasks…
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="empty-state">
          <div className="icon"><ListChecks size={28} /></div>
          <h3>No tasks here</h3>
          <p className="text-muted text-sm">
            {search || activeFilterCount > 0
              ? "No tasks match the current search/filters."
              : tab === "PENDING"
                ? "Nothing pending — nice work."
                : "No tasks to show."}
          </p>
        </div>
      ) : (
        <div className="table-wrap">
          {selection.count > 0 && (
            <div
              className="table-toolbar"
              style={{
                background: "var(--lp-surface-2)",
                borderBottom: "1px solid var(--lp-border)",
              }}
            >
              <span
                style={{
                  color: "var(--lp-accent)",
                  fontWeight: 600,
                  fontSize: "0.867rem",
                }}
              >
                {selection.count} selected
              </span>
              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
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
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={selection.clear}
                >
                  Clear
                </button>
              </div>
            </div>
          )}
          <div className="table-scroll">
            <table className="data" style={{ tableLayout: "fixed" }}>
              <colgroup>
                <col style={{ width: 36 }} />
                {cols.map((c) => (
                  <col key={c.key} style={{ width: c.width }} />
                ))}
                <col style={{ width: 120 }} />
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
                    <th key={c.key}>{c.label}</th>
                  ))}
                  <th className="col-actions" style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((t) => (
                  <tr
                    key={t.id}
                    className={selection.isSelected(t.id) ? "selected" : ""}
                  >
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
          </div>
        </div>
      )}

      <CreateTaskModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(task) => {
          if (tab === "PENDING" || tab === "ALL") setTasks((prev) => [task, ...prev])
        }}
        users={users}
        leads={leads}
        projects={projects}
      />

      {deleteTarget && (
        <div
          className="modal-backdrop"
          onClick={() => !deleting && setDeleteTarget(null)}
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 420 }}
          >
            <div className="modal-head">
              <div className="row" style={{ gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 999,
                    background: "rgba(220,38,38,0.12)",
                    color: "var(--lp-error)",
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                  }}
                >
                  <AlertTriangle size={18} />
                </div>
                <h3 style={{ margin: 0 }}>Delete {deleteTarget.label}?</h3>
              </div>
              <button
                type="button"
                className="btn-icon btn-ghost"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ margin: 0 }}>
                This will permanently remove{" "}
                {deleteTarget.ids.length > 1
                  ? `${deleteTarget.ids.length} tasks`
                  : `the task ${deleteTarget.label}`}
                . This cannot be undone.
              </p>
            </div>
            <div className="modal-foot">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
