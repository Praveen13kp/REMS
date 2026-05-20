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
  Lightbulb,
} from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { fmt } from "@/lib/format"
import KpiCard from "@/components/common/KpiCard"
import { useAuthStore } from "@/stores/authStore"
import { leadPiiMasked, NON_SELECTABLE_STYLE } from "@/lib/privacy"

// Visual port from leadpro-realty/src/pages/FollowUps.jsx.
// TODO: replace client-side bucketing with /tasks?bucket=today endpoint when S3-BE-B-04 lands.

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

function ts(v) {
  if (!v) return null
  const t = new Date(v).getTime()
  return isNaN(t) ? null : t
}

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

function FollowUpTable({ rows, missedFlag, navigate, role }) {
  return (
    <div className="table-scroll">
      <table className="data">
        <thead>
          <tr>
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
          {rows.map((l) => (
            <tr key={l.id}>
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
              <td>{l.interestedProject?.name || l.projectName || "—"}</td>
              <td>
                <span style={missedFlag ? { color: "var(--error)", fontWeight: 600 } : {}}>
                  {fmt.date(l._due)}
                </span>
              </td>
              <td>{l.updatedAt ? fmt.ago(l.updatedAt) : "—"}</td>
              <td>
                <span className={`badge ${statusCls(l.status)}`}>{l.status || "—"}</span>
              </td>
              <td>
                <span className={`badge ${priorityCls(l.priority)}`}>{l.priority || "—"}</span>
              </td>
              <td>
                <div className="row" style={{ gap: 4 }}>
                  {leadPiiMasked(l, role) ? (
                    <button
                      type="button"
                      className="btn-icon btn-ghost"
                      aria-label="Call via auto-dialer"
                      title="Auto-dialer"
                      onClick={() => dialViaAutoDialer(l.id)}
                    >
                      <Phone size={14} />
                    </button>
                  ) : (
                    <>
                      <a
                        href={`tel:${l.phone}`}
                        className="btn-icon btn-ghost"
                        aria-label="Call"
                      >
                        <Phone size={14} />
                      </a>
                      <a
                        href={`https://wa.me/${stripNonDigits(l.phone)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-icon btn-ghost"
                        aria-label="WhatsApp"
                      >
                        <MessageSquare size={14} />
                      </a>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function FollowUps() {
  const navigate = useNavigate()
  const role = useAuthStore((s) => s.user?.role)
  const [leads, setLeads] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    api
      .get("/leads", { params: { pageSize: 500 } })
      .then((res) => {
        if (cancelled) return
        const list = res?.data?.items ?? res?.items ?? res?.data ?? []
        setLeads(Array.isArray(list) ? list : [])
      })
      .catch((err) => {
        if (!cancelled) toast.error(err?.message || "Failed to load follow-ups")
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  const startMs = start.getTime()
  const endMs = end.getTime()
  const weekAhead = endMs + 7 * 86400000

  const active = leads.filter((l) => l.status !== "Booked" && l.status !== "Lost")
  const withDue = active
    .map((l) => ({ ...l, _due: ts(l.nextFollowUpAt || l.nextFollowUp) }))
    .filter((l) => l._due != null)

  const today = withDue.filter((l) => l._due >= startMs && l._due <= endMs)
  const missed = withDue.filter((l) => l._due < startMs)
  const upcoming = withDue
    .filter((l) => l._due > endMs && l._due <= weekAhead)
    .sort((a, b) => a._due - b._due)

  return (
    <>
      <div className="content-head">
        <div>
          <h1>Follow-Ups</h1>
          <p>Stay on top of every customer touchpoint.</p>
        </div>
      </div>

      <div className="kpi-grid">
        <KpiCard label="Today's Calls" value={today.length} icon={PhoneCall} color="amber" />
        <KpiCard label="Missed" value={missed.length} icon={AlertTriangle} color="red" />
        <KpiCard label="Upcoming (7 days)" value={upcoming.length} icon={Calendar} color="blue" />
        <KpiCard
          label="Total Active"
          value={today.length + missed.length + upcoming.length}
          icon={ListChecks}
          color="green"
        />
      </div>

      <div
        className="card mb-4"
        style={{
          background: "linear-gradient(135deg,rgba(59,130,246,.08),rgba(59,130,246,.02))",
          borderColor: "rgba(59,130,246,.25)",
        }}
      >
        <div className="row" style={{ gap: 14 }}>
          <div className="kpi-icon kpi-icon-blue" style={{ width: 42, height: 42 }}>
            <Lightbulb size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700 }}>Smart Suggestion</div>
            <div className="text-muted text-sm">
              {missed.length ? (
                <>
                  <b>{missed.length} missed follow-ups</b> are at high risk of going cold. Prioritise them today.
                </>
              ) : (
                "You're all caught up. Nice work!"
              )}
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div
          style={{
            padding: "40px 20px",
            textAlign: "center",
            color: "var(--lp-text-muted)",
            fontSize: 14,
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
              <FollowUpTable rows={missed} missedFlag navigate={navigate} role={role} />
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
              <FollowUpTable rows={today} navigate={navigate} role={role} />
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
              <FollowUpTable rows={upcoming.slice(0, 15)} navigate={navigate} role={role} />
            ) : (
              <p className="text-muted text-sm" style={{ padding: "14px 0" }}>
                Nothing upcoming.
              </p>
            )}
          </div>
        </>
      )}
    </>
  )
}
