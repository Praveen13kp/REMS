import { Folder, Upload } from "lucide-react"

// Placeholder. CP-scoped document storage needs S3/storage decision,
// per-CP folder structure, upload signing, virus scanning, and either a
// new ChannelPartnerDocument model or extending the existing File model.

export default function Documents() {
  return (
    <>
      <div className="cp-page-head">
        <div>
          <h1>Documents</h1>
          <p>Agreements, ID proofs, property docs.</p>
        </div>
        <button type="button" className="btn btn-primary" disabled>
          <Upload size={14} /> Upload
        </button>
      </div>

      <div className="cp-coming-soon">
        <Folder size={32} style={{ opacity: 0.5 }} />
        <h2>Document vault — coming soon</h2>
        <p>
          You'll be able to upload agreements, ID proofs, PDFs, and
          property documents — both your own and per-lead. For now,
          attach files to specific leads from the lead workspace.
        </p>
      </div>
    </>
  )
}
