import { useEffect, useState } from "react"
import { Check, ChevronDown, ChevronRight, ExternalLink } from "lucide-react"
import { toast } from "sonner"

import { integrationsService } from "@/services/integrationsService"

// IndiaMART is the simplest of the five — one credential field, fully
// self-serve from the seller dashboard, no waiting on a third party.
// Background poller (Phase 4 scheduler) picks up new credentials within
// ~60 seconds of save and polls every 300s thereafter.
const STEPS = [
  {
    n: 1,
    title: "Generate the CRM Key",
    body: (
      <ol className="wiz-list">
        <li>Log in to <ExtLink href="https://seller.indiamart.com">seller.indiamart.com</ExtLink>.</li>
        <li>Top menu → <b>Lead Manager</b> → look for <b>Import/Export Leads</b> → click the <b>API</b> tab.</li>
        <li>If you can't find it, use the dashboard search bar at the top → <i>"Lead API"</i> or <i>"CRM Integration"</i>.</li>
        <li>Click <b>"Generate API Key"</b> or <b>"Get CRM Key"</b> (button label varies).</li>
        <li>Copy the long alphanumeric string that appears.</li>
      </ol>
    ),
  },
  {
    n: 2,
    title: "Paste it below and save",
    body: (
      <p className="text-sm text-muted">
        Bizzfly will poll your IndiaMART account every 5 minutes for new leads. The first poll runs
        within ~60 seconds of save — give it a minute and check your Leads page. Click <b>Test Connection</b>
        below to verify the key works right now (pulls the last 24 hours as a preview).
      </p>
    ),
  },
  {
    n: 3,
    title: "Eligibility check",
    body: (
      <p className="text-sm text-muted">
        The Lead API is only available on <b>paid IndiaMART seller plans</b> (Star tier or higher, TrustSEAL).
        Free listings get an error from the API. If Test Connection returns "API not available on your plan",
        upgrade your IndiaMART subscription.
      </p>
    ),
  },
]

export default function ConnectIndiaMART({ editing, onClose, onSaved }) {
  const [openStep, setOpenStep] = useState(editing ? null : 1)
  const [label, setLabel] = useState("")
  const [crmKey, setCrmKey] = useState("")
  const [saving, setSaving] = useState(false)
  const [savedRow, setSavedRow] = useState(null)

  useEffect(() => {
    if (editing) {
      setLabel(editing.label || "")
      setSavedRow(editing)
    }
  }, [editing])

  const submit = async () => {
    if (!label.trim()) {
      toast.error("Give this connection a label")
      return
    }
    setSaving(true)
    try {
      let row
      if (editing) {
        const patch = { label: label.trim() }
        if (crmKey.trim()) {
          patch.credentials = { crmKey: crmKey.trim() }
        }
        row = await integrationsService.update(editing.id, patch)
        toast.success("Integration updated")
      } else {
        if (!crmKey.trim()) {
          toast.error("CRM Key is required")
          setSaving(false)
          return
        }
        row = await integrationsService.create({
          provider: "INDIAMART",
          label: label.trim(),
          credentials: { crmKey: crmKey.trim() },
        })
        toast.success("Saved — poller will pull your first batch within a minute")
      }
      setSavedRow(row)
    } catch (err) {
      const msg = err?.details?.[0]?.message || err?.message || "Save failed"
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const runTest = async () => {
    if (!savedRow?.id) return
    try {
      const result = await integrationsService.test(savedRow.id)
      if (result?.ok) toast.success(result?.info || "Connection OK")
      else toast.error(result?.error || result?.info || "Test failed")
    } catch (err) {
      toast.error(err?.message || "Test failed")
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 660, maxHeight: "90vh", overflowY: "auto" }}>
        <div className="modal-head">
          <div className="card-title" style={{ marginBottom: 0 }}>
            {editing ? "Edit IndiaMART connection" : "Connect IndiaMART"}
          </div>
        </div>
        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {!editing && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {STEPS.map((step) => (
                <Step
                  key={step.n}
                  open={openStep === step.n}
                  onToggle={() => setOpenStep(openStep === step.n ? null : step.n)}
                  step={step}
                />
              ))}
            </div>
          )}

          <div className="card">
            <div className="card-title">Credentials</div>
            <div className="field">
              <label>Label</label>
              <input
                className="input"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder='e.g. "Acme Realty IndiaMART"'
              />
            </div>
            <div className="field">
              <label>CRM Key {editing && "(leave blank to keep existing)"}</label>
              <input
                className="input"
                type="password"
                value={crmKey}
                onChange={(e) => setCrmKey(e.target.value)}
                placeholder={editing ? "(unchanged)" : "Paste the full key from seller.indiamart.com"}
                style={{ fontFamily: "monospace", fontSize: "0.8rem" }}
              />
            </div>
          </div>

          {savedRow && (
            <div className="card" style={{ background: "var(--lp-surface-2, rgba(120,120,160,0.08))" }}>
              <div className="card-title" style={{ marginBottom: 6 }}>
                <Check size={16} style={{ display: "inline", marginRight: 6, color: "var(--lp-success, #16a34a)" }} />
                Saved — polling every 5 minutes
              </div>
              <p className="text-xs text-muted" style={{ marginBottom: 8 }}>
                Bizzfly will pull new leads automatically. No webhook URL to configure on IndiaMART's side —
                this is a pull integration. Click <b>Test Connection</b> below to verify the key works now.
              </p>
              <div className="row" style={{ gap: 8 }}>
                <button className="btn btn-secondary btn-sm" onClick={runTest}>Test connection</button>
                <button className="btn btn-primary btn-sm" onClick={() => onSaved?.()}>Done</button>
              </div>
              {savedRow.lastVerifiedAt && (
                <div className="text-xs text-muted" style={{ marginTop: 6 }}>
                  Last verified: {new Date(savedRow.lastVerifiedAt).toLocaleString()}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="modal-foot">
          <button className="btn btn-secondary" onClick={onClose}>{savedRow ? "Close" : "Cancel"}</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>
            {saving ? "Saving…" : savedRow ? "Save changes" : editing ? "Save changes" : "Save"}
          </button>
        </div>
      </div>
    </div>
  )
}

function Step({ step, open, onToggle }) {
  return (
    <div style={{ border: "1px solid var(--lp-border)", borderRadius: 8, overflow: "hidden" }}>
      <button
        onClick={onToggle}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 12px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <span style={{ fontWeight: 600, fontSize: "0.867rem" }}>Step {step.n} — {step.title}</span>
      </button>
      {open && <div style={{ padding: "0 14px 12px 38px", fontSize: "0.867rem" }}>{step.body}</div>}
    </div>
  )
}

function ExtLink({ href, children }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" style={{ color: "var(--lp-accent)", textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: 3 }}>
      {children} <ExternalLink size={11} />
    </a>
  )
}
