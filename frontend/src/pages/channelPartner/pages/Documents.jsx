import { useEffect, useMemo, useRef, useState } from "react"
import { Link, useOutletContext } from "react-router-dom"
import {
  Download,
  Eye,
  File as FileIcon,
  FileText,
  Image as ImageIcon,
  Link2,
  Search,
  Sheet,
  Trash2,
  Upload,
  UploadCloud,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import Pagination from "@/components/common/Pagination"

// CP document vault. Reuses the company file store (/api/files) — the BE
// scopes a channel partner to the documents they uploaded into the
// currently-selected company, so switching companies in the top bar shows
// that workspace's documents. No company selected → nothing to show yet.

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api"
const MAX_FILE_BYTES = 10 * 1024 * 1024 // mirrors the BE 10 MB cap

const FOLDERS = [
  { value: "general", label: "General" },
  { value: "agreements", label: "Agreements" },
  { value: "kyc", label: "KYC / ID proofs" },
  { value: "property-docs", label: "Property docs" },
  { value: "brochures", label: "Brochures" },
  { value: "booking-forms", label: "Booking forms" },
]
const FOLDER_LABELS = Object.fromEntries(FOLDERS.map((f) => [f.value, f.label]))

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

function canInline(mime = "") {
  return mime.startsWith("image/") || mime === "application/pdf" || mime.startsWith("text/")
}

export default function Documents() {
  const { activeCompanyId, activeCompany } = useOutletContext() ?? {}

  const [files, setFiles] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [folder, setFolder] = useState("all")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [showUpload, setShowUpload] = useState(false)
  const [initialFiles, setInitialFiles] = useState(null) // from drag-and-drop
  const [pendingDelete, setPendingDelete] = useState(null)
  const [leads, setLeads] = useState([])
  const [dragOver, setDragOver] = useState(false)

  const hasActiveFilters = !!debouncedSearch || folder !== "all"

  // Debounce the search box so we don't refetch on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  // Filters / company change → back to page 1.
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, folder, activeCompanyId])

  const reload = () => {
    if (!activeCompanyId) {
      setFiles([])
      setTotal(0)
      setLoading(false)
      return
    }
    setLoading(true)
    api
      .get("/files", {
        params: {
          companyId: activeCompanyId,
          page,
          pageSize,
          folder,
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
        },
      })
      .then((res) => {
        setFiles(res?.data?.items ?? [])
        setTotal(res?.data?.total ?? 0)
      })
      .catch((err) => toast.error(err?.message || "Failed to load documents"))
      .finally(() => setLoading(false))
  }
  useEffect(reload, [activeCompanyId, page, pageSize, folder, debouncedSearch]) // eslint-disable-line react-hooks/exhaustive-deps

  // Leads for the optional "link to lead" picker — the CP's own + shared
  // leads in this company, merged and de-duped. Best-effort; the picker
  // just hides if none load.
  useEffect(() => {
    if (!activeCompanyId) {
      setLeads([])
      return
    }
    let cancelled = false
    Promise.all([
      api.get(`/channel-partner/leads?scope=own&companyId=${activeCompanyId}`).catch(() => null),
      api.get(`/channel-partner/leads?scope=shared&companyId=${activeCompanyId}`).catch(() => null),
    ]).then(([own, shared]) => {
      if (cancelled) return
      const merged = [...(own?.data ?? []), ...(shared?.data ?? [])]
      const map = new Map(merged.filter((l) => l?.id).map((l) => [l.id, l]))
      setLeads([...map.values()])
    })
    return () => {
      cancelled = true
    }
  }, [activeCompanyId])

  const openUpload = (preset = null) => {
    setInitialFiles(preset)
    setShowUpload(true)
  }

  const handlePreview = (f) => {
    window.open(
      `${API_BASE}/files/${f.id}/download?inline=true&companyId=${activeCompanyId}`,
      "_blank",
    )
  }
  const handleDownload = (f) => {
    window.open(
      `${API_BASE}/files/${f.id}/download?download=true&companyId=${activeCompanyId}`,
      "_blank",
    )
  }
  const handleShare = async (f) => {
    try {
      const res = await api.post(`/files/${f.id}/share?companyId=${activeCompanyId}`, {})
      const token = res?.data?.token || res?.token
      if (!token) throw new Error("Share link unavailable")
      const url = `${API_BASE.replace(/\/$/, "")}/files/share/${token}`
      await navigator.clipboard.writeText(url)
      toast.success("Share link copied (valid 14 days)")
    } catch (err) {
      toast.error(err?.message || "Failed to create share link")
    }
  }
  const confirmDelete = async () => {
    if (!pendingDelete) return
    try {
      await api.delete(`/files/${pendingDelete.id}?companyId=${activeCompanyId}`)
      toast.success("Document deleted")
      reload()
    } catch (err) {
      toast.error(err?.message || "Delete failed")
    } finally {
      setPendingDelete(null)
    }
  }

  // Drag-and-drop anywhere on the table card → open the upload modal with
  // the dropped files pre-selected.
  const onDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = Array.from(e.dataTransfer?.files || [])
    if (dropped.length) openUpload(dropped)
  }

  return (
    <>
      <div className="cp-page-head">
        <div>
          <h1>Documents</h1>
          <p>
            {activeCompany
              ? `Agreements, ID proofs, and property docs for ${activeCompany.name}.`
              : "Agreements, ID proofs, and property docs."}
          </p>
        </div>
      </div>

      {!activeCompanyId ? (
        <div className="cp-empty">
          <div className="icon"><FileText size={28} /></div>
          <h3>Pick a company</h3>
          <p>Select a company in the top bar to view and upload its documents.</p>
        </div>
      ) : (
        <div
          className="cp-table-wrap"
          onDragOver={(e) => {
            e.preventDefault()
            if (!dragOver) setDragOver(true)
          }}
          onDragLeave={(e) => {
            if (e.currentTarget === e.target) setDragOver(false)
          }}
          onDrop={onDrop}
          style={dragOver ? { outline: "2px dashed var(--lp-accent)", outlineOffset: -4 } : undefined}
        >
          <div className="cp-table-toolbar">
            <div style={{ position: "relative", flex: 1, maxWidth: 320 }}>
              <Search size={14} style={{ position: "absolute", left: 10, top: 11, color: "var(--lp-text-muted)" }} />
              <input
                className="input"
                placeholder="Search documents…"
                style={{ paddingLeft: 32 }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="select"
              style={{ maxWidth: 180 }}
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
            >
              <option value="all">All categories</option>
              {FOLDERS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
            <span style={{ fontSize: 12, color: "var(--lp-text-muted)" }}>
              {total} {total === 1 ? "document" : "documents"}
            </span>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => openUpload()}
              style={{ marginLeft: "auto" }}
            >
              <Upload size={14} /> Upload
            </button>
          </div>

          {loading ? (
            <div style={{ padding: 36, color: "var(--lp-text-muted)", textAlign: "center" }}>Loading…</div>
          ) : files.length === 0 ? (
            hasActiveFilters ? (
              <div className="cp-empty">
                <div className="icon"><Search size={28} /></div>
                <h3>No matching documents</h3>
                <p>No documents match your search or category filter.</p>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ marginTop: 14 }}
                  onClick={() => {
                    setSearch("")
                    setFolder("all")
                  }}
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="cp-empty">
                <button
                  type="button"
                  className="icon"
                  onClick={() => openUpload()}
                  title="Upload a document"
                  aria-label="Upload a document"
                  style={{ border: "none", cursor: "pointer" }}
                >
                  <UploadCloud size={28} />
                </button>
                <h3>No documents yet</h3>
                <p>
                  Drag &amp; drop files here, or use Upload. Add agreements, ID
                  proofs, brochures, or property papers — they're private to you
                  within this company.
                </p>
              </div>
            )
          ) : (
            <>
              <table className="cp-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Linked lead</th>
                    <th>Size</th>
                    <th>Uploaded</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((f) => {
                    const Icon = iconForMime(f.mimeType)
                    return (
                      <tr key={f.id}>
                        <td>
                          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                            <div
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: 8,
                                background: "var(--lp-surface-2)",
                                display: "grid",
                                placeItems: "center",
                                color: "var(--lp-accent)",
                                flexShrink: 0,
                              }}
                            >
                              <Icon size={15} />
                            </div>
                            <span style={{ fontWeight: 600, wordBreak: "break-word" }}>{f.name}</span>
                          </div>
                        </td>
                        <td>
                          <span className="badge badge-muted">{FOLDER_LABELS[f.folder] || f.folder}</span>
                        </td>
                        <td>
                          {f.lead ? (
                            <Link
                              to={`/cp/leads/${f.lead.id}`}
                              style={{ color: "var(--lp-accent)" }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {f.lead.name || "View lead"}
                            </Link>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td>{formatBytes(f.sizeBytes)}</td>
                        <td>{new Date(f.createdAt).toLocaleDateString()}</td>
                        <td>
                          <div className="cp-actions">
                            {canInline(f.mimeType) && (
                              <button type="button" className="cp-action-chip" title="Preview" onClick={() => handlePreview(f)}>
                                <Eye size={13} />
                              </button>
                            )}
                            <button type="button" className="cp-action-chip" title="Download" onClick={() => handleDownload(f)}>
                              <Download size={13} />
                            </button>
                            <button type="button" className="cp-action-chip" title="Copy share link" onClick={() => handleShare(f)}>
                              <Link2 size={13} />
                            </button>
                            <button type="button" className="cp-action-chip" title="Delete" onClick={() => setPendingDelete(f)}>
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <Pagination
                page={page}
                pageSize={pageSize}
                total={total}
                onPageChange={setPage}
                onPageSizeChange={(s) => {
                  setPageSize(s)
                  setPage(1)
                }}
                itemLabel="documents"
              />
            </>
          )}
        </div>
      )}

      {showUpload && (
        <UploadModal
          companyId={activeCompanyId}
          leads={leads}
          initialFiles={initialFiles}
          onClose={() => {
            setShowUpload(false)
            setInitialFiles(null)
          }}
          onUploaded={() => {
            setShowUpload(false)
            setInitialFiles(null)
            setPage(1)
            reload()
          }}
        />
      )}

      {pendingDelete && (
        <div className="modal-backdrop" onClick={() => setPendingDelete(null)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Delete document?</h3>
              <button type="button" className="btn-icon btn-ghost" onClick={() => setPendingDelete(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p className="text-sm">
                <b>{pendingDelete.name}</b> will be permanently removed. This can't be undone.
              </p>
              <div className="row" style={{ justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setPendingDelete(null)}>Cancel</button>
                <button type="button" className="btn btn-danger" onClick={confirmDelete}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function UploadModal({ companyId, leads = [], initialFiles = null, onClose, onUploaded }) {
  const [picked, setPicked] = useState(() => (initialFiles ? Array.from(initialFiles) : []))
  const [folder, setFolder] = useState("general")
  const [leadId, setLeadId] = useState("")
  const [busy, setBusy] = useState(false)
  const inputRef = useRef(null)

  // Add files (from picker or drop), dropping any that bust the 10 MB cap
  // up front so the user gets immediate feedback instead of a server 413.
  const addFiles = (list) => {
    const incoming = Array.from(list || [])
    const tooBig = incoming.filter((f) => f.size > MAX_FILE_BYTES)
    const ok = incoming.filter((f) => f.size <= MAX_FILE_BYTES)
    if (tooBig.length) {
      toast.error(
        `${tooBig.length} file${tooBig.length === 1 ? "" : "s"} over 10 MB skipped`,
      )
    }
    // De-dupe by name+size so the same file isn't queued twice.
    setPicked((prev) => {
      const seen = new Set(prev.map((f) => `${f.name}:${f.size}`))
      return [...prev, ...ok.filter((f) => !seen.has(`${f.name}:${f.size}`))]
    })
  }

  const removeAt = (i) => setPicked((prev) => prev.filter((_, idx) => idx !== i))

  const totalBytes = useMemo(() => picked.reduce((s, f) => s + f.size, 0), [picked])

  const submit = async (e) => {
    e.preventDefault()
    if (!picked.length) {
      toast.error("Pick at least one file")
      return
    }
    setBusy(true)
    let ok = 0
    let fail = 0
    for (const file of picked) {
      const form = new FormData()
      form.append("file", file)
      form.append("folder", folder)
      if (leadId) form.append("leadId", leadId)
      try {
        // companyId goes on the query string — tenantMiddleware resolves the
        // CP's company before multer parses the multipart body.
        await api.post(`/files?companyId=${companyId}`, form, {
          headers: { "Content-Type": "multipart/form-data" },
        })
        ok++
      } catch (err) {
        fail++
        if (err?.status === 415) toast.error(`${file.name}: unsupported file type`)
        else if (err?.status === 402) toast.error(err?.message || "Storage limit reached")
        else if (err?.status === 413) toast.error(`${file.name}: too large`)
      }
    }
    setBusy(false)
    if (ok > 0) {
      toast.success(`Uploaded ${ok} document${ok === 1 ? "" : "s"}${fail ? `, ${fail} failed` : ""}`)
      onUploaded()
    } else if (fail > 0) {
      toast.error("Upload failed")
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form onSubmit={submit} className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="modal-head">
          <h3>Upload document{picked.length > 1 ? "s" : ""}</h3>
          <button type="button" className="btn-icon btn-ghost" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          <div className="field">
            <label>Files</label>
            <input
              ref={inputRef}
              type="file"
              multiple
              style={{ display: "none" }}
              onChange={(e) => addFiles(e.target.files)}
            />
            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                addFiles(e.dataTransfer?.files)
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: 14,
                border: "1px dashed var(--lp-border)",
                borderRadius: 10,
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: "var(--lp-surface-2)",
                  display: "grid",
                  placeItems: "center",
                  color: "var(--lp-accent)",
                }}
              >
                <UploadCloud size={18} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>
                  {picked.length ? `${picked.length} file${picked.length === 1 ? "" : "s"} selected` : "Drop files or click to browse"}
                </div>
                <div className="text-xs text-muted">
                  {picked.length ? `${formatBytes(totalBytes)} total` : "PDF, DOC, XLS, images · up to 10 MB each"}
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

            {picked.length > 0 && (
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                {picked.map((f, i) => (
                  <div
                    key={`${f.name}:${f.size}:${i}`}
                    className="row"
                    style={{ justifyContent: "space-between", fontSize: 12, color: "var(--lp-text-muted)" }}
                  >
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {f.name} · {formatBytes(f.size)}
                    </span>
                    <button
                      type="button"
                      className="btn-icon btn-ghost"
                      onClick={() => removeAt(i)}
                      aria-label={`Remove ${f.name}`}
                      style={{ width: 22, height: 22 }}
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="field">
            <label>Category</label>
            <select className="select" value={folder} onChange={(e) => setFolder(e.target.value)}>
              {FOLDERS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>

          {leads.length > 0 && (
            <div className="field">
              <label>Link to lead <span className="text-muted">(optional)</span></label>
              <select className="select" value={leadId} onChange={(e) => setLeadId(e.target.value)}>
                <option value="">— None —</option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>{l.name || l.phone || l.id}</option>
                ))}
              </select>
            </div>
          )}

          <div className="row" style={{ justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={busy || !picked.length}>
              {busy ? "Uploading…" : `Upload${picked.length > 1 ? ` ${picked.length}` : ""}`}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
