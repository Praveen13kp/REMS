import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams, Link } from "react-router-dom"
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Building,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUpDown,
  Columns3,
  Filter,
  ListChecks,
  Mail,
  MoreHorizontal,
  Phone,
  Search,
  Shuffle,
  UserPlus,
  Users,
  X,
} from "lucide-react"
import { Doughnut } from "react-chartjs-2"
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js"
import { toast } from "sonner"

import { Dash } from "@/components/ui/dash"
import { api } from "@/lib/api"
import { fmt, roleLabel } from "@/lib/format"
import KpiCard from "@/components/KpiCard"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

ChartJS.register(ArcElement, Tooltip, Legend)

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
  { key: "name", label: "Name", icon: Users },
  { key: "email", label: "Email", icon: Mail },
  { key: "phone", label: "Phone", icon: Phone },
  { key: "role", label: "Role", icon: Shuffle },
  { key: "otherDepts", label: "Other Departments", icon: Building },
]

function SortIcon({ field, sort }) {
  const [curField, curDir] = sort.split(":")
  if (curField !== field) return <ChevronsUpDown size={12} />
  return curDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />
}

export default function DepartmentDetail() {
  const { id } = useParams()
  const [dept, setDept] = useState(null)
  const [allUsers, setAllUsers] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)

  // Change dept state
  const [changeTarget, setChangeTarget] = useState(null)
  const [changeDraft, setChangeDraft] = useState([])
  const [savingChange, setSavingChange] = useState(false)

  // Search
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  // Role filter
  const [roleFilter, setRoleFilter] = useState("")

  // Sort
  const [sort, setSort] = useState("name:asc")

  // Columns
  const [visibleColumns, setVisibleColumns] = useState(COLUMNS_CONFIG.map((c) => c.key))

  // Pagination
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const loadData = async () => {
    setLoading(true)
    try {
      const [deptRes, userRes] = await Promise.all([
        api.get("/departments", { params: { pageSize: 100 } }),
        api.get("/users", { params: { pageSize: 100 } }),
      ])

      const deptData = deptRes?.data ?? deptRes ?? {}
      const deptList = deptData.items ?? []
      const found = deptList.find((d) => d.id === id)
      if (!found) { toast.error("Department not found"); return }
      setDept(found)
      setDepartments(deptList)

      const userData = userRes?.data?.data ?? userRes?.data ?? userRes?.users ?? []
      const list = Array.isArray(userData) ? userData : []
      const deptUsers = list.filter((u) => {
        if ((u.departments || []).some((ud) => (ud.department?.id || ud.departmentId) === id)) return true
        if (found && u.dept) {
          const names = u.dept.split(",").map((s) => s.trim()).filter(Boolean)
          return names.includes(found.name)
        }
        return false
      })
      setAllUsers(deptUsers)
    } catch (err) {
      toast.error(err?.message || "Failed to load department")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const deptNameById = useMemo(() => {
    const map = {}
    departments.forEach((d) => { map[d.id] = d.name })
    return map
  }, [departments])

  // Role breakdown
  const roleBreakdown = useMemo(() => {
    const agentCount = allUsers.filter((u) => u.role === "AGENT").length
    const managerCount = allUsers.filter((u) => u.role === "MANAGER").length
    return { agentCount, managerCount }
  }, [allUsers])

  const DOUGHNUT_COLORS = ["#F59E0B", "#3B82F6"]

  const roleChart = useMemo(() => ({
    labels: ["Managers", "Agents"],
    datasets: [
      {
        data: [roleBreakdown.managerCount, roleBreakdown.agentCount],
        backgroundColor: DOUGHNUT_COLORS,
        borderWidth: 0,
      },
    ],
  }), [roleBreakdown])

  // Filter + search + sort
  const filteredUsers = useMemo(() => {
    let result = [...allUsers]

    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (u) => (u.name || "").toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q),
      )
    }

    if (roleFilter) {
      result = result.filter((u) => u.role === roleFilter)
    }

    const [field, dir] = sort.split(":")
    result.sort((a, b) => {
      let aVal, bVal
      if (field === "name") { aVal = (a.name || "").toLowerCase(); bVal = (b.name || "").toLowerCase() }
      else if (field === "email") { aVal = (a.email || "").toLowerCase(); bVal = (b.email || "").toLowerCase() }
      else if (field === "role") { aVal = a.role || ""; bVal = b.role || "" }
      else if (field === "phone") { aVal = a.phone || ""; bVal = b.phone || "" }
      else if (field === "otherDepts") {
        aVal = (a.departments || []).filter((ud) => (ud.department?.id || ud.departmentId) !== id).length
        bVal = (b.departments || []).filter((ud) => (ud.department?.id || ud.departmentId) !== id).length
      }
      if (aVal < bVal) return dir === "asc" ? -1 : 1
      if (aVal > bVal) return dir === "asc" ? 1 : -1
      return 0
    })

    return result
  }, [allUsers, search, roleFilter, sort, id])

  // Pagination
  const total = filteredUsers.length
  const effectivePageSize = pageSize === ALL_PAGE_SIZE ? ALL_PAGE_SIZE : pageSize
  const totalPages = Math.max(1, Math.ceil(total / effectivePageSize))
  const curPage = Math.min(page, totalPages)
  const startRow = total === 0 ? 0 : (curPage - 1) * effectivePageSize + 1
  const endRow = Math.min(curPage * effectivePageSize, total)
  const paginatedUsers = filteredUsers.slice((curPage - 1) * effectivePageSize, curPage * effectivePageSize)

  useEffect(() => { setPage(1) }, [search, roleFilter])

  const onSort = (field) => {
    const [curField, curDir] = sort.split(":")
    const nextDir = curField === field && curDir === "asc" ? "desc" : "asc"
    setSort(`${field}:${nextDir}`)
    setPage(1)
  }

  const isAllPageSize = pageSize === ALL_PAGE_SIZE

  // Columns
  const toggleColumn = (key) => {
    setVisibleColumns((prev) => {
      const current = new Set(prev)
      if (current.has(key)) {
        if (current.size <= 1) return prev
        current.delete(key)
      } else {
        current.add(key)
      }
      return [...current]
    })
  }

  const toggleAllColumns = () => {
    const allKeys = COLUMNS_CONFIG.map((c) => c.key)
    const allVisible = allKeys.every((k) => visibleColumns.includes(k))
    setVisibleColumns(allVisible ? allKeys.slice(0, 1) : [...allKeys])
  }

  // Change dept
  const openChangeDept = (u) => {
    const deptIds = (u.departments || [])
      .map((ud) => ud.department?.id || ud.departmentId)
      .filter(Boolean)
    setChangeTarget(u)
    setChangeDraft([...deptIds])
  }

  const toggleDept = (deptId) => {
    setChangeDraft((prev) => {
      const next = new Set(prev)
      if (next.has(deptId)) next.delete(deptId)
      else next.add(deptId)
      return [...next]
    })
  }

  const saveChangeDept = async () => {
    if (!changeTarget) return
    setSavingChange(true)
    try {
      await api.put(`/departments/user/${changeTarget.id}`, { departmentIds: changeDraft })
      toast.success("User departments updated")
      setChangeTarget(null)
      loadData()
    } catch (err) {
      toast.error(err?.message || "Failed to update departments")
    } finally {
      setSavingChange(false)
    }
  }

  // Filter chips
  const chips = []
  if (search) chips.push({ label: `Search: "${search}"`, clear: () => { setSearchInput(""); setSearch("") } })
  if (roleFilter) chips.push({ label: `Role: ${roleLabel(roleFilter)}`, clear: () => setRoleFilter("") })
  const hasFilters = chips.length > 0
  const clearAllFilters = () => { setSearchInput(""); setSearch(""); setRoleFilter("") }

  if (loading) {
    return (
      <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--lp-text-muted)" }}>
        Loading…
      </div>
    )
  }

  if (!dept) {
    return (
      <div className="empty-state">
        <Building size={28} />
        <h3>Department not found</h3>
        <Link to="/departments" className="btn btn-primary">Back to Departments</Link>
      </div>
    )
  }

  const paginationItems = buildPaginationItems(curPage, totalPages)

  return (
    <>
      <div style={{ display: "flex", gap: 24, alignItems: "stretch", marginBottom: 24 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="content-head" style={{ marginBottom: 16 }}>
            <div>
              <Link to="/departments" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.867rem", color: "var(--lp-accent)", textDecoration: "none", marginBottom: 8 }}>
                <ArrowLeft size={14} /> Back to Departments
              </Link>
              <h1 style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Building size={22} style={{ color: "var(--lp-accent)" }} />
                {dept.name}
              </h1>
            </div>
          </div>

          <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", height: "100%" }}>
              <KpiCard
                label="Max Employees"
                value={dept.maxEmployees}
                icon={Users}
                color="purple"
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", height: "100%" }}>
              <KpiCard
                label="Current Members"
                value={allUsers.length}
                icon={UserPlus}
                color={allUsers.length >= dept.maxEmployees ? "red" : "blue"}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", height: "100%" }}>
              <KpiCard
                label="Created"
                value={fmt.date(dept.createdAt)}
                icon={Calendar}
                color="green"
              />
            </div>
          </div>
        </div>

        <div className="kpi" style={{ display: "flex", flexDirection: "column", width: 300, flexShrink: 0, paddingTop: 0 }}>
          <div className="kpi-head" style={{ marginTop: 16 }}>
            <span className="l">Role Breakdown</span>
          </div>
          <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
            {roleBreakdown.managerCount + roleBreakdown.agentCount > 0 ? (
              <Doughnut
                data={roleChart}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: "bottom",
                      labels: {
                        boxWidth: 12,
                        font: { size: 11 },
                      },
                    },
                  },
                  cutout: "62%",
                }}
              />
            ) : (
              <div style={{ display: "grid", placeItems: "center", height: "100%", color: "var(--lp-text-muted)", fontSize: "0.867rem" }}>
                No members yet.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="table-wrap">
        <div className="table-toolbar">
          <div className="topbar-search">
            <Search size={16} />
            <input
              value={searchInput}
              placeholder="Search name, email…"
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
                      Role
                    </label>
                    <select
                      className="select"
                      style={{ fontSize: "0.8rem", padding: "5px 8px" }}
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                    >
                      <option value="">All Roles</option>
                      <option value="MANAGER">Manager</option>
                      <option value="AGENT">Agent</option>
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
                      checked={COLUMNS_CONFIG.every((c) => visibleColumns.includes(c.key))}
                      onChange={toggleAllColumns}
                      style={{ accentColor: "var(--lp-accent)", width: 15, height: 15 }} />
                    <ListChecks size={15} style={{ color: "var(--lp-text-muted)", flexShrink: 0 }} />
                    Select All
                  </label>
                  {COLUMNS_CONFIG.map((col) => (
                    <label key={col.key} className="column-option"
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", borderRadius: "var(--lp-radius-input)", cursor: "pointer", fontSize: "0.867rem" }}>
                      <input type="checkbox"
                        checked={visibleColumns.includes(col.key)}
                        onChange={() => toggleColumn(col.key)}
                        style={{ accentColor: "var(--lp-accent)", width: 15, height: 15 }} />
                      <col.icon size={15} style={{ color: "var(--lp-text-muted)", flexShrink: 0 }} />
                      {col.label}
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            {hasFilters && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={clearAllFilters}>Clear</button>
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
          {paginatedUsers.length === 0 ? (
            <div className="empty-state">
              <Building size={28} />
              <h3>{hasFilters ? "No members match" : "No members yet"}</h3>
              <p>{hasFilters ? "Try clearing some filters." : "Assign agents or managers to this department."}</p>
            </div>
          ) : (
            <table className="data">
              <thead>
                <tr>
                  {visibleColumns.includes("name") && (
                    <th style={{ cursor: "pointer" }} onClick={() => onSort("name")}>
                      <span className="row" style={{ gap: 4 }}>
                        Name <SortIcon field="name" sort={sort} />
                      </span>
                    </th>
                  )}
                  {visibleColumns.includes("email") && (
                    <th style={{ cursor: "pointer" }} onClick={() => onSort("email")}>
                      <span className="row" style={{ gap: 4 }}>
                        Email <SortIcon field="email" sort={sort} />
                      </span>
                    </th>
                  )}
                  {visibleColumns.includes("phone") && (
                    <th style={{ cursor: "pointer" }} onClick={() => onSort("phone")}>
                      <span className="row" style={{ gap: 4 }}>
                        Phone <SortIcon field="phone" sort={sort} />
                      </span>
                    </th>
                  )}
                  {visibleColumns.includes("role") && (
                    <th style={{ cursor: "pointer" }} onClick={() => onSort("role")}>
                      <span className="row" style={{ gap: 4 }}>
                        Role <SortIcon field="role" sort={sort} />
                      </span>
                    </th>
                  )}
                  {visibleColumns.includes("otherDepts") && (
                    <th style={{ cursor: "pointer" }} onClick={() => onSort("otherDepts")}>
                      <span className="row" style={{ gap: 4 }}>
                        Other Departments <SortIcon field="otherDepts" sort={sort} />
                      </span>
                    </th>
                  )}
                  <th className="col-actions" style={{ width: 56, textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((u) => {
                  const otherDepts = (u.departments || [])
                    .map((ud) => ud.department?.id || ud.departmentId)
                    .filter((did) => did !== id)

                  return (
                    <tr key={u.id}>
                      {visibleColumns.includes("name") && (
                        <td>
                          <div className="row" style={{ gap: 10 }}>
                            <div className="avatar sm" style={{ width: 28, height: 28, fontSize: "0.75rem" }}>
                              {u.image ? (
                                <img src={u.image} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }} />
                              ) : (
                                (u.name || "?")[0]?.toUpperCase()
                              )}
                            </div>
                            <span style={{ fontWeight: 600 }}>{u.name}</span>
                          </div>
                        </td>
                      )}
                      {visibleColumns.includes("email") && (
                        <td style={{ fontSize: "0.867rem" }}>{u.email}</td>
                      )}
                      {visibleColumns.includes("phone") && (
                        <td style={{ fontSize: "0.867rem", color: "var(--lp-text-muted)" }}>
                          {u.phone ? fmt.phone(u.phone) : <Dash />}
                        </td>
                      )}
                      {visibleColumns.includes("role") && (
                        <td>
                          <span className={`badge ${u.isActive === false ? "badge-muted" : u.role === "MANAGER" ? "badge-warning" : "badge-info"}`}>
                            {roleLabel(u.role)}
                          </span>
                        </td>
                      )}
                      {visibleColumns.includes("otherDepts") && (
                        <td style={{ fontSize: "0.867rem", color: "var(--lp-text-muted)" }}>
                          {otherDepts.length > 0
                            ? otherDepts.map((did) => deptNameById[did]).filter(Boolean).join(", ")
                            : <Dash />}
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
                            <button type="button" className="row-menu-item" onClick={() => openChangeDept(u)}>
                              <Shuffle size={14} /> Change Dept
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
                <select className="select" style={{ width: "auto", paddingRight: 24 }}
                  value={isAllPageSize ? "all" : pageSize}
                  onChange={(e) => { setPageSize(e.target.value === "all" ? ALL_PAGE_SIZE : parseInt(e.target.value, 10)); setPage(1) }}
                  aria-label="Rows per page">
                  {PAGE_SIZE_OPTIONS.map((n) => {
                    const value = n === "All" ? "all" : String(n)
                    return <option key={value} value={value}>{n}</option>
                  })}
                </select>
              </label>
              <div className="pagination" role="navigation" aria-label="Pagination">
                <button type="button" onClick={() => setPage(1)} disabled={curPage === 1} aria-label="First page"><ChevronsLeft size={14} /></button>
                <button type="button" onClick={() => setPage(curPage - 1)} disabled={curPage === 1} aria-label="Previous page"><ChevronLeft size={14} /></button>
                {paginationItems.map((item, idx) =>
                  item === "…" ? (
                    <span key={`ellipsis-${idx}`} aria-hidden style={{ width: 32, height: 32, display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--lp-text-muted)", fontWeight: 600, userSelect: "none" }}>…</span>
                  ) : (
                    <button key={item} type="button" className={item === curPage ? "active" : ""}
                      onClick={() => setPage(item)} aria-current={item === curPage ? "page" : undefined} aria-label={`Page ${item}`}>{item}</button>
                  ),
                )}
                <button type="button" onClick={() => setPage(curPage + 1)} disabled={curPage === totalPages} aria-label="Next page"><ChevronRight size={14} /></button>
                <button type="button" onClick={() => setPage(totalPages)} disabled={curPage === totalPages} aria-label="Last page"><ChevronsRight size={14} /></button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Change Dept popover — separate portal so it doesn't nest inside the row popover */}
      {changeTarget && (
        <div className="modal-backdrop" onClick={() => !savingChange && setChangeTarget(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 360 }}>
            <div className="modal-head">
              <h3>Change Departments</h3>
              <button type="button" className="btn-icon btn-ghost" onClick={() => setChangeTarget(null)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p className="text-sm text-muted" style={{ marginBottom: 12 }}>
                Select departments for <strong>{changeTarget.name}</strong>
              </p>
              <div className="stack" style={{ gap: "2px" }}>
                <label className="column-option"
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", borderRadius: "var(--lp-radius-input)", cursor: "pointer", fontSize: "0.867rem", borderBottom: "1px solid var(--lp-border)", marginBottom: 4 }}>
                  <input type="checkbox"
                    checked={departments.every((d) => changeDraft.includes(d.id))}
                    onChange={() => {
                      const allIds = departments.map((d) => d.id)
                      const allSelected = allIds.every((did) => changeDraft.includes(did))
                      setChangeDraft(allSelected ? [] : [...allIds])
                    }}
                    style={{ accentColor: "var(--lp-accent)", width: 15, height: 15 }} />
                  <ListChecks size={15} style={{ color: "var(--lp-text-muted)", flexShrink: 0 }} />
                  Select All
                </label>
                {departments.map((d) => (
                  <label key={d.id} className="column-option"
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", borderRadius: "var(--lp-radius-input)", cursor: "pointer", fontSize: "0.867rem" }}>
                    <input type="checkbox"
                      checked={changeDraft.includes(d.id)}
                      onChange={() => toggleDept(d.id)}
                      style={{ accentColor: "var(--lp-accent)", width: 15, height: 15 }} />
                    <Building size={15} style={{ color: "var(--lp-text-muted)", flexShrink: 0 }} />
                    {d.name}
                  </label>
                ))}
              </div>
            </div>
            <div className="modal-foot">
              <button type="button" className="btn btn-secondary" onClick={() => setChangeTarget(null)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={saveChangeDept} disabled={savingChange}>
                {savingChange ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
