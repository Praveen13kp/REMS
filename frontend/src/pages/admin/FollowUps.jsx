import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Phone,
  MessageSquare,
  AlertTriangle,
  CalendarClock,
  Calendar,
  PhoneCall,
  ListChecks,
  Check,
  Clock,
  Trash2,
  MoreHorizontal,
} from "lucide-react"
import { toast } from "sonner"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { api } from "@/lib/api"
import { fmt } from "@/lib/format"
import KpiCard from "@/components/common/KpiCard"
import { useAuthStore } from "@/stores/authStore"
import { leadPiiMasked, NON_SELECTABLE_STYLE } from "@/lib/privacy"
import { useRowSelection } from "@/hooks/useRowSelection"

const STATUS_BADGE = {
  New: "badge-info",
  Contacted: "badge-info",
  Qualified: "badge-warning",
  "Proposal Sent": "badge-warning",
  Negotiation: "badge-warning",
  Interested: "badge-warning",
  "Site Visit": "badge-warning",
  Won: "badge-success",
  Booked: "badge-success",
  Lost: "badge-error",
  "Not Interested": "badge-muted",
  "Follow Up": "badge-info",
}
const PRIORITY_BADGE = {
  Hot: "badge-hot",
  Warm: "badge-warm",
  Cold: "badge-cold",
}
const statusCls = (s) => STATUS_BADGE[s] || "badge-muted"
const priorityCls = (p) => PRIORITY_BADGE[p] || "badge-muted"

const OUTCOMES = [
  { value: "CALLED", label: "Called — spoke to lead" },
  { value: "NO_ANSWER", label: "Called — no answer" },
  { value: "WHATSAPP", label: "WhatsApp / SMS sent" },
  { value: "EMAILED", label: "Emailed" },
  { value: "MET", label: "Met in person / site visit" },
  { value: "OTHER", label: "Other" },
]

function stripNonDigits(s) {
  return (s || "").replace(/\D/g, "")
}

async function dialViaAutoDialer(leadId) {
  try {
    const res = await api.post(`/leads/${leadId}/call`)
    const callId = res?.data?.callId
    toast.success(
      callId ? `Auto-dialer connecting… (${callId})` : "Auto-dialer connecting…",
    )
  } catch (err) {
    toast.error(err?.message || "Failed to place call")
  }
}

