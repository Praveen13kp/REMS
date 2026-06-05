import { useEffect, useState, useCallback } from "react"
import { Building, Plus, Pencil, Trash2, Search, UserPlus, X } from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { roleLabel } from "@/lib/format"
import { useAuthStore } from "@/stores/authStore"
import MultiDepartmentSelect from "@/components/forms/MultiDepartmentSelect"

// Department Management — OWNER only.
// 3 sections: Create Department, Manage Departments (list/rename/delete),
// and Manage Users (assign departments to agents/managers).

const STAFF_ROLES = ["MANAGER", "AGENT"]

export default function DepartmentManagement() {
  const currentUser = useAuthStore((s) => s.user)
  const [tab, setTab] = useState(0)

  // Departments
  const [departments, setDepartments] = useState([])
  const [deptLoading, setDeptLoading] = useState(true)

  // Create department
  const [newDeptName, setNewDeptName] = useState("")
  const [creating, setCreating] = useState(false)

  // Rename department
  const [renameId, setRenameId] = useState(null)
  const [renameVal, setRenameVal] = useState("")
  const [renaming, setRenaming] = useState(false)

  // Users
  const [users, setUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [userSearch, setUserSearch] = useState("")

  // Invite modal
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteForm, setInviteForm] = useState({ email: "", role: "AGENT", departmentIds: [] })
  const [sendingInvite, setSendingInvite] = useState(false)

  const loadDepartments = useCallback(async () => {
    setDeptLoading(true)
    try {
      const res = await api.get("/departments")
      const list = Array.isArray(res) ? res : res?.data ?? []
      setDepartments(list)
    } catch (err) {
      toast.error(err?.message || "Failed to load departments")
    } finally {
      setDeptLoading(false)
    }
  }, [])

  const loadUsers = useCallback(async () => {
    setUsersLoading(true)
    try {
      const res = await api.get("/users")
      const list = res?.data?.data ?? res?.data ?? res?.users ?? []
      const filtered = list.filter(
        (u) => STAFF_ROLES.includes(u.role) && u.status !== "PENDING",
      )
      setUsers(filtered)
    } catch (err) {
      toast.error(err?.message || "Failed to load users")
    } finally {
      setUsersLoading(false)
    }
  }, [])

  useEffect(() => { loadDepartments(); loadUsers() }, [loadDepartments, loadUsers])

  const handleCreate = async () => {
    const name = newDeptName.trim()
    if (!name) { toast.error("Department name is required"); return }
    setCreating(true)
    try {
      await api.post("/departments", { name })
      toast.success(`Department "${name}" created`)
      setNewDeptName("")
      loadDepartments()
    } catch (err) {
      toast.error(err?.message || "Failed to create department")
    } finally {
      setCreating(false)
    }
  }

  const handleRename = async (id) => {
    const name = renameVal.trim()
    if (!name) { toast.error("Department name is required"); return }
    setRenaming(true)
    try {
      await api.patch(`/departments/${id}`, { name })
      toast.success("Department renamed")
      setRenameId(null)
      loadDepartments()
    } catch (err) {
      toast.error(err?.message || "Failed to rename department")
    } finally {
      setRenaming(false)
    }
  }

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? Users assigned to this department will have it removed.`)) return
    try {
      await api.delete(`/departments/${id}`)
      toast.success(`Department "${name}" deleted`)
      loadDepartments()
      loadUsers()
    } catch (err) {
      toast.error(err?.message || "Failed to delete department")
    }
  }

  const handleUserDeptChange = async (userId, departmentIds) => {
    try {
      await api.put(`/departments/user/${userId}`, { departmentIds })
      loadUsers()
      toast.success("User departments updated")
    } catch (err) {
      toast.error(err?.message || "Failed to update user departments")
    }
  }

  const handleInvite = async () => {
    const { email, role, departmentIds } = inviteForm
    if (!email.trim()) { toast.error("Email is required"); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { toast.error("Enter a valid email"); return }
    setSendingInvite(true)
    try {
      const res = await api.post("/users/invite", { email, role, departmentIds })
      const data = res?.data?.data ?? res?.data ?? res
      if (data?.inviteLink && navigator.clipboard) {
        try { await navigator.clipboard.writeText(data.inviteLink) } catch {}
      }
      toast.success(`Invitation sent to ${email}`)
      setInviteOpen(false)
      setInviteForm({ email: "", role: "AGENT", departmentIds: [] })
      loadUsers()
    } catch (err) {
      toast.error(err?.message || "Failed to send invite")
    } finally {
      setSendingInvite(false)
    }
  }

  const filteredUsers = users.filter(
    (u) => !userSearch || ((u.name || "") + (u.email || "")).toLowerCase().includes(userSearch.toLowerCase()),
  )

  return (
    <>
      <div className="content-head">
        <div>
          <h1>Department Management</h1>
          <p>Manage departments, assign users, and invite new team members.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setInviteOpen(true)}>
          <UserPlus size={16} /> Invite Staff
        </button>
      </div>

      <div className="tabs">
        {["Departments", "Manage Users"].map((t, i) => (
          <button key={t} type="button" className={`tab ${tab === i ? "active" : ""}`} onClick={() => setTab(i)}>
            {t}
          </button>
        ))}
      </div>

      {tab === 0 && (
        <div className="card">
          {/* Create Department */}
          <div className="card-title">Create Department</div>
          <div className="row" style={{ gap: 10, marginBottom: 24 }}>
            <input
              className="input"
              placeholder="Department name"
              value={newDeptName}
              onChange={(e) => setNewDeptName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              style={{ maxWidth: 320 }}
            />
            <button className="btn btn-primary" onClick={handleCreate} disabled={creating}>
              <Plus size={14} /> {creating ? "Creating…" : "Create"}
            </button>
          </div>

          {/* Department List */}
          <div className="card-title">All Departments</div>
          {deptLoading ? (
            <p className="text-muted text-sm">Loading departments…</p>
          ) : departments.length === 0 ? (
            <div className="empty-state">
              <Building size={28} />
              <h3>No departments yet</h3>
              <p>Create your first department above.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {departments.map((dept) => (
                <div
                  key={dept.id}
                  className="row row-between"
                  style={{
                    padding: "12px 14px",
                    borderRadius: 8,
                    border: "1px solid var(--lp-border)",
                    background: "var(--lp-surface)",
                  }}
                >
                  {renameId === dept.id ? (
                    <div className="row" style={{ gap: 8, flex: 1 }}>
                      <input
                        className="input"
                        value={renameVal}
                        onChange={(e) => setRenameVal(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRename(dept.id)
                          if (e.key === "Escape") setRenameId(null)
                        }}
                        autoFocus
                        style={{ maxWidth: 240 }}
                      />
                      <button className="btn btn-sm btn-primary" onClick={() => handleRename(dept.id)} disabled={renaming}>
                        Save
                      </button>
                      <button className="btn btn-sm btn-secondary" onClick={() => setRenameId(null)}>Cancel</button>
                    </div>
                  ) : (
                    <>
                      <div className="row" style={{ gap: 10 }}>
                        <Building size={16} style={{ color: "var(--lp-accent)", flex: "none" }} />
                        <span style={{ fontWeight: 600 }}>{dept.name}</span>
                      </div>
                      <div className="row" style={{ gap: 6 }}>
                        <button
                          type="button"
                          className="btn-icon btn-ghost"
                          title="Rename"
                          onClick={() => { setRenameId(dept.id); setRenameVal(dept.name) }}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          className="btn-icon btn-ghost"
                          style={{ color: "var(--lp-error)" }}
                          title="Delete"
                          onClick={() => handleDelete(dept.id, dept.name)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 1 && (
        <div className="card">
          <div className="card-title">Assign Departments to Staff</div>
          <div className="topbar-search" style={{ marginBottom: 16 }}>
            <Search size={16} />
            <input
              value={userSearch}
              placeholder="Search staff…"
              onChange={(e) => setUserSearch(e.target.value)}
            />
          </div>
          {usersLoading ? (
            <p className="text-muted text-sm">Loading users…</p>
          ) : filteredUsers.length === 0 ? (
            <div className="empty-state">
              <Building size={28} />
              <h3>No staff found</h3>
              <p>{userSearch ? "Try a different search." : "Invite agents or managers to get started."}</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {filteredUsers.map((u) => {
                const deptIds = (u.departments || []).map((ud) => ud.department?.id || ud.departmentId).filter(Boolean)
                return (
                  <div
                    key={u.id}
                    className="row row-between"
                    style={{
                      padding: "12px 14px",
                      borderRadius: 8,
                      border: "1px solid var(--lp-border)",
                      background: "var(--lp-surface)",
                    }}
                  >
                    <div className="row" style={{ gap: 10, flex: 1, minWidth: 0 }}>
                      <div className="avatar" style={{ width: 32, height: 32, fontSize: "0.8rem" }}>
                        {u.image ? (
                          <img src={u.image} alt="" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }} />
                        ) : (
                          (u.name || "?")[0]?.toUpperCase()
                        )}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{u.name}</div>
                        <div className="text-xs text-muted">{u.email} · {roleLabel(u.role)}</div>
                      </div>
                    </div>
                    <div style={{ minWidth: 200, maxWidth: 300 }}>
                      <MultiDepartmentSelect
                        value={deptIds}
                        onChange={(ids) => handleUserDeptChange(u.id, ids)}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Invite Modal */}
      {inviteOpen && (
        <div className="modal-backdrop" onClick={() => setInviteOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Invite Staff</h3>
              <button type="button" className="btn-icon btn-ghost" onClick={() => setInviteOpen(false)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="grid grid-2" style={{ gap: "0 14px" }}>
                <div className="field">
                  <label>Email <span className="req">*</span></label>
                  <input
                    className="input"
                    type="email"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    placeholder="colleague@example.com"
                  />
                </div>
                <div className="field">
                  <label>Role <span className="req">*</span></label>
                  <select
                    className="select"
                    value={inviteForm.role}
                    onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                  >
                    {STAFF_ROLES.map((r) => (
                      <option key={r} value={r}>{roleLabel(r)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="field">
                <label>Departments</label>
                <MultiDepartmentSelect
                  value={inviteForm.departmentIds}
                  onChange={(ids) => setInviteForm({ ...inviteForm, departmentIds: ids })}
                />
              </div>
            </div>
            <div className="modal-foot">
              <button type="button" className="btn btn-secondary" onClick={() => setInviteOpen(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={handleInvite} disabled={sendingInvite}>
                {sendingInvite ? "Sending…" : "Send Invite"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
