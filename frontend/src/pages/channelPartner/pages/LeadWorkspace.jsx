import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Eye,
  Mail,
  MessageCircle,
  MessageSquare,
  Phone,
} from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { fmt } from "@/lib/format"
import { useAuthStore } from "@/stores/authStore"

// Lead Workspace — single-pane view of everything related to a lead:
// summary, status control, sharing controls, activity timeline, notes,
// follow-up history. Tabs let the CP switch between the major facets
// without navigating away.

const STATUSES = [
  "New", "Contacted", "Qualified", "Site Visit",
  "Proposal Sent", "Negotiation", "Won", "Lost", "Follow Up",
]
const VISIBILITY_OPTIONS = [
  { value: "FULL", label: "Full" },
  { value: "PARTIAL", label: "Partial" },
  { value: "ANONYMOUS", label: "Anonymous" },
]
// Sharing tab is only relevant when the CP owns the lead — i.e. they
// created it and may be sharing it OUT to one or more companies. On a
// company-originated lead the CP is just a recipient and has no business
// changing the visibility their company set.
const BASE_TABS = ["overview", "activity", "notes"]

export default function LeadWorkspace() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [lead, setLead] = useState(null)
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState("overview")
  const [noteText, setNoteText] = useState("")
  const [savingNote, setSavingNote] = useState(false)
  const [savingStatus, setSavingStatus] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([
      api.get(`/channel-partner/leads/${id}`),
      api.get(`/leads/${id}/activities`).catch(() => ({})),
    ])
      .then(([l, a]) => {
        setLead(l?.data ?? null)
        const list = a?.data?.items ?? a?.items ?? a?.data ?? []
        setActivities(Array.isArray(list) ? list : [])
      })
      .catch((err) => {
        toast.error(err?.message || "Lead not found")
        navigate("/cp/my-leads", { replace: true })
      })
      .finally(() => setLoading(false))
  }
  useEffect(load, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  const updateStatus = async (status) => {
    setSavingStatus(true)
    try {
      await api.patch(`/channel-partner/leads/${id}/status`, { status })
      toast.success(`Status → ${status}`)
      load()
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || err?.message || "Failed")
    } finally {
      setSavingStatus(false)
    }
  }
  const updateShareVisibility = async (companyId, visibility) => {
    try {
      await api.patch(`/channel-partner/leads/${id}/visibility`, { companyId, visibility })
      toast.success("Visibility updated")
      load()
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || err?.message || "Failed")
    }
  }
  const submitNote = async () => {
    if (!noteText.trim()) return
    setSavingNote(true)
    try {
      await api.post(`/leads/${id}/notes`, { content: noteText.trim() })
      setNoteText("")
      toast.success("Note added")
      load()
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || err?.message || "Failed")
    } finally {
      setSavingNote(false)
    }
  }

  if (loading) return <div className="cp-empty"><p>Loading…</p></div>
  if (!lead) return null

  return (
    <>
      <Link to="/cp/my-leads" className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }}>
        <ArrowLeft size={14} /> Back
      </Link>

      <div className="cp-page-head">
        <div>
          <h1>{lead.name}</h1>
          <p>
            {lead.company?.name} · {fmt.phone(lead.phone)} · {lead.email || "—"}
          </p>
        </div>
        <span className="badge">
          <Eye size={11} /> Visibility: {lead.visibility || "FULL"}
        </span>
      </div>

      <div className="cp-actions" style={{ marginBottom: 14 }}>
        <a href={`tel:${lead.phone}`} className="btn btn-secondary btn-sm">
          <Phone size={13} /> Call
        </a>
        <a
          href={`https://wa.me/${(lead.phone || "").replace(/[^\d]/g, "")}`}
          target="_blank"
          rel="noreferrer"
          className="btn btn-secondary btn-sm"
        >
          <MessageCircle size={13} /> WhatsApp
        </a>
        {lead.email && (
          <a href={`mailto:${lead.email}`} className="btn btn-secondary btn-sm">
            <Mail size={13} /> Email
          </a>
        )}
      </div>

      <div className="cp-tabs">
        {(lead?.channelPartnerId && lead.channelPartnerId === user?.id
          ? [...BASE_TABS, "sharing"]
          : BASE_TABS
        ).map((t) => (
          <button key={t} type="button" className={`cp-tab ${tab === t ? "is-active" : ""}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div className="cp-card">
            <div className="cp-card-title">Status</div>
            <select
              className="select"
              value={lead.status}
              onChange={(e) => updateStatus(e.target.value)}
              disabled={savingStatus}
            >
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <p className="text-xs text-muted" style={{ marginTop: 8 }}>
              Status changes notify the company's Owner and Manager in real time.
            </p>
          </div>
          <div className="cp-card">
            <div className="cp-card-title">Details</div>
            <Row k="Priority" v={lead.priority || "—"} />
            <Row k="Source" v={lead.source || "—"} />
            <Row k="City" v={lead.city || "—"} />
            <Row k="Requirement" v={lead.requirementType || "—"} />
            <Row k="Budget" v={lead.budget || "—"} />
            <Row k="Created" v={new Date(lead.createdAt).toLocaleDateString()} />
            {lead.nextFollowUpAt && (
              <Row k="Next follow-up" v={new Date(lead.nextFollowUpAt).toLocaleString()} />
            )}
          </div>
        </div>
      )}

      {tab === "activity" && (
        <div className="cp-card">
          <div className="cp-card-title">Activity timeline</div>
          {activities.length === 0 ? (
            <p className="text-muted text-sm">No activity yet.</p>
          ) : (
            <div className="cp-timeline">
              {activities.map((a) => (
                <div key={a.id} className="cp-timeline-item">
                  <div className="cp-timeline-dot" />
                  <div className="cp-timeline-time">{new Date(a.createdAt).toLocaleString()}</div>
                  <div className="cp-timeline-body">
                    <span className="badge" style={{ marginRight: 8 }}>{a.type}</span>
                    {a.content || "—"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "notes" && (
        <div className="cp-card">
          <div className="cp-card-title">Notes</div>
          <textarea
            className="textarea"
            rows={3}
            placeholder="Add a note. Visible to the company."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
          />
          <div className="row" style={{ justifyContent: "flex-end", marginTop: 8 }}>
            <button type="button" className="btn btn-primary" onClick={submitNote} disabled={savingNote}>
              <MessageSquare size={14} /> {savingNote ? "Saving…" : "Add note"}
            </button>
          </div>
        </div>
      )}

      {tab === "sharing" && (
        <div className="cp-card">
          <div className="cp-card-title">Sharing</div>
          {(lead.channelPartnerShares || []).length === 0 ? (
            <p className="text-muted text-sm">
              This lead isn't shared with any company yet.
            </p>
          ) : (
            <table className="cp-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Status</th>
                  <th>Visibility</th>
                  <th>Shared at</th>
                </tr>
              </thead>
              <tbody>
                {lead.channelPartnerShares.map((s) => (
                  <tr key={s.id}>
                    <td><Building2 size={11} /> {s.company?.name}</td>
                    <td><span className="badge">{s.status}</span></td>
                    <td>
                      <select
                        className="select"
                        defaultValue={s.visibility}
                        onChange={(e) => updateShareVisibility(s.companyId, e.target.value)}
                        disabled={s.status !== "ACTIVE"}
                        style={{ minWidth: 130, padding: "4px 8px", fontSize: 12 }}
                      >
                        {VISIBILITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </td>
                    <td>{new Date(s.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </>
  )
}

function Row({ k, v }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px dashed var(--lp-border)" }}>
      <span className="text-muted text-sm">{k}</span>
      <span style={{ fontWeight: 500, fontSize: 13 }}>{v}</span>
    </div>
  )
}
