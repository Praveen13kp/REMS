import { useEffect, useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  ChevronsUpDownIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  UsersIcon,
  XIcon,
} from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { LEAD_SOURCES, LEAD_STATUSES, LEAD_STATUS_VALUES } from "@/lib/constants"
import { fmt } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useLeads } from "@/hooks/useLeads"
import { useAuthStore } from "@/stores/authStore"

import PageHeader from "@/components/common/PageHeader"
import EmptyState from "@/components/common/EmptyState"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

const PAGE_SIZE_OPTIONS = [10, 25, 50]
const ALL = "__all__"

const STATUS_META = Object.fromEntries(LEAD_STATUSES.map((s) => [s.value, s]))

function StatusBadge({ status }) {
  const meta = STATUS_META[status]
  if (!meta) {
    return <Badge variant="outline">{status || "—"}</Badge>
  }
  return (
    <Badge variant={meta.variant} className={meta.className}>
      {status}
    </Badge>
  )
}

function SortHeader({ label, field, currentSort, onSort, className }) {
  const [sortField, sortDir] = currentSort.split(":")
  const isActive = sortField === field
  const Icon = !isActive
    ? ChevronsUpDownIcon
    : sortDir === "asc"
      ? ArrowUpIcon
      : ArrowDownIcon
  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onSort(field)}
        className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
      >
        {label}
        <Icon className="size-3" />
      </button>
    </TableHead>
  )
}

