import { useEffect, useState } from "react"
import { AlertTriangle, Check, ChevronDown, ChevronRight, Copy, ExternalLink } from "lucide-react"
import { toast } from "sonner"

import { integrationsService } from "@/services/integrationsService"

// 7-step wizard mirrors docs/integrations/03-google-ads-credentials-guide.md.
// The big difference vs Meta: Developer Token approval is a multi-week
// gate. The form lets tenants paste creds anyway so we're ready when the
// approval lands; healthCheck will return ok:false until then.
const STEPS = [
  {
    n: 1,
    title: "Create a Google Cloud project",
    body: (
      <ol className="wiz-list">
        <li>Open <ExtLink href="https://console.cloud.google.com">console.cloud.google.com</ExtLink>.</li>
        <li>Top-left project dropdown → <b>New Project</b>.</li>
        <li>Name it (e.g. "Bizzfly CRM Integration") → Create.</li>
        <li>Switch into the new project.</li>
      </ol>
    ),
  },
  {
    n: 2,
    title: "Enable the Google Ads API",
    body: (
      <ol className="wiz-list">
        <li>Left sidebar → <b>APIs & Services → Library</b>.</li>
        <li>Search "Google Ads API" → Enable.</li>
      </ol>
    ),
  },
  {
    n: 3,
    title: "Configure OAuth consent screen",
    body: (
      <ol className="wiz-list">
        <li>Left sidebar → <b>APIs & Services → OAuth consent screen</b>.</li>
        <li>User Type: <b>External</b> → Create.</li>
        <li>Fill app name + support email + developer contact.</li>
        <li>Add scope: <code>https://www.googleapis.com/auth/adwords</code>.</li>
        <li>Add yourself as a Test User.</li>
      </ol>
    ),
  },
  {
    n: 4,
    title: "Create OAuth 2.0 credentials",
    body: (
      <ol className="wiz-list">
        <li>Left sidebar → <b>APIs & Services → Credentials</b>.</li>
        <li><b>+ Create Credentials → OAuth client ID</b> → Web application.</li>
        <li>
          Authorized redirect URI: add <code>https://developers.google.com/oauthplayground</code>
          {" "}— required for the refresh-token step.
        </li>
        <li>Create → copy the <b>Client ID</b> and <b>Client Secret</b>.</li>
      </ol>
    ),
  },
  {
    n: 5,
    title: "Get the Developer Token (the wall — 1–3 weeks)",
    body: (
      <ol className="wiz-list">
        <li>Sign in to <ExtLink href="https://ads.google.com">ads.google.com</ExtLink> with your <b>Google Ads Manager Account (MCC)</b>.</li>
        <li>Top-right → <b>Tools & Settings → Setup → API Center</b>.</li>
        <li>Fill the application form (company, use case = "CRM integration to sync lead form submissions"). Submit.</li>
        <li><b>Test Access</b> is issued instantly. <b>Basic Access</b> (production) takes 1–3 weeks of review by Google.</li>
        <li>Once approved, copy the <b>Developer Token</b>.</li>
      </ol>
    ),
  },
  {
    n: 6,
    title: "Generate the Refresh Token via OAuth Playground",
    body: (
      <ol className="wiz-list">
        <li>Open <ExtLink href="https://developers.google.com/oauthplayground">OAuth Playground</ExtLink>.</li>
        <li>Top-right ⚙ → check <b>"Use your own OAuth credentials"</b> → paste Client ID + Client Secret.</li>
        <li>Step 1 → "Input your own scopes" → <code>https://www.googleapis.com/auth/adwords</code> → Authorize APIs.</li>
        <li>Sign in with the Google account that has access to the Ads account → Allow.</li>
        <li>Step 2 → Exchange authorization code for tokens → copy the <b>Refresh Token</b>.</li>
      </ol>
    ),
  },
  {
    n: 7,
    title: "Configure Lead Form webhook in Google Ads",
    body: (
      <ol className="wiz-list">
        <li>After saving credentials below, Bizzfly will show you a webhook URL.</li>
        <li>Sign in to <ExtLink href="https://ads.google.com">ads.google.com</ExtLink> → <b>Ads & Extensions → Extensions</b>.</li>
        <li>Find your Lead form extension → edit → expand <b>Delivery options</b>.</li>
        <li>Webhook URL: paste the URL Bizzfly shows.</li>
        <li><b>Key</b>: paste the same <b>Webhook Key</b> you entered into Bizzfly below.</li>
        <li>Click <b>Send test data</b> — it should land in Bizzfly within a few seconds.</li>
      </ol>
    ),
  },
]

