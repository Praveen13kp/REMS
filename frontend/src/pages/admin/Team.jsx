import { useEffect, useState } from "react"
import {
  UserPlus,
  Search,
  Pencil,
  UserX,
  UserCheck,
  Trash2,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { fmt } from "@/lib/format"

// Ported visuals from leadpro-realty/src/pages/UsersMgmt.jsx.
// Reads from GET /users (already used by Leads filters); mutating endpoints
// (invite / update / deactivate / delete) are not yet built — those actions
// currently just toast + update local state.
// TODO: wire to /users (POST/PATCH/DELETE) when S4-BE-A-* lands.

const ROLE_BADGE = {
  OWNER: "badge-purple",
  ADMIN: "badge-warning",
  MANAGER: "badge-info",
  AGENT: "badge-success",
  VIEWER: "badge-muted",
}

const ROLE_LABEL = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MANAGER: "Manager",
  AGENT: "Agent",
  VIEWER: "Viewer",
}

const INVITABLE_ROLES = ["ADMIN", "MANAGER", "AGENT"]

const PERM_MODULES = [
  "Leads",
  "Lead Assignment",
  "Reports",
  "User Management",
  "Settings",
  "Billing",
  "Files",
  "Audit Log",
]

const PERM_ROLES = ["OWNER", "ADMIN", "MANAGER", "AGENT", "VIEWER"]

function permDefault(mod, role) {
  if (role === "OWNER") return true
  if (role === "VIEWER") return ["Leads", "Reports", "Files"].includes(mod)
  if (role === "AGENT") return ["Leads", "Files"].includes(mod)
  if (role === "MANAGER")
    return ["Leads", "Lead Assignment", "Reports", "Files"].includes(mod)
  return mod !== "Audit Log" || role === "ADMIN"
}

