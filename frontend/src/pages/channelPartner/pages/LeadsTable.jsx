import { useEffect, useMemo, useState } from "react"
import { useNavigate, useOutletContext, useSearchParams } from "react-router-dom"
import {
  CalendarDays,
  Eye,
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
  const [priority, setPriority] = useState("")
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
    if (priority) rows = rows.filter((l) => (l.priority || "").toLowerCase() === priority.toLowerCase())
    return rows
  }, [leads, search, priority])

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
            disabled={!ctx?.activeCompany && scope === "own"}
          >
            <Plus size={14} /> Add Lead
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
          <select className="select" style={{ maxWidth: 160 }} value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="">All priorities</option>
            <option value="Hot">Hot</option>
            <option value="Warm">Warm</option>
            <option value="Cold">Cold</option>
          </select>
          <div style={{ marginLeft: "auto", fontSize: 12, color: "var(--lp-text-muted)" }}>
            {filtered.length} of {leads.length}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 36, color: "var(--lp-text-muted)", textAlign: "center" }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="cp-empty">
            <div className="icon"><Search size={28} /></div>
            <h3>No leads to show</h3>
            <p>
              {scope === "own"
                ? "Once you add a lead and share it with this company, it appears here."
                : scope === "shared"
                  ? "When this company shares a lead with you, it will show up here."
                  : "Capture a lead in your private pool, then share it with any of your companies when ready."}
            </p>
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
              {filtered.map((l) => (
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
      </div>
      )}

      {createOpen && ctx?.activeCompany && (
        <AddLeadModal
          company={ctx.activeCompany}
          onClose={() => {
            setCreateOpen(false)
            // remove ?add=1 from URL
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