const emptyForm = {
  label: "",
  clientId: "",
  clientSecret: "",
  developerToken: "",
  refreshToken: "",
  customerId: "",
  loginCustomerId: "",
  webhookKey: "",
}

const CRED_KEYS = [
  "clientId",
  "clientSecret",
  "developerToken",
  "refreshToken",
  "customerId",
  "webhookKey",
]

export default function ConnectGoogle({ editing, onClose, onSaved }) {
  const [openStep, setOpenStep] = useState(editing ? null : 1)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [savedRow, setSavedRow] = useState(null)

  useEffect(() => {
    if (editing) {
      setForm({ ...emptyForm, label: editing.label || "" })
      setSavedRow(editing)
    }
  }, [editing])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async () => {
    if (!form.label.trim()) {
      toast.error("Give this connection a label")
      return
    }
    setSaving(true)
    try {
      const credsFilled = CRED_KEYS.every((k) => String(form[k] || "").trim().length > 0)

      let row
      if (editing) {
        const patch = { label: form.label.trim() }
        if (credsFilled) {
          patch.credentials = buildCreds(form)
        }
        row = await integrationsService.update(editing.id, patch)
        toast.success("Integration updated")
      } else {
        if (!credsFilled) {
          toast.error("All credential fields are required")
          setSaving(false)
          return
        }
        row = await integrationsService.create({
          provider: "GOOGLE_ADS",
          label: form.label.trim(),
          credentials: buildCreds(form),
        })
        toast.success("Google Ads connected — test the connection next")
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
      else toast.error(result?.error || result?.info || "Connection failed")
    } catch (err) {
      toast.error(err?.message || "Test failed")
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720, maxHeight: "90vh", overflowY: "auto" }}>
        <div className="modal-head">
          <div className="card-title" style={{ marginBottom: 0 }}>
            {editing ? "Edit Google Ads connection" : "Connect Google Ads Lead Forms"}
          </div>
        </div>
        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {!editing && (
            <>
              <div
                className="card"
                style={{
                  background: "var(--lp-warning-bg, rgba(217,119,6,0.08))",
                  borderColor: "var(--lp-warning, #d97706)",
                  padding: "10px 12px",
                }}
              >
                <div className="row" style={{ gap: 8, alignItems: "flex-start" }}>
                  <AlertTriangle size={16} style={{ color: "var(--lp-warning, #d97706)", flex: "none", marginTop: 2 }} />
                  <div className="text-xs">
                    <b>Developer Token approval takes 1–3 weeks.</b> You can save credentials now;
                    leads will start flowing as soon as Google approves your token. Test Connection
                    will fail until then with "developer token not approved".
                  </div>
                </div>
              </div>

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
            </>
          )}

          <div className="card" style={{ marginTop: 4 }}>
            <div className="card-title">Credentials</div>
            <div className="field">
              <label>Label</label>
              <input
                className="input"
                placeholder='e.g. "Acme Realty Google Ads"'
                value={form.label}
                onChange={set("label")}
              />
            </div>
            <div className="grid grid-2" style={{ gap: "0 14px" }}>
              <div className="field">
                <label>Client ID</label>
                <input className="input" value={form.clientId} onChange={set("clientId")} placeholder={editing ? "(unchanged)" : ""} />
              </div>
              <div className="field">
                <label>Client Secret</label>
                <input className="input" type="password" value={form.clientSecret} onChange={set("clientSecret")} placeholder={editing ? "(unchanged)" : ""} />
              </div>
              <div className="field">
                <label>Developer Token</label>
                <input className="input" type="password" value={form.developerToken} onChange={set("developerToken")} placeholder={editing ? "(unchanged)" : ""} />
              </div>
              <div className="field">
                <label>Refresh Token</label>
                <input className="input" type="password" value={form.refreshToken} onChange={set("refreshToken")} placeholder={editing ? "(unchanged)" : ""} />
              </div>
              <div className="field">
                <label>Customer ID <span className="text-xs text-muted">(digits only, no dashes)</span></label>
                <input className="input" value={form.customerId} onChange={set("customerId")} placeholder={editing ? "(unchanged)" : "1234567890"} />
              </div>
              <div className="field">
                <label>Login Customer ID <span className="text-xs text-muted">(optional, MCC)</span></label>
                <input className="input" value={form.loginCustomerId} onChange={set("loginCustomerId")} placeholder={editing ? "(unchanged)" : ""} />
              </div>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label>Webhook Key <span className="text-xs text-muted">(make up a random secret — paste the same into Google Ads Lead Form delivery)</span></label>
                <input className="input" value={form.webhookKey} onChange={set("webhookKey")} placeholder={editing ? "(unchanged)" : "min 8 chars"} />
              </div>
            </div>
            {editing && (
              <p className="text-xs text-muted" style={{ marginTop: 6 }}>
                Leave credential fields blank to keep existing values. Fill all six to rotate.
              </p>
            )}
          </div>

          {savedRow?.webhookUrl && (
            <div className="card" style={{ background: "var(--lp-surface-2, rgba(120,120,160,0.08))" }}>
              <div className="card-title" style={{ marginBottom: 6 }}>
                <Check size={16} style={{ display: "inline", marginRight: 6, color: "var(--lp-success, #16a34a)" }} />
                Webhook URL — paste this into Google Ads
              </div>
              <p className="text-xs text-muted" style={{ marginBottom: 8 }}>
                Google Ads → Ads & Extensions → your Lead form extension → Delivery options →
                Webhook URL = this URL, Key = the same value you set above.
              </p>
              <div className="row" style={{ gap: 8 }}>
                <input
                  className="input"
                  readOnly
                  value={savedRow.webhookUrl}
                  style={{ flex: 1, fontFamily: "monospace", fontSize: 12 }}
                />
                <CopyButton text={savedRow.webhookUrl} label="URL" />
              </div>
              <div className="row" style={{ marginTop: 10, gap: 8 }}>
                <button className="btn btn-secondary btn-sm" onClick={runTest}>Test connection</button>
                <button className="btn btn-primary btn-sm" onClick={() => onSaved?.()}>Done</button>
              </div>
            </div>
          )}
        </div>
        <div className="modal-foot">
          <button className="btn btn-secondary" onClick={onClose}>{savedRow ? "Close" : "Cancel"}</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>
            {saving ? "Saving…" : savedRow ? "Save changes" : editing ? "Save changes" : "Save & continue"}
          </button>
        </div>
      </div>
    </div>
  )
}

function buildCreds(form) {
  return {
    clientId: form.clientId.trim(),
    clientSecret: form.clientSecret.trim(),
    developerToken: form.developerToken.trim(),
    refreshToken: form.refreshToken.trim(),
    customerId: form.customerId.trim(),
    loginCustomerId: form.loginCustomerId.trim() || undefined,
    webhookKey: form.webhookKey.trim(),
  }
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
        <span style={{ fontWeight: 600, fontSize: 13 }}>Step {step.n} — {step.title}</span>
      </button>
      {open && <div style={{ padding: "0 14px 12px 38px", fontSize: 13 }}>{step.body}</div>}
    </div>
  )
}

function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
      toast.success(`${label} copied`)
    } catch {
      toast.error("Copy failed")
    }
  }
  return (
    <button className="btn btn-secondary btn-sm" onClick={copy}>
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  )
}

function ExtLink({ href, children }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" style={{ color: "var(--lp-accent)", textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: 3 }}>
      {children} <ExternalLink size={11} />
    </a>
  )
}
