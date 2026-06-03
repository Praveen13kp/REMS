import { useEffect, useState, useCallback } from "react"
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Building2,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
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

// Leadpro-styled restyle. Keeps useProjects hook + ProjectFormDialog wiring.

const PROJECT_TYPE_LABELS = {
  RESIDENTIAL: "Residential",
  COMMERCIAL: "Commercial",
  PLOT: "Plot",
  VILLA: "Villa",
  MIXED: "Mixed",
}

const TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "RESIDENTIAL", label: "Residential" },
  { value: "COMMERCIAL", label: "Commercial" },
  { value: "PLOT", label: "Plot" },
  { value: "VILLA", label: "Villa" },
  { value: "MIXED", label: "Mixed" },
]

const CAN_MANAGE = [ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER]
const CAN_DELETE = [ROLES.OWNER, ROLES.ADMIN]

export default function Projects() {
  const user = useAuthStore((s) => s.user)
  const userRole = user?.role
  const canManage = CAN_MANAGE.includes(userRole)
  const canDelete = CAN_DELETE.includes(userRole)
  const { plan } = usePlan()

  const {
    projects,
    total,
    page,
    pageSize,
    loading,
    fetchProjects,
    createProject,
    updateProject,
    deleteProject,
  } = useProjects()

  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [editingProject, setEditingProject] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

  const selection = useRowSelection(projects, (p) => p.id)

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  useEffect(() => {
    fetchProjects({
      search,
      type: typeFilter || undefined,
      page: currentPage,
      pageSize,
    })
  }, [fetchProjects, search, typeFilter, currentPage, pageSize])

  const handleSearch = useCallback((e) => {
    setSearch(e.target.value)
    setCurrentPage(1)
  }, [])

  const handleTypeFilter = useCallback((e) => {
    setTypeFilter(e.target.value)
    setCurrentPage(1)
  }, [])

  const openCreate = useCallback(() => {
    // Pre-flight plan check before opening the create modal. Same logic
    // as the BE gate in project.controller.js so users see the upgrade
    // prompt the moment they click New Project, instead of after submit.
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
      fetchProjects({
        search,
        type: typeFilter || undefined,
        page: currentPage,
        pageSize,
      })
    } catch (err) {
      const leadCount = err?.details?.leadCount
      if (leadCount) {
        toast.error(
          `${leadCount} lead(s) reference this project. Remove or reassign them first.`,
        )
      } else {
        toast.error(err?.message || "Failed to delete project")
      }
    }
  }, [
    deleteTarget,
    deleteProject,
    fetchProjects,
    search,
    typeFilter,
    currentPage,
    pageSize,
  ])

  const handleBulkDelete = useCallback(async () => {
    if (selection.count === 0) return
    setIsBulkDeleting(true)
    const ids = selection.ids
    let ok = 0
    let fail = 0
    for (const id of ids) {
      try {
        await deleteProject(id)
        ok++
      } catch {
        fail++
      }
    }
    setIsBulkDeleting(false)
    setBulkDeleteOpen(false)
    selection.clear()
    fetchProjects({
      search,
      type: typeFilter || undefined,
      page: currentPage,
      pageSize,
    })
    if (fail === 0) toast.success(`Deleted ${ok} project${ok > 1 ? "s" : ""}`)
    else if (ok === 0) toast.error("Failed to delete projects")
    else toast.warning(`Deleted ${ok}, failed ${fail}`)
  }, [
    selection,
    deleteProject,
    fetchProjects,
    search,
    typeFilter,
    currentPage,
    pageSize,
  ])

  return (
    <>
      <div className="content-head">
        <div>
          <h1>Projects</h1>
          <p>
            {total} {total === 1 ? "project" : "projects"} in your portfolio.
          </p>
        </div>
        <div className="row">
          {canManage && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={openCreate}
            >
              <Plus size={16} /> New Project
            </button>
          )}
        </div>
      </div>

      <div className="table-wrap">
        <div className="table-toolbar">
          <div className="topbar-search">
            <Search size={16} />
            <input
              value={search}
              placeholder="Search projects…"
              onChange={handleSearch}
            />
          </div>
          <select
            className="select"
            style={{ width: "auto" }}
            value={typeFilter}
            onChange={handleTypeFilter}
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {selection.count > 0 && (
            <div
              style={{
                marginLeft: "auto",
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
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
              {canDelete && (
                <button
                  type="button"
                  className="btn btn-sm btn-danger"
                  disabled={isBulkDeleting}
                  onClick={() => setBulkDeleteOpen(true)}
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
          )}
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
              Loading projects…
            </div>
          ) : projects.length === 0 ? (
            <div className="empty-state">
              <div className="icon">
                <Building2 size={28} />
              </div>
              <h3>No projects yet</h3>
              <p>Get started by creating your first project.</p>
              {canManage && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={openCreate}
                >
                  <Plus size={14} /> New Project
                </button>
              )}
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
                      aria-label="Select all projects"
                    />
                  </th>
                  <th>Name</th>
                  <th>Location</th>
                  <th>Type</th>
                  <th>Price Range</th>
                  <th>Possession</th>
                  {(canManage || canDelete) && (
                    <th
                      className="col-actions"
                      style={{ width: 56, textAlign: "right" }}
                    >
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr
                    key={project.id}
                    className={selection.isSelected(project.id) ? "selected" : ""}
                  >
                    <td onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selection.isSelected(project.id)}
                        onChange={(e) =>
                          selection.toggleRow(project.id, e.target.checked)
                        }
                        aria-label={`Select ${project.name}`}
                      />
                    </td>
                    <td style={{ fontWeight: 600 }}>{project.name}</td>
                    <td>{project.location}</td>
                    <td>
                      <span className="badge badge-info">
                        {PROJECT_TYPE_LABELS[project.type] || project.type}
                      </span>
                    </td>
                    <td>{project.priceRange || "—"}</td>
                    <td>
                      {project.possessionDate
                        ? fmt.date(project.possessionDate)
                        : "—"}
                    </td>
                    {(canManage || canDelete) && (
                      <td className="col-actions" style={{ textAlign: "right" }}>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="btn-icon btn-ghost"
                              title="Actions"
                              aria-label="Row actions"
                            >
                              <MoreHorizontal size={16} />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent
                            align="end"
                            className="row-menu p-0"
                            style={{ width: "auto" }}
                          >
                            {canManage && (
                              <button
                                type="button"
                                className="row-menu-item"
                                onClick={() => openEdit(project)}
                              >
                                <Pencil size={14} /> Edit
                              </button>
                            )}
                            {canDelete && (
                              <>
                                {canManage && <div className="row-menu-sep" />}
                                <button
                                  type="button"
                                  className="row-menu-item danger"
                                  onClick={() => setDeleteTarget(project)}
                                >
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
              Page {page} of {totalPages} ({total}{" "}
              {total === 1 ? "project" : "projects"})
            </div>
            <div className="pagination">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                aria-label="Previous page"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => p + 1)}
                disabled={currentPage >= totalPages}
                aria-label="Next page"
              >
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
        onSuccess={() =>
          fetchProjects({
            search,
            type: typeFilter || undefined,
            page: currentPage,
            pageSize,
          })
        }
        createProject={createProject}
        updateProject={updateProject}
      />

      {bulkDeleteOpen && (
        <div
          className="modal-backdrop"
          onClick={() => !isBulkDeleting && setBulkDeleteOpen(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>
                Delete {selection.count} project
                {selection.count > 1 ? "s" : ""}?
              </h3>
              <button
                type="button"
                className="btn-icon btn-ghost"
                onClick={() => setBulkDeleteOpen(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p className="text-muted text-sm" style={{ marginTop: 0 }}>
                Projects with leads attached can&apos;t be removed — those will
                be skipped. This action cannot be undone for the rest.
              </p>
            </div>
            <div className="modal-foot">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setBulkDeleteOpen(false)}
                disabled={isBulkDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleBulkDelete}
                disabled={isBulkDeleting}
              >
                {isBulkDeleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div
          className="modal-backdrop"
          onClick={() => setDeleteTarget(null)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Delete Project</h3>
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
                  fontSize: "0.933rem",
                  color: "var(--lp-text-muted)",
                }}
              >
                Are you sure you want to delete{" "}
                <strong style={{ color: "var(--lp-text)" }}>
                  {deleteTarget.name}
                </strong>
                ? This action cannot be undone.
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
