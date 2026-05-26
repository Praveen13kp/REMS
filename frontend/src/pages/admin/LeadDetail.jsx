import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import {
  CalendarPlus,
  Check,
  Mail,
  MapPin,
  MessageSquare,
  Pencil,
  Phone,
  Plus,
  SearchX,
  Share2,
  StickyNote,
  Trash2,
  UserCog,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { DEFAULT_PIPELINE_STAGES } from "@/lib/constants"
import { fmt } from "@/lib/format"
import { useAuthStore } from "@/stores/authStore"
import { useNotesStore } from "@/stores/noteStore"
import SourceIcon from "@/components/leads/SourceIcon"
import { leadPiiMasked, NON_SELECTABLE_STYLE } from "@/lib/privacy"

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

const PRIORITY_BADGE = {
  Hot: "badge-error",
  Warm: "badge-warning",
  Cold: "badge-muted",
}

function priorityBadgeCls(p) {
  return PRIORITY_BADGE[p] || "badge-muted"
}

function stripNonDigits(s) {
  return (s || "").replace(/\D/g, "")
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
  const currentUser = useAuthStore((s) => s.user)
  const notes = useNotesStore((s) => s.notes)
  const notesLoading = useNotesStore((s) => s.loading)
  const fetchNotes = useNotesStore((s) => s.fetchNotes)
  const addNote = useNotesStore((s) => s.addNote)
  const updateNote = useNotesStore((s) => s.updateNote)
  const deleteNote = useNotesStore((s) => s.deleteNote)
  const [lead, setLead] = useState(null)
  const [loading, setLoading] = useState(true)
  const [assignModal, setAssignModal] = useState(false)
  const [cpShareOpen, setCpShareOpen] = useState(false)
  const [deleteModal, setDeleteModal] = useState(false)
  const [emailModalOpen, setEmailModalOpen] = useState(false)
  const [reasonModal, setReasonModal] = useState(false)
  const [pendingStatus, setPendingStatus] = useState("")
  const [lostReason, setLostReason] = useState("")
  const [users, setUsers] = useState([])
  const [assignTo, setAssignTo] = useState("")
  const [newNoteContent, setNewNoteContent] = useState("")
  const [editingNoteId, setEditingNoteId] = useState(null)
  const [editingContent, setEditingContent] = useState("")
  const [deleteConfirmNote, setDeleteConfirmNote] = useState(null)
  const [followUpModal, setFollowUpModal] = useState(false)
  const [followUpAt, setFollowUpAt] = useState("")
  const [followUpSaving, setFollowUpSaving] = useState(false)
  const [siteVisitModal, setSiteVisitModal] = useState(false)
  const [siteVisitNote, setSiteVisitNote] = useState("")
  const [siteVisitSaving, setSiteVisitSaving] = useState(false)

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
    fetchNotes(id)
    return () => {
      cancelled = true
    }
  }, [id, fetchNotes])

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
    const stage = DEFAULT_PIPELINE_STAGES.find((st) => st.name === s)
    if (stage?.isLost) {
      setPendingStatus(s)
      setLostReason("")
      setReasonModal(true)
      return
    }
    try {
      const res = await api.post(`/leads/${id}/transition`, { toStatus: s })
      const updated = res?.data ?? res
      setLead((prev) => ({ ...prev, ...updated, status: updated?.status ?? s }))
      toast.success(`Status changed to ${s}`)
    } catch {
      toast.error("Failed to update status")
    }
  }

  const confirmLost = async () => {
    const reason = lostReason.trim()
    if (!reason) return
    try {
      const res = await api.post(`/leads/${id}/transition`, {
        toStatus: pendingStatus,
        reason,
      })
      const updated = res?.data ?? res
      setLead((prev) => ({ ...prev, ...updated, status: updated?.status ?? pendingStatus }))
      toast.success(`Status changed to ${pendingStatus}`)
      setReasonModal(false)
      setPendingStatus("")
    } catch (err) {
      toast.error(err?.message || "Failed to update status")
    }
  }

  const reassign = async () => {
    try {
      const res = await api.post(`/leads/${id}/assign`, {
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

  // mode: "soft" → 30-day Trash (recoverable); "hard" → permanent.
  const del = async (mode = "soft") => {
    try {
      await api.delete(`/leads/${id}?mode=${mode}`)
      toast.success(
        mode === "hard"
          ? "Lead permanently deleted"
          : "Lead moved to Trash — recoverable for 30 days",
      )
      navigate("/leads")
    } catch (err) {
      toast.error(err?.message || "Failed to delete")
    }
  }

  // Fire-and-forget: log the contact attempt as an activity row, then let
  // the tel:/wa.me href open the dialer/WhatsApp. We don't block the user
  // on the network call.
  const logContactActivity = async (type) => {
    try {
      await api.post(`/leads/${id}/activity`, { type })
      setLead((prev) =>
        prev ? { ...prev, lastContactedAt: new Date().toISOString() } : prev,
      )
    } catch {
      // Silent — the user already initiated the contact action.
    }
  }

  // Auto-dialer path. When PII is masked we never expose the raw phone
  // to the agent — the call is placed server-side via POST /leads/:id/call.
  const dialViaAutoDialer = async () => {
    try {
      const res = await api.post(`/leads/${id}/call`)
      const callId = res?.data?.callId
      toast.success(
        callId
          ? `Auto-dialer connecting… (${callId})`
          : "Auto-dialer connecting…",
      )
      setLead((prev) =>
        prev ? { ...prev, lastContactedAt: new Date().toISOString() } : prev,
      )
    } catch (err) {
      toast.error(err?.message || "Failed to place call")
    }
  }

  const openFollowUp = () => {
    const existing = lead?.nextFollowUpAt || lead?.nextFollowUp
    if (existing) {
      const d = new Date(existing)
      const pad = (n) => String(n).padStart(2, "0")
      const local = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
      setFollowUpAt(local)
    } else {
      setFollowUpAt("")
    }
    setFollowUpModal(true)
  }

  const saveFollowUp = async () => {
    if (!followUpAt) return
    setFollowUpSaving(true)
    try {
      const iso = new Date(followUpAt).toISOString()
      await api.post("/follow-ups", { leadId: id, scheduledAt: iso })
      setLead((prev) => ({ ...prev, nextFollowUpAt: iso }))
      toast.success("Follow-up scheduled")
      setFollowUpModal(false)
    } catch (err) {
      toast.error(err?.message || "Failed to schedule follow-up")
    } finally {
      setFollowUpSaving(false)
    }
  }

  const saveSiteVisit = async () => {
    const note = siteVisitNote.trim()
    setSiteVisitSaving(true)
    try {
      await api.post(`/leads/${id}/activity`, {
        type: "NOTE",
        content: note ? `Site visit: ${note}` : "Site visit logged",
        metadata: { kind: "SITE_VISIT" },
      })
      setLead((prev) =>
        prev ? { ...prev, lastContactedAt: new Date().toISOString() } : prev,
      )
      toast.success("Site visit logged")
      setSiteVisitModal(false)
      setSiteVisitNote("")
    } catch (err) {
      toast.error(err?.message || "Failed to log site visit")
    } finally {
      setSiteVisitSaving(false)
    }
  }

  // Send Email opens a compose panel (template picker + manual editor)
  // instead of bouncing the user to Gmail. The send happens server-side
  // via the company's configured SMTP — see POST /api/leads/:id/send-email.
  const openSendEmail = () => {
    if (!lead?.email) {
      toast.warning("No email on file for this lead")
      return
    }
    setEmailModalOpen(true)
  }
  const onEmailSent = (subject) => {
    setEmailModalOpen(false)
    toast.success("Email sent")
    setLead((prev) =>
      prev ? { ...prev, lastContactedAt: new Date().toISOString() } : prev,
    )
    // Refresh activities so the EMAIL row shows up on the timeline.
    if (typeof loadActivities === "function") loadActivities()
  }

  const canModifyNote = (note) => {
    if (!currentUser) return false
    if (note.author?.id === currentUser.id) return true
    return ["OWNER", "ADMIN", "SUPER_ADMIN"].includes(currentUser.role)
  }

  const handleAddNote = async () => {
    const content = newNoteContent.trim()
    if (!content) return
    try {
      await addNote({
        leadId: id,
        content,
        author: { id: currentUser.id, name: currentUser.name },
      })
      setNewNoteContent("")
      toast.success("Note added")
    } catch {
      toast.error("Failed to add note")
    }
  }

  const startEditNote = (note) => {
    setEditingNoteId(note.id)
    setEditingContent(note.content)
  }

  const cancelEditNote = () => {
    setEditingNoteId(null)
    setEditingContent("")
  }

  const saveEditNote = async () => {
    const content = editingContent.trim()
    if (!content) return
    try {
      await updateNote(editingNoteId, { content })
      setEditingNoteId(null)
      setEditingContent("")
      toast.success("Note updated")
    } catch {
      toast.error("Failed to update note")
    }
  }

  const confirmDeleteNote = async () => {
    if (!deleteConfirmNote) return
    try {
      await deleteNote(deleteConfirmNote.id)
      setDeleteConfirmNote(null)
      toast.success("Note deleted")
    } catch {
      toast.error("Failed to delete note")
    }
  }

  if (loading) {
    return (
      <div
        style={{
          padding: "40px 20px",
          textAlign: "center",
          color: "var(--lp-text-muted)",
          fontSize: "0.933rem",
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
              fontSize: "0.867rem",
              cursor: "pointer",
            }}
          >
            ← Back to leads
          </a>
          <h1
            style={{
              marginTop: 6,
              ...(lead.deletedAt
                ? { textDecoration: "line-through", opacity: 0.7 }
                : {}),
            }}
          >
            {lead.name}
          </h1>
          <div className="row" style={{ gap: 6, marginTop: 4 }}>
            {lead.deletedAt && (
              <span
                className="badge"
                style={{
                  background: "var(--lp-surface-2)",
                  color: "var(--lp-text-muted)",
                  border: "1px solid var(--lp-border)",
                  fontWeight: 700,
                  letterSpacing: 0.5,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 999,
                    background: "var(--lp-text-muted)",
                    display: "inline-block",
                  }}
                />
                INACTIVE
              </span>
            )}
            {lead.status && (
              <span className={`badge ${statusBadgeCls(lead.status)}`}>
                {lead.status}
              </span>
            )}
            {lead.priority && (
              <span className={`badge ${priorityBadgeCls(lead.priority)}`}>
                {lead.priority}
              </span>
            )}
          </div>
          <p
            style={
              leadPiiMasked(lead, currentUser?.role)
                ? NON_SELECTABLE_STYLE
                : undefined
            }
            onCopy={
              leadPiiMasked(lead, currentUser?.role)
                ? (e) => e.preventDefault()
                : undefined
            }
          >
            {fmt.phone(lead.phone)}
            {lead.email ? ` · ${lead.email}` : ""}
          </p>
        </div>
        <div className="row">
          {leadPiiMasked(lead, currentUser?.role) ? (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={dialViaAutoDialer}
              title="Call via auto-dialer (customer number is hidden)"
            >
              <Phone size={16} /> Call
            </button>
          ) : (
            <a
              href={`tel:${lead.phone}`}
              className="btn btn-secondary"
              onClick={() => logContactActivity("CALL")}
            >
              <Phone size={16} /> Call
            </a>
          )}
          {!leadPiiMasked(lead, currentUser?.role) && (
            <a
              href={`https://wa.me/${stripNonDigits(lead.phone)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              onClick={() => logContactActivity("WHATSAPP")}
            >
              <MessageSquare size={16} /> WhatsApp
            </a>
          )}
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => navigate(`/leads/${id}/edit`)}
          >
            <Pencil size={16} /> Edit
          </button>
        </div>
      </div>

      {/* Inactive banner — appears above the detail body when the lead is
          soft-deleted. Gives admins/owners a one-click restore path. */}
      {lead.deletedAt && (
        <div
          className="card"
          style={{
            marginBottom: 14,
            borderColor: "var(--lp-border)",
            background: "var(--lp-surface-2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Trash2 size={18} style={{ color: "var(--lp-text-muted)" }} />
            <div>
              <div style={{ fontWeight: 700 }}>This lead is inactive</div>
              <div className="text-xs text-muted">
                Deactivated {fmt.ago(lead.deletedAt)}. Will be permanently
                deleted 30 days after deactivation unless restored.
              </div>
            </div>
          </div>
          {(currentUser?.role === "OWNER" ||
            currentUser?.role === "ADMIN") && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={async () => {
                try {
                  await api.post(`/leads/${id}/restore`)
                  setLead((prev) => ({ ...prev, deletedAt: null }))
                  toast.success("Lead restored")
                } catch (err) {
                  toast.error(err?.message || "Failed to restore")
                }
              }}
            >
              Restore lead
            </button>
          )}
        </div>
      )}

      <div
        className="grid"
        style={{
          gridTemplateColumns: "2fr 1fr",
          gap: 16,
          ...(lead.deletedAt ? { opacity: 0.7 } : {}),
        }}
      >
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
              <Row
                k="Source"
                v={
                  lead.source ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <SourceIcon source={lead.source} />
                      {lead.source}
                    </span>
                  ) : null
                }
              />
              <Row k="City" v={lead.city} />
              <Row
                k="Created"
                v={lead.createdAt ? fmt.date(lead.createdAt) : "—"}
              />
              <Row
                k="Last Updated"
                v={lead.updatedAt ? fmt.ago(lead.updatedAt) : "—"}
              />
              <Row
                k="AI Score"
                v={
                  <div className="row">
                    <div
                      style={{
                        flex: 1,
                        height: 6,
                        background: "var(--lp-surface-3)",
                        borderRadius: 3,
                        maxWidth: 120,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: (lead.score || 0) + "%",
                          height: "100%",
                          background: "var(--lp-accent)",
                        }}
                      />
                    </div>
                    <span className="text-sm" style={{ fontWeight: 600 }}>
                      {lead.score || 0}/100
                    </span>
                  </div>
                }
              />
              <Row
                k="Next Follow-Up"
                v={
                  lead.nextFollowUp || lead.nextFollowUpAt
                    ? fmt.date(lead.nextFollowUp || lead.nextFollowUpAt)
                    : "—"
                }
              />
            </div>
          </div>

          <div className="card" data-notes-section>
            <div className="card-title">Notes</div>
            <div className="field">
              <textarea
                className="textarea"
                rows={3}
                placeholder="Add a note…"
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
              />
              <button
                type="button"
                className="btn btn-primary"
                style={{ marginTop: 8 }}
                disabled={!newNoteContent.trim()}
                onClick={handleAddNote}
              >
                <Plus size={14} /> Add Note
              </button>
            </div>
            {notesLoading ? (
              <div style={{ padding: "16px 0", fontSize: "0.867rem", color: "var(--lp-text-muted)" }}>
                Loading notes…
              </div>
            ) : notes.length === 0 ? (
              <div style={{ padding: "16px 0", fontSize: "0.867rem", color: "var(--lp-text-muted)" }}>
                No notes yet. Add one above.
              </div>
            ) : (
              <div className="stack" style={{ gap: 10, marginTop: 14 }}>
                {notes.map((note) => {
                  const isEditing = editingNoteId === note.id
                  const canEdit = canModifyNote(note)
                  return (
                    <div
                      key={note.id}
                      className="card"
                      style={{ background: "var(--lp-surface-2)", padding: 14 }}
                    >
                      {isEditing ? (
                        <>
                          <textarea
                            className="textarea"
                            rows={3}
                            value={editingContent}
                            onChange={(e) => setEditingContent(e.target.value)}
                            autoFocus
                          />
                          <div className="row" style={{ gap: 6, marginTop: 8 }}>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              disabled={!editingContent.trim()}
                              onClick={saveEditNote}
                            >
                              <Check size={14} /> Save
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={cancelEditNote}
                            >
                              Cancel
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="row" style={{ gap: 10, marginBottom: 8 }}>
                            <div className="avatar sm">
                              {(note.author?.image || note.author?.avatar) ? (
                                <img src={fmt.avatarUrl(note.author?.image || note.author?.avatar)} alt="" />
                              ) : (
                                fmt.initials(note.author?.name || "?")
                              )}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, fontSize: "0.867rem" }}>
                                {note.author?.name || "Unknown"}
                              </div>
                              <div style={{ fontSize: "0.733rem", color: "var(--lp-text-muted)" }}>
                                {fmt.ago(note.createdAt)}
                              </div>
                            </div>
                            {canEdit && (
                              <div className="row-actions">
                                <button
                                  type="button"
                                  className="btn-icon btn-ghost"
                                  title="Edit"
                                  onClick={() => startEditNote(note)}
                                >
                                  <Pencil size={13} />
                                </button>
                                <button
                                  type="button"
                                  className="btn-icon btn-ghost"
                                  title="Delete"
                                  onClick={() => setDeleteConfirmNote(note)}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            )}
                          </div>
                          <div style={{ fontSize: "0.867rem", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                            {note.content}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-title">Status & Workflow</div>
            <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
              {DEFAULT_PIPELINE_STAGES.map((st) => (
                <button
                  key={st.name}
                  type="button"
                  className={`badge ${lead.status === st.name ? statusBadgeCls(st.name) : "badge-muted"}`}
                  style={{
                    padding: "8px 14px",
                    cursor: "pointer",
                    border: "1px solid " + (lead.status === st.name ? "transparent" : "var(--lp-border)"),
                  }}
                  onClick={() => changeStatus(st.name)}
                >
                  {st.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="stack">
          <div className="card">
            <div className="card-title">Assigned Agent</div>
            {ag ? (
              <>
                <div className="row" style={{ gap: 12 }}>
                  <div className="avatar lg">
                    {(ag.image || ag.avatar) ? (
                      <img src={fmt.avatarUrl(ag.image || ag.avatar)} alt="" />
                    ) : (
                      fmt.initials(ag.name || ag.email || "?")
                    )}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      {ag.name || ag.email}
                    </div>
                    <div className="text-xs text-muted">{ag.email}</div>
                  </div>
                </div>
                {["OWNER", "ADMIN", "MANAGER"].includes(currentUser?.role) && (
                  <>
                    <button
                      className="btn btn-secondary mt-4"
                      type="button"
                      style={{ width: "100%", justifyContent: "center" }}
                      onClick={() => setAssignModal(true)}
                    >
                      <UserCog size={14} /> Reassign
                    </button>
                    <button
                      className="btn btn-ghost mt-2"
                      type="button"
                      style={{ width: "100%", justifyContent: "center" }}
                      onClick={() => setCpShareOpen(true)}
                    >
                      <Share2 size={14} /> Share with Channel Partner
                    </button>
                  </>
                )}
              </>
            ) : (
              <>
                <p className="text-muted text-sm">Not assigned yet.</p>
                {["OWNER", "ADMIN", "MANAGER"].includes(currentUser?.role) && (
                  <>
                    <button
                      className="btn btn-primary mt-3"
                      type="button"
                      style={{ width: "100%", justifyContent: "center" }}
                      onClick={() => setAssignModal(true)}
                    >
                      Assign Agent
                    </button>
                    <button
                      className="btn btn-secondary mt-2"
                      type="button"
                      style={{ width: "100%", justifyContent: "center" }}
                      onClick={() => setCpShareOpen(true)}
                    >
                      <Share2 size={14} /> Share with Channel Partner
                    </button>
                  </>
                )}
              </>
            )}
          </div>

          <div className="card">
            <div className="card-title">Quick Actions</div>
            <div className="stack" style={{ gap: 6 }}>
              <button
                type="button"
                className="nav-item"
                onClick={openFollowUp}
              >
                <CalendarPlus size={16} />
                <span>Schedule Follow-Up</span>
              </button>
              <button
                type="button"
                className="nav-item"
                onClick={() => {
                  const el = document.querySelector("[data-notes-section]")
                  if (el) el.scrollIntoView({ behavior: "smooth" })
                }}
              >
                <StickyNote size={16} />
                <span>Notes</span>
              </button>
              <button
                type="button"
                className="nav-item"
                onClick={() => setSiteVisitModal(true)}
              >
                <MapPin size={16} />
                <span>Log Site Visit</span>
              </button>
              <button
                type="button"
                className="nav-item"
                onClick={openSendEmail}
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

      {/* Schedule follow-up modal */}
      {followUpModal && (
        <div
          className="modal-backdrop"
          onClick={() => !followUpSaving && setFollowUpModal(false)}
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 460 }}
          >
            <div className="modal-head">
              <h3>Schedule follow-up</h3>
              <button
                type="button"
                onClick={() => setFollowUpModal(false)}
                disabled={followUpSaving}
                aria-label="Close"
                style={{
                  background: "transparent",
                  border: 0,
                  cursor: "pointer",
                  color: "var(--lp-text-muted)",
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="field">
                <label className="label">When</label>
                <input
                  className="input"
                  type="datetime-local"
                  value={followUpAt}
                  onChange={(e) => setFollowUpAt(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-foot">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setFollowUpModal(false)}
                disabled={followUpSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!followUpAt || followUpSaving}
                onClick={saveFollowUp}
              >
                {followUpSaving ? "Saving…" : "Schedule"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Log site visit modal */}
      {siteVisitModal && (
        <div
          className="modal-backdrop"
          onClick={() => !siteVisitSaving && setSiteVisitModal(false)}
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 460 }}
          >
            <div className="modal-head">
              <h3>Log site visit</h3>
              <button
                type="button"
                onClick={() => setSiteVisitModal(false)}
                disabled={siteVisitSaving}
                aria-label="Close"
                style={{
                  background: "transparent",
                  border: 0,
                  cursor: "pointer",
                  color: "var(--lp-text-muted)",
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="field">
                <label className="label">Notes (optional)</label>
                <textarea
                  className="textarea"
                  rows={4}
                  placeholder="What happened at the visit?"
                  value={siteVisitNote}
                  onChange={(e) => setSiteVisitNote(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-foot">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setSiteVisitModal(false)}
                disabled={siteVisitSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={siteVisitSaving}
                onClick={saveSiteVisit}
              >
                {siteVisitSaving ? "Saving…" : "Log visit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share with Channel Partner modal */}
      {cpShareOpen && (
        <ShareWithCpModal
          leadId={lead.id}
          leadName={lead.name}
          onClose={() => setCpShareOpen(false)}
          onShared={() => {
            setCpShareOpen(false)
            load()
          }}
        />
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
                  {users
                    .filter((u) => u.status !== "PENDING")
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name || u.email}
                        {u.role ? ` — ${u.role}` : ""}
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

      {/* Lost reason modal */}
      {reasonModal && (
        <div
          className="modal-backdrop"
          onClick={() => { setReasonModal(false); setPendingStatus("") }}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Mark as {pendingStatus}</h3>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => { setReasonModal(false); setPendingStatus("") }}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <div className="field">
                <label>Reason</label>
                <input
                  className="input"
                  placeholder={`Why is this lead ${pendingStatus.toLowerCase()}?`}
                  value={lostReason}
                  onChange={(e) => setLostReason(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <div className="modal-foot">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => { setReasonModal(false); setPendingStatus("") }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!lostReason.trim()}
                onClick={confirmLost}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete note confirm modal */}
      {deleteConfirmNote && (
        <div
          className="modal-backdrop"
          onClick={() => setDeleteConfirmNote(null)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Delete note?</h3>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setDeleteConfirmNote(null)}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <p className="text-muted text-sm">
                Permanently delete this note? This cannot be undone.
              </p>
            </div>
            <div className="modal-foot">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeleteConfirmNote(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={confirmDeleteNote}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal — two options:
            · Move to Trash (soft delete, recoverable for 30 days)
            · Delete permanently (hard delete, no undo) */}
      {emailModalOpen && (
        <SendEmailModal
          lead={lead}
          onClose={() => setEmailModalOpen(false)}
          onSent={onEmailSent}
        />
      )}

      {deleteModal && (
        <DeleteLeadModal
          leadName={lead.name}
          onClose={() => setDeleteModal(false)}
          onSoftDelete={() => {
            setDeleteModal(false)
            del("soft")
          }}
          onHardDelete={() => {
            setDeleteModal(false)
            del("hard")
          }}
        />
      )}
    </>
  )
}

// ---- Share-with-Channel-Partner modal --------------------------------------
// Used by Owner/Manager from the LeadDetail right rail. Lists every ACTIVE
// channel partner connected to this company, lets them pick a visibility
// level, and POSTs to /api/channel-partners/:id/share-lead.

// Two-option delete modal. Surfaces a recoverable "Move to Trash" CTA as
// the primary action so a misclick on the lead's row in a list view can be
// undone within 30 days. "Delete permanently" is intentionally separate
// (styled as a quieter ghost-danger row) so it isn't the muscle-memory
// default for power users who delete a lot.
// Send Email composer. Loads the company's email templates so the user
// can pick one and tweak before sending. Templates can reference
// {{lead.name}}, {{user.name}}, {{company.name}} — the server renders
// the variables before the message goes out.
function SendEmailModal({ lead, onClose, onSent }) {
  const currentUser = useAuthStore((s) => s.user)
  const [templates, setTemplates] = useState([])
  const [loadingTpl, setLoadingTpl] = useState(true)
  const [company, setCompany] = useState(null)
  const [selectedTplId, setSelectedTplId] = useState("")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [sending, setSending] = useState(false)

  // Mirror of the server-side renderTemplate(). Picking a template runs
  // the body through this so the user sees real values like "Hi Tushar,"
  // instead of "Hi {{lead.name}}," in the editor — but the textarea is
  // still editable. The server re-renders on send (idempotent: substituting
  // already-replaced text leaves it unchanged).
  const renderVars = (text) => {
    if (!text) return ""
    const ctx = {
      lead: lead || {},
      user: currentUser || {},
      company: company || { name: "your workspace" },
    }
    return text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path) => {
      const value = path.split(".").reduce((acc, key) => acc?.[key], ctx)
      return value == null ? "" : String(value)
    })
  }

  useEffect(() => {
    let cancelled = false
    Promise.all([
      api.get("/email-templates").catch(() => null),
      api.get("/company/me").catch(() => null),
    ]).then(([tplRes, coRes]) => {
      if (cancelled) return
      setTemplates(tplRes?.data ?? [])
      setCompany(coRes?.data ?? coRes?.company ?? null)
      setLoadingTpl(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const applyTemplate = (id) => {
    setSelectedTplId(id)
    if (!id) {
      setSubject("")
      setBody("")
      return
    }
    const tpl = templates.find((t) => t.id === id)
    if (tpl) {
      setSubject(renderVars(tpl.subject))
      setBody(renderVars(tpl.body))
    }
  }

  const send = async () => {
    if (!subject.trim()) {
      toast.error("Subject is required")
      return
    }
    if (!body.trim()) {
      toast.error("Body is required")
      return
    }
    setSending(true)
    try {
      await api.post(`/leads/${lead.id}/send-email`, {
        templateId: selectedTplId || null,
        subject,
        body,
      })
      onSent?.(subject)
    } catch (err) {
      toast.error(err?.message || "Failed to send email")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{
          maxWidth: 640,
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div className="modal-head" style={{ flexShrink: 0 }}>
          <div>
            <h3 style={{ margin: 0 }}>Send Email</h3>
            <div
              className="text-xs text-muted"
              style={{ marginTop: 2 }}
            >
              To <b>{lead.email}</b> · sent from your company SMTP
            </div>
          </div>
          <button
            type="button"
            className="btn-icon btn-ghost"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ overflowY: "auto", flex: 1 }}>
          <div className="field">
            <label>Template</label>
            {loadingTpl ? (
              <div className="text-xs text-muted">Loading templates…</div>
            ) : (
              <select
                className="select"
                value={selectedTplId}
                onChange={(e) => applyTemplate(e.target.value)}
              >
                <option value="">— Compose from scratch —</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.category ? `${t.category} · ` : ""}
                    {t.name}
                  </option>
                ))}
              </select>
            )}
            {templates.length === 0 && !loadingTpl && (
              <div
                className="text-xs text-muted"
                style={{ marginTop: 4 }}
              >
                No templates yet. Add some from Settings → Email Templates.
              </div>
            )}
          </div>

          <div className="field">
            <label>
              Subject <span className="req">*</span>
            </label>
            <input
              className="input"
              value={subject}
              placeholder="Subject line"
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="field">
            <label>
              Message <span className="req">*</span>
            </label>
            <textarea
              className="input"
              value={body}
              placeholder="Write your message…"
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              style={{ resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 }}
            />
          </div>
        </div>

        <div className="modal-foot" style={{ flexShrink: 0 }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={sending}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={send}
            disabled={sending}
          >
            <Mail size={14} />
            {sending ? "Sending…" : "Send email"}
          </button>
        </div>
      </div>
    </div>
  )
}

function DeleteLeadModal({ leadName, onClose, onSoftDelete, onHardDelete }) {
  const [confirmHard, setConfirmHard] = useState(false)
  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{ maxWidth: 480 }}
      >
        <div className="modal-head">
          <h3>Delete {leadName}?</h3>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        <div className="modal-body">
          <p className="text-muted text-sm" style={{ marginTop: 0 }}>
            Choose how to remove this lead.
          </p>

          {/* Recoverable option — primary CTA */}
          <button
            type="button"
            onClick={onSoftDelete}
            className="card"
            style={{
              width: "100%",
              textAlign: "left",
              padding: 14,
              marginBottom: 10,
              cursor: "pointer",
              borderColor: "var(--lp-accent)",
              background: "rgba(139,92,246,0.06)",
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 4 }}>
              Move to Trash
            </div>
            <div className="text-xs text-muted">
              Hidden from listings. Recoverable from Trash for{" "}
              <b>30 days</b>, then automatically deleted.
            </div>
          </button>

          {/* Permanent option — quieter, two-step (click twice to confirm) */}
          <button
            type="button"
            onClick={() => {
              if (confirmHard) onHardDelete()
              else setConfirmHard(true)
            }}
            className="card"
            style={{
              width: "100%",
              textAlign: "left",
              padding: 14,
              cursor: "pointer",
              borderColor: confirmHard
                ? "var(--lp-error)"
                : "var(--lp-border)",
              background: confirmHard
                ? "rgba(220,38,38,0.08)"
                : "transparent",
            }}
          >
            <div
              style={{
                fontWeight: 700,
                marginBottom: 4,
                color: "var(--lp-error)",
              }}
            >
              {confirmHard
                ? "Click again to confirm permanent delete"
                : "Delete permanently"}
            </div>
            <div className="text-xs text-muted">
              Removes the lead and its notes immediately. This cannot be
              undone.
            </div>
          </button>
        </div>
        <div className="modal-foot">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

function ShareWithCpModal({ leadId, leadName, onClose, onShared }) {
  const [partners, setPartners] = useState([])
  const [loading, setLoading] = useState(true)
  const [partnerId, setPartnerId] = useState("")
  const [visibility, setVisibility] = useState("FULL")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api
      .get("/channel-partners")
      .then((res) => {
        const list = (res?.data ?? []).filter((p) => p.status === "ACTIVE")
        setPartners(list)
        if (list[0]) setPartnerId(list[0].id)
      })
      .catch((err) => toast.error(err?.message || "Failed to load partners"))
      .finally(() => setLoading(false))
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    if (!partnerId) {
      toast.error("Pick a channel partner")
      return
    }
    setSaving(true)
    try {
      await api.post(`/channel-partners/${partnerId}/share-lead`, {
        leadId,
        visibility,
      })
      toast.success("Lead shared with channel partner")
      onShared?.()
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || err?.message || "Failed")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Share &ldquo;{leadName}&rdquo; with a channel partner</h3>
          <button type="button" className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="modal-body">
          {loading ? (
            <p className="text-muted">Loading partners…</p>
          ) : partners.length === 0 ? (
            <p className="text-muted text-sm">
              No active channel partners are linked to this company yet. Invite
              one from User Management first.
            </p>
          ) : (
            <>
              <div className="field">
                <label>Channel partner</label>
                <select className="select" value={partnerId} onChange={(e) => setPartnerId(e.target.value)}>
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>{p.name || p.email}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>What the partner sees</label>
                <select className="select" value={visibility} onChange={(e) => setVisibility(e.target.value)}>
                  <option value="FULL">Full — name, phone, email all visible</option>
                  <option value="PARTIAL">Partial — hide phone &amp; email</option>
                  <option value="ANONYMOUS">Anonymous — also hide the name</option>
                </select>
              </div>
              <p className="text-xs text-muted">
                The lead's assignee is updated to the channel partner. You can
                revoke this share any time from the Channel Partners page.
              </p>
            </>
          )}
          <div className="row" style={{ justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving || partners.length === 0}>
              <Share2 size={14} /> {saving ? "Sharing…" : "Share"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
