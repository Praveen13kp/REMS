import { useEffect, useState } from "react"
import {
  UserPlus,
  Search,
  Pencil,
  UserX,
  UserCheck,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { fmt, roleLabel } from "@/lib/format"
import { useAuthStore } from "@/stores/authStore"

// Visual port of leadpro-realty/src/pages/UsersMgmt.jsx.
// 3 tabs: All Users (table), Roles & Permissions (matrix), Pending Invites.

const ROLES = ["admin", "manager", "agent", "viewer"]
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

function permDefault(mod, role) {
  if (role === "super_admin") return true
  if (role === "viewer") return ["Leads", "Reports", "Files"].includes(mod)
  if (role === "agent") return ["Leads", "Files"].includes(mod)
  if (role === "manager")
    return ["Leads", "Lead Assignment", "Reports", "Files"].includes(mod)
  return mod !== "Audit Log" || role === "admin"
}

function roleBadgeCls(role) {
  if (role === "admin") return "badge-warning"
  if (role === "manager") return "badge-info"
  if (role === "agent") return "badge-success"
  return "badge-muted"
}

export default function UsersMgmt() {
  const currentUser = useAuthStore((s) => s.user)
  const [tab, setTab] = useState(0)
  const [search, setSearch] = useState("")
  const [users, setUsers] = useState([])
  const [invites, setInvites] = useState([])
  const [loading, setLoading] = useState(true)

  // Modal state
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    name: "",
    email: "",
    role: "admin",
    dept: "Sales North",
  })

  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState(null)

  const [deleteTarget, setDeleteTarget] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api
      .get("/users")
      .then((res) => {
        if (cancelled) return
        const list = res?.data?.items ?? res?.data ?? res?.users ?? res ?? []
        setUsers(Array.isArray(list) ? list : [])
      })
      .catch(() => {
        // TODO: BE endpoint missing — fall back to empty list.
        if (!cancelled) setUsers([])
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
      u.role !== "super_admin" &&
      (!search ||
        ((u.name || "") + (u.email || ""))
          .toLowerCase()
          .includes(search.toLowerCase())),
  )

  const openInvite = () => {
    setInviteForm({ name: "", email: "", role: "admin", dept: "Sales North" })
    setInviteOpen(true)
  }

  const sendInvite = async () => {
    const { name, email, role, dept } = inviteForm
    if (!name.trim() || !email.trim()) {
      toast.error("Name and email required")
      return
    }
    try {
      const res = await api.post("/users/invite", { email, role })
      const newUser = res?.data ?? res
      if (newUser && typeof newUser === "object" && newUser.id) {
        setUsers((prev) => [...prev, newUser])
      } else {
        // Endpoint returned no usable body — add locally.
        setUsers((prev) => [
          ...prev,
          {
            id: `local-${Date.now()}`,
            name,
            email,
            role,
            dept,
            active: true,
            createdAt: Date.now(),
            lastLogin: null,
          },
        ])
      }
      toast.success("Invitation sent")
    } catch (err) {
      if (err?.status === 404) {
        // TODO: BE endpoint missing — fall back to local state.
        setUsers((prev) => [
          ...prev,
          {
            id: `local-${Date.now()}`,
            name,
            email,
            role,
            dept,
            active: true,
            createdAt: Date.now(),
            lastLogin: null,
          },
        ])
        toast.success("Invitation sent (local)")
      } else {
        toast.error(err?.message || "Failed to send invite")
        return
      }
    }
    setInviteOpen(false)
  }

  const openEdit = (u) => {
    setEditForm({
      id: u.id,
      name: u.name || "",
      email: u.email || "",
      role: u.role || "agent",
      dept: u.dept || "",
    })
    setEditOpen(true)
  }

  const saveEdit = async () => {
    if (!editForm) return
    const { id, name, email, role, dept } = editForm
    try {
      await api.patch(`/users/${id}`, { name, email, role })
      setUsers((prev) =>
        prev.map((x) =>
          x.id === id ? { ...x, name, email, role, dept } : x,
        ),
      )
      toast.success("User updated")
    } catch (err) {
      if (err?.status === 404) {
        // TODO: BE endpoint missing — fall back to local state.
        setUsers((prev) =>
          prev.map((x) =>
            x.id === id ? { ...x, name, email, role, dept } : x,
          ),
        )
        toast.success("User updated (local)")
      } else {
        toast.error(err?.message || "Failed to update")
        return
      }
    }
    setEditOpen(false)
  }

  const toggleActive = async (u) => {
    const next = !u.active
    try {
      await api.patch(`/users/${u.id}`, { isActive: next })
      setUsers((prev) =>
        prev.map((x) => (x.id === u.id ? { ...x, active: next } : x)),
      )
      toast.success(next ? "User activated" : "User deactivated")
    } catch (err) {
      if (err?.status === 404) {
        // TODO: BE endpoint missing — fall back to local state.
        setUsers((prev) =>
          prev.map((x) => (x.id === u.id ? { ...x, active: next } : x)),
        )
        toast.success(next ? "User activated (local)" : "User deactivated (local)")
      } else {
        toast.error(err?.message || "Failed to toggle status")
      }
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    const u = deleteTarget
    try {
      await api.delete(`/users/${u.id}`)
      setUsers((prev) => prev.filter((x) => x.id !== u.id))
      toast.success("User deleted")
    } catch (err) {
      if (err?.status === 404) {
        // TODO: BE endpoint missing — fall back to local state.
        setUsers((prev) => prev.filter((x) => x.id !== u.id))
        toast.success("User deleted (local)")
      } else {
        toast.error(err?.message || "Failed to delete")
        return
      }
    }
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
        <button className="btn btn-primary" onClick={openInvite}>
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
                Loading users…
              </div>
            ) : filtered.length === 0 ? (
              <div className="empty-state">
                <div className="icon">
                  <UserPlus size={28} />
                </div>
                <h3>No users</h3>
                <p>Invite your first teammate to get started.</p>
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
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div className="row">
                          <div className="avatar">
                            {u.avatar || fmt.initials(u.name || "?")}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600 }}>{u.name}</div>
                            <div className="text-xs text-muted">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${roleBadgeCls(u.role)}`}>
                          {roleLabel(u.role)}
                        </span>
                      </td>
                      <td>{u.dept || "—"}</td>
                      <td>
                        <span
                          className={`badge ${
                            u.active ? "badge-success" : "badge-error"
                          }`}
                        >
                          {u.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>{u.lastLogin ? fmt.ago(u.lastLogin) : "—"}</td>
                      <td>{u.createdAt ? fmt.date(u.createdAt) : "—"}</td>
                      <td>
                        <div className="row-actions">
                          <button
                            type="button"
                            className="btn-icon btn-ghost"
                            onClick={() => openEdit(u)}
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            className="btn-icon btn-ghost"
                            onClick={() => toggleActive(u)}
                            title="Toggle"
                          >
                            {u.active ? (
                              <UserX size={14} />
                            ) : (
                              <UserCheck size={14} />
                            )}
                          </button>
                          <button
                            type="button"
                            className="btn-icon btn-ghost"
                            onClick={() => setDeleteTarget(u)}
                            title="Delete"
                            disabled={currentUser?.id === u.id}
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
                  <th>Super Admin</th>
                  <th>Admin</th>
                  <th>Manager</th>
                  <th>Agent</th>
                  <th>Viewer</th>
                </tr>
              </thead>
              <tbody>
                {PERM_MODULES.map((m) => (
                  <tr key={m}>
                    <td>{m}</td>
                    {["super_admin", ...ROLES].map((r) => (
                      <td key={r}>
                        <label
                          className="checkbox"
                          style={{ justifyContent: "center" }}
                        >
                          <input
                            type="checkbox"
                            defaultChecked={permDefault(m, r)}
                          />
                        </label>
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
          {invites.length === 0 ? (
            <div className="empty-state">
              <div className="icon">
                <UserPlus size={28} />
              </div>
              <h3>No pending invitations</h3>
              <p>Invited users will appear here until they accept.</p>
              <button className="btn btn-primary" onClick={openInvite}>
                <UserPlus size={14} /> Invite User
              </button>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Invited</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {invites.map((i) => (
                    <tr key={i.id}>
                      <td>{i.email}</td>
                      <td>
                        <span className={`badge ${roleBadgeCls(i.role)}`}>
                          {roleLabel(i.role)}
                        </span>
                      </td>
                      <td>{i.createdAt ? fmt.ago(i.createdAt) : "—"}</td>
                      <td>
                        <button
                          type="button"
                          className="btn-icon btn-ghost"
                          onClick={() =>
                            setInvites((prev) =>
                              prev.filter((x) => x.id !== i.id),
                            )
                          }
                          title="Revoke"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Invite modal */}
      {inviteOpen && (
        <div
          className="modal-backdrop"
          onClick={() => setInviteOpen(false)}
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              <h3>Invite User</h3>
            </div>
            <div className="modal-body">
              <div className="grid grid-2" style={{ gap: "0 14px" }}>
                <div className="field">
                  <label>Full name</label>
                  <input
                    className="input"
                    value={inviteForm.name}
                    onChange={(e) =>
                      setInviteForm({ ...inviteForm, name: e.target.value })
                    }
                  />
                </div>
                <div className="field">
                  <label>Email</label>
                  <input
                    className="input"
                    type="email"
                    value={inviteForm.email}
                    onChange={(e) =>
                      setInviteForm({ ...inviteForm, email: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-2" style={{ gap: "0 14px" }}>
                <div className="field">
                  <label>Role</label>
                  <select
                    className="select"
                    value={inviteForm.role}
                    onChange={(e) =>
                      setInviteForm({ ...inviteForm, role: e.target.value })
                    }
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {roleLabel(r)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Department</label>
                  <select
                    className="select"
                    value={inviteForm.dept}
                    onChange={(e) =>
                      setInviteForm({ ...inviteForm, dept: e.target.value })
                    }
                  >
                    <option>Sales North</option>
                    <option>Sales South</option>
                    <option>Marketing</option>
                    <option>Support</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-foot">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setInviteOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={sendInvite}
              >
                Send Invite
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editOpen && editForm && (
        <div className="modal-backdrop" onClick={() => setEditOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Edit User</h3>
            </div>
            <div className="modal-body">
              <div className="grid grid-2" style={{ gap: "0 14px" }}>
                <div className="field">
                  <label>Name</label>
                  <input
                    className="input"
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, name: e.target.value })
                    }
                  />
                </div>
                <div className="field">
                  <label>Email</label>
                  <input
                    className="input"
                    value={editForm.email}
                    onChange={(e) =>
                      setEditForm({ ...editForm, email: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-2" style={{ gap: "0 14px" }}>
                <div className="field">
                  <label>Role</label>
                  <select
                    className="select"
                    value={editForm.role}
                    onChange={(e) =>
                      setEditForm({ ...editForm, role: e.target.value })
                    }
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {roleLabel(r)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Department</label>
                  <input
                    className="input"
                    value={editForm.dept}
                    onChange={(e) =>
                      setEditForm({ ...editForm, dept: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
            <div className="modal-foot">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setEditOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={saveEdit}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div
          className="modal-backdrop"
          onClick={() => setDeleteTarget(null)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Delete user?</h3>
            </div>
            <div className="modal-body">
              <p className="text-muted text-sm">
                Permanently delete {deleteTarget.name}? Their leads will become
                unassigned.
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
                onClick={confirmDelete}
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