export default function Team() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState(0)
  const [search, setSearch] = useState("")
  const [inviteOpen, setInviteOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  useEffect(() => {
    let cancelled = false
    api
      .get("/users")
      .then((res) => {
        if (cancelled) return
        const list =
          res?.data?.items ?? res?.data ?? res?.users ?? res ?? []
        setUsers(Array.isArray(list) ? list : [])
      })
      .catch(() => {
        // No /users yet — seed with empty list.
        setUsers([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = users.filter(
    (u) =>
      !search ||
      `${u.name || ""} ${u.email || ""}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  )

  // TODO: wire to POST /users (invitation flow) when BE endpoint exists.
  const handleInvite = (formData) => {
    if (!formData.name || !formData.email) {
      toast.error("Name and email required")
      return
    }
    setUsers((prev) => [
      ...prev,
      {
        id: `local-${Date.now()}`,
        name: formData.name,
        email: formData.email,
        role: formData.role,
        dept: formData.dept,
        active: true,
        createdAt: new Date().toISOString(),
        lastLogin: null,
      },
    ])
    toast.success("Invitation sent (local only — backend pending)")
    setInviteOpen(false)
  }

  // TODO: wire to PATCH /users/:id.
  const handleEdit = (formData) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === editTarget.id ? { ...u, ...formData } : u,
      ),
    )
    toast.success("User updated (local only — backend pending)")
    setEditTarget(null)
  }

  // TODO: wire to PATCH /users/:id { active }.
  const toggleActive = (u) => {
    setUsers((prev) =>
      prev.map((x) => (x.id === u.id ? { ...x, active: !x.active } : x)),
    )
    toast.success(u.active ? "User deactivated" : "User activated")
  }

  // TODO: wire to DELETE /users/:id.
  const handleDelete = () => {
    setUsers((prev) => prev.filter((x) => x.id !== deleteTarget.id))
    toast.success("User deleted (local only — backend pending)")
    setDeleteTarget(null)
  }

  return (
    <>
      <div className="content-head">
        <div>
          <h1>User Management</h1>
          <p>
            {filtered.length} {filtered.length === 1 ? "user" : "users"} in
            your organisation.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setInviteOpen(true)}
        >
          <UserPlus size={16} /> Invite User
        </button>
      </div>

      <div className="tabs">
        {["All Users", "Roles & Permissions", "Pending Invitations"].map(
          (t, i) => (
            <button
              key={t}
              type="button"
              className={`tab ${tab === i ? "active" : ""}`}
              onClick={() => setTab(i)}
            >
              {t}
            </button>
          ),
        )}
      </div>

      {tab === 0 && (
        <div className="table-wrap">
          <div className="table-toolbar">
            <div className="topbar-search">
              <Search size={16} />
              <input
                value={search}
                placeholder="Search users…"
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="table-scroll">
            {loading ? (
              <div
                style={{
                  padding: "40px 20px",
                  textAlign: "center",
                  color: "var(--lp-text-muted)",
                  fontSize: 14,
                }}
              >
                Loading team…
              </div>
            ) : filtered.length === 0 ? (
              <div className="empty-state">
                <div className="icon">
                  <UserPlus size={28} />
                </div>
                <h3>No users yet</h3>
                <p>Invite your first teammate to get started.</p>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setInviteOpen(true)}
                >
                  <UserPlus size={14} /> Invite User
                </button>
              </div>
            ) : (
              <table className="data">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th>Last Login</th>
                    <th>Created</th>
                    <th style={{ width: 120 }} />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div className="row">
                          <div className="avatar">
                            {fmt.initials(u.name || u.email || "?")}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600 }}>{u.name}</div>
                            <div
                              style={{
                                fontSize: 12,
                                color: "var(--lp-text-muted)",
                              }}
                            >
                              {u.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`badge ${ROLE_BADGE[u.role] || "badge-muted"}`}
                        >
                          {ROLE_LABEL[u.role] || u.role}
                        </span>
                      </td>
                      <td>{u.dept || "—"}</td>
                      <td>
                        <span
                          className={`badge ${u.active === false ? "badge-error" : "badge-success"}`}
                        >
                          {u.active === false ? "Inactive" : "Active"}
                        </span>
                      </td>
                      <td>{u.lastLogin ? fmt.ago(u.lastLogin) : "—"}</td>
                      <td>{u.createdAt ? fmt.date(u.createdAt) : "—"}</td>
                      <td>
                        <div
                          className="row"
                          style={{
                            justifyContent: "flex-end",
                            gap: 4,
                          }}
                        >
                          <button
                            type="button"
                            className="btn-icon btn-ghost"
                            title="Edit"
                            onClick={() => setEditTarget(u)}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            className="btn-icon btn-ghost"
                            title={u.active === false ? "Activate" : "Deactivate"}
                            onClick={() => toggleActive(u)}
                          >
                            {u.active === false ? (
                              <UserCheck size={14} />
                            ) : (
                              <UserX size={14} />
                            )}
                          </button>
                          <button
                            type="button"
                            className="btn-icon btn-ghost"
                            title="Delete"
                            onClick={() => setDeleteTarget(u)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {tab === 1 && (
        <div className="card">
          <div className="card-title">Permission Matrix</div>
          <div className="table-scroll">
            <table className="perm-matrix">
              <thead>
                <tr>
                  <th>Module</th>
                  {PERM_ROLES.map((r) => (
                    <th key={r}>{ROLE_LABEL[r]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERM_MODULES.map((m) => (
                  <tr key={m}>
                    <td>{m}</td>
                    {PERM_ROLES.map((r) => (
                      <td key={r}>
                        <input
                          type="checkbox"
                          defaultChecked={permDefault(m, r)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 2 && (
        <div className="card">
          <div className="empty-state">
            <div className="icon">
              <UserPlus size={28} />
            </div>
            <h3>No pending invitations</h3>
            <p>Invited users will appear here until they accept.</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setInviteOpen(true)}
            >
              <UserPlus size={14} /> Invite User
            </button>
          </div>
        </div>
      )}

      {inviteOpen && (
        <UserFormModal
          title="Invite User"
          submitLabel="Send Invite"
          onClose={() => setInviteOpen(false)}
          onSubmit={handleInvite}
        />
      )}

      {editTarget && (
        <UserFormModal
          title="Edit User"
          submitLabel="Save"
          initial={editTarget}
          onClose={() => setEditTarget(null)}
          onSubmit={handleEdit}
        />
      )}

      {deleteTarget && (
        <div
          className="modal-backdrop"
          onClick={() => setDeleteTarget(null)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Delete user?</h3>
              <button
                type="button"
                className="btn-icon btn-ghost"
                onClick={() => setDeleteTarget(null)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p
                style={{
                  fontSize: 14,
                  color: "var(--lp-text-muted)",
                }}
              >
                Permanently delete{" "}
                <strong style={{ color: "var(--lp-text)" }}>
                  {deleteTarget.name}
                </strong>
                ? Their leads will become unassigned.
              </p>
            </div>
            <div className="modal-foot">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function UserFormModal({ title, submitLabel, initial, onClose, onSubmit }) {
  const [form, setForm] = useState({
    name: initial?.name || "",
    email: initial?.email || "",
    role: initial?.role || "AGENT",
    dept: initial?.dept || "",
  })
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }))

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button
            type="button"
            className="btn-icon btn-ghost"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          <div className="field">
            <label>Full name</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>
          <div className="field">
            <label>Email</label>
            <input
              className="input"
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </div>
          <div className="field">
            <label>Role</label>
            <select
              className="select"
              value={form.role}
              onChange={(e) => set("role", e.target.value)}
            >
              {INVITABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Department</label>
            <input
              className="input"
              value={form.dept}
              onChange={(e) => set("dept", e.target.value)}
            />
          </div>
        </div>
        <div className="modal-foot">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onSubmit(form)}
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