export default function Leads() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const currentUser = useAuthStore((s) => s.user)

  // Debounced search input — typing updates the local field immediately,
  // URL `search` param syncs after 300ms so the BE call doesn't fire on
  // every keystroke.
  const urlSearch = searchParams.get("search") ?? ""
  const [searchInput, setSearchInput] = useState(urlSearch)
  useEffect(() => {
    setSearchInput(urlSearch)
  }, [urlSearch])

  useEffect(() => {
    if (searchInput === urlSearch) return
    const t = setTimeout(() => {
      updateParams({ search: searchInput || null, page: null })
    }, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput])

  const tab = searchParams.get("tab") ?? "all"
  const status = searchParams.get("status") ?? ""
  const source = searchParams.get("source") ?? ""
  const assignedToId = searchParams.get("assignedToId") ?? ""
  const interestedProjectId = searchParams.get("interestedProjectId") ?? ""
  const page = parseInt(searchParams.get("page") ?? "1", 10) || 1
  const pageSize =
    parseInt(searchParams.get("pageSize") ?? "20", 10) || 20
  const sort = searchParams.get("sort") ?? "createdAt:desc"

  // "Mine" tab pins assignedToId to current user; "all" leaves it free.
  const effectiveAssignedToId =
    tab === "mine" && currentUser?.id ? currentUser.id : assignedToId

  const queryParams = useMemo(() => {
    const p = { page, pageSize, sort }
    if (urlSearch) p.search = urlSearch
    if (status) p.status = status
    if (source) p.source = source
    if (effectiveAssignedToId) p.assignedToId = effectiveAssignedToId
    if (interestedProjectId) p.interestedProjectId = interestedProjectId
    return p
  }, [
    page,
    pageSize,
    sort,
    urlSearch,
    status,
    source,
    effectiveAssignedToId,
    interestedProjectId,
  ])

  const { items, total, isLoading, refetch } = useLeads(queryParams)

  // Filter dropdown data (users + projects).
  const [users, setUsers] = useState([])
  const [projects, setProjects] = useState([])
  useEffect(() => {
    let cancelled = false
    Promise.all([
      api.get("/users").catch(() => null),
      api.get("/projects", { params: { pageSize: 100 } }).catch(() => null),
    ]).then(([uRes, pRes]) => {
      if (cancelled) return
      const uList =
        uRes?.data?.items ?? uRes?.data ?? uRes?.users ?? uRes ?? []
      setUsers(Array.isArray(uList) ? uList : [])
      const pList = pRes?.data?.items ?? pRes?.data ?? []
      setProjects(Array.isArray(pList) ? pList : [])
    })
    return () => {
      cancelled = true
    }
  }, [])

  // URL-state writer.
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

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const curPage = Math.min(page, totalPages)
  const startRow = total === 0 ? 0 : (curPage - 1) * pageSize + 1
  const endRow = Math.min(curPage * pageSize, total)

  // Bulk selection (page-scoped — selecting "all" selects only visible rows).
  const [selected, setSelected] = useState(new Set())
  useEffect(() => {
    setSelected(new Set())
  }, [urlSearch, status, source, effectiveAssignedToId, interestedProjectId, page, pageSize, sort, tab])

  const toggleRow = (id, on) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })
  }
  const toggleAll = (on) => {
    setSelected(on ? new Set(items.map((l) => l.id)) : new Set())
  }
  const allSelected = items.length > 0 && items.every((l) => selected.has(l.id))

  const [isBulkDeleting, setIsBulkDeleting] = useState(false)
  const bulkDelete = async () => {
    if (selected.size === 0) return
    if (
      !window.confirm(
        `Permanently delete ${selected.size} lead${selected.size > 1 ? "s" : ""}? This cannot be undone.`,
      )
    )
      return
    setIsBulkDeleting(true)
    const ids = [...selected]
    let ok = 0
    let fail = 0
    for (const id of ids) {
      try {
        await api.delete(`/leads/${id}`)
        ok++
      } catch {
        fail++
      }
    }
    setIsBulkDeleting(false)
    setSelected(new Set())
    refetch()
    if (fail === 0) toast.success(`Deleted ${ok} lead${ok > 1 ? "s" : ""}`)
    else if (ok === 0) toast.error(`Failed to delete leads`)
    else toast.warning(`Deleted ${ok}, failed ${fail}`)
  }

  // Active filter chips.
  const chips = []
  if (urlSearch) chips.push({ label: `Search: "${urlSearch}"`, clear: () => { setSearchInput(""); updateParams({ search: null, page: null }) } })
  if (status) chips.push({ label: `Status: ${status}`, clear: () => updateParams({ status: null, page: null }) })
  if (source) chips.push({ label: `Source: ${source}`, clear: () => updateParams({ source: null, page: null }) })
  if (assignedToId) {
    const u = users.find((x) => x.id === assignedToId)
    chips.push({ label: `Assigned: ${u?.name || u?.email || assignedToId}`, clear: () => updateParams({ assignedToId: null, page: null }) })
  }
  if (interestedProjectId) {
    const p = projects.find((x) => x.id === interestedProjectId)
    chips.push({ label: `Project: ${p?.name || interestedProjectId}`, clear: () => updateParams({ interestedProjectId: null, page: null }) })
  }
  const hasFilters = chips.length > 0
  const clearAllFilters = () => {
    setSearchInput("")
    updateParams({
      search: null,
      status: null,
      source: null,
      assignedToId: null,
      interestedProjectId: null,
      page: null,
    })
  }

  return (
    <>
      <PageHeader
        title="Leads"
        description={
          total === 0 && !hasFilters
            ? "No leads yet."
            : `${total} ${total === 1 ? "lead" : "leads"}${hasFilters ? " matching filters" : ""}.`
        }
        actions={
          <Button onClick={() => toast.info("New Lead form lands with S2-FE-B-02")}>
            <PlusIcon className="size-4" /> New Lead
          </Button>
        }
      />

      <div className="flex flex-col gap-4">
        <Tabs
          value={tab}
          onValueChange={(v) => updateParams({ tab: v === "all" ? null : v, page: null })}
        >
          <TabsList>
            <TabsTrigger value="all">All Leads</TabsTrigger>
            <TabsTrigger value="mine" disabled={!currentUser?.id}>
              My Leads
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search name, phone, email…"
              className="pl-8"
            />
          </div>

          <Select
            value={status || ALL}
            onValueChange={(v) => updateParams({ status: v === ALL ? null : v, page: null })}
          >
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {LEAD_STATUS_VALUES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={source || ALL}
            onValueChange={(v) => updateParams({ source: v === ALL ? null : v, page: null })}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All sources</SelectItem>
              {LEAD_SOURCES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={assignedToId || ALL}
            onValueChange={(v) =>
              updateParams({ assignedToId: v === ALL ? null : v, page: null })
            }
            disabled={tab === "mine"}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Assigned to" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Anyone</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name || u.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={interestedProjectId || ALL}
            onValueChange={(v) =>
              updateParams({ interestedProjectId: v === ALL ? null : v, page: null })
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All projects</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters}>
              Clear all
            </Button>
          )}
        </div>

        {hasFilters && (
          <div className="flex flex-wrap items-center gap-1.5">
            {chips.map((c) => (
              <Badge
                key={c.label}
                variant="secondary"
                className="gap-1 pr-1 text-xs"
              >
                {c.label}
                <button
                  type="button"
                  onClick={c.clear}
                  className="ml-0.5 inline-flex size-4 items-center justify-center rounded hover:bg-muted-foreground/20"
                  aria-label={`Remove ${c.label}`}
                >
                  <XIcon className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        {selected.size > 0 && (
          <div className="flex items-center gap-3 rounded-md border border-input bg-muted/30 px-3 py-2 text-sm">
            <span className="font-medium">{selected.size} selected</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => toast.info("Bulk assign lands with S2-BE-B-03")}
            >
              Assign
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={bulkDelete}
              disabled={isBulkDeleting}
            >
              <Trash2Icon className="size-3.5" /> Delete
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto"
              onClick={() => setSelected(new Set())}
            >
              Clear selection
            </Button>
          </div>
        )}

        <div className="overflow-hidden rounded-lg border border-input">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={(v) => toggleAll(!!v)}
                    aria-label="Select all on this page"
                  />
                </TableHead>
                <SortHeader
                  label="Name"
                  field="name"
                  currentSort={sort}
                  onSort={onSort}
                />
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Assigned</TableHead>
                <TableHead>Project</TableHead>
                <SortHeader
                  label="Created"
                  field="createdAt"
                  currentSort={sort}
                  onSort={onSort}
                  className="w-32"
                />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    Loading leads…
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="p-0">
                    <EmptyState
                      title={hasFilters ? "No leads match" : "No leads yet"}
                      description={
                        hasFilters
                          ? "Try clearing some filters."
                          : "Add your first lead to get started."
                      }
                      icon={UsersIcon}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                items.map((l) => {
                  const isSelected = selected.has(l.id)
                  return (
                    <TableRow
                      key={l.id}
                      data-state={isSelected ? "selected" : undefined}
                      className="group"
                    >
                      <TableCell
                        onClick={(e) => e.stopPropagation()}
                        className="w-10"
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(v) => toggleRow(l.id, !!v)}
                          aria-label={`Select ${l.name}`}
                        />
                      </TableCell>
                      <TableCell
                        className="cursor-pointer"
                        onClick={() => navigate(`/leads/${l.id}`)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                            {fmt.initials(l.name || "?")}
                          </span>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">
                              {l.name}
                            </span>
                            {l.email && (
                              <span className="text-xs text-muted-foreground">
                                {l.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{l.phone}</TableCell>
                      <TableCell>
                        <StatusBadge status={l.status} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {l.source || "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {l.assignedTo ? (
                          <span>{l.assignedTo.name || l.assignedTo.email}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Unassigned
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {l.interestedProject ? (
                          l.interestedProject.name
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {fmt.ago(l.createdAt)}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <div className="text-muted-foreground">
              Showing {startRow}–{endRow} of {total}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Rows</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) =>
                    updateParams({ pageSize: v, page: null })
                  }
                >
                  <SelectTrigger className="h-8 w-[72px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="icon-sm"
                  variant="outline"
                  onClick={() => updateParams({ page: 1 })}
                  disabled={curPage === 1}
                  aria-label="First page"
                >
                  <ChevronsLeftIcon className="size-4" />
                </Button>
                <Button
                  size="icon-sm"
                  variant="outline"
                  onClick={() => updateParams({ page: curPage - 1 })}
                  disabled={curPage === 1}
                  aria-label="Previous page"
                >
                  <ChevronLeftIcon className="size-4" />
                </Button>
                <span className="px-2 text-xs text-muted-foreground">
                  {curPage} / {totalPages}
                </span>
                <Button
                  size="icon-sm"
                  variant="outline"
                  onClick={() => updateParams({ page: curPage + 1 })}
                  disabled={curPage === totalPages}
                  aria-label="Next page"
                >
                  <ChevronRightIcon className="size-4" />
                </Button>
                <Button
                  size="icon-sm"
                  variant="outline"
                  onClick={() => updateParams({ page: totalPages })}
                  disabled={curPage === totalPages}
                  aria-label="Last page"
                >
                  <ChevronsRightIcon className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
