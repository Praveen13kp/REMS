import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Calendar as CalendarIcon,
  Ellipsis,
  Plus,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { fmt } from "@/lib/format"

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

const styles = `
  .calendar-cell:hover .calendar-cell-actions {
    opacity: 1 !important;
  }
`

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
  const [leads, setLeads] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [selected, setSelected] = useState(() => new Date())
  const [popoverDate, setPopoverDate] = useState(null)
  const [createdLeads, setCreatedLeads] = useState([])
  const [loadingCreated, setLoadingCreated] = useState(false)
  const popoverRef = useRef(null)

  const [calendarNotes, setCalendarNotes] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem("calendarNotes") || "{}")
      const migrated = {}
      for (const [k, v] of Object.entries(raw)) {
        if (typeof v === "string") {
          migrated[k] = [{ id: "migrated", text: v, createdAt: new Date().toISOString() }]
        } else {
          migrated[k] = v
        }
      }
      return migrated
    } catch {
      return {}
    }
  })
  const [noteModalDay, setNoteModalDay] = useState(null)
  const [noteInput, setNoteInput] = useState("")

  const monthStart = useMemo(() => startOfMonth(new Date()), [])
  const monthEnd = useMemo(() => endOfMonth(new Date()), [])

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

  const fetchCreatedLeads = async (date) => {
    setPopoverDate(date)
    setCreatedLeads([])
    setLoadingCreated(true)
    try {
      const d = new Date(date)
      const from = new Date(d.getFullYear(), d.getMonth(), d.getDate())
      const to = new Date(from)
      to.setDate(to.getDate() + 1)
      const res = await api.get("/leads", {
        params: {
          ...filters,
          pageSize: 100,
          createdFrom: from.toISOString(),
          createdTo: to.toISOString(),
          sort: "createdAt:desc",
        },
      })
      const list = res?.data?.items ?? res?.items ?? []
      setCreatedLeads(Array.isArray(list) ? list : [])
    } catch (err) {
      toast.error(err?.message || "Failed to load leads")
    } finally {
      setLoadingCreated(false)
    }
  }

  useEffect(() => {
    const handler = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setPopoverDate(null)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

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

  const monthLabel = today.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  })

  const openNoteModal = (d) => {
    setNoteInput("")
    setNoteModalDay(d)
  }

  const saveNote = () => {
    if (!noteModalDay || !noteInput.trim()) return
    const k = dayKey(noteModalDay)
    const notes = calendarNotes[k] || []
    const updated = { ...calendarNotes }
    updated[k] = [...notes, {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      text: noteInput.trim(),
      createdAt: new Date().toISOString(),
    }]
    setCalendarNotes(updated)
    localStorage.setItem("calendarNotes", JSON.stringify(updated))
    setNoteInput("")
  }

  const deleteNote = (dayKeyStr, noteId) => {
    const notes = (calendarNotes[dayKeyStr] || []).filter((n) => n.id !== noteId)
    const updated = { ...calendarNotes }
    if (notes.length === 0) {
      delete updated[dayKeyStr]
    } else {
      updated[dayKeyStr] = notes
    }
    setCalendarNotes(updated)
    localStorage.setItem("calendarNotes", JSON.stringify(updated))
  }

  return (
    <div>
      <style>{styles}</style>
      <div
        className="row row-between"
        style={{ marginBottom: 12, alignItems: "center" }}
      >
        <div className="row" style={{ gap: 8, alignItems: "center" }}>
          <CalendarIcon size={18} />
          <h3 style={{ margin: 0 }}>{monthLabel}</h3>
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
          const inMonth = d.getMonth() === monthStart.getMonth()
          if (!inMonth) {
            return (
              <div
                key={i}
                style={{
                  background: "var(--lp-surface)",
                  minHeight: 130,
                }}
              />
            )
          }
          const isToday = sameDay(d, today)
          const isSelected = sameDay(d, selected)
          const dayLeads = leadsByDay.get(dayKey(d)) || []
          const isPopoverOpen = popoverDate && sameDay(new Date(popoverDate), d)
          const noteKey = dayKey(d)
          const dayNotes = calendarNotes[noteKey]
          return (
            <div
              key={i}
              className="calendar-cell"
              style={{
                position: "relative",
                background: isSelected
                  ? "rgba(59,130,246,0.12)"
                  : "var(--lp-surface)",
                minHeight: 130,
                padding: "5px 6px",
                border: 0,
                cursor: "pointer",
                textAlign: "left",
                outline: isToday ? "2px solid var(--accent)" : "none",
                outlineOffset: -2,
                display: "flex",
                flexDirection: "column",
                gap: 3,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <button
                  type="button"
                  onClick={() => setSelected(new Date(d))}
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: isToday ? 700 : 500,
                    color: isToday ? "var(--accent)" : "var(--lp-text)",
                    background: "none",
                    border: 0,
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  {d.getDate()}
                </button>
                <div
                  className="calendar-cell-actions"
                  style={{
                    display: "flex",
                    gap: 2,
                    opacity: 0,
                    transition: "opacity 0.15s",
                    alignItems: "center",
                  }}
                >
                  <button
                    type="button"
                    title="Add note"
                    style={{
                      background: "none",
                      border: 0,
                      cursor: "pointer",
                      padding: "1px 2px",
                      lineHeight: 1,
                      borderRadius: 4,
                      color: "var(--lp-text-muted)",
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      openNoteModal(d)
                    }}
                  >
                    <Plus size={14} />
                  </button>
                  <div
                    style={{
                      borderRadius: 4,
                      padding: "1px 2px",
                      cursor: "pointer",
                      lineHeight: 1,
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (isPopoverOpen) {
                        setPopoverDate(null)
                      } else {
                        fetchCreatedLeads(d)
                      }
                    }}
                  >
                    <Ellipsis size={14} />
                  </div>
                </div>
              </div>
              {dayNotes && dayNotes.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {dayNotes.length > 1 && (
                    <div style={{
                      fontSize: "0.65rem",
                      color: "var(--lp-text-muted)",
                      lineHeight: 1.2,
                    }}>
                      {dayNotes.length} notes
                    </div>
                  )}
                  <div
                    style={{
                      fontSize: "0.7rem",
                      color: "var(--lp-text-muted)",
                      background: "rgba(255, 193, 7, 0.12)",
                      border: "1px solid rgba(255, 193, 7, 0.2)",
                      borderRadius: 4,
                      padding: "2px 4px",
                      overflow: "hidden",
                      whiteSpace: "nowrap",
                      textOverflow: "ellipsis",
                    }}
                    title={dayNotes.map((n) => n.text).join(" | ")}
                  >
                    {dayNotes[0].text}{dayNotes.length > 1 ? "…" : ""}
                  </div>
                </div>
              )}
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
              {isPopoverOpen && (
                <div
                  ref={popoverRef}
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    zIndex: 50,
                    background: "var(--lp-surface)",
                    border: "1px solid var(--lp-border)",
                    borderRadius: 8,
                    boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                    padding: 8,
                    marginTop: 2,
                    maxHeight: 200,
                    overflowY: "auto",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div
                    style={{
                      fontSize: "0.733rem",
                      fontWeight: 600,
                      color: "var(--lp-text-muted)",
                      padding: "4px 6px",
                      borderBottom: "1px solid var(--lp-border)",
                      marginBottom: 4,
                    }}
                  >
                    Added on {d.getDate()} {d.toLocaleString("en-IN", { month: "short" })}
                  </div>
                  {loadingCreated ? (
                    <div
                      style={{
                        fontSize: "0.733rem",
                        color: "var(--lp-text-muted)",
                        padding: "8px 6px",
                      }}
                    >
                      Loading…
                    </div>
                  ) : createdLeads.length === 0 ? (
                    <div
                      style={{
                        fontSize: "0.733rem",
                        color: "var(--lp-text-muted)",
                        padding: "8px 6px",
                      }}
                    >
                      No leads added on this date.
                    </div>
                  ) : (
                    createdLeads.map((l) => (
                      <div
                        key={l.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "5px 6px",
                          borderRadius: 4,
                          cursor: "pointer",
                          fontSize: "0.8rem",
                        }}
                        onClick={() => navigate(`/leads/${l.id}`)}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = "var(--lp-surface-2)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "transparent")
                        }
                      >
                        <div
                          className="avatar sm"
                          style={{ width: 20, height: 20, fontSize: "0.6rem" }}
                        >
                          {fmt.initials(l.name || "?")}
                        </div>
                        <div style={{ flex: 1, fontWeight: 500 }}>{l.name}</div>
                        <span
                          className={`badge ${STATUS_BADGE[l.status] || "badge-muted"}`}
                          style={{ fontSize: "0.6rem", padding: "1px 5px" }}
                        >
                          {l.status || "—"}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
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

      {noteModalDay && (
        <div
          className="modal-backdrop"
          onClick={() => setNoteModalDay(null)}
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 460 }}
          >
            <div className="modal-head">
              <h3>Notes for {noteModalDay.toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}</h3>
              <button
                type="button"
                onClick={() => setNoteModalDay(null)}
                aria-label="Close"
                style={{
                  background: "none",
                  border: 0,
                  cursor: "pointer",
                  color: "var(--lp-text-muted)",
                  padding: 4,
                }}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: 300, overflowY: "auto" }}>
              {(calendarNotes[dayKey(noteModalDay)] || []).map((note) => (
                <div
                  key={note.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 8,
                    padding: "6px 0",
                    borderBottom: "1px solid var(--lp-border)",
                  }}
                >
                  <div style={{ fontSize: "0.8rem", flex: 1, whiteSpace: "pre-wrap" }}>
                    {note.text}
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteNote(dayKey(noteModalDay), note.id)}
                    style={{
                      background: "none",
                      border: 0,
                      cursor: "pointer",
                      color: "var(--lp-text-muted)",
                      padding: 2,
                      flexShrink: 0,
                    }}
                    title="Delete note"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              <textarea
                className="input"
                rows={3}
                placeholder="Write a new note…"
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                autoFocus
                style={{ width: "100%", resize: "vertical", marginTop: 8 }}
              />
            </div>
            <div className="modal-foot">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setNoteModalDay(null)}
              >
                Done
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={saveNote}
                disabled={!noteInput.trim()}
              >
                Add Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
