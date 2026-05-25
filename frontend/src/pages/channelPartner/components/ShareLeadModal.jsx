import { useState } from "react"
import { Share2, X } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"

const VISIBILITY_OPTIONS = [
  { value: "FULL", label: "Full Visible" },
  { value: "PARTIAL", label: "Partial (hide phone & email)" },
  { value: "ANONYMOUS", label: "Anonymous (hide name too)" },
]

export default function ShareLeadModal({ lead, companies, onClose, onShared }) {
  const [companyId, setCompanyId] = useState(companies[0]?.id || "")
  const [visibility, setVisibility] = useState("FULL")
  const [saving, setSaving] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    if (!companyId) {
      toast.error("Pick a company")
      return
    }
    setSaving(true)
    try {
      await api.post(`/channel-partner/leads/${lead.id}/share`, { companyId, visibility })
      toast.success("Lead shared")
      onShared?.()
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || err?.message || "Failed")
    } finally {
      setSaving(false)
    }
  }
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Share &ldquo;{lead.name}&rdquo;</h3>
          <button type="button" className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="modal-body">
          <div className="field">
            <label>Company</label>
            <select className="select" value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Visibility</label>
            <select className="select" value={visibility} onChange={(e) => setVisibility(e.target.value)}>
              {VISIBILITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="row" style={{ justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Sharing…" : <><Share2 size={14} /> Share</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
