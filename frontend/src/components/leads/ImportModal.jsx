import { useRef, useState } from "react"
import { UploadCloud, X, CheckCircle, AlertTriangle, FileText, Download, FileSpreadsheet, ShieldCheck } from "lucide-react"
import Papa from "papaparse"
import { toast } from "sonner"

import { api } from "@/lib/api"

const PREVIEW_ROWS = 5

export default function ImportModal({ open, onClose, onImported }) {
  const fileRef = useRef(null)
  const [step, setStep] = useState("idle") // idle | preview | uploading | result
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState({ headers: [], rows: [], rowCount: 0 })
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [dragActive, setDragActive] = useState(false)

  if (!open) return null

  function reset() {
    setStep("idle")
    setFile(null)
    setPreview({ headers: [], rows: [], rowCount: 0 })
    setProgress(0)
    setResult(null)
    setError(null)
    if (fileRef.current) fileRef.current.value = ""
  }

  function handleClose() {
    reset()
    onClose?.()
  }

  function pickFile(f) {
    if (!f) return
    if (!/\.csv$/i.test(f.name)) {
      toast.error("Please choose a .csv file")
      return
    }
    setFile(f)
    setError(null)
    Papa.parse(f, {
      header: true,
      skipEmptyLines: true,
      preview: PREVIEW_ROWS + 1, // a bit more so we can compute rowCount sample
      complete: (res) => {
        const headers = res.meta?.fields ?? []
        const rows = (res.data || []).slice(0, PREVIEW_ROWS)
        // do a full count in a second pass — small files only; large files we still allow
        Papa.parse(f, {
          header: true,
          skipEmptyLines: true,
          complete: (full) => {
            setPreview({ headers, rows, rowCount: (full.data || []).length })
            setStep("preview")
          },
        })
      },
      error: (err) => {
        toast.error("CSV parse error: " + err.message)
      },
    })
  }

  async function handleUpload() {
    if (!file) return
    setStep("uploading")
    setProgress(0)

    const form = new FormData()
    form.append("file", file)

    try {
      const data = await api.post("/leads/import", form, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.round((e.loaded / e.total) * 100))
        },
      })
      setResult(data?.data ?? data)
      setStep("result")
      onImported?.()
    } catch (err) {
      setError(err)
      setStep("preview")
      if (err?.status === 413) {
        toast.error(err?.message || "File too large or too many rows")
      } else {
        toast.error(err?.message || "Import failed")
      }
    }
  }

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
        <div className="modal-head">
          <div>
            <h3>Import leads from CSV</h3>
            <p className="text-muted" style={{ fontSize: "0.867rem", marginTop: 2 }}>
              Bulk-add leads from a spreadsheet. Duplicates are detected automatically.
            </p>
          </div>
          <button type="button" className="icon-btn" onClick={handleClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {step === "idle" && (
          <>
            <div className="modal-body">
              <div
                className={`dropzone import-dropzone ${dragActive ? "is-dragging" : ""}`}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault()
                  if (!dragActive) setDragActive(true)
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setDragActive(false)
                  pickFile(e.dataTransfer.files?.[0])
                }}
                role="button"
                tabIndex={0}
              >
                <div className="dropzone-icon">
                  <UploadCloud size={28} />
                </div>
                <div className="dropzone-title">
                  {dragActive ? "Drop to upload" : "Drop a CSV file or click to browse"}
                </div>
                <div className="dropzone-sub">
                  Accepted format: <strong>.csv</strong> · Max <strong>5,000 rows</strong> · Max <strong>5 MB</strong>
                </div>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className="input"
                style={{ display: "none" }}
                onChange={(e) => pickFile(e.target.files?.[0])}
              />

              <div className="import-columns">
                <div className="import-columns-row">
                  <span className="import-columns-label">Required</span>
                  <span className="col-chip col-chip-req">name</span>
                  <span className="col-chip col-chip-req">phone</span>
                </div>
                <div className="import-columns-row">
                  <span className="import-columns-label">Optional</span>
                  <span className="col-chip">email</span>
                  <span className="col-chip">source</span>
                  <span className="col-chip">budget</span>
                  <span className="col-chip">city</span>
                  <span className="col-chip">requirementType</span>
                  <span className="col-chip">status</span>
                </div>
              </div>

              <div className="import-tips">
                <div className="import-tip">
                  <ShieldCheck size={14} />
                  <span>Duplicates by phone or email are skipped — your existing leads stay safe.</span>
                </div>
                <div className="import-tip">
                  <FileSpreadsheet size={14} />
                  <span>Column order doesn't matter — we match by header name.</span>
                </div>
              </div>
            </div>
            <div className="modal-foot" style={{ justifyContent: "space-between" }}>
              <a className="btn btn-ghost" href="/sample-leads.csv" download>
                <Download size={14} /> Download sample CSV
              </a>
              <div className="row" style={{ gap: 8 }}>
                <button type="button" className="btn btn-secondary" onClick={handleClose}>
                  Cancel
                </button>
                <button type="button" className="btn btn-primary" onClick={() => fileRef.current?.click()}>
                  <UploadCloud size={14} /> Choose file
                </button>
              </div>
            </div>
          </>
        )}

        {step === "preview" && (
          <div className="modal-body">
            <div className="row" style={{ alignItems: "center", gap: 8, marginBottom: 8 }}>
              <FileText size={18} />
              <strong>{file?.name}</strong>
              <span className="text-muted">· {preview.rowCount} rows</span>
            </div>
            <div className="table-wrap" style={{ maxHeight: 260, overflow: "auto" }}>
              <table className="data">
                <thead>
                  <tr>{preview.headers.map((h) => <th key={h}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {preview.rows.map((r, i) => (
                    <tr key={i}>
                      {preview.headers.map((h) => <td key={h}>{r[h]}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {error && (
              <div className="callout-error" style={{ marginTop: 8 }}>
                <AlertTriangle size={14} /> {error.message || "Upload failed"}
              </div>
            )}
            <div className="row" style={{ justifyContent: "space-between", marginTop: 12 }}>
              <button type="button" className="btn btn-secondary" onClick={reset}>
                Choose another file
              </button>
              <button type="button" className="btn btn-primary" onClick={handleUpload}>
                Import {preview.rowCount} leads
              </button>
            </div>
          </div>
        )}

        {step === "uploading" && (
          <div className="modal-body">
            <p>Uploading {file?.name}…</p>
            <div
              style={{
                height: 8,
                background: "var(--surface-2)",
                borderRadius: 4,
                overflow: "hidden",
                marginTop: 8,
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${progress}%`,
                  background: "var(--accent)",
                  transition: "width .2s",
                }}
              />
            </div>
            <p className="text-muted" style={{ fontSize: "0.8rem", marginTop: 6 }}>{progress}%</p>
          </div>
        )}

        {step === "result" && result && (
          <div className="modal-body">
            <div className="kpi-grid">
              <div className="card kpi" style={{ borderColor: "var(--success)" }}>
                <div className="kpi-label">Created</div>
                <div className="kpi-value" style={{ color: "var(--success)" }}>
                  {result.summary.created}
                </div>
              </div>
              <div className="card kpi" style={{ borderColor: "var(--warning)" }}>
                <div className="kpi-label">Skipped (duplicates)</div>
                <div className="kpi-value" style={{ color: "var(--warning)" }}>
                  {result.summary.skipped}
                </div>
              </div>
              <div className="card kpi" style={{ borderColor: "var(--danger)" }}>
                <div className="kpi-label">Errors</div>
                <div className="kpi-value" style={{ color: "var(--danger)" }}>
                  {result.summary.errors}
                </div>
              </div>
            </div>
            <details style={{ marginTop: 12 }}>
              <summary>Row-by-row details ({result.details.length})</summary>
              <div className="table-wrap" style={{ maxHeight: 260, overflow: "auto", marginTop: 8 }}>
                <table className="data">
                  <thead>
                    <tr><th>Row</th><th>Status</th><th>Message</th></tr>
                  </thead>
                  <tbody>
                    {result.details.map((d, i) => (
                      <tr key={i}>
                        <td>{d.row}</td>
                        <td>
                          {d.status === "CREATED" && <CheckCircle size={14} color="var(--success)" />}
                          {d.status === "SKIPPED" && <AlertTriangle size={14} color="var(--warning)" />}
                          {d.status === "ERROR" && <AlertTriangle size={14} color="var(--danger)" />}{" "}
                          {d.status}
                        </td>
                        <td>{d.message || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
            <div className="row" style={{ justifyContent: "flex-end", marginTop: 12 }}>
              <button type="button" className="btn btn-primary" onClick={handleClose}>Done</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
