import { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import {
  Download,
  Eye,
  File as FileIcon,
  FileText,
  Image as ImageIcon,
  Link2,
  Mail,
  Search,
  Sheet,
  Trash2,
  Upload,
  UploadCloud,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { fmt } from "@/lib/format"
import { useAuthStore } from "@/stores/authStore"
import { useRowSelection } from "@/hooks/useRowSelection"

// Visual port of leadpro-realty/src/pages/Files.jsx, wired to /api/files/*.
// CRM extensions: every upload can be tagged with a Lead and/or Project so
// the page doubles as the company's document drawer (brochures, KYC, booking
// forms) AND a search index for per-lead paperwork.

function iconForMime(mime = "") {
  if (mime.startsWith("image/")) return ImageIcon
  if (mime === "application/pdf") return FileText
  if (mime.includes("sheet") || mime.includes("excel") || mime.includes("csv")) return Sheet
  if (mime.includes("word") || mime.includes("document") || mime.startsWith("text/")) return FileText
  return FileIcon
}

function formatBytes(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api"

export default function Files() {
  const { user } = useAuthStore()
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [leadFilter, setLeadFilter] = useState("")
  const [projectFilter, setProjectFilter] = useState("")
  const [usage, setUsage] = useState({
    used: 0,
    limit: null,
    unit: "GB",
    unlimited: false,
    percent: 0,
    plan: "BASIC",
  })
  const [leads, setLeads] = useState([])
  const [projects, setProjects] = useState([])

  const [pendingDelete, setPendingDelete] = useState(null)
  const [showUpload, setShowUpload] = useState(false)
  const [sendTarget, setSendTarget] = useState(null) // file being sent-to-lead
  const fileInputRef = useRef(null)

  const reload = async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams()
      if (leadFilter) qs.set("leadId", leadFilter)
      if (projectFilter) qs.set("projectId", projectFilter)
      qs.set("pageSize", "100")
      const [list, use] = await Promise.all([
        api.get(`/files?${qs.toString()}`),
        api.get("/files/usage"),
      ])
      setFiles(list?.data?.items ?? list?.items ?? [])
      setUsage(use?.data ?? use ?? usage)
    } catch (err) {
      toast.error(err?.message || "Failed to load files")
      setFiles([])
    } finally {
      setLoading(false)
    }
  }

  // Leads + projects are loaded once for the upload modal pickers AND the
  // toolbar filters. Capped at 500 each — the page isn't built for a 5k-lead
  // multi-select, that would need a search-ahead component.
  const loadDirectories = async () => {
    try {
      const [lr, pr] = await Promise.all([
        api.get("/leads", { params: { pageSize: 500 } }).catch(() => null),
        api.get("/projects").catch(() => null),
      ])
      const lList = lr?.data?.items ?? lr?.items ?? lr?.data ?? lr ?? []
      const pList = pr?.data?.items ?? pr?.data ?? pr?.items ?? pr ?? []
      setLeads(Array.isArray(lList) ? lList : [])
      setProjects(Array.isArray(pList) ? pList : [])
    } catch {
      // non-fatal: pickers will just be empty
    }
  }

  useEffect(() => {
    reload()
    loadDirectories()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-fetch when filters change so the BE drives the list (cheap with
  // current row counts; future-proof if we add pagination).
  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadFilter, projectFilter])

  const openUpload = () => setShowUpload(true)

  const handleDownload = (f) => {
    window.open(`${API_BASE}/files/${f.id}/download?download=true`, "_blank")
  }

  const handlePreview = (f) => {
    window.open(`${API_BASE}/files/${f.id}/download?inline=true`, "_blank")
  }

  const handleShare = async (f, target /* "copy" | "whatsapp" */) => {
    try {
      const res = await api.post(`/files/${f.id}/share`, {})
      // BE returns { token, expiresAt, url } — but the url is built from
      // req.get("host") which can resolve to a hostname the browser can't
      // reach (Docker, 0.0.0.0, etc). Rebuild it from API_BASE which the
      // browser is already talking to successfully for every other call.
      const token = res?.data?.token || res?.token
      if (!token) throw new Error("Share link unavailable")
      const url = `${API_BASE.replace(/\/$/, "")}/files/share/${token}`
      if (target === "whatsapp") {
        const msg = encodeURIComponent(`${f.name}\n${url}`)
        window.open(`https://wa.me/?text=${msg}`, "_blank")
      } else {
        await navigator.clipboard.writeText(url)
        toast.success("Share link copied")
      }
    } catch (err) {
      toast.error(err?.message || "Failed to create share link")
    }
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    try {
      await api.delete(`/files/${pendingDelete.id}`)
      toast.success("File deleted")
      reload()
    } catch (err) {
      toast.error(err?.message || "Delete failed")
    } finally {
      setPendingDelete(null)
    }
  }

  const filtered = useMemo(
    () => files.filter((f) => f.name?.toLowerCase().includes(search.toLowerCase())),
    [files, search],
  )
  const selection = useRowSelection(filtered, (f) => f.id)

  const usedBytes = usage.usedBytes ?? 0
  const limitBytes = usage.limitBytes ?? null
  const usedPctExact =
    !usage.unlimited && limitBytes && limitBytes > 0
      ? Math.min(100, (usedBytes / limitBytes) * 100)
      : 0
  const usedPctLabel =
    !usage.unlimited && limitBytes && limitBytes > 0
      ? usedPctExact < 1 && usedBytes > 0
        ? "<1"
        : Math.round(usedPctExact)
      : 0
  const barWidthPct = usage.unlimited
    ? 0
    : usedBytes > 0
      ? Math.max(2, usedPctExact)
      : 0
  const remainingBytes = usage.unlimited
    ? null
    : Math.max(0, (limitBytes ?? 0) - usedBytes)
  const nearLimit = !usage.unlimited && usedPctExact >= 90

  const canDelete = (f) =>
    user?.role === "OWNER" ||
    user?.role === "ADMIN" ||
    (f.uploader?.id && user?.id && f.uploader.id === user.id)

  // Only roles that already see full PII can email leads — mirrors the
  // restriction on the existing per-lead email modal.
  const canSendToLead =
    user?.role === "OWNER" || user?.role === "ADMIN" || user?.role === "MANAGER"

  return (
    <>
      <div className="content-head">
        <div>
          <h1>Files</h1>
          <p>
            {files.length} files ·{" "}
            {usage.unlimited
              ? `${formatBytes(usedBytes)} used · unlimited storage`
              : `${formatBytes(usedBytes)} used of ${formatBytes(limitBytes ?? 0)}`}
            .
          </p>
        </div>
        <button className="btn btn-primary" onClick={openUpload}>
          <Upload size={16} /> Upload Files
        </button>
      </div>

      <div className="card mb-4">
        <div className="dropzone" onClick={openUpload}>
          <UploadCloud size={36} />
          <p style={{ marginTop: 10, fontWeight: 600 }}>Drop files to upload</p>
          <p className="text-muted text-sm">
            or click to browse · max 10MB per file · tag with a Lead / Project on upload
          </p>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-title">
          Storage Usage{" "}
          <span
            className="text-xs text-muted"
            style={{ fontWeight: 400, marginLeft: 6 }}
          >
            · {usage.plan} plan
          </span>
        </div>
        {usage.unlimited ? (
          <div className="text-sm text-muted">
            {formatBytes(usedBytes)} used · Unlimited storage on this plan.
          </div>
        ) : (
          <>
            <div
              style={{
                height: 8,
                background: "var(--lp-surface-2)",
                borderRadius: 4,
                overflow: "hidden",
                marginBottom: 6,
              }}
            >
              <div
                style={{
                  width: barWidthPct + "%",
                  height: "100%",
                  background: nearLimit ? "var(--lp-error)" : "var(--lp-accent)",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
            <div className="text-sm text-muted">
              {formatBytes(usedBytes)} / {formatBytes(limitBytes ?? 0)} used ·{" "}
              {formatBytes(remainingBytes ?? 0)} remaining ({usedPctLabel}%)
            </div>
            {nearLimit && (
              <div
                className="text-xs"
                style={{ color: "var(--lp-error)", marginTop: 4 }}
              >
                You're close to your storage limit. Upgrade your plan or delete
                old files to free up space.
              </div>
            )}
          </>
        )}
      </div>

      <div className="table-wrap">
        <div className="table-toolbar" style={{ gap: 8, flexWrap: "wrap" }}>
          <div className="topbar-search">
            <Search size={16} />
            <input
              placeholder="Search files…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="select"
            value={leadFilter}
            onChange={(e) => setLeadFilter(e.target.value)}
            style={{ minWidth: 160 }}
            title="Filter by lead"
          >
            <option value="">All leads</option>
            {leads.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name || l.phone || l.id}
              </option>
            ))}
          </select>
          <select
            className="select"
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            style={{ minWidth: 160 }}
            title="Filter by project"
          >
            <option value="">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {(leadFilter || projectFilter) && (
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => {
                setLeadFilter("")
                setProjectFilter("")
              }}
            >
              Clear filters
            </button>
          )}
        </div>
        {selection.count > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 12px",
              borderBottom: "1px solid var(--lp-border)",
              background: "var(--lp-surface-2)",
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
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              style={{ marginLeft: "auto" }}
              onClick={selection.clear}
            >
              Clear
            </button>
          </div>
        )}
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
                    aria-label="Select all files"
                  />
                </th>
                <th>Name</th>
                <th>Linked Lead</th>
                <th>Project</th>
                <th>Size</th>
                <th>Uploaded By</th>
                <th>Date</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan={8}
                    className="text-muted text-sm"
                    style={{ textAlign: "center", padding: 24 }}
                  >
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="text-muted text-sm"
                    style={{ textAlign: "center", padding: 24 }}
                  >
                    No files yet. Upload your first file to get started.
                  </td>
                </tr>
              )}
              {!loading &&
                filtered.map((f) => {
                  const Ic = iconForMime(f.mimeType)
                  const uploaderName = f.uploader?.name || "—"
                  return (
                    <tr
                      key={f.id}
                      className={selection.isSelected(f.id) ? "selected" : ""}
                    >
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selection.isSelected(f.id)}
                          onChange={(e) =>
                            selection.toggleRow(f.id, e.target.checked)
                          }
                          aria-label={`Select ${f.name}`}
                        />
                      </td>
                      <td>
                        <div className="row">
                          <div
                            className="kpi-icon kpi-icon-amber"
                            style={{ width: 32, height: 32 }}
                          >
                            <Ic size={14} />
                          </div>
                          <span style={{ fontWeight: 600 }}>{f.name}</span>
                        </div>
                      </td>
                      <td>
                        {f.lead ? (
                          <Link
                            to={`/leads/${f.lead.id}`}
                            className="text-sm"
                            style={{ color: "var(--lp-accent)" }}
                          >
                            {f.lead.name || "Lead"}
                          </Link>
                        ) : (
                          <span className="text-sm text-muted">—</span>
                        )}
                      </td>
                      <td>
                        {f.project ? (
                          <span className="text-sm">{f.project.name}</span>
                        ) : (
                          <span className="text-sm text-muted">—</span>
                        )}
                      </td>
                      <td>{formatBytes(f.sizeBytes)}</td>
                      <td>
                        <div className="row" style={{ gap: 6 }}>
                          <div className="avatar sm">
                            {(uploaderName[0] || "?").toUpperCase()}
                          </div>
                          <span className="text-sm">{uploaderName}</span>
                        </div>
                      </td>
                      <td>{f.createdAt ? fmt.date(f.createdAt) : "—"}</td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="btn-icon btn-ghost"
                            onClick={() => handlePreview(f)}
                            title="Preview"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            className="btn-icon btn-ghost"
                            onClick={() => handleDownload(f)}
                            title="Download"
                          >
                            <Download size={14} />
                          </button>
                          <button
                            className="btn-icon btn-ghost"
                            onClick={() => handleShare(f, "copy")}
                            title="Copy share link (14-day public)"
                          >
                            <Link2 size={14} />
                          </button>
                          {canSendToLead && (
                            <button
                              className="btn-icon btn-ghost"
                              onClick={() => setSendTarget(f)}
                              title="Email to a lead"
                            >
                              <Mail size={14} />
                            </button>
                          )}
                          {canDelete(f) && (
                            <button
                              className="btn-icon btn-ghost"
                              onClick={() => setPendingDelete(f)}
                              title="Delete"
                            >
                              <Trash2 size={14} />
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
      </div>

      {showUpload && (
        <UploadModal
          leads={leads}
          projects={projects}
          onClose={() => setShowUpload(false)}
          onUploaded={() => {
            setShowUpload(false)
            reload()
          }}
        />
      )}

      {sendTarget && (
        <SendToLeadModal
          file={sendTarget}
          leads={leads}
          onClose={() => setSendTarget(null)}
          onSent={() => {
            setSendTarget(null)
            reload()
          }}
        />
      )}

      {pendingDelete && (
        <div className="modal-backdrop" onClick={() => setPendingDelete(null)}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 420 }}
          >
            <div className="modal-head">
              <h3>Delete file?</h3>
              <button
                type="button"
                className="btn-icon btn-ghost"
                onClick={() => setPendingDelete(null)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ margin: 0 }}>
                <strong>{pendingDelete.name}</strong> will be permanently removed. This cannot
                be undone.
              </p>
            </div>
            <div className="modal-foot">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setPendingDelete(null)}
              >
                Cancel
              </button>
              <button type="button" className="btn btn-danger" onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function UploadModal({ leads, projects, onClose, onUploaded }) {
  const [picked, setPicked] = useState(null)
  const [leadId, setLeadId] = useState("")
  const [projectId, setProjectId] = useState("")
  const [folder, setFolder] = useState("general")
  const [busy, setBusy] = useState(false)
  const inputRef = useRef(null)

  const submit = async (e) => {
    e.preventDefault()
    if (!picked) {
      toast.error("Pick a file first")
      return
    }
    const form = new FormData()
    form.append("file", picked)
    if (leadId) form.append("leadId", leadId)
    if (projectId) form.append("projectId", projectId)
    if (folder) form.append("folder", folder)
    setBusy(true)
    try {
      await api.post("/files", form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      toast.success("File uploaded")
      onUploaded()
    } catch (err) {
      if (err?.status === 413) toast.error(err?.message || "File too large")
      else if (err?.status === 415) toast.error(err?.message || "Unsupported file type")
      else toast.error(err?.message || "Upload failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form
        onSubmit={submit}
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 480 }}
      >
        <div className="modal-head">
          <h3>Upload file</h3>
          <button
            type="button"
            className="btn-icon btn-ghost"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="modal-body file-modal-body">
          <div className="field-row">
            <label className="field-label">File</label>
            <input
              ref={inputRef}
              type="file"
              style={{ display: "none" }}
              onChange={(e) => setPicked(e.target.files?.[0] || null)}
            />
            <div className="file-picker" onClick={() => inputRef.current?.click()}>
              <div className="file-picker-icon">
                <UploadCloud size={18} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="file-picker-name">
                  {picked ? picked.name : "Choose a file…"}
                </div>
                <div className="text-xs text-muted">
                  {picked
                    ? formatBytes(picked.size)
                    : "PDF, DOC, XLS, images · up to 10 MB"}
                </div>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={(e) => {
                  e.stopPropagation()
                  inputRef.current?.click()
                }}
              >
                Browse
              </button>
            </div>
          </div>

          <div className="field-row">
            <label className="field-label">Category</label>
            <select
              className="select"
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
            >
              <option value="general">General</option>
              <option value="brochures">Brochures</option>
              <option value="booking-forms">Booking forms</option>
              <option value="kyc">KYC docs</option>
              <option value="agreements">Agreements</option>
              <option value="floor-plans">Floor plans</option>
              <option value="price-lists">Price lists</option>
            </select>
          </div>

          <div className="field-row">
            <label className="field-label">
              Link to lead <span className="text-muted">(optional)</span>
            </label>
            <select
              className="select"
              value={leadId}
              onChange={(e) => setLeadId(e.target.value)}
            >
              <option value="">— None —</option>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name || l.phone || l.id}
                </option>
              ))}
            </select>
          </div>

          <div className="field-row">
            <label className="field-label">
              Link to project <span className="text-muted">(optional)</span>
            </label>
            <select
              className="select"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              <option value="">— None —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="modal-foot">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy || !picked}>
            {busy ? "Uploading…" : "Upload"}
          </button>
        </div>
      </form>
    </div>
  )
}