function toLocalDateTimeInput(date) {
  const pad = (n) => String(n).padStart(2, "0")
  const d = date instanceof Date ? date : new Date(date)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function RescheduleModal({ followUp, onClose, onSaved }) {
  const initial = followUp.scheduledAt
    ? toLocalDateTimeInput(new Date(followUp.scheduledAt))
    : toLocalDateTimeInput(new Date(Date.now() + 86400000))
  const [value, setValue] = useState(initial)
  const [saving, setSaving] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!value) {
      toast.error("Pick a date and time")
      return
    }
    setSaving(true)
    try {
      const iso = new Date(value).toISOString()
      const res = await api.patch(`/follow-ups/${followUp.id}`, {
        scheduledAt: iso,
      })
      toast.success("Follow-up rescheduled")
      onSaved(res?.data || { ...followUp, scheduledAt: iso })
    } catch (err) {
      toast.error(err?.message || "Failed to reschedule")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 420 }}
      >
        <form onSubmit={submit}>
          <div className="modal-head">
            <h3>Reschedule follow-up</h3>
          </div>
          <div className="modal-body">
            <div style={{ marginBottom: 10, fontSize: "0.867rem", color: "var(--lp-text-muted)" }}>
              For <b>{followUp.lead?.name}</b>
            </div>
            <label className="text-xs text-muted">New date &amp; time</label>
            <input
              type="datetime-local"
              className="input"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoFocus
            />
          </div>
          <div className="modal-foot">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function CompleteModal({ followUp, onClose, onSaved }) {
  const [outcome, setOutcome] = useState("CALLED")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await api.post(`/follow-ups/${followUp.id}/complete`, {
        outcome,
        notes: notes.trim() || null,
      })
      toast.success("Follow-up marked done")
      onSaved(res?.data || followUp)
    } catch (err) {
      toast.error(err?.message || "Failed to update")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 460 }}
      >
        <form onSubmit={submit}>
          <div className="modal-head">
            <h3>Mark follow-up done</h3>
          </div>
          <div className="modal-body">
            <div style={{ marginBottom: 12, fontSize: "0.867rem", color: "var(--lp-text-muted)" }}>
              For <b>{followUp.lead?.name}</b>
            </div>
            <label className="text-xs text-muted">Outcome</label>
            <select
              className="input"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              style={{ marginBottom: 10 }}
            >
              {OUTCOMES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <label className="text-xs text-muted">Notes (optional)</label>
            <textarea
              className="input"
              rows={3}
              placeholder="What happened on this call/visit?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="modal-foot">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving…" : "Mark done"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function FollowUpTable({ rows, missedFlag, navigate, role, onMarkDone, onReschedule, onDelete }) {
  const selection = useRowSelection(rows, (fu) => fu.id)
  return (
    <div className="table-scroll">
      {selection.count > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 12px",
            marginBottom: 8,
            background: "var(--lp-surface-2)",
            border: "1px solid var(--lp-border)",
            borderRadius: 8,
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
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={async () => {
                for (const id of selection.ids) {
                  const fu = rows.find((r) => r.id === id)
                  if (fu) await onMarkDone(fu)
                }
                selection.clear()
              }}
            >
              Mark done
            </button>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={selection.clear}
            >
              Clear
            </button>
          </div>
        </div>
      )}
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
                aria-label="Select all"
              />
            </th>
            <th>Customer</th>
            <th>Project</th>
            <th>{missedFlag ? "Was due" : "Due"}</th>
            <th>Last Contact</th>
            <th>Status</th>
            <th>Priority</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((fu) => {
            const l = fu.lead || {}
            return (
              <tr
                key={fu.id}
                className={selection.isSelected(fu.id) ? "selected" : ""}
              >
                <td onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selection.isSelected(fu.id)}
                    onChange={(e) => selection.toggleRow(fu.id, e.target.checked)}
                    aria-label={`Select ${l.name || "follow-up"}`}
                  />
                </td>
                <td>
                  <div
                    className="row"
                    style={{ cursor: "pointer" }}
                    onClick={() => navigate(`/leads/${l.id}`)}
                  >
                    <div className="avatar sm">{fmt.initials(l.name || "?")}</div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{l.name}</div>
                      <div
                        className="text-xs text-muted"
                        style={
                          leadPiiMasked(l, role) ? NON_SELECTABLE_STYLE : undefined
                        }
                        onCopy={
                          leadPiiMasked(l, role)
                            ? (e) => e.preventDefault()
                            : undefined
                        }
                      >
                        {fmt.phone(l.phone)}
                      </div>
                    </div>
                  </div>
                </td>
                <td>{l.interestedProject?.name || "—"}</td>
                <td>
                  <span style={missedFlag ? { color: "var(--error)", fontWeight: 600 } : {}}>
                    {fmt.date(fu.scheduledAt)}
                  </span>
                </td>
                <td>{l.lastContactedAt ? fmt.ago(l.lastContactedAt) : "—"}</td>
                <td>
                  <span className={`badge ${statusCls(l.status)}`}>{l.status || "—"}</span>
                </td>
                <td>
                  <span className={`badge ${priorityCls(l.priority)}`}>{l.priority || "—"}</span>
                </td>
                <td
                  className="col-actions"
                  style={{ textAlign: "right" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="btn-icon btn-ghost"
                        aria-label="Row actions"
                        title="Actions"
                      >
                        <MoreHorizontal size={16} />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="end"
                      className="row-menu p-0"
                      style={{ width: "auto" }}
                    >
                      {leadPiiMasked(l, role) ? (
                        <button
                          type="button"
                          className="row-menu-item"
                          onClick={() => dialViaAutoDialer(l.id)}
                        >
                          <Phone size={14} /> Call (auto-dialer)
                        </button>
                      ) : (
                        <>
                          <a href={`tel:${l.phone}`} className="row-menu-item">
                            <Phone size={14} /> Call
                          </a>
                          <a
                            href={`https://wa.me/${stripNonDigits(l.phone)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="row-menu-item"
                          >
                            <MessageSquare size={14} /> WhatsApp
                          </a>
                        </>
                      )}
                      <button
                        type="button"
                        className="row-menu-item"
                        onClick={() => onReschedule(fu)}
                      >
                        <Clock size={14} /> Reschedule
                      </button>
                      <button
                        type="button"
                        className="row-menu-item"
                        onClick={() => onMarkDone(fu)}
                      >
                        <Check size={14} /> Mark done
                      </button>
                      <div className="row-menu-sep" />
                      <button
                        type="button"
                        className="row-menu-item danger"
                        onClick={() => onDelete(fu)}
                      >
                        <Trash2 size={14} /> Cancel follow-up
                      </button>
                    </PopoverContent>
                  </Popover>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default function FollowUps() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const role = user?.role
  const [today, setToday] = useState([])
  const [missed, setMissed] = useState([])
  const [upcoming, setUpcoming] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [rescheduleTarget, setRescheduleTarget] = useState(null)
  const [completeTarget, setCompleteTarget] = useState(null)

  const load = async () => {
    setIsLoading(true)
    try {
      const [t, m, u] = await Promise.all([
        api.get("/follow-ups", { params: { bucket: "today" } }),
        api.get("/follow-ups", { params: { bucket: "missed" } }),
        api.get("/follow-ups", { params: { bucket: "upcoming" } }),
      ])
      setToday(t?.data ?? [])
      setMissed(m?.data ?? [])
      setUpcoming(u?.data ?? [])
    } catch (err) {
      toast.error(err?.message || "Failed to load follow-ups")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const removeFromBuckets = (id) => {
    setToday((p) => p.filter((x) => x.id !== id))
    setMissed((p) => p.filter((x) => x.id !== id))
    setUpcoming((p) => p.filter((x) => x.id !== id))
  }

  const handleMarkDone = (saved) => {
    removeFromBuckets(saved.id)
    setCompleteTarget(null)
  }

  const handleRescheduled = () => {
    // Re-fetch to put the row in the right bucket.
    setRescheduleTarget(null)
    load()
  }

  const handleDelete = async (fu) => {
    if (!window.confirm(`Cancel this follow-up for ${fu.lead?.name}?`)) return
    try {
      await api.delete(`/follow-ups/${fu.id}`)
      removeFromBuckets(fu.id)
      toast.success("Follow-up cancelled")
    } catch (err) {
      toast.error(err?.message || "Failed to cancel")
    }
  }

  return (
    <>
      <div className="content-head">
        <div>
          <h1>Follow-Ups</h1>
          <p>Stay on top of every customer touchpoint.</p>
        </div>
      </div>

      <div className="kpi-grid">
        <KpiCard label="Due Today" value={today.length} icon={PhoneCall} color="amber" />
        <KpiCard label="Missed" value={missed.length} icon={AlertTriangle} color="red" />
        <KpiCard label="Upcoming" value={upcoming.length} icon={Calendar} color="blue" />
        <KpiCard
          label="Total Active"
          value={today.length + missed.length + upcoming.length}
          icon={ListChecks}
          color="green"
        />
      </div>



      {isLoading ? (
        <div
          style={{
            padding: "40px 20px",
            textAlign: "center",
            color: "var(--lp-text-muted)",
            fontSize: "0.933rem",
          }}
        >
          Loading follow-ups…
        </div>
      ) : (
        <>
          <div className="card mb-4">
            <div className="card-title">
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <AlertTriangle size={16} style={{ color: "var(--error)" }} />
                Missed Follow-Ups ({missed.length})
              </span>
            </div>
            {missed.length ? (
              <FollowUpTable
                rows={missed}
                missedFlag
                navigate={navigate}
                role={role}
                onMarkDone={setCompleteTarget}
                onReschedule={setRescheduleTarget}
                onDelete={handleDelete}
              />
            ) : (
              <p className="text-muted text-sm" style={{ padding: "14px 0" }}>
                No missed follow-ups.
              </p>
            )}
          </div>

          <div className="card mb-4">
            <div className="card-title">
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <CalendarClock size={16} style={{ color: "var(--accent)" }} />
                Today ({today.length})
              </span>
            </div>
            {today.length ? (
              <FollowUpTable
                rows={today}
                navigate={navigate}
                role={role}
                onMarkDone={setCompleteTarget}
                onReschedule={setRescheduleTarget}
                onDelete={handleDelete}
              />
            ) : (
              <p className="text-muted text-sm" style={{ padding: "14px 0" }}>
                No follow-ups scheduled today.
              </p>
            )}
          </div>

          <div className="card">
            <div className="card-title">
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Calendar size={16} style={{ color: "var(--info)" }} />
                Upcoming ({upcoming.length})
              </span>
            </div>
            {upcoming.length ? (
              <FollowUpTable
                rows={upcoming.slice(0, 15)}
                navigate={navigate}
                role={role}
                onMarkDone={setCompleteTarget}
                onReschedule={setRescheduleTarget}
                onDelete={handleDelete}
              />
            ) : (
              <p className="text-muted text-sm" style={{ padding: "14px 0" }}>
                Nothing upcoming.
              </p>
            )}
          </div>
        </>
      )}

      {rescheduleTarget && (
        <RescheduleModal
          followUp={rescheduleTarget}
          onClose={() => setRescheduleTarget(null)}
          onSaved={handleRescheduled}
        />
      )}
      {completeTarget && (
        <CompleteModal
          followUp={completeTarget}
          onClose={() => setCompleteTarget(null)}
          onSaved={handleMarkDone}
        />
      )}
    </>
  )
}
