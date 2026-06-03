import { useEffect, useState } from "react"
import { ShieldCheck, ShieldOff, UserPlus, Search, Pencil, UserX, UserCheck, Send, Trash2, MoreHorizontal, X } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { fmt, roleLabel } from "@/lib/format"
import { getBaseModules, ALL_MODULES, MODULE_LABELS } from "@/lib/modules"
import { useAuthStore } from "@/stores/authStore"
import { usePlan, dispatchPlanLimitFE } from "@/hooks/usePlan"
import { useRowSelection } from "@/hooks/useRowSelection"
import {
  useFormDraft,
  readFormDraft,
  writeFormDraft,
  clearFormDraft,
} from "@/hooks/useFormDraft"
import DepartmentSelect from "@/components/forms/DepartmentSelect"

// Visual port of leadpro-realty/src/pages/UsersMgmt.jsx.
// 3 tabs: All Users (table), Roles & Permissions (matrix), Pending Invites.

// Department is required on invite, so start empty to force a deliberate pick.
const INVITE_INITIAL = { name: "", email: "", role: "AGENT", dept: "" }
const INVITE_ROLES = ["MANAGER", "AGENT", "CHANNEL_PARTNER"]
const EDIT_ROLES = ["OWNER", "ADMIN", "MANAGER", "AGENT"]
// Roles whose login is locked to a registered IP (mirrors backend ipGuard).
// Only these rows show a registered IP and a "Reset Login IP" action.
const IP_LOCKED_ROLES = ["MANAGER", "AGENT", "CHANNEL_PARTNER", "BROKER"]
// Channel partners have no company/department, so dept doesn't apply to them.
const DEPT_APPLIES = (role) => role !== "CHANNEL_PARTNER"

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
  // Draft-backed so a backdrop/outside click doesn't lose typed-in values —
  // reopening restores them. Cleared only on Cancel or a successful send.
  const [inviteForm, setInviteForm, clearInviteDraft] = useFormDraft(
    "users:invite",
    INVITE_INITIAL,
  )

  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState(null)

  const [accessUser, setAccessUser] = useState(null)
  const [accessOverrides, setAccessOverrides] = useState(null)
  const [accessLoading, setAccessLoading] = useState(false)
  const [accessSaving, setAccessSaving] = useState(false)

  const [resetTarget, setResetTarget] = useState(null)
  const [resettingIp, setResettingIp] = useState(false)

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
  // Exclude the current user from bulk selection — they can't deactivate
  // themselves and bulk actions on their own row would be confusing.
  const selection = useRowSelection(filtered, (u) => u.id, {
    isSelectable: (u) => u.id !== currentUser?.id,
  })

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
    // Don't reset here — reopen should restore any in-progress draft. The
    // form is only cleared on Cancel or a successful send.
    setInviteOpen(true)
  }

  const NAME_REGEX = /^[a-zA-ZÀ-ÖØ-öø-ÿ\s'.-]+$/

  const sendInvite = async () => {
    const { name, email, role, dept } = inviteForm
    if (!email.trim()) {
      toast.error("Email is required")
      return
    }
    if (name && !NAME_REGEX.test(name)) {
      toast.error("Name cannot contain numbers")
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error("Enter a valid email address")
      return
    }
    if (DEPT_APPLIES(role) && !dept?.trim()) {
      toast.error("Please select a department")
      return
    }
    try {
      const url = role === "CHANNEL_PARTNER" ? "/users/invite-broker" : "/users/invite"
      const body =
        role === "CHANNEL_PARTNER" ? { email, name } : { email, role, name, dept }
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
      clearInviteDraft() // successful submit → wipe the saved draft
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

  const [cancellingId, setCancellingId] = useState(null)
  const cancelInvite = async (inv) => {
    if (!inv?.id) return
    if (!window.confirm(`Cancel invite for ${inv.email}? The recipient won't be able to accept it anymore.`)) return
    setCancellingId(inv.id)
    try {
      await api.delete(`/users/invite/${inv.id}`)
      toast.success(`Invite for ${inv.email} cancelled`)
      refresh()
    } catch (err) {
      toast.error(err?.message || "Failed to cancel invite")
    } finally {
      setCancellingId(null)
    }
  }

  const editDraftKey = (id) => `users:edit:${id}`

  const openEdit = (u) => {
    // Restore an unsaved draft for this user if one exists (e.g. they edited,
    // clicked outside, and came back); otherwise seed from the live record.
    const draft = readFormDraft(editDraftKey(u.id))
    setEditForm(
      draft || {
        id: u.id,
        name: u.name || "",
        email: u.email || "",
        role: String(u.role || "AGENT").toUpperCase(),
        dept: u.dept || "",
        registeredIp: u.registeredIp ?? null,
      },
    )
    setEditOpen(true)
  }

  // Persist edit-form changes per user so a backdrop close doesn't lose them.
  useEffect(() => {
    if (editOpen && editForm?.id) writeFormDraft(editDraftKey(editForm.id), editForm)
  }, [editOpen, editForm])

  const openAccess = async (u) => {
    setAccessUser(u)
    setAccessLoading(true)
    setAccessOverrides(null)
    try {
      const res = await api.get(`/users/${u.id}/module-overrides`)
      setAccessOverrides(res?.data ?? {})
    } catch (err) {
      toast.error(err?.message || "Failed to load module overrides")
      setAccessOverrides({})
    } finally {
      setAccessLoading(false)
    }
  }

  const saveEdit = async () => {
    if (!editForm) return
    const { id, name, role, dept } = editForm
    if (!NAME_REGEX.test(name)) {
      toast.error("Name cannot contain numbers")
      return
    }
    try {
      const res = await api.patch(`/users/${id}`, { name, role, dept })
      const updated = res?.data?.data ?? res?.data ?? res
      setUsers((prev) =>
        prev.map((x) => (x.id === id ? { ...x, ...updated } : x)),
      )
      toast.success("User updated")
      clearFormDraft(editDraftKey(id)) // successful submit → drop the draft
      setEditOpen(false)
    } catch (err) {
      toast.error(err?.message || "Failed to update user")
    }
  }

  const saveAccess = async () => {
    if (!accessUser) return
    setAccessSaving(true)
    try {
      const res = await api.patch(`/users/${accessUser.id}/module-overrides`, { overrides: accessOverrides })
      const updated = res?.data?.data ?? res?.data ?? res
      setUsers((prev) =>
        prev.map((x) => (x.id === accessUser.id ? { ...x, moduleOverrides: updated.moduleOverrides } : x)),
      )
      toast.success("Module access updated")
      setAccessUser(null)
    } catch (err) {
      toast.error(err?.message || "Failed to update module access")
    } finally {
      setAccessSaving(false)
    }
  }

  const toggleAccessOverride = (mod) => {
    setAccessOverrides((prev) => {
      const next = { ...prev }
      if (next[mod] === false) {
        delete next[mod]
      } else {
        next[mod] = false
      }
      return next
    })
  }

  const toggleAccessAllow = (mod) => {
    setAccessOverrides((prev) => {
      const next = { ...prev }
      if (next[mod] === true) {
        delete next[mod]
      } else {
        next[mod] = true
      }
      return next
    })
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

  // Owner-only: clear a user's registered login IP. Opens a styled confirm
  // modal; the actual call runs in confirmResetIp. Backend enforces the
  // OWNER-only rule too.
  const resetIp = (u) => setResetTarget(u)

  const confirmResetIp = async () => {
    const u = resetTarget
    if (!u) return
    setResettingIp(true)
    try {
      const res = await api.post(`/users/${u.id}/reset-ip`)
      const updated = res?.data?.data ?? res?.data ?? res
      const nextIp = updated?.registeredIp ?? null
      setUsers((prev) =>
        prev.map((x) => (x.id === u.id ? { ...x, registeredIp: nextIp } : x)),
      )
      // Keep the Edit modal in sync if it's open for this same user.
      setEditForm((prev) =>
        prev && prev.id === u.id ? { ...prev, registeredIp: nextIp } : prev,
      )
      toast.success("Login IP reset — next login will register a new device")
      setResetTarget(null)
    } catch (err) {
      toast.error(err?.message || "Failed to reset login IP")
    } finally {
      setResettingIp(false)
    }
  }

  const isOwner = currentUser?.role === "OWNER"

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
                  fontSize: "0.933rem",
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
                    <th style={{ width: 36 }}>
                      <input
                        type="checkbox"
                        checked={selection.allSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = selection.someSelected
                        }}
                        onChange={(e) => selection.toggleAll(e.target.checked)}
                        aria-label="Select all users"
                      />
                    </th>
                    <th>User</th>
                    <th>Role</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th>Login IP</th>
                    <th>Last Login</th>
                    <th>Created</th>
                    <th className="col-actions" style={{ width: 56, textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => {
                    const isSelf = currentUser?.id === u.id
                    return (
                    <tr
                      key={u.id}
                      className={selection.isSelected(u.id) ? "selected" : ""}
                    >
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selection.isSelected(u.id)}
                          disabled={isSelf}
                          onChange={(e) =>
                            selection.toggleRow(u.id, e.target.checked)
                          }
                          aria-label={`Select ${u.name || u.email}`}
                          title={
                            isSelf ? "You can't select your own account" : undefined
                          }
                        />
                      </td>
                      <td>
                        <div className="row">
                          <div className="avatar">
                            {u.image ? (
                              <img src={fmt.avatarUrl(u.image)} alt="" />
                            ) : (
                              fmt.initials(u.name || "?")
                            )}
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
                        {(() => {
                          // Owner created the workspace — they're never
                          // "Pending acceptance" of anything. Pending only
                          // applies to invited users who haven't logged in
                          // yet (no lastLoginAt AND not the OWNER).
                          const pending =
                            !u.lastLoginAt && u.role !== "OWNER"
                          const cls = pending
                            ? "badge-warning"
                            : u.isActive
                              ? "badge-success"
                              : "badge-error"
                          const label = pending
                            ? "Pending"
                            : u.isActive
                              ? "Active"
                              : "Inactive"
                          return <span className={`badge ${cls}`}>{label}</span>
                        })()}
                      </td>
                      <td>
                        {IP_LOCKED_ROLES.includes(String(u.role || "").toUpperCase()) ? (
                          u.registeredIp ? (
                            <span className="text-xs" style={{ fontFamily: "monospace" }}>
                              {u.registeredIp}
                            </span>
                          ) : (
                            <span className="text-xs text-muted">Not registered</span>
                          )
                        ) : (
                          <span className="text-xs text-muted" title="Owners and admins can sign in from any IP">
                            Any
                          </span>
                        )}
                      </td>
                      <td>{u.lastLoginAt ? fmt.ago(u.lastLoginAt) : "—"}</td>
                      <td>{u.createdAt ? fmt.date(u.createdAt) : "—"}</td>
                      <td className="col-actions" style={{ textAlign: "right" }}>
                        {(() => {
                          const isSelf = currentUser?.id === u.id
                          const selfHint = "You can't edit your own account here — use the Profile page"
                          return (
                            <Popover>
                              <PopoverTrigger asChild>
                                <button
                                  type="button"
                                  className="btn-icon btn-ghost"
                                  title={isSelf ? selfHint : "Actions"}
                                  aria-label="Row actions"
                                  disabled={isSelf}
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
                                  onClick={() => openEdit(u)}
                                >
                                  <Pencil size={14} /> Edit
                                </button>
                                <button
                                  type="button"
                                  className="row-menu-item"
                                  onClick={() => toggleActive(u)}
                                >
                                  {u.isActive ? (
                                    <>
                                      <UserX size={14} /> Deactivate
                                    </>
                                  ) : (
                                    <>
                                      <UserCheck size={14} /> Activate
                                    </>
                                  )}
                                </button>
                                {(currentUser?.role === "OWNER" && u.role !== "OWNER") && (
                                  <button
                                    type="button"
                                    className="row-menu-item"
                                    onClick={() => openAccess(u)}
                                  >
                                    <ShieldCheck size={14} /> Access
                                  </button>
                                )}
                                {isOwner &&
                                  IP_LOCKED_ROLES.includes(
                                    String(u.role || "").toUpperCase(),
                                  ) && (
                                    <button
                                      type="button"
                                      className="row-menu-item"
                                      onClick={() => resetIp(u)}
                                      disabled={!u.registeredIp}
                                      title={
                                        u.registeredIp
                                          ? "Clear the registered IP so the next login registers a new device"
                                          : "No IP registered yet"
                                      }
                                    >
                                      <ShieldOff size={14} /> Reset Login IP
                                    </button>
                                  )}
                              </PopoverContent>
                            </Popover>
                          )
                        })()}
                      </td>
                    </tr>
                    )
                  })}
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
                    <th style={{ textAlign: "right" }}>Actions</th>
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
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          <button
                            type="button"
                            className="btn btn-sm btn-secondary"
                            disabled={resendingId === i.id || cancellingId === i.id}
                            onClick={() => resendInvite(i)}
                          >
                            <Send size={12} />{" "}
                            {resendingId === i.id ? "Resending…" : "Resend"}
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            disabled={cancellingId === i.id || resendingId === i.id}
                            onClick={() => cancelInvite(i)}
                            title="Cancel this invite — recipient won't be able to accept it"
                          >
                            <Trash2 size={12} />{" "}
                            {cancellingId === i.id ? "Cancelling…" : "Delete"}
                          </button>
                        </div>
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
                    {(currentUser?.role === "MANAGER"
                      ? ["AGENT"]
                      : INVITE_ROLES
                    ).map((r) => (
                      <option key={r} value={r}>
                        {roleLabel(r)}
                      </option>
                    ))}
                  </select>
                </div>
                {DEPT_APPLIES(inviteForm.role) && (
                  <div className="field">
                    <label>
                      Department <span className="req">*</span>
                    </label>
                    <DepartmentSelect
                      value={inviteForm.dept}
                      onChange={(v) => setInviteForm({ ...inviteForm, dept: v })}
                      required
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="modal-foot">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  clearInviteDraft() // explicit cancel → discard the draft
                  setInviteOpen(false)
                }}
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
                  <DepartmentSelect
                    value={editForm.dept}
                    onChange={(v) => setEditForm({ ...editForm, dept: v })}
                  />
                </div>
              </div>

              {/* Login IP lock — only relevant for IP-restricted roles, and
                  only the OWNER may reset. Owners/Admins are exempt so we
                  hide the block for them entirely. */}
              {isOwner &&
                IP_LOCKED_ROLES.includes(
                  String(editForm.role || "").toUpperCase(),
                ) && (
                  <div className="field" style={{ marginTop: 4 }}>
                    <label>Registered Login IP</label>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        justifyContent: "space-between",
                      }}
                    >
                      <span
                        className="text-sm"
                        style={{ fontFamily: "monospace" }}
                      >
                        {editForm.registeredIp || (
                          <span className="text-muted" style={{ fontFamily: "inherit" }}>
                            Not registered yet
                          </span>
                        )}
                      </span>
                      <button
                        type="button"
                        className="btn btn-sm btn-secondary"
                        disabled={!editForm.registeredIp}
                        title={
                          editForm.registeredIp
                            ? "Clear the registered IP so the next login registers a new device"
                            : "No IP registered yet"
                        }
                        onClick={() =>
                          resetIp({
                            id: editForm.id,
                            name: editForm.name,
                            email: editForm.email,
                          })
                        }
                      >
                        <ShieldOff size={14} /> Reset IP
                      </button>
                    </div>
                    <p className="text-xs text-muted" style={{ marginTop: 6 }}>
                      This user can only sign in from the IP shown above. Reset
                      it to let them log in from a new device — their next login
                      registers the new IP.
                    </p>
                  </div>
                )}
            </div>
            <div className="modal-foot">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  if (editForm?.id) clearFormDraft(editDraftKey(editForm.id))
                  setEditOpen(false)
                }}
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

      {/* Module access modal */}
      {accessUser && (
        <div className="modal-backdrop" onClick={() => setAccessUser(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-head">
              <h3>Module Access — {accessUser.name}</h3>
              <button type="button" className="btn-icon btn-ghost" onClick={() => setAccessUser(null)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              {accessLoading ? (
                <p className="text-muted text-sm">Loading…</p>
              ) : (
                <>
                  <p className="text-xs text-muted" style={{ marginBottom: 14 }}>
                    Override which modules this user can access. Grey = module is not in their role's base set
                    and cannot be granted. Unchecked = module is restricted for this user.
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {ALL_MODULES.map((mod) => {
                      const base = getBaseModules(accessUser.role)
                      const inBase = base === null || (base && base.includes(mod))
                      const val = accessOverrides?.[mod]
                      const checked = val === undefined ? true : val
                      return (
                        <div
                          key={mod}
                          className="row row-between"
                          style={{
                            padding: "8px 0",
                            borderBottom: "1px solid var(--lp-border)",
                            opacity: inBase ? 1 : 0.35,
                          }}
                        >
                          <span style={{ fontSize: "0.933rem", fontWeight: val === false ? 500 : 400 }}>{mod}</span>
                          <div className="row" style={{ gap: 8 }}>
                            {inBase ? (
                              <>
                                <label className="checkbox" style={{ fontSize: "0.8rem" }}>
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => {
                                      if (checked) {
                                        toggleAccessOverride(mod)
                                      } else {
                                        toggleAccessAllow(mod)
                                      }
                                    }}
                                  />
                                  {" Allowed"}
                                </label>
                              </>
                            ) : (
                              <span className="text-xs text-muted">Not available for {roleLabel(accessUser.role)}</span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
            <div className="modal-foot">
              <button type="button" className="btn btn-secondary" onClick={() => setAccessUser(null)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={saveAccess} disabled={accessSaving || accessLoading}>
                {accessSaving ? "Saving…" : "Save access"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Login IP confirmation */}
      {resetTarget && (
        <div
          className="modal-backdrop"
          onClick={() => !resettingIp && setResetTarget(null)}
        >
          <div
            className="modal"
            style={{ maxWidth: 440 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              <h3>Reset login IP</h3>
            </div>
            <div className="modal-body">
              <p style={{ margin: 0, lineHeight: 1.6 }}>
                Reset the registered login IP for{" "}
                <strong>{resetTarget.name || resetTarget.email}</strong>?
              </p>
              <p
                className="text-sm text-muted"
                style={{ marginTop: 10, lineHeight: 1.6 }}
              >
                They&apos;ll be able to sign in from any device, and their next
                successful login will register that device&apos;s IP as the new
                allowed address.
              </p>
            </div>
            <div className="modal-foot">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setResetTarget(null)}
                disabled={resettingIp}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={confirmResetIp}
                disabled={resettingIp}
              >
                <ShieldOff size={14} />{" "}
                {resettingIp ? "Resetting…" : "Reset IP"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
