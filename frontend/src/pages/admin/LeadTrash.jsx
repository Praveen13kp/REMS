import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { ArrowLeft, RotateCcw, Trash2, AlertTriangle } from "lucide-react"

import { api } from "@/lib/api"
import { fmt } from "@/lib/format"
import { useAuthStore } from "@/stores/authStore"
import { useRowSelection } from "@/hooks/useRowSelection"

const RETENTION_DAYS = 30
const MS_PER_DAY = 24 * 60 * 60 * 1000

// Days remaining until auto-purge. Floor so "0 days" means "deletes today."
function daysLeft(deletedAt) {
  if (!deletedAt) return 0
  const purgeAt = new Date(deletedAt).getTime() + RETENTION_DAYS * MS_PER_DAY
  return Math.max(0, Math.ceil((purgeAt - Date.now()) / MS_PER_DAY))
}

export default function LeadTrash() {
  const role = useAuthStore((s) => s.user?.role)
  const canManage = role === "OWNER" || role === "ADMIN"
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [bulkBusy, setBulkBusy] = useState(false)
  const selection = useRowSelection(leads, (l) => l.id)

  const bulkRestore = async () => {
    if (selection.count === 0) return
    setBulkBusy(true)
    let ok = 0, fail = 0
    for (const id of selection.ids) {
      try {
        await api.post(`/leads/${id}/restore`)
        ok++
      } catch {
        fail++
      }
    }
    setLeads((prev) => prev.filter((l) => !selection.isSelected(l.id)))
    selection.clear()
    setBulkBusy(false)
    if (fail === 0) toast.success(`Restored ${ok} lead${ok > 1 ? "s" : ""}`)
    else if (ok === 0) toast.error("Failed to restore")
    else toast.warning(`Restored ${ok}, failed ${fail}`)
  }

  const bulkHardDelete = async () => {
    if (selection.count === 0) return
    if (
      !window.confirm(
        `Permanently delete ${selection.count} lead${selection.count > 1 ? "s" : ""}? This cannot be undone.`,
      )
    )
      return
    setBulkBusy(true)
    let ok = 0, fail = 0
    for (const id of selection.ids) {
      try {
        await api.delete(`/leads/${id}?mode=hard`)
        ok++
      } catch {
        fail++
      }
    }
    setLeads((prev) => prev.filter((l) => !selection.isSelected(l.id)))
    selection.clear()
    setBulkBusy(false)
    if (fail === 0) toast.success(`Deleted ${ok} lead${ok > 1 ? "s" : ""}`)
    else if (ok === 0) toast.error("Failed to delete")
    else toast.warning(`Deleted ${ok}, failed ${fail}`)
  }

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get("/leads/trash")
      setLeads(res?.data ?? [])
    } catch (err) {
      toast.error(err?.message || "Failed to load Trash")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const restore = async (lead) => {
    setBusyId(lead.id)
    try {
      await api.post(`/leads/${lead.id}/restore`)
      toast.success(`Restored "${lead.name}"`)
      setLeads((prev) => prev.filter((l) => l.id !== lead.id))
    } catch (err) {
      toast.error(err?.message || "Failed to restore")
    } finally {
      setBusyId(null)
    }
  }

  const hardDelete = async (lead) => {
    if (
      !window.confirm(
        `Permanently delete "${lead.name}"? This cannot be undone.`,
      )
    )
      return
    setBusyId(lead.id)
    try {
      await api.delete(`/leads/${lead.id}?mode=hard`)
      toast.success(`Deleted "${lead.name}"`)
      setLeads((prev) => prev.filter((l) => l.id !== lead.id))
    } catch (err) {
      toast.error(err?.message || "Failed to delete")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <div className="content-head">
        <div>
          <h1>
            <Trash2 size={20} style={{ verticalAlign: "middle", marginRight: 8 }} />
            Trash
          </h1>
          <p>
            Soft-deleted leads stay here for <b>{RETENTION_DAYS} days</b> and
            then get permanently removed. Restore one to bring it back into
            your active list.
          </p>
        </div>
        <Link to="/leads" className="btn btn-secondary">
          <ArrowLeft size={14} /> Back to Leads
        </Link>
      </div>

      <div className="card">
        {selection.count > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 12px",
              marginBottom: 12,
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
                disabled={bulkBusy}
                onClick={bulkRestore}
              >
                <RotateCcw size={13} /> Restore
              </button>
              {canManage && (
                <button
                  type="button"
                  className="btn btn-sm btn-danger"
                  disabled={bulkBusy}
                  onClick={bulkHardDelete}
                >
                  <Trash2 size={13} /> Delete permanently
                </button>
              )}
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
        {loading ? (
          <p className="text-muted text-sm">Loading…</p>
        ) : leads.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "48px 20px",
              border: "1px dashed var(--lp-border)",
              borderRadius: 8,
            }}
          >
            <Trash2
              size={32}
              style={{
                color: "var(--lp-text-muted)",
                opacity: 0.5,
                marginBottom: 10,
              }}
            />
            <div style={{ fontWeight: 600, marginBottom: 4 }}>
              Trash is empty
            </div>
            <p
              className="text-muted text-sm"
              style={{ margin: 0, maxWidth: 360, marginInline: "auto" }}
            >
              When you delete a lead, it lands here first. You can restore it
              within 30 days before it&apos;s gone for good.
            </p>
          </div>
        ) : (
          <div className="table-scroll">
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
                  <th>Lead</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Deleted</th>
                  <th>Auto-purge in</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => {
                  const remaining = daysLeft(lead.deletedAt)
                  const urgent = remaining <= 3
                  return (
                    <tr
                      key={lead.id}
                      className={selection.isSelected(lead.id) ? "selected" : ""}
                    >
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selection.isSelected(lead.id)}
                          onChange={(e) =>
                            selection.toggleRow(lead.id, e.target.checked)
                          }
                          aria-label={`Select ${lead.name}`}
                        />
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{lead.name}</div>
                        <div className="text-xs text-muted">
                          {lead.email || "—"}
                        </div>
                      </td>
                      <td>{lead.phone || "—"}</td>
                      <td>
                        <span className="badge badge-muted">{lead.status}</span>
                      </td>
                      <td>
                        <div>{fmt.date(lead.deletedAt)}</div>
                        <div className="text-xs text-muted">
                          {fmt.ago ? fmt.ago(lead.deletedAt) : ""}
                        </div>
                      </td>
                      <td>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            color: urgent
                              ? "var(--lp-warning, #f59e0b)"
                              : "var(--lp-text)",
                            fontWeight: urgent ? 600 : 500,
                          }}
                        >
                          {urgent && <AlertTriangle size={12} />}
                          {remaining} day{remaining === 1 ? "" : "s"}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div
                          style={{
                            display: "inline-flex",
                            gap: 6,
                            justifyContent: "flex-end",
                          }}
                        >
                          <button
                            type="button"
                            className="btn btn-sm btn-secondary"
                            disabled={busyId === lead.id}
                            onClick={() => restore(lead)}
                          >
                            <RotateCcw size={13} /> Restore
                          </button>
                          {canManage && (
                            <button
                              type="button"
                              className="btn btn-sm btn-danger"
                              disabled={busyId === lead.id}
                              onClick={() => hardDelete(lead)}
                              title="Delete permanently"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
