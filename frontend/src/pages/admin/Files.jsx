import { useEffect, useRef, useState } from "react"
import {
  Download,
  Eye,
  File as FileIcon,
  FileText,
  Image as ImageIcon,
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

// Visual port of leadpro-realty/src/pages/Files.jsx, wired to /api/files/*.

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
  const [usage, setUsage] = useState({
    used: 0,
    limit: null,
    unit: "GB",
    unlimited: false,
    percent: 0,
    plan: "BASIC",
  })
  const [pendingDelete, setPendingDelete] = useState(null)
  const fileInputRef = useRef(null)

  const reload = async () => {
    setLoading(true)
    try {
      const [list, use] = await Promise.all([
        api.get("/files"),
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

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleBrowse = () => fileInputRef.current?.click()

  const handleUpload = async (e) => {
    const picked = e.target.files?.[0]
    if (!picked) return
    const form = new FormData()
    form.append("file", picked)
    try {
      await api.post("/files", form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      toast.success("File uploaded")
      reload()
    } catch (err) {
      if (err?.status === 413) toast.error(err?.message || "File too large")
      else if (err?.status === 415) toast.error(err?.message || "Unsupported file type")
      else toast.error(err?.message || "Upload failed")
    } finally {
      e.target.value = ""
    }
  }

  const handleDownload = (f) => {
    window.open(`${API_BASE}/files/${f.id}/download?download=true`, "_blank")
  }

  const handlePreview = (f) => {
    // Backend now handles the logic based on mimeType, but we explicitly
    // request inline to ensure browser behavior for supported types.
    window.open(`${API_BASE}/files/${f.id}/download?inline=true`, "_blank")
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

  const filtered = files.filter((f) =>
    f.name?.toLowerCase().includes(search.toLowerCase()),
  )

  const usedBytes = usage.usedBytes ?? 0
  const limitBytes = usage.limitBytes ?? null
  // Exact percentage (not rounded) — drives the progress bar so a 0.15%
  // sliver is still visually distinguishable from 0%.
  const usedPctExact =
    !usage.unlimited && limitBytes && limitBytes > 0
      ? Math.min(100, (usedBytes / limitBytes) * 100)
      : 0
  // Rounded percentage shown in text (whole numbers read cleaner).
  const usedPctLabel =
    !usage.unlimited && limitBytes && limitBytes > 0
      ? usedPctExact < 1 && usedBytes > 0
        ? "<1"
        : Math.round(usedPctExact)
      : 0
  // Give the bar a minimum 2% width once there's any usage so users can
  // see something is filled even for tiny files.
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
        <button className="btn btn-primary" onClick={handleBrowse}>
          <Upload size={16} /> Upload Files
        </button>
        <input
          ref={fileInputRef}
          type="file"
          style={{ display: "none" }}
          onChange={handleUpload}
        />
      </div>

      <div className="card mb-4">
        <div className="dropzone" onClick={handleBrowse}>
          <UploadCloud size={36} />
          <p style={{ marginTop: 10, fontWeight: 600 }}>Drop files to upload</p>
          <p className="text-muted text-sm">
            or click to browse · max 10MB per file · PDF, DOC, XLS, images
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
        <div className="table-toolbar">
          <div className="topbar-search">
            <Search size={16} />
            <input
              placeholder="Search files…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="table-scroll">
          <table className="data">
            <thead>
              <tr>
                <th>Name</th>
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
                    colSpan={5}
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
                    colSpan={5}
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
                    <tr key={f.id}>
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

      {pendingDelete && (
        <div className="modal-backdrop" onClick={() => setPendingDelete(null)}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 420 }}
          >
            <div className="modal-header">
              <h3>Delete file?</h3>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setPendingDelete(null)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p>
                <strong>{pendingDelete.name}</strong> will be permanently removed. This cannot
                be undone.
              </p>
              <div className="row" style={{ justifyContent: "flex-end", marginTop: 12 }}>
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
        </div>
      )}
    </>
  )
}
