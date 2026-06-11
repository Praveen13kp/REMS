import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  List,
  StickyNote,
  Users,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { fmt } from "@/lib/format"
import { journalService } from "@/services/journalService"

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
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
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

export default function LeadsCalendar({ filters = {}, dayViewTrigger = 0, onDayViewOpened }) {
  const navigate = useNavigate()
  const [leads, setLeads] = useState([])
  const [noteCounts, setNoteCounts] = useState({})
  const [selected, setSelected] = useState(() => new Date())
  // Day view modal state
  const [dayViewDate, setDayViewDate] = useState(null)
  const [dayData, setDayData] = useState(null)
  const [dayLoading, setDayLoading] = useState(false)
  const [newNoteTitle, setNewNoteTitle] = useState("")
  const [newNoteDesc, setNewNoteDesc] = useState("")
  const [savingNote, setSavingNote] = useState(false)
  const [viewMode, setViewMode] = useState("summary")

  const monthStart = useMemo(() => startOfMonth(new Date()), [])
  const monthEnd = useMemo(() => endOfMonth(new Date()), [])

  useEffect(() => {
    let cancelled = false
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
    return () => {
      cancelled = true
    }
    }, [monthStart, monthEnd, JSON.stringify(filters)]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let cancelled = false
    const fmtDate = (d) => {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, "0")
      const day = String(d.getDate()).padStart(2, "0")
      return `${y}-${m}-${day}`
    }
    journalService.noteCounts(fmtDate(monthStart), fmtDate(monthEnd))
      .then((data) => { if (!cancelled && typeof data === "object") setNoteCounts(data) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [monthStart, monthEnd])

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

  const today = new Date()

  const monthLabel = today.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  })

  const fetchDaySummary = useCallback(async (date) => {
    if (!date) return
    setDayLoading(true)
    try {
      const res = await journalService.daySummary(date)
      setDayData(res)
      setViewMode("summary")
    } catch { toast.error("Failed to load day data") }
    finally { setDayLoading(false) }
  }, [])

  useEffect(() => {
    if (dayViewDate) fetchDaySummary(dayViewDate)
  }, [dayViewDate, fetchDaySummary])

  const handleSaveNote = async () => {
    if (!newNoteTitle.trim() || !dayViewDate) return
    setSavingNote(true)
    try {
      await journalService.create({ date: dayViewDate, title: newNoteTitle.trim(), description: newNoteDesc.trim() || undefined })
      toast.success("Note added")
      setNewNoteTitle("")
      setNewNoteDesc("")
      fetchDaySummary(dayViewDate)
    } catch (err) { toast.error(err?.message || "Failed to save note") }
    finally { setSavingNote(false) }
  }

  const formatDateLabelFull = (iso) =>
    new Date(iso).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })

  useEffect(() => {
    if (dayViewTrigger > 0) {
      const iso = selected.toISOString().split("T")[0]
      setDayViewDate(iso)
      onDayViewOpened?.()
    }
  }, [dayViewTrigger]) // eslint-disable-line react-hooks/exhaustive-deps

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
          const dayNoteCount = noteCounts[dayKey(d)] || 0
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
                    title="Day View"
                    style={{
                      background: "none",
                      border: 0,
                      cursor: "pointer",
                      padding: "1px 4px",
                      lineHeight: 1,
                      borderRadius: 4,
                      color: "var(--lp-text-muted)",
                      fontSize: "0.7rem",
                      fontWeight: 500,
                      whiteSpace: "nowrap",
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      const iso = d.toISOString().split("T")[0]
                      setDayViewDate(iso)
                    }}
                  >
                    Day View
                  </button>
                </div>
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
              {dayNoteCount > 0 && (
                <div style={{ marginTop: dayLeads.length > 0 ? 2 : 0 }}>
                  <span style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 3,
                    fontSize: "0.6rem",
                    color: "var(--lp-text-muted)",
                    fontWeight: 600,
                    letterSpacing: 0.3,
                    textTransform: "uppercase",
                    padding: "2px 4px",
                    borderRadius: 4,
                    background: "rgba(255, 193, 7, 0.12)",
                  }}>
                    <StickyNote size={10} />
                    {dayNoteCount}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Day View Modal */}
      {dayViewDate && dayData && (
        <div className="modal-backdrop" onClick={() => { setDayViewDate(null); setDayData(null); setNewNoteTitle(""); setNewNoteDesc("") }}
          style={{ animation: "fadeIn 0.15s ease" }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "680px", maxHeight: "85vh", display: "flex", flexDirection: "column", borderRadius: 16 }}>

            {/* Header with date navigation */}
            <div className="modal-head" style={{ padding: "16px 20px", borderBottom: "1px solid var(--lp-border)", flexShrink: 0 }}>
              <div className="row" style={{ gap: 8, alignItems: "center", flex: 1 }}>
                <CalendarIcon size={20} style={{ color: "var(--lp-accent)", flexShrink: 0 }} />
                <button type="button" className="btn-icon btn-ghost btn-sm"
                  onClick={() => {
                    const d = new Date(dayViewDate + "T00:00:00")
                    d.setDate(d.getDate() - 1)
                    setDayViewDate(d.toISOString().split("T")[0])
                  }}
                  title="Previous day">
                  <ChevronLeft size={18} />
                </button>
                <div style={{ position: "relative", flex: 1 }}>
                  <input
                    type="date"
                    value={dayViewDate}
                    onChange={(e) => { if (e.target.value) setDayViewDate(e.target.value) }}
                    style={{
                      fontSize: "1rem",
                      fontWeight: 700,
                      background: "transparent",
                      border: 0,
                      cursor: "pointer",
                      color: "var(--lp-text)",
                      outline: "none",
                      padding: "2px 6px",
                      borderRadius: 6,
                      width: "auto",
                      minWidth: 180,
                      fontFamily: "inherit",
                    }}
                    onFocus={(e) => e.target.style.background = "var(--lp-surface-2)"}
                    onBlur={(e) => e.target.style.background = "transparent"}
                  />
                </div>
                <button type="button" className="btn-icon btn-ghost btn-sm"
                  onClick={() => {
                    const d = new Date(dayViewDate + "T00:00:00")
                    d.setDate(d.getDate() + 1)
                    setDayViewDate(d.toISOString().split("T")[0])
                  }}
                  title="Next day">
                  <ChevronRight size={18} />
                </button>
                <span style={{ fontSize: "0.8rem", color: "var(--lp-text-muted)", marginLeft: 4 }}>
                  {new Date(dayViewDate + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short" })}
                </span>
              </div>
              <button type="button" className="btn-icon btn-ghost" onClick={() => { setDayViewDate(null); setDayData(null); setNewNoteTitle(""); setNewNoteDesc("") }}><X size={20} /></button>
            </div>

            <div className="modal-body" style={{ flex: 1, overflow: "auto", padding: "20px" }}>
              {dayLoading ? (
                <div style={{ textAlign: "center", padding: 40, color: "var(--lp-text-muted)", fontSize: "0.933rem" }}>
                  Loading…
                </div>
              ) : (
                <>
                  {/* Stats bar */}
                  <div className="row" style={{ gap: 12, marginBottom: 20 }}>
                    <div className="card" style={{ flex: 1, padding: "14px 16px", textAlign: "center", borderRadius: 10 }}>
                      <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--lp-accent)", lineHeight: 1.2 }}>{dayData.leadCount}</div>
                      <div style={{ fontSize: "0.8rem", color: "var(--lp-text-muted)", marginTop: 2 }}>Leads Created</div>
                    </div>
                    <div className="card" style={{ flex: 1, padding: "14px 16px", textAlign: "center", borderRadius: 10 }}>
                      <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--lp-accent)", lineHeight: 1.2 }}>{dayData.journalEntries.length}</div>
                      <div style={{ fontSize: "0.8rem", color: "var(--lp-text-muted)", marginTop: 2 }}>Notes</div>
                    </div>
                  </div>

                  {/* View mode pills */}
                  <div className="row" style={{ gap: 6, marginBottom: 16 }}>
                    {["summary", "leads", "notes"].map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        className={`btn btn-sm ${viewMode === mode ? "btn-primary" : "btn-ghost"}`}
                        onClick={() => setViewMode(mode)}
                        style={{ textTransform: "capitalize" }}
                      >
                        {mode === "summary" && <List size={14} style={{ marginRight: 4 }} />}
                        {mode === "leads" && <Users size={14} style={{ marginRight: 4 }} />}
                        {mode === "notes" && <StickyNote size={14} style={{ marginRight: 4 }} />}
                        {mode}
                      </button>
                    ))}
                  </div>

                  {/* Summary view */}
                  {viewMode === "summary" && (
                    <>
                      <div className="card" style={{ marginBottom: 16, padding: 16, borderRadius: 10 }}>
                        <div className="row row-between" style={{ marginBottom: 12 }}>
                          <div style={{ fontWeight: 600, fontSize: "0.933rem" }}>
                            <Users size={16} style={{ marginRight: 8, display: "inline" }} />
                            Leads
                          </div>
                          {dayData.leadCount > 0 && (
                            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setViewMode("leads")}>
                              View all {dayData.leadCount} &rarr;
                            </button>
                          )}
                        </div>
                        {dayData.leadCount === 0 ? (
                          <p className="text-sm text-muted" style={{ margin: 0 }}>No leads created on this date.</p>
                        ) : (
                          <div className="stack" style={{ gap: 8 }}>
                            {dayData.leads.slice(0, 5).map((l) => (
                              <div key={l.id} className="row" style={{ gap: 10, cursor: "pointer", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--lp-border)", transition: "all 0.15s" }}
                                onClick={() => navigate(`/leads/${l.id}`)}
                                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--lp-accent)"; e.currentTarget.style.background = "var(--lp-surface-2)" }}
                                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--lp-border)"; e.currentTarget.style.background = "transparent" }}>
                                <div className="avatar sm">{fmt.initials(l.name || "?")}</div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontWeight: 500, fontSize: "0.867rem" }}>{l.name}</div>
                                  <div style={{ fontSize: "0.78rem", color: "var(--lp-text-muted)", display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                                    {l.phone ? fmt.phone(l.phone) : "—"}
                                    <span aria-hidden style={{ opacity: 0.3 }}>|</span>
                                    <span className={`badge ${STATUS_BADGE[l.status] || "badge-muted"}`} style={{ fontSize: "0.65rem", padding: "1px 6px" }}>{l.status}</span>
                                    {l.source && <><span aria-hidden style={{ opacity: 0.3 }}>|</span>{l.source}</>}
                                  </div>
                                </div>
                              </div>
                            ))}
                            {dayData.leadCount > 5 && <p className="text-xs text-muted" style={{ textAlign: "center", margin: 0 }}>+{dayData.leadCount - 5} more leads</p>}
                          </div>
                        )}
                      </div>

                      <div className="card" style={{ marginBottom: 16, padding: 16, borderRadius: 10 }}>
                        <div className="row row-between" style={{ marginBottom: 12 }}>
                          <div style={{ fontWeight: 600, fontSize: "0.933rem" }}>
                            <StickyNote size={16} style={{ marginRight: 8, display: "inline" }} />
                            Notes
                          </div>
                          {dayData.journalEntries.length > 0 && (
                            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setViewMode("notes")}>
                              View all {dayData.journalEntries.length} &rarr;
                            </button>
                          )}
                        </div>
                        {dayData.journalEntries.length === 0 ? (
                          <p className="text-sm text-muted" style={{ margin: 0 }}>No notes for this date.</p>
                        ) : (
                          <div className="stack" style={{ gap: 8 }}>
                            {dayData.journalEntries.slice(0, 3).map((e) => (
                              <div key={e.id} style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid var(--lp-border)" }}>
                                <div style={{ fontWeight: 600, fontSize: "0.867rem" }}>{e.title}</div>
                                {e.description && <div className="text-sm" style={{ marginTop: 4, color: "var(--lp-text-muted)" }}>{e.description}</div>}
                                <div className="text-xs text-muted" style={{ marginTop: 6 }}>by {e.user?.name || "Unknown"}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="card" style={{ padding: 16, borderRadius: 10 }}>
                        <div style={{ fontWeight: 600, fontSize: "0.933rem", marginBottom: 12 }}>Add Note</div>
                        <div className="stack" style={{ gap: 10 }}>
                          <input className="input" placeholder="Note title" value={newNoteTitle} onChange={(e) => setNewNoteTitle(e.target.value)} />
                          <textarea className="input" placeholder="Write details… (optional)" rows={3} value={newNoteDesc} onChange={(e) => setNewNoteDesc(e.target.value)} style={{ resize: "vertical" }} />
                          <div className="row" style={{ justifyContent: "flex-end", gap: 8 }}>
                            <button type="button" className="btn btn-primary" disabled={savingNote || !newNoteTitle.trim()} onClick={handleSaveNote}>
                              {savingNote ? "Saving…" : "Save Note"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Leads view */}
                  {viewMode === "leads" && (
                    <div className="stack" style={{ gap: 8 }}>
                      {dayData.leads.length === 0 ? (
                        <p className="text-muted text-sm" style={{ textAlign: "center", padding: 20 }}>No leads on this date.</p>
                      ) : (
                        dayData.leads.map((l) => (
                          <div key={l.id} className="row" style={{ gap: 10, cursor: "pointer", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--lp-border)", transition: "all 0.15s" }}
                            onClick={() => navigate(`/leads/${l.id}`)}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--lp-accent)"; e.currentTarget.style.background = "var(--lp-surface-2)" }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--lp-border)"; e.currentTarget.style.background = "transparent" }}>
                            <div className="avatar sm">{fmt.initials(l.name || "?")}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 500, fontSize: "0.867rem" }}>{l.name}</div>
                              <div style={{ fontSize: "0.78rem", color: "var(--lp-text-muted)", display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                                {l.phone ? fmt.phone(l.phone) : "—"}
                                <span aria-hidden style={{ opacity: 0.3 }}>|</span>
                                <span className={`badge ${STATUS_BADGE[l.status] || "badge-muted"}`} style={{ fontSize: "0.65rem", padding: "1px 6px" }}>{l.status}</span>
                                {l.source && <><span aria-hidden style={{ opacity: 0.3 }}>|</span>{l.source}</>}
                                {l.assignedTo && <><span aria-hidden style={{ opacity: 0.3 }}>|</span>{l.assignedTo.name || l.assignedTo.email}</>}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Notes view */}
                  {viewMode === "notes" && (
                    <div className="stack" style={{ gap: 8 }}>
                      {dayData.journalEntries.length === 0 ? (
                        <p className="text-muted text-sm" style={{ textAlign: "center", padding: 20 }}>No notes on this date.</p>
                      ) : (
                        dayData.journalEntries.map((e) => (
                          <div key={e.id} style={{ padding: "12px 14px", borderRadius: 8, border: "1px solid var(--lp-border)" }}>
                            <div className="row row-between" style={{ marginBottom: 4 }}>
                              <div style={{ fontWeight: 600, fontSize: "0.933rem" }}>{e.title}</div>
                              <button type="button" className="btn-icon btn-ghost btn-sm"
                                onClick={async () => {
                                  try {
                                    await journalService.remove(e.id)
                                    toast.success("Note deleted")
                                    fetchDaySummary(dayViewDate)
                                  } catch { toast.error("Failed to delete") }
                                }}
                                title="Delete note"
                              ><X size={14} /></button>
                            </div>
                            {e.description && <div className="text-sm" style={{ marginTop: 4, whiteSpace: "pre-wrap", color: "var(--lp-text-muted)" }}>{e.description}</div>}
                            <div className="text-xs text-muted" style={{ marginTop: 8 }}>by {e.user?.name || "Unknown"} &middot; {fmt.date(e.createdAt)}</div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
