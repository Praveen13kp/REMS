import { useEffect, useState } from "react"
import { Check, ChevronDown, ChevronRight, Copy, ExternalLink } from "lucide-react"
import { toast } from "sonner"

import { integrationsService } from "@/services/integrationsService"

// 6-step wizard mirrors docs/integrations/02-meta-credentials-guide.md.
// Each step is collapsible so power users can skip ahead; first-time
// tenants follow them top-to-bottom.
const STEPS = [
  {
    n: 1,
    title: "Create a Meta App",
    body: (
      <ol className="wiz-list">
        <li>Open <ExtLink href="https://developers.facebook.com">developers.facebook.com</ExtLink> and sign in.</li>
        <li>Top-right <b>My Apps → Create App</b>.</li>
        <li>Use case: <b>Other</b> → app type: <b>Business</b>.</li>
        <li>App name: anything (internal — leads never see it).</li>
        <li>Pick your Business Manager → Create App.</li>
        <li>Copy the <b>App ID</b> from the top of the App Dashboard.</li>
        <li>Left sidebar → <b>App Settings → Basic</b> → click <b>Show</b> next to App Secret → copy <b>App Secret</b>.</li>
      </ol>
    ),
  },
  {
    n: 2,
    title: "Add the Webhooks product",
    body: (
      <ol className="wiz-list">
        <li>Left sidebar → <b>Add Product</b> → find <b>Webhooks</b> → <b>Set Up</b>.</li>
        <li>Object dropdown → <b>Page</b>.</li>
        <li>Callback URL: paste the webhook URL Bizzfly will show after you save (last step). For now, you can put any HTTPS URL here.</li>
        <li>Verify Token: make up a random string (e.g. <code>bizzfly-meta-v1-abc123</code>). Write it down — you'll paste it into the form below.</li>
        <li>Click <b>Verify and Save</b>. After saving credentials in Bizzfly, return here and click <b>Subscribe</b> next to the <code>leadgen</code> field.</li>
      </ol>
    ),
  },
  {
    n: 3,
    title: "Get the Page Access Token",
    body: (
      <ol className="wiz-list">
        <li>
          Open <ExtLink href="https://developers.facebook.com/tools/explorer">Graph API Explorer</ExtLink>, pick your app, click <b>Get Page Access Token</b>, choose your Page, and approve scopes:
          <code style={{ display: "block", marginTop: 6, fontSize: "0.8rem" }}>
            pages_show_list, pages_read_engagement, pages_manage_metadata, leads_retrieval
          </code>
        </li>
        <li>Exchange the short-lived token for a long-lived (60-day) one by opening this URL in your browser:</li>
        <li>
          <code style={{ display: "block", fontSize: "0.733rem", padding: 8, background: "var(--lp-surface-2)", borderRadius: 6, wordBreak: "break-all" }}>
            https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=YOUR_APP_ID&client_secret=YOUR_APP_SECRET&fb_exchange_token=SHORT_TOKEN
          </code>
        </li>
        <li>Then call <code>https://graph.facebook.com/v19.0/me/accounts?access_token=LONG_USER_TOKEN</code> — copy the <b>Page Access Token</b> and <b>Page ID</b> from the response.</li>
        <li><b>Power users:</b> use a System User Token from Business Manager → Business Settings → System Users for a non-expiring token.</li>
      </ol>
    ),
  },
  {
    n: 4,
    title: "Subscribe the Page to leadgen",
    body: (
      <ol className="wiz-list">
        <li>In your browser address bar run this exact URL (it's a one-time call):</li>
        <li>
          <code style={{ display: "block", fontSize: "0.733rem", padding: 8, background: "var(--lp-surface-2)", borderRadius: 6, wordBreak: "break-all" }}>
            https://graph.facebook.com/v19.0/PAGE_ID/subscribed_apps?subscribed_fields=leadgen&access_token=PAGE_ACCESS_TOKEN
          </code>
        </li>
        <li>Response should be <code>{"{\"success\": true}"}</code>.</li>
        <li>Now every lead form submission on this Page will hit Bizzfly's webhook.</li>
      </ol>
    ),
  },
  {
    n: 5,
    title: "Paste credentials into Bizzfly (form below)",
    body: (
      <p className="text-sm text-muted">
        Fill in the form. We'll AES-256-GCM-encrypt these values before storing — they cannot be read by anyone but this app.
      </p>
    ),
  },
  {
    n: 6,
    title: "Test with a real lead",
    body: (
      <ol className="wiz-list">
        <li>After saving, copy the Webhook URL Bizzfly displays and paste it into your Meta App → Webhooks → Page → Callback URL.</li>
        <li>Use <ExtLink href="https://developers.facebook.com/tools/lead-ads-testing">Lead Ads Testing Tool</ExtLink> to submit a fake lead.</li>
        <li>The lead should land in your Leads page within seconds and the bell notification should fire.</li>
      </ol>
    ),
  },
]

const emptyForm = {
  label: "",
  appId: "",
  appSecret: "",
  pageId: "",
  pageAccessToken: "",
  verifyToken: "",
}

export default function ConnectMeta({ editing, onClose, onSaved }) {
  const [openStep, setOpenStep] = useState(editing ? null : 1)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [savedRow, setSavedRow] = useState(null)

  useEffect(() => {
    if (editing) {
      // Don't pre-fill secrets — we never round-trip decrypted values to
      // the client. Show only label + non-secret hints. Tenant must
      // re-enter creds if they want to update them.
      setForm({ ...emptyForm, label: editing.label || "" })
      setSavedRow(editing)
    }
  }, [editing])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async () => {
    if (!form.label.trim()) {
      toast.error("Give this connection a label (e.g. \"Acme Realty Main Page\")")
      return
    }
    setSaving(true)
    try {
      // On edit, only patch fields the tenant changed. The label is always
      // sent. Credentials are only sent if every required field is filled
      // — partial credential updates are rejected by the schema.
      const credsFilled = ["appId", "appSecret", "pageId", "pageAccessToken", "verifyToken"]
        .every((k) => String(form[k] || "").trim().length > 0)

      let row
      if (editing) {
        const patch = { label: form.label.trim() }
        if (credsFilled) {
          patch.credentials = {
            appId: form.appId.trim(),
            appSecret: form.appSecret.trim(),
            pageId: form.pageId.trim(),
            pageAccessToken: form.pageAccessToken.trim(),
            verifyToken: form.verifyToken.trim(),
          }
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
          provider: "META",
          label: form.label.trim(),
          credentials: {
            appId: form.appId.trim(),
            appSecret: form.appSecret.trim(),
            pageId: form.pageId.trim(),
            pageAccessToken: form.pageAccessToken.trim(),
            verifyToken: form.verifyToken.trim(),
          },
        })
        toast.success("Meta connected — test the connection next")
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
      else toast.error(result?.error || "Connection failed")
    } catch (err) {
      toast.error(err?.message || "Test failed")
    }
  }

  const finish = () => onSaved?.()

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720, maxHeight: "90vh", overflowY: "auto" }}>
        <div className="modal-head">
          <div className="card-title" style={{ marginBottom: 0 }}>
            {editing ? "Edit Meta connection" : "Connect Facebook & Instagram"}
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

          {/* Credentials form — required on create; on edit, only label is
              required. */}
          <div className="card" style={{ marginTop: 4 }}>
            <div className="card-title">Credentials</div>
            <div className="field">
              <label>Label</label>
              <input
                className="input"
                placeholder="e.g. Acme Realty Main Page"
                value={form.label}
                onChange={set("label")}
              />
            </div>
            <div className="grid grid-2" style={{ gap: "0 14px" }}>
              <div className="field">
                <label>App ID</label>
                <input className="input" value={form.appId} onChange={set("appId")} placeholder={editing ? "(unchanged)" : ""} />
              </div>
              <div className="field">
                <label>App Secret</label>
                <input className="input" type="password" value={form.appSecret} onChange={set("appSecret")} placeholder={editing ? "(unchanged)" : ""} />
              </div>
              <div className="field">
                <label>Page ID</label>
                <input className="input" value={form.pageId} onChange={set("pageId")} placeholder={editing ? "(unchanged)" : ""} />
              </div>
              <div className="field">
                <label>Page Access Token</label>
                <input className="input" type="password" value={form.pageAccessToken} onChange={set("pageAccessToken")} placeholder={editing ? "(unchanged)" : ""} />
              </div>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label>Verify Token <span className="text-xs text-muted">(the random string you put in Meta's webhook config)</span></label>
                <input className="input" value={form.verifyToken} onChange={set("verifyToken")} placeholder={editing ? "(unchanged)" : ""} />
              </div>
            </div>
            {editing && (
              <p className="text-xs text-muted" style={{ marginTop: 6 }}>
                Leave credential fields blank to keep the existing values. Fill all five to rotate.
              </p>
            )}
          </div>

          {savedRow?.webhookUrl && (
            <div className="card" style={{ background: "var(--lp-surface-2, rgba(120,120,160,0.08))" }}>
              <div className="card-title" style={{ marginBottom: 6 }}>
                <Check size={16} style={{ display: "inline", marginRight: 6, color: "var(--lp-success, #16a34a)" }} />
                Webhook URL — paste this into Meta
              </div>
              <p className="text-xs text-muted" style={{ marginBottom: 8 }}>
                Open your Meta App → Webhooks → Page → Edit Callback URL → paste this URL. Use the Verify Token you entered above.
              </p>
              <div className="row" style={{ gap: 8 }}>
                <input
                  className="input"
                  readOnly
                  value={savedRow.webhookUrl}
                  style={{ flex: 1, fontFamily: "monospace", fontSize: "0.8rem" }}
                />
                <CopyButton text={savedRow.webhookUrl} label="URL" />
              </div>
              <div className="row" style={{ marginTop: 10, gap: 8 }}>
                <button className="btn btn-secondary btn-sm" onClick={runTest}>Test connection</button>
                <button className="btn btn-primary btn-sm" onClick={finish}>Done</button>
              </div>
            </div>
          )}
        </div>
        <div className="modal-foot">
          <button className="btn btn-secondary" onClick={onClose}>{savedRow ? "Close" : "Cancel"}</button>
          {!savedRow && (
            <button className="btn btn-primary" onClick={submit} disabled={saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Save & continue"}
            </button>
          )}
          {savedRow && (
            <button className="btn btn-primary" onClick={submit} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function Step({ step, open, onToggle }) {
  return (
    <div
      style={{
        border: "1px solid var(--lp-border)",
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
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
      {open && (
        <div style={{ padding: "0 14px 12px 38px", fontSize: "0.867rem" }}>
          {step.body}
        </div>
      )}
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
