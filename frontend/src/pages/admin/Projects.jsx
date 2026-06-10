import { useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import {
  ArrowDown,
  ArrowUp,
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Columns3,
  ListChecks,
  Flag,
  Filter,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { toast } from "sonner"

import ProjectFormDialog from "@/components/projects/ProjectFormDialog"
import { useProjects } from "@/hooks/useProjects"
import { useRowSelection } from "@/hooks/useRowSelection"
import { useAuthStore } from "@/stores/authStore"
import { usePlan, dispatchPlanLimitFE } from "@/hooks/usePlan"
import { ROLES } from "@/utils/constants"
import { fmt } from "@/lib/format"
import { PROJECT_TYPES } from "@/lib/constants"

function SortIcon({ field, sort }) {
  const [curField, curDir] = (sort || "").split(":")
  if (curField !== field) return <ChevronsUpDown size={12} />
  return curDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />
}

const COLUMNS_CONFIG = [
  { key: "name", label: "Name", icon: Flag },
  { key: "location", label: "Location", icon: Flag },
  { key: "type", label: "Type", icon: Flag },
  { key: "priceRange", label: "Price Range", icon: Flag },
  { key: "possessionDate", label: "Possession", icon: Calendar },
  { key: "createdAt", label: "Created", icon: Calendar },
]

const PROJECT_TYPE_LABELS = {
  RESIDENTIAL: "Residential",
  COMMERCIAL: "Commercial",
  PLOT: "Plot",
  VILLA: "Villa",
  MIXED: "Mixed",
}

const TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  ...PROJECT_TYPES.map((t) => ({ value: t.value, label: t.label })),
]

const CAN_MANAGE = [ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER]
const CAN_DELETE = [ROLES.OWNER, ROLES.ADMIN]

export default function Projects() {
  const [searchParams, setSearchParams] = useSearchParams()
  const user = useAuthStore((s) => s.user)
  const userRole = user?.role
  const canManage = CAN_MANAGE.includes(userRole)
  const canDelete = CAN_DELETE.includes(userRole)
  const { plan } = usePlan()

  const {
    projects,
    total,
    page: apiPage,
    pageSize: apiPageSize,
    loading,
    fetchProjects,
    createProject,
    updateProject,
    deleteProject,
  } = useProjects()

  const [formOpen, setFormOpen] = useState(false)
  const [editingProject, setEditingProject] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

  // URL params
  const search = searchParams.get("search") ?? ""
  const typeFilter = searchParams.get("type") ?? ""
  const sort = searchParams.get("sort") ?? "createdAt:desc"
  const page = parseInt(searchParams.get("page") ?? "1", 10) || 1
  const rawPageSize = searchParams.get("pageSize") ?? "20"
  const pageSize = parseInt(rawPageSize, 10) || 20

  const [searchInput, setSearchInput] = useState(search)
  useEffect(() => { setSearchInput(search) }, [search])
  useEffect(() => {
    if (searchInput === search) return
    const t = setTimeout(() => {
      updateParams({ search: searchInput || null, page: null })
    }, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput])

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

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const curPage = Math.min(page, totalPages)

  useEffect(() => {
    fetchProjects({
      search: search || undefined,
      type: typeFilter || undefined,
      page: curPage,
      pageSize,
      sort: sort || undefined,
    })
  }, [fetchProjects, search, typeFilter, curPage, pageSize, sort])

  const selection = useRowSelection(projects, (p) => p.id)

  // Columns state
  const columnsParam = searchParams.get("columns") ?? ""
  const visibleColumns = useMemo(() => {
    if (!columnsParam) return COLUMNS_CONFIG.map((c) => c.key)
    return columnsParam.split(",").filter((k) => COLUMNS_CONFIG.some((c) => c.key === k))
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

  const onSort = (field) => {
    const [curField, curDir] = sort.split(":")
    const nextDir = curField === field && curDir === "asc" ? "desc" : "asc"
    updateParams({ sort: `${field}:${nextDir}` })
  }

  const openCreate = useCallback(() => {
    if (
      plan &&
      plan.limits?.projects != null &&
      plan.usage?.projects != null &&
      plan.usage.projects >= plan.limits.projects
    ) {
      dispatchPlanLimitFE({
        resource: "projects",
        current: plan.usage.projects,
        limit: plan.limits.projects,
        planCode: plan.plan,
      })
      return
    }
    setEditingProject(null)
    setFormOpen(true)
  }, [plan])

  const openEdit = useCallback((project) => {
    setEditingProject(project)
    setFormOpen(true)
  }, [])

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    try {
      await deleteProject(deleteTarget.id)
      toast.success("Project deleted")
      setDeleteTarget(null)
      fetchProjects({ search: search || undefined, type: typeFilter || undefined, page: curPage, pageSize, sort: sort || undefined })
    } catch (err) {
      const leadCount = err?.details?.leadCount
      if (leadCount) {
        toast.error(`${leadCount} lead(s) reference this project. Remove or reassign them first.`)
      } else {
        toast.error(err?.message || "Failed to delete project")
      }
    }
  }, [deleteTarget, deleteProject, fetchProjects, search, typeFilter, curPage, pageSize, sort])

  const handleBulkDelete = useCallback(async () => {
    if (selection.count === 0) return
    setIsBulkDeleting(true)
    const ids = selection.ids
    let ok = 0
    let fail = 0
    for (const id of ids) {
      try { await deleteProject(id); ok++ } catch { fail++ }
    }
    setIsBulkDeleting(false)
    setBulkDeleteOpen(false)
    selection.clear()
    fetchProjects({ search: search || undefined, type: typeFilter || undefined, page: curPage, pageSize, sort: sort || undefined })
    if (fail === 0) toast.success(`Deleted ${ok} project${ok > 1 ? "s" : ""}`)
    else if (ok === 0) toast.error("Failed to delete projects")
    else toast.warning(`Deleted ${ok}, failed ${fail}`)
  }, [selection, deleteProject, fetchProjects, search, typeFilter, curPage, pageSize, sort])

  // Filter chips
  const chips = []
  if (search) chips.push({ label: `Search: "${search}"`, clear: () => { setSearchInput(""); updateParams({ search: null, page: null }) } })
  if (typeFilter) {
    const label = TYPE_OPTIONS.find((o) => o.value === typeFilter)?.label || typeFilter
    chips.push({ label: `Type: ${label}`, clear: () => updateParams({ type: null, page: null }) })
  }
  const hasFilters = chips.length > 0

  const clearAllFilters = () => {
    setSearchInput("")
    updateParams({ search: null, type: null, page: null })
  }

  const startRow = total === 0 ? 0 : (curPage - 1) * pageSize + 1
  const endRow = Math.min(curPage * pageSize, total)

  return (
    <>
      <div className="content-head">
        <div>
          <h1>Projects</h1>
          <p>{total} {total === 1 ? "project" : "projects"} in your portfolio.</p>
        </div>
        <div className="row">
          {canManage && (
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              <Plus size={16} /> New Project
            </button>
          )}
        </div>
      </div>

      <div className="table-wrap">
        <div className="table-toolbar">
          <div className="topbar-search">
            <Search size={16} />
            <input value={searchInput} placeholder="Search projects…" onChange={(e) => setSearchInput(e.target.value)} />
          </div>
          <div className="row" style={{ marginLeft: "auto", gap: 6 }}>
            {selection.count > 0 && (
              <span className="row" style={{ gap: 6 }}>
                <span style={{ color: "var(--lp-accent)", fontWeight: 600, fontSize: "0.867rem" }}>{selection.count} selected</span>
                {canDelete && (
                  <button type="button" className="btn btn-sm btn-danger" disabled={isBulkDeleting} onClick={() => setBulkDeleteOpen(true)}>
                    <Trash2 size={14} /> Delete
                  </button>
                )}
                <button type="button" className="btn btn-sm btn-ghost" onClick={selection.clear}>Clear</button>
              </span>
            )}
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
                    <label className="label" style={{ fontSize: "0.75rem", marginBottom: 2, display: "block" }}>Type</label>
                    <select className="select" style={{ fontSize: "0.8rem", padding: "5px 8px" }} value={typeFilter} onChange={(e) => updateParams({ type: e.target.value || null, page: null })}>
                      {TYPE_OPTIONS.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
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
                  <label className="column-option" style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", borderRadius: "var(--lp-radius-input)", cursor: "pointer", fontSize: "0.867rem", borderBottom: "1px solid var(--lp-border)", marginBottom: 4 }}>
                    <input type="checkbox" checked={COLUMNS_CONFIG.every((c) => visibleColumns.includes(c.key))} onChange={toggleAllColumns} style={{ accentColor: "var(--lp-accent)", width: 15, height: 15 }} />
                    <ListChecks size={15} style={{ color: "var(--lp-text-muted)", flexShrink: 0 }} />
                    Select All
                  </label>
                  {COLUMNS_CONFIG.map((col) => (
                    <label key={col.key} className="column-option" style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", borderRadius: "var(--lp-radius-input)", cursor: "pointer", fontSize: "0.867rem" }}>
                      <input type="checkbox" checked={visibleColumns.includes(col.key)} onChange={() => toggleColumn(col.key)} style={{ accentColor: "var(--lp-accent)", width: 15, height: 15 }} />
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
                <button type="button" onClick={c.clear} aria-label={`Remove ${c.label}`} style={{ marginLeft: 4, background: "transparent", border: 0, cursor: "pointer", display: "inline-flex", alignItems: "center", color: "inherit" }}>
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="table-scroll">
          {loading ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--lp-text-muted)", fontSize: "0.933rem" }}>
              Loading projects…
            </div>
          ) : projects.length === 0 ? (
            <div className="empty-state">
              <div className="icon"><Building2 size={28} /></div>
              <h3>{hasFilters ? "No projects match" : "No projects yet"}</h3>
              <p>{hasFilters ? "Try clearing some filters." : "Get started by creating your first project."}</p>
              {canManage && !hasFilters && (
                <button type="button" className="btn btn-primary" onClick={openCreate}>
                  <Plus size={14} /> New Project
                </button>
              )}
            </div>
          ) : (
            <table className="data">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <input type="checkbox" checked={selection.allSelected} ref={(el) => { if (el) el.indeterminate = selection.someSelected }} onChange={(e) => selection.toggleAll(e.target.checked)} aria-label="Select all projects" />
                  </th>
                  {visibleColumns.includes("name") && (
                    <th style={{ cursor: "pointer" }} onClick={() => onSort("name")}>
                      <span className="row" style={{ gap: 4 }}>Name <SortIcon field="name" sort={sort} /></span>
                    </th>
                  )}
                  {visibleColumns.includes("location") && (
                    <th style={{ cursor: "pointer" }} onClick={() => onSort("location")}>
                      <span className="row" style={{ gap: 4 }}>Location <SortIcon field="location" sort={sort} /></span>
                    </th>
                  )}
                  {visibleColumns.includes("type") && (
                    <th style={{ cursor: "pointer" }} onClick={() => onSort("type")}>
                      <span className="row" style={{ gap: 4 }}>Type <SortIcon field="type" sort={sort} /></span>
                    </th>
                  )}
                  {visibleColumns.includes("priceRange") && <th>Price Range</th>}
                  {visibleColumns.includes("possessionDate") && (
                    <th style={{ cursor: "pointer" }} onClick={() => onSort("possessionDate")}>
                      <span className="row" style={{ gap: 4 }}>Possession <SortIcon field="possessionDate" sort={sort} /></span>
                    </th>
                  )}
                  {visibleColumns.includes("createdAt") && (
                    <th style={{ cursor: "pointer" }} onClick={() => onSort("createdAt")}>
                      <span className="row" style={{ gap: 4 }}>Created <SortIcon field="createdAt" sort={sort} /></span>
                    </th>
                  )}
                  {(canManage || canDelete) && (
                    <th className="col-actions" style={{ width: 56, textAlign: "right" }}>Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id} className={selection.isSelected(project.id) ? "selected" : ""}>
                    <td onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selection.isSelected(project.id)} onChange={(e) => selection.toggleRow(project.id, e.target.checked)} aria-label={`Select ${project.name}`} />
                    </td>
                    {visibleColumns.includes("name") && <td style={{ fontWeight: 600 }}>{project.name}</td>}
                    {visibleColumns.includes("location") && <td>{project.location}</td>}
                    {visibleColumns.includes("type") && (
                      <td><span className="badge badge-info">{PROJECT_TYPE_LABELS[project.type] || project.type}</span></td>
                    )}
                    {visibleColumns.includes("priceRange") && <td>{project.priceRange || "—"}</td>}
                    {visibleColumns.includes("possessionDate") && <td>{project.possessionDate ? fmt.date(project.possessionDate) : "—"}</td>}
                    {visibleColumns.includes("createdAt") && (
                      <td style={{ fontSize: "0.8rem", color: "var(--lp-text-muted)" }}>{fmt.ago(project.createdAt)}</td>
                    )}
                    {(canManage || canDelete) && (
                      <td className="col-actions" style={{ textAlign: "right" }}>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button type="button" className="btn-icon btn-ghost" title="Actions" aria-label="Row actions">
                              <MoreHorizontal size={16} />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent align="end" className="row-menu p-0" style={{ width: "auto" }}>
                            {canManage && (
                              <button type="button" className="row-menu-item" onClick={() => openEdit(project)}>
                                <Pencil size={14} /> Edit
                              </button>
                            )}
                            {canDelete && (
                              <>
                                {canManage && <div className="row-menu-sep" />}
                                <button type="button" className="row-menu-item danger" onClick={() => setDeleteTarget(project)}>
                                  <Trash2 size={14} /> Delete
                                </button>
                              </>
                            )}
                          </PopoverContent>
                        </Popover>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {total > 0 && (
          <div className="table-foot">
            <div>
              Page {curPage} of {totalPages} ({startRow}–{endRow} of {total} {total === 1 ? "project" : "projects"})
            </div>
            <div className="pagination">
              <button type="button" onClick={() => updateParams({ page: Math.max(1, curPage - 1) })} disabled={curPage <= 1} aria-label="Previous page">
                <ChevronLeft size={14} />
              </button>
              <button type="button" onClick={() => updateParams({ page: Math.min(totalPages, curPage + 1) })} disabled={curPage >= totalPages} aria-label="Next page">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      <ProjectFormDialog
        project={editingProject}
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={() => fetchProjects({ search: search || undefined, type: typeFilter || undefined, page: curPage, pageSize, sort: sort || undefined })}
        createProject={createProject}
        updateProject={updateProject}
      />

      {bulkDeleteOpen && (
        <div className="modal-backdrop" onClick={() => !isBulkDeleting && setBulkDeleteOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Delete {selection.count} project{selection.count > 1 ? "s" : ""}?</h3>
              <button type="button" className="btn-icon btn-ghost" onClick={() => setBulkDeleteOpen(false)} aria-label="Close"><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p className="text-muted text-sm" style={{ marginTop: 0 }}>Projects with leads attached can&apos;t be removed — those will be skipped. This action cannot be undone for the rest.</p>
            </div>
            <div className="modal-foot">
              <button type="button" className="btn btn-secondary" onClick={() => setBulkDeleteOpen(false)} disabled={isBulkDeleting}>Cancel</button>
              <button type="button" className="btn btn-danger" onClick={handleBulkDelete} disabled={isBulkDeleting}>{isBulkDeleting ? "Deleting…" : "Delete"}</button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-backdrop" onClick={() => setDeleteTarget(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Delete Project</h3>
              <button type="button" className="btn-icon btn-ghost" onClick={() => setDeleteTarget(null)} aria-label="Close"><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: "0.933rem", color: "var(--lp-text-muted)" }}>
                Are you sure you want to delete <strong style={{ color: "var(--lp-text)" }}>{deleteTarget.name}</strong>? This action cannot be undone.
              </p>
            </div>
            <div className="modal-foot">
              <button type="button" className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button type="button" className="btn btn-danger" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
