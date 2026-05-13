import { useEffect, useRef, useState } from "react"
import {
  Download,
  Eye,
  File,
  FileText,
  Image,
  Search,
  Sheet,
  Trash2,
  Upload,
  UploadCloud,
} from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { fmt } from "@/lib/format"
import { useAuthStore } from "@/stores/authStore"

// Visual port of leadpro-realty/src/pages/Files.jsx
// Backend file endpoints are not implemented yet — UI runs against local stub state.
// TODO: requires S4-BE-B-03 (files module) for real list/upload/delete wiring.

const ICONS = { pdf: FileText, image: Image, excel: Sheet, doc: FileText }

const STORAGE_LIMIT_GB = 5
const STORAGE_USED_GB = 1.7 // stub until backend reports actual usage

export default function Files() {
  const { user } = useAuthStore()
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const fileInputRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        // TODO: requires S4-BE-B-03 — /files endpoint not implemented; treat 404 as empty
        const data = await api.get("/files")
        if (!cancelled) setFiles(Array.isArray(data) ? data : data?.items ?? [])
      } catch {
        if (!cancelled) setFiles([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const handleBrowse = () => fileInputRef.current?.click()

  const handleUpload = async (e) => {
    const picked = e.target.files?.[0]
    if (!picked) return
    const form = new FormData()
    form.append("file", picked)
    try {
      // TODO: requires S4-BE-B-03 — POST /files not implemented yet
      const created = await api.post("/files", form)
      setFiles((prev) => [created, ...prev])
      toast.success("File uploaded")
    } catch {
      // Stub: optimistically add a local row so the UI is exercisable
      setFiles((prev) => [
        {
          id: "stub_" + Date.now(),
          name: picked.name,
          size: picked.size,
          type: picked.name.split(".").pop()?.toLowerCase() || "doc",
          uploadedBy: user?.name || "You",
          uploadedAt: Date.now(),
        },
        ...prev,
      ])
      toast.success("File uploaded (stub)")
    } finally {
      e.target.value = ""
    }
  }

  const handleDelete = async (id) => {
    if (!confirm("Delete this file? This cannot be undone.")) return
    try {
      // TODO: requires S4-BE-B-03 — DELETE /files/:id not implemented yet
      await api.delete(`/files/${id}`)
    } catch {
      // fall through to local removal so stub UI works
    }
    setFiles((prev) => prev.filter((f) => f.id !== id))
    toast.success("File deleted")
  }

  const filtered = files.filter((f) =>
    f.name?.toLowerCase().includes(search.toLowerCase()),
  )

  const usedPct = Math.min(100, (STORAGE_USED_GB / STORAGE_LIMIT_GB) * 100)

  return (
    <>
      <div className="content-head">
        <div>
          <h1>Files</h1>
          <p>
            {files.length} files · {STORAGE_USED_GB} GB used of {STORAGE_LIMIT_GB} GB.
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
            or click to browse · max 100MB per file · PDF, DOC, XLS, PNG, JPG, MP4
          </p>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-title">Storage Usage</div>
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
              width: usedPct + "%",
              height: "100%",
              background: "var(--lp-accent)",
            }}
          />
        </div>
        <div className="text-sm text-muted">
          {STORAGE_USED_GB} GB / {STORAGE_LIMIT_GB} GB used ·{" "}
          {(STORAGE_LIMIT_GB - STORAGE_USED_GB).toFixed(1)} GB remaining
        </div>
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
                  <td colSpan={5} className="text-muted text-sm" style={{ textAlign: "center", padding: 24 }}>
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-muted text-sm" style={{ textAlign: "center", padding: 24 }}>
                    No files yet. Upload your first file to get started.
                  </td>
                </tr>
              )}
              {!loading &&
                filtered.map((f) => {
                  const Ic = ICONS[f.type] || File
                  const uploader =
                    typeof f.uploadedBy === "string"
                      ? f.uploadedBy
                      : f.uploadedBy?.name || "—"
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
                      <td>{((f.size || 0) / 1024).toFixed(1)} KB</td>
                      <td>
                        <div className="row" style={{ gap: 6 }}>
                          <div className="avatar sm">
                            {(uploader[0] || "?").toUpperCase()}
                          </div>
                          <span className="text-sm">{uploader}</span>
                        </div>
                      </td>
                      <td>{f.uploadedAt ? fmt.date(f.uploadedAt) : "—"}</td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="btn-icon btn-ghost"
                            onClick={() => toast.info("Preview opened")}
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            className="btn-icon btn-ghost"
                            onClick={() => toast.success("Downloaded")}
                          >
                            <Download size={14} />
                          </button>
                          <button
                            className="btn-icon btn-ghost"
                            onClick={() => handleDelete(f.id)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