function SendToLeadModal({ file, leads, onClose, onSent }) {
  // Default to the lead the file is already tagged with — most users will
  // be sending KYC/booking docs back to that same lead.
  const [leadId, setLeadId] = useState(file?.lead?.id || "")
  const [subject, setSubject] = useState(file?.name || "")
  const [body, setBody] = useState(
    "Hi,\n\nSharing the requested document with you. Let me know if you need anything else.\n\nThanks.",
  )
  const [busy, setBusy] = useState(false)

  const leadsWithEmail = useMemo(
    () => leads.filter((l) => !!l.email),
    [leads],
  )

  const submit = async (e) => {
    e.preventDefault()
    if (!leadId) {
      toast.error("Pick a lead")
      return
    }
    setBusy(true)
    try {
      await api.post(`/files/${file.id}/send-to-lead`, { leadId, subject, body })
      toast.success("Email sent")
      onSent()
    } catch (err) {
      toast.error(err?.message || "Failed to send email")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form
        onSubmit={submit}
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 520 }}
      >
        <div className="modal-head">
          <h3>Email file to lead</h3>
          <button
            type="button"
            className="btn-icon btn-ghost"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="modal-body file-modal-body">
          <div className="attachment-chip">
            <FileText size={16} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{file.name}</div>
              <div className="text-xs text-muted">{formatBytes(file.sizeBytes)}</div>
            </div>
          </div>

          <div className="field-row">
            <label className="field-label">Lead</label>
            <select
              className="select"
              value={leadId}
              onChange={(e) => setLeadId(e.target.value)}
              required
            >
              <option value="">— Pick a lead —</option>
              {leadsWithEmail.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name || l.phone || l.id} {l.email ? `· ${l.email}` : ""}
                </option>
              ))}
            </select>
            {leadsWithEmail.length === 0 && (
              <div className="text-xs text-muted" style={{ marginTop: 4 }}>
                No leads with email addresses on file.
              </div>
            )}
          </div>

          <div className="field-row">
            <label className="field-label">Subject</label>
            <input
              className="input"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
          </div>

          <div className="field-row">
            <label className="field-label">Message</label>
            <textarea
              className="textarea"
              rows={5}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
            />
          </div>
        </div>
        <div className="modal-foot">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? "Sending…" : "Send email"}
          </button>
        </div>
      </form>
    </div>
  )
}
