import { useEffect, useState } from "react"
import { CheckCircle2, ListChecks, Plus, Trash2, X } from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { taskService } from "@/services/taskService"
import { useAuthStore } from "@/stores/authStore"
import { useRowSelection } from "@/hooks/useRowSelection"
import { fmt } from "@/lib/format"

const TABS = [
  { key: "PENDING", label: "Pending" },
  { key: "COMPLETED", label: "Completed" },
  { key: "ALL", label: "All" },
]

const CAN_DELETE_ROLES = new Set(["OWNER", "ADMIN", "SUPER_ADMIN"])
const CAN_CREATE_ROLES = new Set(["OWNER", "ADMIN", "MANAGER"])

const cellTruncate = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
}

function CreateTaskModal({ open, onClose, onCreated, users, leads }) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [assignedToId, setAssignedToId] = useState("")
  const [leadId, setLeadId] = useState("")
  const [dueAt, setDueAt] = useState("")
  const [saving, setSaving] = useState(false)

  if (!open) return null

  const reset = () => {
    setTitle("")
    setDescription("")
    setAssignedToId("")
    setLeadId("")
    setDueAt("")
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
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
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

export default function Tasks() {
  const currentUser = useAuthStore((s) => s.user)
  const canDelete = CAN_DELETE_ROLES.has(currentUser?.role)
  const canCreate = CAN_CREATE_ROLES.has(currentUser?.role)
  const [tab, setTab] = useState("PENDING")
  const [tasks, setTasks] = useState([])
  const selection = useRowSelection(tasks, (t) => t.id)
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [users, setUsers] = useState([])
  const [leads, setLeads] = useState([])

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
  }, [])

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

  const onDelete = async (task) => {
    if (!window.confirm(`Delete "${task.title}"?`)) return
    try {
      await taskService.delete(task.id)
      toast.success("Task deleted")
      setTasks((prev) => prev.filter((t) => t.id !== task.id))
    } catch (err) {
      toast.error(err?.message || "Failed to delete task")
    }
  }

  return (
    <>
      <div className="content-head">
        <div>
          <h1>Tasks</h1>
          <p>Track your follow-ups, calls, and to-dos.</p>
        </div>
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

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--lp-text-muted)" }}>
          Loading tasks…
        </div>
      ) : tasks.length === 0 ? (
        <div className="empty-state">
          <div className="icon"><ListChecks size={28} /></div>
          <h3>No tasks here</h3>
          <p className="text-muted text-sm">
            {tab === "PENDING" ? "Nothing pending — nice work." : "No tasks to show."}
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
                    onClick={async () => {
                      if (
                        !window.confirm(
                          `Delete ${selection.count} task${selection.count > 1 ? "s" : ""}?`,
                        )
                      )
                        return
                      let ok = 0
                      let fail = 0
                      for (const id of selection.ids) {
                        try {
                          await taskService.delete(id)
                          ok++
                        } catch {
                          fail++
                        }
                      }
                      setTasks((prev) =>
                        prev.filter((t) => !selection.isSelected(t.id)),
                      )
                      selection.clear()
                      if (fail === 0)
                        toast.success(`Deleted ${ok} task${ok > 1 ? "s" : ""}`)
                      else if (ok === 0) toast.error("Failed to delete tasks")
                      else toast.warning(`Deleted ${ok}, failed ${fail}`)
                    }}
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
                <col style={{ width: "28%" }} />
                <col style={{ width: "17%" }} />
                <col style={{ width: "17%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "12%" }} />
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
                  <th>Title</th>
                  <th>Assigned to</th>
                  <th>Lead</th>
                  <th>Due</th>
                  <th style={{ width: 110 }}>Status</th>
                  <th className="col-actions" style={{ width: 120, textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
            <tbody>
              {tasks.map((t) => {
                const assignee = t.assignedTo?.name || t.assignedTo?.email || "—"
                const leadName = t.lead?.name || "—"
                return (
                <tr
                  key={t.id}
                  className={selection.isSelected(t.id) ? "selected" : ""}
                >
                  <td onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selection.isSelected(t.id)}
                      onChange={(e) =>
                        selection.toggleRow(t.id, e.target.checked)
                      }
                      aria-label={`Select task ${t.title}`}
                    />
                  </td>
                  <td>
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
                  </td>
                  <td><div style={cellTruncate} title={assignee}>{assignee}</div></td>
                  <td><div style={cellTruncate} title={leadName}>{leadName}</div></td>
                  <td>{t.dueAt ? fmt.date(t.dueAt) : "—"}</td>
                  <td>
                    <span className={`badge ${t.status === "COMPLETED" ? "badge-success" : "badge-info"}`}>
                      {t.status}
                    </span>
                  </td>
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
                )
              })}
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
      />
    </>
  )
}
