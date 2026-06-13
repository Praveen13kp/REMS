import { useEffect, useMemo, useState, useCallback } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import {
  ArrowDown,
  ArrowUp,
  Building,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUpDown,
  Columns3,
  Eye,
  Filter,
  ListChecks,
  Mail,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Shuffle,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { Dash } from "@/components/ui/dash"
import { api } from "@/lib/api"
import { fmt, roleLabel } from "@/lib/format"
import { useAuthStore } from "@/stores/authStore"
import MultiDepartmentSelect from "@/components/forms/MultiDepartmentSelect"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const STAFF_ROLES = ["MANAGER", "AGENT"]

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

const COLUMNS_CONFIG = [
  { key: "name", label: "Department", icon: Building },
  { key: "maxEmployees", label: "Max Employees", icon: Users },
  { key: "userCount", label: "Current Count", icon: UserPlus },
  { key: "createdAt", label: "Created", icon: Calendar },
]

const USER_COLUMNS = [
  { key: "name", label: "Name", icon: Users },
  { key: "email", label: "Email", icon: Mail },
  { key: "role", label: "Role", icon: Shuffle },
  { key: "departments", label: "Departments", icon: Building },
  { key: "createdAt", label: "Joined", icon: Calendar },
]

function SortIcon({ field, sort }) {
  const [curField, curDir] = sort.split(":")
  if (curField !== field) return <ChevronsUpDown size={12} />
  return curDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />
}

export default function DepartmentManagement() {
  const navigate = useNavigate()
  const currentUser = useAuthStore((s) => s.user)
  const [searchParams, setSearchParams] = useSearchParams()
  const role = currentUser?.role
  const [tab, setTab] = useState(0)

  // URL search param state
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

  const createdFrom = searchParams.get("createdFrom") ?? ""
  const createdTo = searchParams.get("createdTo") ?? ""
  const page = parseInt(searchParams.get("page") ?? "1", 10) || 1
  const rawPageSize = searchParams.get("pageSize") ?? "20"
  const isAllPageSize = rawPageSize === "all"
  const pageSize = isAllPageSize ? ALL_PAGE_SIZE : parseInt(rawPageSize, 10) || 20
  const sort = searchParams.get("sort") ?? "name:asc"

  const queryParams = useMemo(() => {
    const p = { page, pageSize, sort }
    if (urlSearch) p.search = urlSearch
    if (createdFrom) p.createdFrom = createdFrom
    if (createdTo) p.createdTo = createdTo
    return p
  }, [page, pageSize, sort, urlSearch, createdFrom, createdTo])

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

  // Department data
  const [departments, setDepartments] = useState([])
  const [total, setTotal] = useState(0)
  const [deptLoading, setDeptLoading] = useState(true)

  // Create department modal
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({ name: "", maxEmployees: "" })
  const [creating, setCreating] = useState(false)

  // Edit department modal
  const [editTarget, setEditTarget] = useState(null)
  const [editForm, setEditForm] = useState({ name: "", maxEmployees: "" })
  const [editing, setEditing] = useState(false)

  // Users
  const [users, setUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [userSearch, setUserSearch] = useState("")

  // Users table state
  const [userSort, setUserSort] = useState("name:asc")
  const [userPage, setUserPage] = useState(1)
  const [userPageSize, setUserPageSize] = useState(20)
  const [userRoleFilter, setUserRoleFilter] = useState("")
  const [userVisibleColumns, setUserVisibleColumns] = useState(USER_COLUMNS.map((c) => c.key))

  // Department filter (Departments tab)
  const [deptFilter, setDeptFilter] = useState("all")

  const DEFAULT_DEPTS = ["Sales", "CRM", "Marketing", "Support"]

  // Current user's department names
  const myDeptNames = useMemo(() => {
    const fromRelation = (currentUser?.departments || []).map((ud) => ud.department?.name).filter(Boolean)
    if (fromRelation.length > 0) return fromRelation
    if (currentUser?.dept) return currentUser.dept.split(",").map((s) => s.trim()).filter(Boolean)
    return []
  }, [currentUser])

  // Change dept modal
  const [changeDeptUser, setChangeDeptUser] = useState(null)
  const [changeDeptNames, setChangeDeptNames] = useState([])
  const [savingChange, setSavingChange] = useState(false)

  // Invite modal
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteForm, setInviteForm] = useState({ name: "", email: "", role: "AGENT", dept: [] })
  const [sendingInvite, setSendingInvite] = useState(false)

  const loadDepartments = useCallback(async () => {
    setDeptLoading(true)
    try {
      const res = await api.get("/departments", { params: queryParams })
      const data = res?.data ?? res ?? {}
      const items = data.items ?? []
      setDepartments(items)
      setTotal(data.total ?? items.length)
    } catch (err) {
      toast.error(err?.message || "Failed to load departments")
    } finally {
      setDeptLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(queryParams)])

  // Build user-count map from already-loaded users — counts via BOTH the
  // UserDepartment relation AND the legacy dept string, deduplicated.
  const userCountMap = useMemo(() => {
    const map = {}
    users.forEach((u) => {
      const deptIds = new Set()
      ;(u.departments || []).forEach((ud) => {
        const deptId = ud.department?.id || ud.departmentId
        if (deptId) deptIds.add(deptId)
      })
      if (u.dept) {
        const names = u.dept.split(",").map((s) => s.trim()).filter(Boolean)
        departments.forEach((d) => {
          if (names.includes(d.name)) deptIds.add(d.id)
        })
      }
      deptIds.forEach((id) => { map[id] = (map[id] || 0) + 1 })
    })
    return map
  }, [users, departments])

  // Enrich departments with user count & apply deptFilter
  const enrichedDepartments = useMemo(() => {
    let list = departments.map((d) => ({
      ...d,
      // Prefer local map (includes legacy dept-string users) over backend _count
      userCount: userCountMap[d.id] ?? d.userCount ?? 0
    }))
    if (deptFilter !== "all") {
      list = list.filter((d) => {
        const isDefault = DEFAULT_DEPTS.includes(d.name)
        return deptFilter === "my" ? !isDefault : isDefault
      })
    }
    return list
  }, [departments, userCountMap, deptFilter, myDeptNames])

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
    const name = createForm.name.trim()
    const maxEmployees = createForm.maxEmployees.trim()
    if (!name) { toast.error("Department name is required"); return }
    if (!maxEmployees || parseInt(maxEmployees, 10) < 1) { toast.error("Max employees must be at least 1"); return }
    setCreating(true)
    try {
      await api.post("/departments", { name, maxEmployees: parseInt(maxEmployees, 10) })
      toast.success(`Department "${name}" created`)
      setCreateOpen(false)
      setCreateForm({ name: "", maxEmployees: "" })
      loadDepartments()
    } catch (err) {
      toast.error(err?.message || "Failed to create department")
    } finally {
      setCreating(false)
    }
  }

  const openEdit = (dept) => {
    setEditTarget(dept)
    setEditForm({ name: dept.name, maxEmployees: String(dept.maxEmployees) })
  }

  const handleEdit = async () => {
    const name = editForm.name.trim()
    const maxEmployees = editForm.maxEmployees.trim()
    if (!name) { toast.error("Department name is required"); return }
    if (!maxEmployees || parseInt(maxEmployees, 10) < 1) { toast.error("Max employees must be at least 1"); return }
    setEditing(true)
    try {
      await api.patch(`/departments/${editTarget.id}`, { name, maxEmployees: parseInt(maxEmployees, 10) })
      toast.success("Department updated")
      setEditTarget(null)
      loadDepartments()
    } catch (err) {
      toast.error(err?.message || "Failed to update department")
    } finally {
      setEditing(false)
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

  const handleUserDeptChange = async (userId, deptNames) => {
    try {
      await api.patch(`/users/${userId}`, { dept: deptNames.join(", ") })
      loadUsers()
      toast.success("User departments updated")
    } catch (err) {
      toast.error(err?.message || "Failed to update user departments")
    }
  }

  const handleInvite = async () => {
    const { name, email, role, dept } = inviteForm
    if (!email.trim()) { toast.error("Email is required"); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { toast.error("Enter a valid email"); return }
    setSendingInvite(true)
    try {
      const res = await api.post("/users/invite", { name: name.trim() || undefined, email, role, dept: dept?.join(", ") })
      const data = res?.data?.data ?? res?.data ?? res
      if (data?.inviteLink && navigator.clipboard) {
        try { await navigator.clipboard.writeText(data.inviteLink) } catch {}
      }
      toast.success(`Invitation sent to ${email}`)
      setInviteOpen(false)
      setInviteForm({ name: "", email: "", role: "AGENT", dept: [] })
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

  const processedUsers = useMemo(() => {
    let result = [...filteredUsers]
    if (userRoleFilter) result = result.filter((u) => u.role === userRoleFilter)
    const [field, dir] = userSort.split(":")
    result.sort((a, b) => {
      let aVal, bVal
      if (field === "name") { aVal = (a.name || "").toLowerCase(); bVal = (b.name || "").toLowerCase() }
      else if (field === "email") { aVal = (a.email || "").toLowerCase(); bVal = (b.email || "").toLowerCase() }
      else if (field === "role") { aVal = a.role || ""; bVal = b.role || "" }
      else if (field === "createdAt") { aVal = a.createdAt || ""; bVal = b.createdAt || "" }
      else aVal = a[field] || ""; bVal = b[field] || ""
      return dir === "asc" ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal))
    })
    return result
  }, [filteredUsers, userRoleFilter, userSort])

  const userTotalPages = Math.max(1, Math.ceil(processedUsers.length / userPageSize))
  const userCurPage = Math.min(userPage, userTotalPages)
  const userStartRow = processedUsers.length === 0 ? 0 : (userCurPage - 1) * userPageSize + 1
  const userEndRow = Math.min(userCurPage * userPageSize, processedUsers.length)
  const paginatedUsers = processedUsers.slice((userCurPage - 1) * userPageSize, userCurPage * userPageSize)
  const userPaginationItems = buildPaginationItems(userCurPage, userTotalPages)

  // Column visibility
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

  const toggleAllColumns = () => {
    const allKeys = COLUMNS_CONFIG.map((c) => c.key)
    const allVisible = allKeys.every((k) => visibleColumns.includes(k))
    if (allVisible) {
      updateParams({ columns: allKeys[0] })
    } else {
      updateParams({ columns: allKeys.join(",") || null })
    }
  }

  // Filter chips
  const chips = []
  if (urlSearch)
    chips.push({
      label: `Search: "${urlSearch}"`,
      clear: () => { setSearchInput(""); updateParams({ search: null, page: null }) },
    })
  if (deptFilter !== "all") {
    chips.push({
      label: `Dept: ${deptFilter === "my" ? "My Creation" : "Others"}`,
      clear: () => setDeptFilter("all"),
    })
  }
  if (createdFrom || createdTo) {
    const rangeLabel = createdFrom && createdTo
      ? createdFrom === createdTo ? createdFrom : `${createdFrom} → ${createdTo}`
      : createdFrom ? `From ${createdFrom}` : `Until ${createdTo}`
    chips.push({
      label: `Date: ${rangeLabel}`,
      clear: () => updateParams({ createdFrom: null, createdTo: null, page: null }),
    })
  }
  const hasFilters = chips.length > 0
  const clearAllFilters = () => {
    setSearchInput("")
    setDeptFilter("all")
    updateParams({ search: null, createdFrom: null, createdTo: null, page: null })
  }

  // Pagination
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const curPage = Math.min(page, totalPages)
  const startRow = total === 0 ? 0 : (curPage - 1) * pageSize + 1
  const endRow = Math.min(curPage * pageSize, total)
  const paginationItems = buildPaginationItems(curPage, totalPages)

  return (
    <>
      <div className="content-head">
        <div>
          <h1>Department Management</h1>
          <p>Manage departments, assign users, and invite new team members.</p>
        </div>
        {role === "OWNER" && (
          <button className="btn btn-primary" onClick={() => setInviteOpen(true)}>
            <UserPlus size={16} /> Invite Staff
          </button>
        )}
      </div>

      <div className="tabs">
        {["Departments", "Manage Users"].map((t, i) => (
          <button key={t} type="button" className={`tab ${tab === i ? "active" : ""}`} onClick={() => setTab(i)}>
            {t}
          </button>
        ))}
      </div>

      {tab === 0 && (
        <div className="table-wrap">
          <div className="table-toolbar">
            <div className="topbar-search">
              <Search size={16} />
              <input
                value={searchInput}
                placeholder="Search departments…"
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
                        Department
                      </label>
                      <select
                        className="select"
                        style={{ fontSize: "0.8rem", padding: "5px 8px", marginTop: 4, width: "100%" }}
                        value={deptFilter}
                        onChange={(e) => setDeptFilter(e.target.value)}
                      >
                        <option value="all">All Depts</option>
                        <option value="my">My Creation</option>
                        <option value="other">Others</option>
                      </select>
                    </div>
                    <div>
                      <label className="label" style={{ fontSize: "0.75rem", marginBottom: 2, display: "block" }}>
                        Date created
                      </label>
                      <div className="row" style={{ gap: 4, marginTop: 4 }}>
                        <input
                          type="date"
                          className="input"
                          style={{ fontSize: "0.75rem", padding: "4px 6px" }}
                          aria-label="From date"
                          value={createdFrom}
                          max={createdTo || undefined}
                          onChange={(e) => updateParams({ createdFrom: e.target.value || null, page: null })}
                        />
                        <input
                          type="date"
                          className="input"
                          style={{ fontSize: "0.75rem", padding: "4px 6px" }}
                          aria-label="To date"
                          value={createdTo}
                          min={createdFrom || undefined}
                          onChange={(e) => updateParams({ createdTo: e.target.value || null, page: null })}
                        />
                      </div>
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
                    <label
                      className="column-option"
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "7px 10px", borderRadius: "var(--lp-radius-input)",
                        cursor: "pointer", fontSize: "0.867rem",
                        borderBottom: "1px solid var(--lp-border)", marginBottom: 4,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={COLUMNS_CONFIG.every((c) => visibleColumns.includes(c.key))}
                        onChange={toggleAllColumns}
                        style={{ accentColor: "var(--lp-accent)", width: 15, height: 15 }}
                      />
                      <ListChecks size={15} style={{ color: "var(--lp-text-muted)", flexShrink: 0 }} />
                      Select All
                    </label>
                    {COLUMNS_CONFIG.map((col) => (
                      <label
                        key={col.key}
                        className="column-option"
                        style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "7px 10px", borderRadius: "var(--lp-radius-input)",
                          cursor: "pointer", fontSize: "0.867rem",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={visibleColumns.includes(col.key)}
                          onChange={() => toggleColumn(col.key)}
                          style={{ accentColor: "var(--lp-accent)", width: 15, height: 15 }}
                        />
                        <col.icon size={15} style={{ color: "var(--lp-text-muted)", flexShrink: 0 }} />
                        {col.label}
                      </label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              {hasFilters && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={clearAllFilters}>
                  Clear
                </button>
              )}
              {role === "OWNER" && (
                <button type="button" className="btn btn-sm btn-primary" onClick={() => setCreateOpen(true)}>
                  <Plus size={14} /> Create Dept
                </button>
              )}
            </div>
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
            {deptLoading ? (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--lp-text-muted)", fontSize: "0.933rem" }}>
                Loading departments…
              </div>
            ) : enrichedDepartments.length === 0 ? (
              <div className="empty-state">
                <Building size={28} />
                <h3>{hasFilters ? "No departments match" : "No departments yet"}</h3>
                <p>{hasFilters ? "Try clearing some filters." : "Create your first department."}</p>
              </div>
            ) : (
              <table className="data">
                <thead>
                  <tr>
                    {visibleColumns.includes("name") && (
                      <th style={{ cursor: "pointer" }} onClick={() => onSort("name")}>
                        <span className="row" style={{ gap: 4 }}>
                          Department <SortIcon field="name" sort={sort} />
                        </span>
                      </th>
                    )}
                    {visibleColumns.includes("maxEmployees") && (
                      <th style={{ cursor: "pointer" }} onClick={() => onSort("maxEmployees")}>
                        <span className="row" style={{ gap: 4 }}>
                          Max Employees <SortIcon field="maxEmployees" sort={sort} />
                        </span>
                      </th>
                    )}
                    {visibleColumns.includes("userCount") && <th>Current Count</th>}
                    {visibleColumns.includes("createdAt") && (
                      <th style={{ cursor: "pointer" }} onClick={() => onSort("createdAt")}>
                        <span className="row" style={{ gap: 4 }}>
                          Created <SortIcon field="createdAt" sort={sort} />
                        </span>
                      </th>
                    )}
                    <th className="col-actions" style={{ width: 56, textAlign: "right" }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {enrichedDepartments.map((dept) => (
                    <tr key={dept.id} onClick={() => navigate(`/departments/${dept.id}`)} style={{ cursor: "pointer" }}>
                      {visibleColumns.includes("name") && (
                        <td>
                          <div className="row" style={{ gap: 10 }}>
                            <Building size={16} style={{ color: "var(--lp-accent)", flex: "none" }} />
                            <span style={{ fontWeight: 600 }}>{dept.name}</span>
                          </div>
                        </td>
                      )}
                      {visibleColumns.includes("maxEmployees") && (
                        <td><span>{dept.maxEmployees}</span></td>
                      )}
                      {visibleColumns.includes("userCount") && (
                        <td>
                          <span style={{ color: dept.userCount >= dept.maxEmployees ? "var(--lp-error)" : "inherit" }}>
                            {dept.userCount}
                          </span>
                        </td>
                      )}
                      {visibleColumns.includes("createdAt") && (
                        <td style={{ fontSize: "0.8rem", color: "var(--lp-text-muted)" }}>
                          {fmt.ago(dept.createdAt)}
                        </td>
                      )}
                      <td className="col-actions" style={{ textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button type="button" className="btn-icon btn-ghost" title="Actions" aria-label="Row actions">
                              <MoreHorizontal size={16} />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent align="end" className="row-menu p-0" style={{ width: "auto" }}>
                            <button type="button" className="row-menu-item" onClick={() => navigate(`/departments/${dept.id}`)}>
                              <Eye size={14} /> View
                            </button>
                            {role === "OWNER" && (
                              <>
                                <button type="button" className="row-menu-item" onClick={() => openEdit(dept)}>
                                  <Pencil size={14} /> Edit
                                </button>
                                <div className="row-menu-sep" />
                                <button type="button" className="row-menu-item danger" onClick={() => handleDelete(dept.id, dept.name)}>
                                  <Trash2 size={14} /> Delete
                                </button>
                              </>
                            )}
                          </PopoverContent>
                        </Popover>
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
      )}

      {tab === 1 && (
        <div className="table-wrap">
          <div className="table-toolbar">
            <div className="topbar-search">
              <Search size={16} />
              <input
                value={userSearch}
                placeholder="Search name, email…"
                onChange={(e) => setUserSearch(e.target.value)}
              />
            </div>
            <div className="row" style={{ marginLeft: "auto", gap: 6 }}>
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" className="btn btn-sm btn-secondary">
                    <Filter size={14} /> Filters
                    {userRoleFilter && (
                      <span className="badge badge-muted" style={{ padding: "1px 6px", fontSize: "0.733rem", lineHeight: 1.4 }}>
                        1
                      </span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="min-w-[200px] p-2">
                  <div className="stack" style={{ gap: "4px" }}>
                    <div>
                      <label className="label" style={{ fontSize: "0.75rem", marginBottom: 2, display: "block" }}>
                        Role
                      </label>
                      <select
                        className="select"
                        style={{ fontSize: "0.8rem", padding: "5px 8px" }}
                        value={userRoleFilter}
                        onChange={(e) => { setUserRoleFilter(e.target.value); setUserPage(1) }}
                      >
                        <option value="">All Roles</option>
                        {STAFF_ROLES.map((r) => (
                          <option key={r} value={r}>{roleLabel(r)}</option>
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
                        checked={USER_COLUMNS.every((c) => userVisibleColumns.includes(c.key))}
                        onChange={() => {
                          const allKeys = USER_COLUMNS.map((c) => c.key)
                          const allVisible = allKeys.every((k) => userVisibleColumns.includes(k))
                          setUserVisibleColumns(allVisible ? [allKeys[0]] : [...allKeys])
                        }}
                        style={{ accentColor: "var(--lp-accent)", width: 15, height: 15 }} />
                      <ListChecks size={15} style={{ color: "var(--lp-text-muted)", flexShrink: 0 }} />
                      Select All
                    </label>
                    {USER_COLUMNS.map((col) => (
                      <label key={col.key} className="column-option"
                        style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", borderRadius: "var(--lp-radius-input)", cursor: "pointer", fontSize: "0.867rem" }}>
                        <input type="checkbox"
                          checked={userVisibleColumns.includes(col.key)}
                          onChange={() => {
                            const current = new Set(userVisibleColumns)
                            if (current.has(col.key)) {
                              if (current.size <= 1) return
                              current.delete(col.key)
                            } else {
                              current.add(col.key)
                            }
                            setUserVisibleColumns([...current])
                          }}
                          style={{ accentColor: "var(--lp-accent)", width: 15, height: 15 }} />
                        <col.icon size={15} style={{ color: "var(--lp-text-muted)", flexShrink: 0 }} />
                        {col.label}
                      </label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              {userRoleFilter && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setUserRoleFilter(""); setUserPage(1) }}>
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="table-scroll">
            {usersLoading ? (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--lp-text-muted)", fontSize: "0.933rem" }}>
                Loading users…
              </div>
            ) : processedUsers.length === 0 ? (
              <div className="empty-state">
                <Users size={28} />
                <h3>{userSearch || userRoleFilter ? "No staff match" : "No staff yet"}</h3>
                <p>{userSearch || userRoleFilter ? "Try clearing some filters." : "Invite agents or managers to get started."}</p>
              </div>
            ) : (
              <table className="data">
                <thead>
                  <tr>
                    {userVisibleColumns.includes("name") && (
                      <th style={{ cursor: "pointer" }} onClick={() => { const [f, d] = userSort.split(":"); const nd = f === "name" && d === "asc" ? "desc" : "asc"; setUserSort(`name:${nd}`); setUserPage(1) }}>
                        <span className="row" style={{ gap: 4 }}>
                          Name <SortIcon field="name" sort={userSort} />
                        </span>
                      </th>
                    )}
                    {userVisibleColumns.includes("email") && (
                      <th style={{ cursor: "pointer" }} onClick={() => { const [f, d] = userSort.split(":"); const nd = f === "email" && d === "asc" ? "desc" : "asc"; setUserSort(`email:${nd}`); setUserPage(1) }}>
                        <span className="row" style={{ gap: 4 }}>
                          Email <SortIcon field="email" sort={userSort} />
                        </span>
                      </th>
                    )}
                    {userVisibleColumns.includes("role") && (
                      <th style={{ cursor: "pointer" }} onClick={() => { const [f, d] = userSort.split(":"); const nd = f === "role" && d === "asc" ? "desc" : "asc"; setUserSort(`role:${nd}`); setUserPage(1) }}>
                        <span className="row" style={{ gap: 4 }}>
                          Role <SortIcon field="role" sort={userSort} />
                        </span>
                      </th>
                    )}
                    {userVisibleColumns.includes("departments") && (
                      <th>Departments</th>
                    )}
                    {userVisibleColumns.includes("createdAt") && (
                      <th style={{ cursor: "pointer" }} onClick={() => { const [f, d] = userSort.split(":"); const nd = f === "createdAt" && d === "asc" ? "desc" : "asc"; setUserSort(`createdAt:${nd}`); setUserPage(1) }}>
                        <span className="row" style={{ gap: 4 }}>
                          Joined <SortIcon field="createdAt" sort={userSort} />
                        </span>
                      </th>
                    )}
                    <th className="col-actions" style={{ width: 56, textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.map((u) => {
                    let userDeptNames = (u.departments || []).map((ud) => ud.department?.name || ud.departmentName).filter(Boolean)
                    if (userDeptNames.length === 0 && u.dept) {
                      userDeptNames = u.dept.split(",").map((s) => s.trim()).filter(Boolean)
                    }
                    return (
                      <tr key={u.id}>
                        {userVisibleColumns.includes("name") && (
                          <td>
                            <div className="row" style={{ gap: 10 }}>
                              <div className="avatar sm" style={{ fontSize: "0.733rem" }}>
                                {u.image ? (
                                  <img src={u.image} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }} />
                                ) : (
                                  (u.name || "?")[0]?.toUpperCase()
                                )}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: "0.867rem" }}>{u.name}</div>
                              </div>
                            </div>
                          </td>
                        )}
                        {userVisibleColumns.includes("email") && (
                          <td style={{ fontSize: "0.867rem", color: "var(--lp-text-muted)" }}>{u.email}</td>
                        )}
                        {userVisibleColumns.includes("role") && (
                          <td><span className={`badge ${u.role === "MANAGER" ? "badge-warning" : "badge-info"}`}>{roleLabel(u.role)}</span></td>
                        )}
                        {userVisibleColumns.includes("departments") && (
                          <td style={{ fontSize: "0.867rem", color: "var(--lp-text-muted)" }}>
                            {userDeptNames.length > 0 ? userDeptNames.join(", ") : <Dash />}
                          </td>
                        )}
                        {userVisibleColumns.includes("createdAt") && (
                          <td style={{ fontSize: "0.8rem", color: "var(--lp-text-muted)" }}>
                            {u.createdAt ? fmt.date(u.createdAt) : <Dash />}
                          </td>
                        )}
                        <td className="col-actions" style={{ textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                          <Popover>
                            <PopoverTrigger asChild>
                              <button type="button" className="btn-icon btn-ghost" title="Actions" aria-label="Row actions">
                                <MoreHorizontal size={16} />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent align="end" className="row-menu p-0" style={{ width: "auto" }}>
                              <button type="button" className="row-menu-item" onClick={() => {
                                setChangeDeptUser(u)
                                setChangeDeptNames(userDeptNames)
                              }}>
                                <Building size={14} /> Change Dept
                              </button>
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

          {processedUsers.length > 0 && (
            <div className="table-foot">
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--lp-text-muted)", fontSize: "0.867rem" }}>
                <span>
                  Showing <b style={{ color: "var(--lp-text)" }}>{userStartRow}–{userEndRow}</b>{" "}
                  of <b style={{ color: "var(--lp-text)" }}>{processedUsers.length.toLocaleString("en-IN")}</b>
                </span>
                <span aria-hidden style={{ opacity: 0.4 }}>·</span>
                <span>
                  Page <b style={{ color: "var(--lp-text)" }}>{userCurPage}</b> of{" "}
                  <b style={{ color: "var(--lp-text)" }}>{userTotalPages}</b>
                </span>
              </div>
              <div className="row" style={{ gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.867rem", color: "var(--lp-text-muted)" }}>
                  Rows
                  <select
                    className="select"
                    style={{ width: "auto", paddingRight: 24 }}
                    value={userPageSize === 1000 ? "all" : userPageSize}
                    onChange={(e) => { setUserPageSize(e.target.value === "all" ? 1000 : parseInt(e.target.value, 10)); setUserPage(1) }}
                    aria-label="Rows per page"
                  >
                    {PAGE_SIZE_OPTIONS.map((n) => {
                      const value = n === "All" ? "all" : String(n)
                      return <option key={value} value={value}>{n}</option>
                    })}
                  </select>
                </label>
                <div className="pagination" role="navigation" aria-label="Pagination">
                  <button type="button" onClick={() => setUserPage(1)} disabled={userCurPage === 1} aria-label="First page" title="First page">
                    <ChevronsLeft size={14} />
                  </button>
                  <button type="button" onClick={() => setUserPage(userCurPage - 1)} disabled={userCurPage === 1} aria-label="Previous page" title="Previous page">
                    <ChevronLeft size={14} />
                  </button>
                  {userPaginationItems.map((item, idx) =>
                    item === "…" ? (
                      <span key={`ellipsis-${idx}`} aria-hidden
                        style={{ width: 32, height: 32, display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--lp-text-muted)", fontWeight: 600, userSelect: "none" }}>
                        …
                      </span>
                    ) : (
                      <button key={item} type="button" className={item === userCurPage ? "active" : ""}
                        onClick={() => setUserPage(item)}
                        aria-current={item === userCurPage ? "page" : undefined} aria-label={`Page ${item}`}>
                        {item}
                      </button>
                    ),
                  )}
                  <button type="button" onClick={() => setUserPage(userCurPage + 1)} disabled={userCurPage === userTotalPages} aria-label="Next page" title="Next page">
                    <ChevronRight size={14} />
                  </button>
                  <button type="button" onClick={() => setUserPage(userTotalPages)} disabled={userCurPage === userTotalPages} aria-label="Last page" title="Last page">
                    <ChevronsRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Change Department Modal */}
      {changeDeptUser && (
        <div className="modal-backdrop" onClick={() => setChangeDeptUser(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Change Department — {changeDeptUser.name}</h3>
              <button type="button" className="btn-icon btn-ghost" onClick={() => setChangeDeptUser(null)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <MultiDepartmentSelect
                value={changeDeptNames}
                onChange={setChangeDeptNames}
              />
            </div>
            <div className="modal-foot">
              <button type="button" className="btn btn-secondary" onClick={() => setChangeDeptUser(null)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={async () => {
                setSavingChange(true)
                await handleUserDeptChange(changeDeptUser.id, changeDeptNames)
                setSavingChange(false)
                setChangeDeptUser(null)
              }} disabled={savingChange}>
                {savingChange ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Department Modal */}
      {createOpen && (
        <div className="modal-backdrop" onClick={() => setCreateOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Create Department</h3>
              <button type="button" className="btn-icon btn-ghost" onClick={() => setCreateOpen(false)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="field">
                <label>Department Name <span className="req">*</span></label>
                <input
                  className="input"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="e.g. Sales North"
                  autoFocus
                />
              </div>
              <div className="field">
                <label>Max Employees <span className="req">*</span></label>
                <input
                  className="input"
                  type="number"
                  min="1"
                  value={createForm.maxEmployees}
                  onChange={(e) => setCreateForm({ ...createForm, maxEmployees: e.target.value })}
                  placeholder="e.g. 10"
                />
              </div>
            </div>
            <div className="modal-foot">
              <button type="button" className="btn btn-secondary" onClick={() => setCreateOpen(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={handleCreate} disabled={creating}>
                {creating ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Department Modal */}
      {editTarget && (
        <div className="modal-backdrop" onClick={() => setEditTarget(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Edit Department</h3>
              <button type="button" className="btn-icon btn-ghost" onClick={() => setEditTarget(null)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="field">
                <label>Department Name <span className="req">*</span></label>
                <input
                  className="input"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="e.g. Sales North"
                  autoFocus
                />
              </div>
              <div className="field">
                <label>Max Employees <span className="req">*</span></label>
                <input
                  className="input"
                  type="number"
                  min="1"
                  value={editForm.maxEmployees}
                  onChange={(e) => setEditForm({ ...editForm, maxEmployees: e.target.value })}
                  placeholder="e.g. 10"
                />
              </div>
            </div>
            <div className="modal-foot">
              <button type="button" className="btn btn-secondary" onClick={() => setEditTarget(null)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={handleEdit} disabled={editing}>
                {editing ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
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
                  <label>Full name</label>
                  <input
                    className="input"
                    value={inviteForm.name}
                    onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                    placeholder="John Doe"
                  />
                </div>
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
              </div>
              <div className="grid grid-2" style={{ gap: "0 14px" }}>
                <div className="field">
                  <label>Role <span className="req">*</span></label>
                  <select
                    className="select"
                    value={inviteForm.role}
                    onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                  >
                    {(role === "MANAGER" ? ["AGENT"] : STAFF_ROLES).map((r) => (
                      <option key={r} value={r}>{roleLabel(r)}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Department(s)</label>
                  <MultiDepartmentSelect
                    value={inviteForm.dept}
                    onChange={(dept) => setInviteForm({ ...inviteForm, dept })}
                  />
                </div>
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
