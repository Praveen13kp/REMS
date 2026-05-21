import { useEffect, useState } from "react"
import { UserPlus, Search, Pencil, UserX, UserCheck, Send } from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { fmt, roleLabel } from "@/lib/format"
import { useAuthStore } from "@/stores/authStore"
import { usePlan, dispatchPlanLimitFE } from "@/hooks/usePlan"

// Visual port of leadpro-realty/src/pages/UsersMgmt.jsx.
// 3 tabs: All Users (table), Roles & Permissions (matrix), Pending Invites.

const INVITE_ROLES = ["ADMIN", "MANAGER", "AGENT", "BROKER"]
const EDIT_ROLES = ["OWNER", "ADMIN", "MANAGER", "AGENT"]
const DEPARTMENTS = ["Sales North", "Sales South", "Marketing", "Support"]

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

const PERM_COLUMNS = [
  { key: "OWNER", label: "Owner" },
  { key: "ADMIN", label: "Admin" },
  { key: "MANAGER", label: "Manager" },
  { key: "AGENT", label: "Agent" },
]

function permDefault(mod, role) {
  if (role === "OWNER") return true
  if (role === "AGENT") return ["Leads", "Files"].includes(mod)
  if (role === "MANAGER")
    return ["Leads", "Lead Assignment", "Reports", "Files"].includes(mod)
  return mod !== "Audit Log" || role === "ADMIN"
}

function roleBadgeCls(role) {
  const r = String(role || "").toUpperCase()
  if (r === "OWNER") return "badge-info"
  if (r === "ADMIN") return "badge-warning"
  if (r === "MANAGER") return "badge-info"
  if (r === "AGENT") return "badge-success"
  return "badge-muted"
}

const splitListResponse = (list) => {
  const arr = Array.isArray(list) ? list : []
  return {
    users: arr.filter((u) => u.status !== "PENDING"),
    invites: arr.filter((u) => u.status === "PENDING"),
  }
}

