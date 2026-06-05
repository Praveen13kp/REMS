import { useEffect, useMemo, useState } from "react"
import { useNavigate, useOutletContext, useSearchParams } from "react-router-dom"
import {
  CalendarDays,
  KanbanSquare,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  Search,
  Share2,
  Table as TableIcon,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { fmt } from "@/lib/format"
import KanbanBoard from "@/components/leads/KanbanBoard"
import LeadsCalendar from "@/components/leads/LeadsCalendar"
import Pagination from "@/components/common/Pagination"
import AddLeadModal from "@/pages/channelPartner/components/AddLeadModal"
import ShareLeadModal from "@/pages/channelPartner/components/ShareLeadModal"

// Shared component used by both /cp/my-leads (scope=own) and
// /cp/shared (scope=shared). Behaviour switches based on the `scope` prop:
//   - own:     CP-created leads currently sitting under the selected company
//   - shared:  leads the company assigned to this CP
// Add Lead button only shows on the "own" view since shared leads come
// from the company side.

const VISIBILITY_OPTIONS = [
  { value: "FULL", label: "Full Visible" },
  { value: "PARTIAL", label: "Partial" },
  { value: "ANONYMOUS", label: "Anonymous" },
]

export default function LeadsTable({ scope }) {
  const ctx = useOutletContext()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("")
  const [priority, setPriority] = useState("")
  const [source, setSource] = useState("")
  const [visibility, setVisibility] = useState("")
  const [createOpen, setCreateOpen] = useState(params.get("add") === "1")
  const [shareLead, setShareLead] = useState(null)
  const view = params.get("view") === "kanban" || params.get("view") === "calendar"
    ? params.get("view")
    : "table"
  const setView = (v) => {
    if (v === "table") params.delete("view")
    else params.set("view", v)
    setParams(params, { replace: true })
  }

  const reload = () => {
    if (scope !== "private" && !ctx?.activeCompanyId) return
    setLoading(true)
    const p = new URLSearchParams()
    p.set("scope", scope)
    if (scope !== "private" && ctx?.activeCompanyId) p.set("companyId", ctx.activeCompanyId)
    api
      .get(`/channel-partner/leads?${p.toString()}`)
      .then((res) => setLeads(res?.data ?? []))
      .catch((err) => toast.error(err?.message || "Failed to load leads"))
      .finally(() => setLoading(false))
  }
  useEffect(reload, [ctx?.activeCompanyId, scope]) // eslint-disable-line react-hooks/exhaustive-deps

  // Status + Source option lists are derived from whatever the loaded leads
  // actually contain, so the dropdowns never offer a value that can't match
  // (and adapt automatically as new statuses/sources appear).
  const statusOptions = useMemo(
    () => [...new Set(leads.map((l) => l.status).filter(Boolean))].sort(),
    [leads],
  )
  const sourceOptions = useMemo(
    () => [...new Set(leads.map((l) => l.source).filter(Boolean))].sort(),
    [leads],
  )

  const filtered = useMemo(() => {
    let rows = leads
    if (search) {
      const q = search.toLowerCase()
      rows = rows.filter(
        (l) =>
          (l.name || "").toLowerCase().includes(q) ||
          (l.email || "").toLowerCase().includes(q) ||
          (l.phone || "").includes(q),
      )
    }
    if (status) rows = rows.filter((l) => (l.status || "") === status)
    if (priority) rows = rows.filter((l) => (l.priority || "").toLowerCase() === priority.toLowerCase())
    if (source) rows = rows.filter((l) => (l.source || "") === source)
    if (visibility) rows = rows.filter((l) => (l.visibility || "FULL") === visibility)
    return rows
  }, [leads, search, status, priority, source, visibility])

  const hasFilters = !!(search || status || priority || source || visibility)
  const clearFilters = () => {
    setSearch("")
    setStatus("")
    setPriority("")
    setSource("")
    setVisibility("")
  }

  // Client-side pagination over the filtered set (the BE returns a
  // bounded page of leads per company). Reset to page 1 whenever the
  // filters, scope, or underlying data change so we never strand the
  // user on a page that no longer exists.
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  useEffect(() => {
    setPage(1)
  }, [search, status, priority, source, visibility, scope, leads])
  const paged = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize],
  )

  const unshare = async (lead) => {
    if (!ctx?.activeCompanyId) return
    if (!window.confirm("Remove this lead from the current company? Other shares stay intact.")) return
    try {
      await api.post(`/channel-partner/leads/${lead.id}/unshare`, { companyId: ctx.activeCompanyId })
      toast.success("Removed from this company")
      reload()
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || err?.message || "Failed")
    }
  }

  const changeVisibility = async (lead, visibility) => {
    if (!ctx?.activeCompanyId) return
    try {
      await api.patch(`/channel-partner/leads/${lead.id}/visibility`, {
        companyId: ctx.activeCompanyId,
        visibility,
      })
      toast.success("Visibility updated")
      reload()
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || err?.message || "Failed")
    }
  }

  // Kanban / Calendar views reuse the existing shared components. Private
  // scope doesn't have a single companyId so kanban/calendar fall back
  // to no-filter (driver still scopes to companies the CP can read).
  const sharedFilters = ctx?.activeCompanyId && scope !== "private"
    ? { companyId: ctx.activeCompanyId }
    : {}

  return (
    <>
      <div className="cp-page-head">
        <div>
          <h1>
            {scope === "own" ? "My Leads" : scope === "shared" ? "Shared with me" : "Private Leads"}
          </h1>
          <p>
            {scope === "own"
              ? "Leads you've sourced and shared with this company."
              : scope === "shared"
                ? "Leads assigned to you by the selected company."
                : "Leads in your private pool. Share them with a company when ready."}
          </p>
        </div>
        {scope !== "shared" && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setCreateOpen(true)}
            // Private scope doesn't need an active company. "Own" still
            // does (it adds + shares with the currently-selected company).
            disabled={scope === "own" && !ctx?.activeCompany}
          >
            <Plus size={14} /> {scope === "private" ? "Add Private Lead" : "Add Lead"}
          </button>
        )}
      </div>

      <div className="row" style={{ justifyContent: "flex-end", gap: 6, marginBottom: 12 }}>
        <ViewBtn active={view === "table"} onClick={() => setView("table")} icon={TableIcon} label="Table" />
        <ViewBtn active={view === "kanban"} onClick={() => setView("kanban")} icon={KanbanSquare} label="Kanban" />
        <ViewBtn active={view === "calendar"} onClick={() => setView("calendar")} icon={CalendarDays} label="Calendar" />
      </div>

      {view === "kanban" ? (
        <div className="cp-card" style={{ padding: 12 }}>
          <KanbanBoard filters={sharedFilters} />
        </div>
      ) : view === "calendar" ? (
        <div className="cp-card" style={{ padding: 0, overflow: "hidden" }}>
          <LeadsCalendar filters={sharedFilters} />
        </div>
      ) : (
      <div className="cp-table-wrap">
        <div className="cp-table-toolbar">
          <div style={{ position: "relative", flex: 1, maxWidth: 320 }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: 11, color: "var(--lp-text-muted)" }} />
            <input
              className="input"
              placeholder="Search name, phone, email…"
              style={{ paddingLeft: 32 }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="select" style={{ maxWidth: 160 }} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {statusOptions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select className="select" style={{ maxWidth: 150 }} value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="">All priorities</option>
            <option value="Hot">Hot</option>
            <option value="Warm">Warm</option>
            <option value="Cold">Cold</option>
          </select>
          {sourceOptions.length > 0 && (
            <select className="select" style={{ maxWidth: 160 }} value={source} onChange={(e) => setSource(e.target.value)}>
              <option value="">All sources</option>
              {sourceOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          )}
          <select className="select" style={{ maxWidth: 150 }} value={visibility} onChange={(e) => setVisibility(e.target.value)}>
            <option value="">All visibility</option>
            {VISIBILITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {hasFilters && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={clearFilters}>
              Clear
            </button>
          )}
          <div style={{ marginLeft: "auto", fontSize: 12, color: "var(--lp-text-muted)" }}>
            {filtered.length} of {leads.length}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 36, color: "var(--lp-text-muted)", textAlign: "center" }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="cp-empty">
            <div className="icon"><Search size={28} /></div>
            {hasFilters && leads.length > 0 ? (
              <>
                <h3>No leads match your filters</h3>
                <p>Try adjusting or clearing the filters above.</p>
                <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: 12 }} onClick={clearFilters}>
                  Clear filters
                </button>
              </>
            ) : (
              <>
                <h3>No leads to show</h3>
                <p>
                  {scope === "own"
                    ? "Once you add a lead and share it with this company, it appears here."
                    : scope === "shared"
                      ? "When this company shares a lead with you, it will show up here."
                      : "Capture a lead in your private pool, then share it with any of your companies when ready."}
                </p>
              </>
            )}
          </div>
        ) : (
          <table className="cp-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Visibility</th>
                <th>Last Activity</th>
                <th>Quick actions</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {paged.map((l) => (
                <tr key={l.id} onClick={() => navigate(`/cp/leads/${l.id}`)} style={{ cursor: "pointer" }}>
                  <td>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: "var(--lp-surface-2)",
                          display: "grid",
                          placeItems: "center",
                          fontSize: 11,
                          fontWeight: 700,
                          color: "var(--lp-accent)",
                        }}
                      >
                        {initials(l.name)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{l.name}</div>
                        <div className="text-xs text-muted">{l.email || "—"}</div>
                      </div>
                    </div>
                  </td>
                  <td>{fmt.phone(l.phone)}</td>
                  <td>
                    <span className="badge">{l.status}</span>
                  </td>
                  <td>{l.priority ? <span className={priorityClass(l.priority)}>{l.priority}</span> : "—"}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <select
                      className="select"
                      style={{ minWidth: 130, padding: "4px 8px", fontSize: 12 }}
                      value={l.visibility || "FULL"}
                      onChange={(e) => changeVisibility(l, e.target.value)}
                      disabled={scope === "shared"}
                    >
                      {VISIBILITY_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </td>
                  <td>{new Date(l.updatedAt).toLocaleDateString()}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="cp-actions">
                      <a
                        href={`tel:${l.phone}`}
                        className="cp-action-chip"
                        title="Call"
                      >
                        <Phone size={13} />
                      </a>
                      <a
                        href={`https://wa.me/${(l.phone || "").replace(/[^\d]/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="cp-action-chip"
                        title="WhatsApp"
                      >
                        <MessageCircle size={13} />
                      </a>
                      {l.email && (
                        <a
                          href={`mailto:${l.email}`}
                          className="cp-action-chip"
                          title="Email"
                        >
                          <Mail size={13} />
                        </a>
                      )}
                    </div>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    {scope === "private" ? (
                      <button type="button" className="btn btn-sm btn-secondary" onClick={() => setShareLead(l)}>
                        <Share2 size={12} /> Share
                      </button>
                    ) : scope === "own" ? (
                      <button type="button" className="btn btn-sm btn-ghost" onClick={() => unshare(l)} title="Remove from this company">
                        <Trash2 size={12} />
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && filtered.length > 0 && (
          <Pagination
            page={page}
            pageSize={pageSize}
            total={filtered.length}
            onPageChange={setPage}
            onPageSizeChange={(s) => {
              setPageSize(s)
              setPage(1)
            }}
            itemLabel="leads"
          />
        )}
      </div>
      )}

      {createOpen && (scope === "private" || ctx?.activeCompany) && (
        <AddLeadModal
          company={scope === "private" ? null : ctx.activeCompany}
          privateOnly={scope === "private"}
          onClose={() => {
            setCreateOpen(false)
            if (params.get("add")) {
              params.delete("add")
              setParams(params, { replace: true })
            }
          }}
          onCreated={() => {
            setCreateOpen(false)
            reload()
          }}
        />
      )}
      {shareLead && (
        <ShareLeadModal
          lead={shareLead}
          companies={(ctx?.companies || []).filter((c) => c.status === "ACTIVE")}
          onClose={() => setShareLead(null)}
          onShared={() => {
            setShareLead(null)
            reload()
          }}
        />
      )}
    </>
  )
}

function initials(name) {
  return (name || "")
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

function priorityClass(p) {
  const v = (p || "").toLowerCase()
  if (v === "hot") return "tag tag-hot"
  if (v === "warm") return "tag tag-warm"
  if (v === "cold") return "tag tag-cold"
  if (v === "vip") return "tag tag-vip"
  return "tag"
}

function ViewBtn({ active, onClick, icon: Icon, label }) {
  return (
    <button
      type="button"
      className={`btn btn-sm ${active ? "btn-primary" : "btn-secondary"}`}
      onClick={onClick}
      aria-pressed={active}
    >
      <Icon size={13} /> {label}
    </button>
  )
}
