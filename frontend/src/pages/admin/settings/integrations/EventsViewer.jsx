import { useEffect, useState } from "react"
import { RefreshCw } from "lucide-react"
import { toast } from "sonner"

import { integrationsService } from "@/services/integrationsService"

// Read-only inspector for the last N inbound webhook events on a single
// integration. Tenants use this to debug "why didn't my lead arrive?" —
// each row shows when the event was received, whether it became a Lead
// or failed (and why), and a truncated preview of the payload.
//
// This is the operator-visible surface of the WebhookEvent table we've
// been recording since Phase 0. No write actions; intentionally
// minimal — we can grow it (re-process button, full payload viewer)
// when real customers ask.

export default function EventsViewer({ row, onClose }) {
  const [events, setEvents] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState({}) // { eventId: true }

  const load = async () => {
    setLoading(true)
    try {
      const list = await integrationsService.events(row.id, 50)
      setEvents(list)
    } catch (err) {
      toast.error(err?.message || "Failed to load events")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row?.id])

  const toggle = (id) => setExpanded((m) => ({ ...m, [id]: !m[id] }))

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 820, maxHeight: "90vh", overflowY: "auto" }}
      >
        <div className="modal-head">
          <div className="card-title" style={{ marginBottom: 0 }}>
            Recent events — {row.label}
          </div>
        </div>
        <div className="modal-body">
          <div className="row row-between" style={{ marginBottom: 8 }}>
            <p className="text-xs text-muted" style={{ marginBottom: 0 }}>
              Last 50 inbound webhook deliveries. Useful when leads aren't arriving as expected —
              FAILED rows have an error message; DUPLICATE rows arrived after an identical event
              we already processed.
            </p>
            <button className="btn btn-secondary btn-sm" onClick={load} disabled={loading}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          {loading && events === null ? (
            <p className="text-muted text-sm">Loading…</p>
          ) : events && events.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: 24 }}>
              <p className="text-sm text-muted" style={{ marginBottom: 4 }}>
                No webhook events recorded yet.
              </p>
              <p className="text-xs text-muted">
                For push-style integrations (Meta, Google, Website, JustDial Push), this fills up as
                leads are delivered. Pull-style integrations (JustDial Pull, IndiaMART) show one entry
                per individual lead the poller pulled in.
              </p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Status</th>
                    <th>External ID</th>
                    <th>Error</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {events.map((e) => (
                    <EventRow key={e.id} event={e} expanded={expanded[e.id]} onToggle={() => toggle(e.id)} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="modal-foot">
          <button className="btn btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

function EventRow({ event, expanded, onToggle }) {
  const badge =
    event.status === "PROCESSED" ? "badge-success" :
    event.status === "DUPLICATE" ? "badge-muted" :
    event.status === "FAILED" ? "badge-danger" :
    "badge-warning"

  return (
    <>
      <tr style={{ cursor: "pointer" }} onClick={onToggle}>
        <td style={{ whiteSpace: "nowrap", fontSize: "0.8rem" }}>
          {new Date(event.receivedAt).toLocaleString()}
        </td>
        <td>
          <span className={`badge ${badge}`}>{event.status.toLowerCase()}</span>
        </td>
        <td style={{ fontFamily: "monospace", fontSize: "0.733rem" }}>
          {truncate(event.externalId, 28)}
        </td>
        <td style={{ fontSize: "0.8rem", color: event.errorMessage ? "var(--lp-danger,#dc2626)" : undefined }}>
          {event.errorMessage ? truncate(event.errorMessage, 60) : "—"}
        </td>
        <td style={{ textAlign: "right", fontSize: "0.733rem", color: "var(--lp-text-muted)" }}>
          {expanded ? "Hide" : "Show"}
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={5} style={{ background: "var(--lp-surface-2, rgba(120,120,160,0.06))" }}>
            <pre
              style={{
                fontSize: "0.733rem",
                margin: 0,
                padding: 10,
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
                fontFamily: "monospace",
              }}
            >
              {prettifyPayload(event.payloadPreview)}
            </pre>
            {event.processedAt && (
              <div className="text-xs text-muted" style={{ padding: "0 10px 10px" }}>
                Processed at {new Date(event.processedAt).toLocaleString()}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  )
}

function truncate(s, n) {
  if (!s) return "—"
  const str = String(s)
  return str.length > n ? str.slice(0, n) + "…" : str
}

function prettifyPayload(p) {
  if (!p) return "(no payload)"
  try {
    return JSON.stringify(JSON.parse(p), null, 2)
  } catch {
    return p
  }
}
