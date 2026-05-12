import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import {
  CalendarPlus,
  Mail,
  MapPin,
  MessageSquare,
  Pencil,
  Phone,
  SearchX,
  StickyNote,
  Trash2,
  UserCog,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { LEAD_STATUS_VALUES } from "@/lib/constants"
import { fmt } from "@/lib/format"

// Visual port of leadpro-realty/src/pages/LeadDetail.jsx.
// TODO: wire activity/notes/files panels once endpoints exist.

const STATUS_BADGE = {
  New: "badge-info",
  Contacted: "badge-info",
  Qualified: "badge-warning",
  "Proposal Sent": "badge-warning",
  Negotiation: "badge-warning",
  Won: "badge-success",
  Lost: "badge-error",
  "Not Interested": "badge-muted",
  "Follow Up": "badge-info",
}

function statusBadgeCls(s) {
  return STATUS_BADGE[s] || "badge-muted"
}

function Row({ k, v }) {
  return (
    <div>
      <div className="text-xs text-muted">{k}</div>
      <div style={{ fontWeight: 500, marginTop: 2 }}>{v ?? "—"}</div>
    </div>
  )
}

export default function LeadDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [lead, setLead] = useState(null)
  const [loading, setLoading] = useState(true)
  const [statusModal, setStatusModal] = useState(false)
  const [assignModal, setAssignModal] = useState(false)
  const [deleteModal, setDeleteModal] = useState(false)
  const [users, setUsers] = useState([])
  const [assignTo, setAssignTo] = useState("")

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api
      .get(`/leads/${id}`)
      .then((res) => {
        if (cancelled) return
        const l = res?.data ?? res
        setLead(l)
        setAssignTo(l?.assignedToId || l?.assignedTo?.id || "")
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  useEffect(() => {
    let cancelled = false
    api
      .get("/users")
      .then((res) => {
        if (cancelled) return
        const list = res?.data?.items ?? res?.data ?? res?.users ?? res ?? []
        setUsers(Array.isArray(list) ? list : [])
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const changeStatus = async (s) => {
    try {
      const res = await api.patch(`/leads/${id}`, { status: s })
      const updated = res?.data ?? res
      setLead((prev) => ({ ...prev, ...updated, status: updated?.status ?? s }))
      toast.success(`Status changed to ${s}`)
      setStatusModal(false)
    } catch {
      toast.error("Failed to update status")
    }
  }

  const reassign = async () => {
    try {
      const res = await api.patch(`/leads/${id}`, {
        assignedToId: assignTo || null,
      })
      const updated = res?.data ?? res
      setLead((prev) => ({ ...prev, ...updated }))
      toast.success("Lead assigned")
      setAssignModal(false)
    } catch {
      toast.error("Failed to assign")
    }
  }

  const del = async () => {
    try {
      await api.delete(`/leads/${id}`)
      toast.success("Lead deleted")
      navigate("/leads")
    } catch {
      toast.error("Failed to delete")
    }
  }

  if (loading) {
    return (
      <div
        style={{
          padding: "40px 20px",
          textAlign: "center",
          color: "var(--lp-text-muted)",
          fontSize: 14,
        }}
      >
        Loading lead…
      </div>
    )
  }

  if (!lead) {
    return (
      <div className="empty-state">
        <div className="icon">
          <SearchX size={28} />
        </div>
        <h3>Lead not found</h3>
        <button
          className="btn btn-primary"
          type="button"
          onClick={() => navigate("/leads")}
        >
          Back to leads
        </button>
      </div>
    )
  }

  const ag = lead.assignedTo || users.find((u) => u.id === lead.assignedToId)

  return (
    <>
      <div className="content-head">
        <div>
          <a
            onClick={() => navigate("/leads")}
            style={{
              color: "var(--lp-text-muted)",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            ← Back to leads
          </a>
          <h1 style={{ marginTop: 6 }}>{lead.name}</h1>
          <p>
            {lead.phone}
            {lead.email ? ` · ${lead.email}` : ""}
          </p>
        </div>
        <div className="row">
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => toast.info(`Calling ${lead.name}…`)}
          >
            <Phone size={16} /> Call
          </button>
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => toast.info(`Opening WhatsApp for ${lead.name}…`)}
          >
            <MessageSquare size={16} /> WhatsApp
          </button>
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => navigate(`/leads/${id}/edit`)}
          >
            <Pencil size={16} /> Edit
          </button>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "2fr 1fr", gap: 16 }}>
        <div className="stack">
          <div className="card">
            <div className="card-title">Lead Information</div>
            <div className="grid grid-2" style={{ gap: 14 }}>
              <Row
                k="Project"
                v={lead.interestedProject?.name || lead.projectName || "—"}
              />
              <Row
                k="Budget"
                v={lead.budget ? fmt.inr(lead.budget) : "—"}
              />
              <Row k="Source" v={lead.source} />
              <Row k="City" v={lead.city} />
              <Row
                k="Created"
                v={lead.createdAt ? fmt.date(lead.createdAt) : "—"}
              />
              <Row
                k="Last Updated"
                v={lead.updatedAt ? fmt.ago(lead.updatedAt) : "—"}
              />
              <Row k="Priority" v={lead.priority || "—"} />
              <Row
                k="Next Follow-Up"
                v={
                  lead.nextFollowUp || lead.nextFollowUpAt
                    ? fmt.date(lead.nextFollowUp || lead.nextFollowUpAt)
                    : "—"
                }
              />
            </div>
            <div className="field mt-4">
              <label>Notes</label>
              <div
                className="card"
                style={{ background: "var(--lp-surface-2)", padding: 14 }}
              >
                {lead.notes || "No notes added."}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-title">Status & Workflow</div>
            <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
              <button
                type="button"
                className={`badge ${statusBadgeCls(lead.status)}`}
                style={{
                  padding: "8px 14px",
                  cursor: "pointer",
                  border: "1px solid transparent",
                }}
                onClick={() => setStatusModal(true)}
              >
                {lead.status || "—"}
              </button>
              <span className="text-xs text-muted">
                Click to change status
              </span>
            </div>
          </div>

          {/* TODO: wire activity/notes/files panels once endpoints exist */}
        </div>

        <div className="stack">
          <div className="card">
            <div className="card-title">Assigned Agent</div>
            {ag ? (
              <>
                <div className="row" style={{ gap: 12 }}>
                  <div className="avatar lg">
                    {fmt.initials(ag.name || ag.email || "?")}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      {ag.name || ag.email}
                    </div>
                    <div className="text-xs text-muted">{ag.email}</div>
                  </div>
                </div>
                <button
                  className="btn btn-secondary mt-4"
                  type="button"
                  style={{ width: "100%", justifyContent: "center" }}
                  onClick={() => setAssignModal(true)}
                >
                  <UserCog size={14} /> Reassign
                </button>
              </>
            ) : (
              <>
                <p className="text-muted text-sm">Not assigned yet.</p>
                <button
                  className="btn btn-primary mt-3"
                  type="button"
                  style={{ width: "100%", justifyContent: "center" }}
                  onClick={() => setAssignModal(true)}
                >
                  Assign Agent
                </button>
              </>
            )}
          </div>

          <div className="card">
            <div className="card-title">Next Follow-up</div>
            <p className="text-sm">
              {lead.nextFollowUp || lead.nextFollowUpAt
                ? fmt.date(lead.nextFollowUp || lead.nextFollowUpAt)
                : "No follow-up scheduled."}
            </p>
          </div>

          <div className="card">
            <div className="card-title">Recent Activity</div>
            {/* TODO: wire activity/notes/files panels once endpoints exist */}
            <div className="activity-item">
              <div className="text-xs text-muted">
                Activity timeline will appear here.
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-title">Quick Actions</div>
            <div className="stack" style={{ gap: 6 }}>
              <button
                type="button"
                className="nav-item"
                onClick={() => toast.success("Follow-up scheduled")}
              >
                <CalendarPlus size={16} />
                <span>Schedule Follow-Up</span>
              </button>
              <button
                type="button"
                className="nav-item"
                onClick={() => toast.success("Note added")}
              >
                <StickyNote size={16} />
                <span>Add Note</span>
              </button>
              <button
                type="button"
                className="nav-item"
                onClick={() => toast.success("Site visit logged")}
              >
                <MapPin size={16} />
                <span>Log Site Visit</span>
              </button>
              <button
                type="button"
                className="nav-item"
                onClick={() => toast.success("Email sent")}
              >
                <Mail size={16} />
                <span>Send Email</span>
              </button>
              <button
                type="button"
                className="nav-item"
                style={{ color: "var(--lp-error)" }}
                onClick={() => setDeleteModal(true)}
              >
                <Trash2 size={16} />
                <span>Delete Lead</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Status change modal */}
      {statusModal && (
        <div
          className="modal-backdrop"
          onClick={() => setStatusModal(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Change Status</h3>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setStatusModal(false)}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
                {LEAD_STATUS_VALUES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`badge ${
                      lead.status === s ? statusBadgeCls(s) : "badge-muted"
                    }`}
                    style={{
                      padding: "8px 14px",
                      cursor: "pointer",
                      border:
                        "1px solid " +
                        (lead.status === s
                          ? "transparent"
                          : "var(--lp-border)"),
                    }}
                    onClick={() => changeStatus(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="modal-foot">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setStatusModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assignment modal */}
      {assignModal && (
        <div
          className="modal-backdrop"
          onClick={() => setAssignModal(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Assign Agent</h3>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setAssignModal(false)}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <div className="field">
                <label>Agent</label>
                <select
                  className="select"
                  value={assignTo}
                  onChange={(e) => setAssignTo(e.target.value)}
                >
                  <option value="">— Unassigned —</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name || u.email}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-foot">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setAssignModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={reassign}
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteModal && (
        <div
          className="modal-backdrop"
          onClick={() => setDeleteModal(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Delete lead?</h3>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setDeleteModal(false)}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <p className="text-muted text-sm">
                Permanently delete {lead.name}? This cannot be undone.
              </p>
            </div>
            <div className="modal-foot">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeleteModal(false)}
              >
                Cancel
              </button>
              <button type="button" className="btn btn-danger" onClick={del}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
