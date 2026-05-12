import { useEffect, useState, useCallback } from "react"
import { PlusIcon, SearchIcon, PencilIcon, Trash2Icon, Building2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import PageHeader from "@/components/common/PageHeader"
import ProjectFormDialog from "@/components/projects/ProjectFormDialog"
import { useProjects } from "@/hooks/useProjects"
import { useAuthStore } from "@/stores/authStore"
import { ROLES } from "@/utils/constants"
import { fmt } from "@/lib/format"

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

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  useEffect(() => {
    fetchProjects({ search, type: typeFilter || undefined, page: currentPage, pageSize })
  }, [fetchProjects, search, typeFilter, currentPage, pageSize])

  const handleSearch = useCallback((e) => {
    setSearch(e.target.value)
    setCurrentPage(1)
  }, [])

  const handleTypeFilter = useCallback((value) => {
    setTypeFilter(value)
    setCurrentPage(1)
  }, [])

  const openCreate = useCallback(() => {
    setEditingProject(null)
    setFormOpen(true)
  }, [])

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
      fetchProjects({ search, type: typeFilter || undefined, page: currentPage, pageSize })
    } catch (err) {
      const leadCount = err?.details?.leadCount
      if (leadCount) {
        toast.error(`${leadCount} lead(s) reference this project. Remove or reassign them first.`)
      } else {
        toast.error(err?.message || "Failed to delete project")
      }
    }
  }, [deleteTarget, deleteProject, fetchProjects, search, typeFilter, currentPage, pageSize])

  return (
    <>
      <PageHeader
        title="Projects"
        description="Manage your real estate projects"
        actions={
          canManage ? (
            <Button onClick={openCreate}>
              <PlusIcon />
              New Project
            </Button>
          ) : null
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={search}
            onChange={handleSearch}
            className="pl-8"
          />
        </div>
        <Select value={typeFilter} onValueChange={handleTypeFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
          <Building2 className="mb-4 size-12 text-muted-foreground/50" />
          <h3 className="mb-1 text-lg font-medium text-foreground">No projects yet</h3>
          <p className="mb-4 max-w-sm text-center text-sm text-muted-foreground">
            Get started by creating your first project.
          </p>
          {canManage && (
            <Button onClick={openCreate}>
              <PlusIcon />
              New Project
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Price Range</TableHead>
                  <TableHead>Possession</TableHead>
                  {(canManage || canDelete) && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">{project.name}</TableCell>
                    <TableCell>{project.location}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{PROJECT_TYPE_LABELS[project.type] || project.type}</Badge>
                    </TableCell>
                    <TableCell>{project.priceRange || "-"}</TableCell>
                    <TableCell>
                      {project.possessionDate ? fmt.date(project.possessionDate) : "-"}
                    </TableCell>
                    {(canManage || canDelete) && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canManage && (
                            <Button variant="ghost" size="icon-sm" onClick={() => openEdit(project)}>
                              <PencilIcon className="size-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                          )}
                          {canDelete && (
                            <Button variant="ghost" size="icon-sm" onClick={() => setDeleteTarget(project)}>
                              <Trash2Icon className="size-4" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Page {page} of {totalPages} ({total} project{(total !== 1 ? "s" : "")})
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      <ProjectFormDialog
        project={editingProject}
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={() => fetchProjects({ search, type: typeFilter || undefined, page: currentPage, pageSize })}
        createProject={createProject}
        updateProject={updateProject}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/80">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}