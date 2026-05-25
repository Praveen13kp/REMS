import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { fmt } from "@/lib/format"

// Month-grid calendar showing every lead's nextFollowUpAt as a dot on the
// scheduled day. Click a day -> bottom panel lists the leads for that day.
// Driven by GET /leads with nextFollowUpFrom/nextFollowUpTo to keep the
// payload bounded to the current month (~ a few hundred rows max).

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function startOfMonth(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), 1)
  x.setHours(0, 0, 0, 0)
  return x
}
function endOfMonth(d) {
  const x = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  x.setHours(23, 59, 59, 999)
  return x
}
function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}
function dayKey(d) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

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

export default function LeadsCalendar({ filters = {} }) {
  const navigate = useNavigate()
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()))
  const [leads, setLeads] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [selected, setSelected] = useState(() => new Date())

  const monthStart = useMemo(() => startOfMonth(cursor), [cursor])
  const monthEnd = useMemo(() => endOfMonth(cursor), [cursor])

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    api
      .get("/leads", {
        params: {
          ...filters,
          pageSize: 500,
          nextFollowUpFrom: monthStart.toISOString(),
          nextFollowUpTo: monthEnd.toISOString(),
          sort: "nextFollowUpAt:asc",
        },
      })
      .then((res) => {
        if (cancelled) return
        const list = res?.data?.items ?? res?.items ?? []
        setLeads(Array.isArray(list) ? list : [])
      })
      .catch((err) => {
        if (!cancelled) toast.error(err?.message || "Failed to load calendar")
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [monthStart, monthEnd, JSON.stringify(filters)]) // eslint-disable-line react-hooks/exhaustive-deps

  // Pre-bucket leads by day for O(1) cell lookup.
  const leadsByDay = useMemo(() => {
    const map = new Map()
    for (const l of leads) {
      if (!l.nextFollowUpAt) continue
      const d = new Date(l.nextFollowUpAt)
      const k = dayKey(d)
      if (!map.has(k)) map.set(k, [])
      map.get(k).push(l)
    }
    return map
  }, [leads])

  // 6-row x 7-col grid starting from the first Sunday on or before the 1st.
  const cells = useMemo(() => {
    const out = []
    const first = new Date(monthStart)
    first.setDate(first.getDate() - first.getDay())
    for (let i = 0; i < 42; i++) {
      const d = new Date(first)
      d.setDate(d.getDate() + i)
      out.push(d)
    }
    return out
  }, [monthStart])

  const selectedLeads = leadsByDay.get(dayKey(selected)) || []
  const today = new Date()

  const monthLabel = cursor.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  })

  return (
    <div>
      <div
        className="row row-between"
        style={{ marginBottom: 12, alignItems: "center" }}
      >
        <div className="row" style={{ gap: 8, alignItems: "center" }}>
          <CalendarIcon size={18} />
          <h3 style={{ margin: 0 }}>{monthLabel}</h3>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={() =>
              setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))
            }
            aria-label="Previous month"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={() => {
              const n = new Date()
              setCursor(startOfMonth(n))
              setSelected(n)
            }}
          >
            Today
          </button>
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={() =>
              setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))
            }
            aria-label="Next month"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 1,
          background: "var(--lp-border)",
          border: "1px solid var(--lp-border)",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        {DOW.map((d) => (
          <div
            key={d}
            style={{
              background: "var(--lp-surface-2)",
              padding: "8px 10px",
              fontSize: "0.8rem",
              fontWeight: 600,
              color: "var(--lp-text-muted)",
              textAlign: "center",
            }}
          >
            {d}
          </div>
        ))}
        {cells.map((d, i) => {
          const inMonth = d.getMonth() === cursor.getMonth()
          const isToday = sameDay(d, today)
          const isSelected = sameDay(d, selected)
          const dayLeads = leadsByDay.get(dayKey(d)) || []
          return (
            <button
              key={i}
              type="button"
              onClick={() => setSelected(new Date(d))}
              style={{
                background: isSelected
                  ? "rgba(59,130,246,0.12)"
                  : "var(--lp-surface)",
                minHeight: 84,
                padding: 6,
                border: 0,
                cursor: "pointer",
                textAlign: "left",
                opacity: inMonth ? 1 : 0.45,
                outline: isToday ? "2px solid var(--accent)" : "none",
                outlineOffset: -2,
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <div
                style={{
                  fontSize: "0.8rem",
                  fontWeight: isToday ? 700 : 500,
                  color: isToday ? "var(--accent)" : "var(--lp-text)",
                }}
              >
                {d.getDate()}
              </div>
              {dayLeads.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {dayLeads.slice(0, 2).map((l) => (
                    <div
                      key={l.id}
                      style={{
                        fontSize: "0.733rem",
                        background: "var(--lp-surface-2)",
                        border: "1px solid var(--lp-border)",
                        borderRadius: 4,
                        padding: "1px 4px",
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                        textOverflow: "ellipsis",
                      }}
                      title={l.name}
                    >
                      {l.name}
                    </div>
                  ))}
                  {dayLeads.length > 2 && (
                    <div
                      style={{
                        fontSize: "0.667rem",
                        color: "var(--lp-text-muted)",
                      }}
                    >
                      +{dayLeads.length - 2} more
                    </div>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-title">
          <span>
            {fmt.date(selected)} — {selectedLeads.length} follow-up
            {selectedLeads.length === 1 ? "" : "s"}
          </span>
        </div>
        {isLoading ? (
          <p className="text-muted text-sm" style={{ padding: "14px 0" }}>
            Loading…
          </p>
        ) : selectedLeads.length === 0 ? (
          <p className="text-muted text-sm" style={{ padding: "14px 0" }}>
            No follow-ups scheduled for this day.
          </p>
        ) : (
          <div className="table-scroll">
            <table className="data">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Time</th>
                  <th>Assigned</th>
                </tr>
              </thead>
              <tbody>
                {selectedLeads.map((l) => (
                  <tr
                    key={l.id}
                    style={{ cursor: "pointer" }}
                    onClick={() => navigate(`/leads/${l.id}`)}
                  >
                    <td>
                      <div className="row">
                        <div className="avatar sm">
                          {fmt.initials(l.name || "?")}
                        </div>
                        <div style={{ fontWeight: 600 }}>{l.name}</div>
                      </div>
                    </td>
                    <td>{fmt.phone(l.phone)}</td>
                    <td>
                      <span
                        className={`badge ${STATUS_BADGE[l.status] || "badge-muted"}`}
                      >
                        {l.status || "—"}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.8rem", color: "var(--lp-text-muted)" }}>
                      {new Date(l.nextFollowUpAt).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td style={{ fontSize: "0.867rem" }}>
                      {l.assignedTo
                        ? l.assignedTo.name || l.assignedTo.email
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
