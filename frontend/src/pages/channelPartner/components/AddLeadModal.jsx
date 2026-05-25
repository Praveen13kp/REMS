import { useState } from "react"
import { X } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"

const VISIBILITY_OPTIONS = [
  { value: "FULL", label: "Full Visible", help: "Company sees everything" },
  { value: "PARTIAL", label: "Partial", help: "Hide phone & email" },
  { value: "ANONYMOUS", label: "Anonymous", help: "Hide name too" },
]

export default function AddLeadModal({ company, onClose, onCreated }) {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    city: "",
    requirementType: "",
    budget: "",
    priority: "Warm",
    visibility: "FULL",
    visibleToCompany: true,
  })
  const [saving, setSaving] = useState(false)
  const u = (k) => (e) => {
    const v = e.target.type === "checkbox" ? e.target.checked : e.target.value
    setForm((f) => ({ ...f, [k]: v }))
  }
  const submit = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error("Name and phone are required")
      return
    }
    setSaving(true)
    try {
      await api.post("/channel-partner/leads", { ...form, companyId: company.id })
      toast.success(form.visibleToCompany ? `Shared with ${company.name}` : "Saved to your private list")
      onCreated?.()
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || err?.message || "Failed")
    } finally {
      setSaving(false)
    }
  }
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Add lead for {company.name}</h3>
          <button type="button" className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="modal-body">
          <div className="grid grid-2" style={{ gap: "0 12px" }}>
            <Field label="Name *"><input className="input" value={form.name} onChange={u("name")} required /></Field>
            <Field label="Phone *"><input className="input" value={form.phone} onChange={u("phone")} required /></Field>
            <Field label="Email"><input className="input" type="email" value={form.email} onChange={u("email")} /></Field>
            <Field label="City"><input className="input" value={form.city} onChange={u("city")} /></Field>
            <Field label="Requirement"><input className="input" value={form.requirementType} onChange={u("requirementType")} placeholder="2BHK Apartment" /></Field>
            <Field label="Budget"><input className="input" value={form.budget} onChange={u("budget")} placeholder="₹50 L - ₹1 Cr" /></Field>
            <Field label="Priority">
              <select className="select" value={form.priority} onChange={u("priority")}>
                <option>Hot</option><option>Warm</option><option>Cold</option><option>VIP</option>
              </select>
            </Field>
            <Field label="Visibility for company">
              <select className="select" value={form.visibility} onChange={u("visibility")}>
                {VISIBILITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label} — {o.help}</option>)}
              </select>
            </Field>
          </div>
          <label className="checkbox" style={{ marginTop: 4 }}>
            <input type="checkbox" checked={form.visibleToCompany} onChange={u("visibleToCompany")} />
            Share with {company.name} immediately
            <span className="text-xs text-muted" style={{ marginLeft: 8 }}>(uncheck to keep private)</span>
          </label>
          <div className="row" style={{ justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : "Add Lead"}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return <div className="field"><label>{label}</label>{children}</div>
}
