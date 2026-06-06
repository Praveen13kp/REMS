import { useMemo, useState } from "react"
import { X, Lock, User, Mail, Home, Wallet, Flame } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { useFormDraft } from "@/hooks/useFormDraft"
import PhoneInput from "@/components/forms/PhoneInput"
import CityInput from "@/components/forms/CityInput"
import { detectCountryCode, getCityDataForCode } from "@/lib/cities"

const VISIBILITY_OPTIONS = [
  { value: "FULL", label: "Full Visible", help: "Company sees everything" },
  { value: "PARTIAL", label: "Partial", help: "Hide phone & email" },
  { value: "ANONYMOUS", label: "Anonymous", help: "Hide name too" },
]

// Kept in sync with the admin Add Lead form (pages/admin/AddLead.jsx) so
// requirement + budget read the same wherever a lead is captured.
const REQUIREMENT_TYPES = [
  "2 BHK Apartment",
  "3 BHK Apartment",
  "4 BHK Apartment",
  "Villa",
  "Plot",
  "Commercial",
]

const BUDGET_RANGES = [
  "Under ₹25 L",
  "₹25 L - ₹50 L",
  "₹50 L - ₹1 Cr",
  "₹1 Cr - ₹2 Cr",
  "₹2 Cr - ₹5 Cr",
  "₹5 Cr - ₹10 Cr",
  "Above ₹10 Cr",
]

// AddLeadModal supports two modes:
//   - With `company` prop: ask whether to share immediately + visibility level.
//   - With `privateOnly={true}` and no company: simple private capture. No
//     company is attached; the lead lives in the CP's private pool until
//     they share it later from the Private Leads page.
export default function AddLeadModal({ company, privateOnly = false, onClose, onCreated }) {
  // Draft-backed so closing via backdrop/X keeps what was typed; reopening
  // restores it. Keyed by mode (private vs a specific company). Cleared only
  // on Cancel or a successful create.
  const draftKey = `cp:add-lead:${privateOnly ? "private" : company?.id || "company"}`
  const [form, setForm, clearDraft] = useFormDraft(draftKey, {
    name: "",
    phone: "",
    email: "",
    city: "",
    requirementType: "",
    budget: "",
    priority: "Warm",
    visibility: "FULL",
    visibleToCompany: !privateOnly,
  })
  const [saving, setSaving] = useState(false)
  const u = (k) => (e) => {
    const v = e.target.type === "checkbox" ? e.target.checked : e.target.value
    setForm((f) => ({ ...f, [k]: v }))
  }
  // Value-setter for the controlled PhoneInput / CityInput (they emit a value,
  // not a DOM event).
  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  // The City dropdown follows the phone's country: detect the dial code from
  // the phone string, then feed that country's city dataset to CityInput.
  // Defaults to India (+91) before a number is entered.
  const countryCode = useMemo(() => detectCountryCode(form.phone), [form.phone])
  const cityData = useMemo(() => getCityDataForCode(countryCode), [countryCode])
  const NAME_REGEX = /^[a-zA-ZÀ-ÖØ-öø-ÿ\s'.-]+$/

  const submit = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error("Name and phone are required")
      return
    }
    if (!NAME_REGEX.test(form.name.trim())) {
      toast.error("Name cannot contain numbers")
      return
    }
    if (!/^\+\d{1,4}\d{8,15}$/.test(form.phone.trim())) {
      toast.error("Enter a valid phone number (country code + number)")
      return
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      toast.error("Enter a valid email address")
      return
    }
    setSaving(true)
    try {
      const payload = { ...form }
      if (privateOnly) {
        payload.companyId = null
        payload.visibleToCompany = false
      } else if (company) {
        payload.companyId = company.id
      }
      await api.post("/channel-partner/leads", payload)
      toast.success(
        privateOnly
          ? "Saved to your private pool"
          : form.visibleToCompany
            ? `Shared with ${company.name}`
            : "Saved to your private pool",
      )
      clearDraft() // successful create → drop the draft
      onCreated?.()
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || err?.message || "Failed")
    } finally {
      setSaving(false)
    }
  }

  const title = privateOnly
    ? "Add to private pool"
    : `Add lead for ${company.name}`

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {privateOnly && <Lock size={16} style={{ color: "var(--lp-accent)", flexShrink: 0 }} />}
            {title}
          </h3>
          <button type="button" className="btn-icon btn-ghost" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
          {privateOnly && (
            <div className="cp-lead-note">
              <span className="note-icon"><Lock size={16} /></span>
              <div>
                <div className="note-title">This lead stays private</div>
                <div className="note-text">
                  No company will see it until you share it from the Private Leads
                  page — you can share with one or many companies later.
                </div>
              </div>
            </div>
          )}
          <div className="grid grid-2" style={{ gap: "0 12px" }}>
            <Field label="Name *">
              <span className="input-icon">
                <User size={16} />
                <input className="input" value={form.name} onChange={u("name")} placeholder="Full name" required />
              </span>
            </Field>
            <Field label="Phone *">
              <PhoneInput
                name="phone"
                value={form.phone}
                onChange={(v) => setField("phone", v)}
              />
            </Field>
            <Field label="Email">
              <span className="input-icon">
                <Mail size={16} />
                <input className="input" type="email" value={form.email} onChange={u("email")} placeholder="name@example.com" />
              </span>
            </Field>
            <Field label="City">
              <CityInput
                name="city"
                value={form.city}
                onChange={(v) => setField("city", v)}
                cityData={cityData}
                placeholder="Select or type a city"
              />
            </Field>
            <Field label="Requirement">
              <span className="input-icon">
                <Home size={16} />
                <select className="select" value={form.requirementType} onChange={u("requirementType")}>
                  <option value="">Select requirement</option>
                  {REQUIREMENT_TYPES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </span>
            </Field>
            <Field label="Budget">
              <span className="input-icon">
                <Wallet size={16} />
                <select className="select" value={form.budget} onChange={u("budget")}>
                  <option value="">Select budget</option>
                  {BUDGET_RANGES.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </span>
            </Field>
            <Field label="Priority">
              <span className="input-icon">
                <Flame size={16} />
                <select className="select" value={form.priority} onChange={u("priority")}>
                  <option>Hot</option><option>Warm</option><option>Cold</option><option>VIP</option>
                </select>
              </span>
            </Field>
            {!privateOnly && (
              <Field label="Visibility for company">
                <select className="select" value={form.visibility} onChange={u("visibility")}>
                  {VISIBILITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label} — {o.help}</option>)}
                </select>
              </Field>
            )}
          </div>
          {!privateOnly && (
            <label className="cp-share-toggle">
              <input type="checkbox" checked={form.visibleToCompany} onChange={u("visibleToCompany")} />
              <div>
                <div className="toggle-title">Share with {company.name} immediately</div>
                <div className="toggle-sub">Uncheck to keep it in your private pool for now.</div>
              </div>
            </label>
          )}
          </div>
          <div className="modal-foot">
            <button type="button" className="btn btn-secondary" onClick={() => { clearDraft(); onClose() }}>Cancel</button>
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