export default function UsersMgmt() {
  const currentUser = useAuthStore((s) => s.user)
  const { plan } = usePlan()
  const [tab, setTab] = useState(0)
  const [search, setSearch] = useState("")
  const [users, setUsers] = useState([])
  const [invites, setInvites] = useState([])
  const [loading, setLoading] = useState(true)

  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    name: "",
    email: "",
    role: "AGENT",
    dept: DEPARTMENTS[0],
  })

  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState(null)

  const refresh = async () => {
    setLoading(true)
    try {
      const res = await api.get("/users")
      const list = res?.data?.data ?? res?.data ?? res?.users ?? []
      const { users: u, invites: i } = splitListResponse(list)
      setUsers(u)
      setInvites(i)
    } catch (err) {
      toast.error(err?.message || "Failed to load users")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const filtered = users.filter(
    (u) =>
      !search ||
      ((u.name || "") + (u.email || ""))
        .toLowerCase()
        .includes(search.toLowerCase()),
  )

  const openInvite = () => {
    // Pre-flight plan check: if the tenant is at (or over) the user cap,
    // surface the upgrade modal immediately instead of opening the form
    // and failing on submit. Brokers don't consume seats so they're
    // excluded from the cap on the BE — same model used here.
    if (
      plan &&
      plan.limits?.users != null &&
      plan.usage?.users != null &&
      plan.usage.users >= plan.limits.users
    ) {
      dispatchPlanLimitFE({
        resource: "users",
        current: plan.usage.users,
        limit: plan.limits.users,
        planCode: plan.plan,
      })
      return
    }
    setInviteForm({ name: "", email: "", role: "AGENT", dept: DEPARTMENTS[0] })
    setInviteOpen(true)
  }

  const sendInvite = async () => {
    const { name, email, role, dept } = inviteForm
    if (!email.trim()) {
      toast.error("Email is required")
      return
    }
    try {
      const url = role === "BROKER" ? "/users/invite-broker" : "/users/invite"
      const body =
        role === "BROKER" ? { email, name } : { email, role, name, dept }
      const res = await api.post(url, body)
      const data = res?.data?.data ?? res?.data ?? res
      if (data?.inviteLink && navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(data.inviteLink)
        } catch {
          /* clipboard may be unavailable */
        }
      }
      if (data?.emailSent) {
        toast.success(`Invitation emailed to ${email} — link also copied`)
      } else {
        toast.success("Invitation created — link copied (email not configured)")
      }
      setInviteOpen(false)
      refresh()
    } catch (err) {
      toast.error(err?.message || "Failed to send invite")
    }
  }

  const [resendingId, setResendingId] = useState(null)
  const resendInvite = async (inv) => {
    if (!inv?.id) return
    setResendingId(inv.id)
    try {
      const res = await api.post(`/users/invite/${inv.id}/resend`)
      const data = res?.data?.data ?? res?.data ?? res
      if (data?.inviteLink && navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(data.inviteLink)
        } catch {
          /* ignore */
        }
      }
      if (data?.emailSent) {
        toast.success(`Invitation resent to ${inv.email}`)
      } else {
        toast.success("Invite refreshed — link copied (email not configured)")
      }
      refresh()
    } catch (err) {
      toast.error(err?.message || "Failed to resend invite")
    } finally {
      setResendingId(null)
    }
  }

  const openEdit = (u) => {
    setEditForm({
      id: u.id,
      name: u.name || "",
      email: u.email || "",
      role: String(u.role || "AGENT").toUpperCase(),
      dept: u.dept || "",
    })
    setEditOpen(true)
  }

  const saveEdit = async () => {
    if (!editForm) return
    const { id, name, role, dept } = editForm
    try {
      const res = await api.patch(`/users/${id}`, { name, role, dept })
      const updated = res?.data?.data ?? res?.data ?? res
      setUsers((prev) =>
        prev.map((x) => (x.id === id ? { ...x, ...updated } : x)),
      )
      toast.success("User updated")
      setEditOpen(false)
    } catch (err) {
      toast.error(err?.message || "Failed to update user")
    }
  }

  const toggleActive = async (u) => {
    const next = !u.isActive
    try {
      const res = await api.patch(`/users/${u.id}`, { isActive: next })
      const updated = res?.data?.data ?? res?.data ?? res
      setUsers((prev) =>
        prev.map((x) => (x.id === u.id ? { ...x, ...updated } : x)),
      )
      toast.success(next ? "User activated" : "User deactivated")
    } catch (err) {
      toast.error(err?.message || "Failed to toggle status")
    }
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
              {i === 2 && invites.length > 0 ? ` (${invites.length})` : ""}
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
                            {u.image
                              ? <img src={u.image} alt="" />
                              : fmt.initials(u.name || "?")}
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
                            u.isActive ? "badge-success" : "badge-error"
                          }`}
                        >
                          {u.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>{u.lastLoginAt ? fmt.ago(u.lastLoginAt) : "—"}</td>
                      <td>{u.createdAt ? fmt.date(u.createdAt) : "—"}</td>
                      <td>
                        {(() => {
                          const isSelf = currentUser?.id === u.id
                          const selfHint = "You can't edit your own account here — use the Profile page"
                          return (
                            <div
                              className="row-actions"
                              style={isSelf ? { opacity: 0.4 } : undefined}
                            >
                              <button
                                type="button"
                                className="btn-icon btn-ghost"
                                onClick={() => openEdit(u)}
                                title={isSelf ? selfHint : "Edit"}
                                disabled={isSelf}
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                type="button"
                                className="btn-icon btn-ghost"
                                onClick={() => toggleActive(u)}
                                title={
                                  isSelf
                                    ? selfHint
                                    : u.isActive
                                      ? "Deactivate"
                                      : "Activate"
                                }
                                disabled={isSelf}
                              >
                                {u.isActive ? (
                                  <UserX size={14} />
                                ) : (
                                  <UserCheck size={14} />
                                )}
                              </button>
                            </div>
                          )
                        })()}
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
                  {PERM_COLUMNS.map((c) => (
                    <th key={c.key}>{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERM_MODULES.map((m) => (
                  <tr key={m}>
                    <td>{m}</td>
                    {PERM_COLUMNS.map((c) => (
                      <td key={c.key}>
                        <label
                          className="checkbox"
                          style={{ justifyContent: "center" }}
                        >
                          <input
                            type="checkbox"
                            defaultChecked={permDefault(m, c.key)}
                            disabled
                          />
                        </label>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted" style={{ marginTop: 10 }}>
            Read-only preview. Permission editing ships in a later sprint.
          </p>
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
                    <th>Expires</th>
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
                      <td>{i.expiresAt ? fmt.date(i.expiresAt) : "—"}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          disabled={resendingId === i.id}
                          onClick={() => resendInvite(i)}
                        >
                          <Send size={12} />{" "}
                          {resendingId === i.id ? "Resending…" : "Resend"}
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
          <div className="modal" onClick={(e) => e.stopPropagation()}>
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
                    {INVITE_ROLES.map((r) => (
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
                    {DEPARTMENTS.map((d) => (
                      <option key={d}>{d}</option>
                    ))}
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
                    disabled
                    title="Email is managed by the auth provider"
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
                    {EDIT_ROLES.map((r) => (
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
    </>
  )
}
