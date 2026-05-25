import { useEffect, useState } from "react"
import { Check, Copy, ExternalLink } from "lucide-react"
import { toast } from "sonner"

import { integrationsService } from "@/services/integrationsService"

// JustDial has no developer portal — credentials come from the tenant's
// JustDial account manager via email. Two variants:
//   PUSH: JustDial calls our webhook with a fixed auth header.
//   PULL: we poll JustDial's endpoint every N minutes with basic auth or
//         an API key.
//
// The wizard surfaces both as tabs so the tenant can pick whichever
// flavour JustDial enabled on their account.

const TABS = [
  { key: "PUSH", label: "Push API (recommended)" },
  { key: "PULL", label: "Pull API" },
]

const initialPush = {
  label: "",
  headerName: "X-JD-Auth",
  headerValue: "",
}
const initialPull = {
  label: "",
  endpointUrl: "",
  authType: "BASIC",
  username: "",
  password: "",
  apiKeyName: "",
  apiKeyValue: "",
  pollIntervalSec: 300,
}

export default function ConnectJustDial({ editing, onClose, onSaved }) {
  const [tab, setTab] = useState(editing?.label?.includes("(pull)") ? "PULL" : "PUSH")
  const [push, setPush] = useState(initialPush)
  const [pull, setPull] = useState(initialPull)
  const [saving, setSaving] = useState(false)
  const [savedRow, setSavedRow] = useState(null)

  useEffect(() => {
    if (editing) {
      // Credentials aren't readable from server — only the label round-
      // trips. Tenant must re-enter creds to rotate.
      setPush({ ...initialPush, label: editing.label || "" })
      setPull({ ...initialPull, label: editing.label || "" })
      setSavedRow(editing)
    }
  }, [editing])

  const submit = async () => {
    const form = tab === "PUSH" ? push : pull
    if (!form.label.trim()) {
      toast.error("Give this connection a label")
      return
    }
    setSaving(true)
    try {
      let credentials = null
      if (tab === "PUSH") {
        if (!editing || (push.headerValue && push.headerName)) {
          if (!push.headerValue.trim()) {
            toast.error("Header value is required")
            setSaving(false)
            return
          }
          credentials = {
            variant: "PUSH",
            headerName: push.headerName.trim(),
            headerValue: push.headerValue.trim(),
          }
        }
      } else {
        if (!editing || pull.endpointUrl) {
          if (!pull.endpointUrl.trim()) {
            toast.error("Endpoint URL is required")
            setSaving(false)
            return
          }
          credentials = {
            variant: "PULL",
            endpointUrl: pull.endpointUrl.trim(),
            authType: pull.authType,
            username: pull.username.trim() || undefined,
            password: pull.password,
            apiKeyName: pull.apiKeyName.trim() || undefined,
            apiKeyValue: pull.apiKeyValue.trim() || undefined,
            pollIntervalSec: Math.max(300, Number(pull.pollIntervalSec) || 300),
          }
        }
      }

      let row
      if (editing) {
        const patch = { label: form.label.trim() }
        if (credentials) patch.credentials = credentials
        row = await integrationsService.update(editing.id, patch)
        toast.success("Integration updated")
      } else {
        if (!credentials) {
          toast.error("Credentials are required")
          setSaving(false)
          return
        }
        row = await integrationsService.create({
          provider: "JUSTDIAL",
          label: form.label.trim(),
          credentials,
        })
        toast.success(
          tab === "PUSH"
            ? "Webhook URL generated — email it to your JustDial account manager"
            : "Pull integration saved — first poll will run within ~1 minute",
        )
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
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720, maxHeight: "90vh", overflowY: "auto" }}>
        <div className="modal-head">
          <div className="card-title" style={{ marginBottom: 0 }}>
            {editing ? "Edit JustDial connection" : "Connect JustDial"}
          </div>
        </div>
        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {!editing && (
            <div className="card" style={{ background: "var(--lp-surface-2, rgba(120,120,160,0.06))" }}>
              <div className="card-title" style={{ marginBottom: 6 }}>Step 1 — Request API access from JustDial</div>
              <p className="text-xs text-muted" style={{ marginBottom: 8 }}>
                Email or call your JustDial Account Manager. Paste the message below — they typically
                reply within 3–7 business days with credentials.
              </p>
              <CopyableBlock text={emailTemplate} />
              <p className="text-xs text-muted" style={{ marginTop: 8 }}>
                If JustDial chooses Push (they call your webhook): use the <b>Push API</b> tab below.
                If they chose Pull (you call their endpoint on a schedule): use <b>Pull API</b>.
              </p>
            </div>
          )}

          <div className="row" style={{ gap: 6 }}>
            {TABS.map((t) => (
              <button
                key={t.key}
                className={`btn btn-sm ${tab === t.key ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "PUSH" ? (
            <PushForm form={push} setForm={setPush} editing={!!editing} />
          ) : (
            <PullForm form={pull} setForm={setPull} editing={!!editing} />
          )}

          {savedRow && (
            <div className="card" style={{ background: "var(--lp-surface-2, rgba(120,120,160,0.08))" }}>
              <div className="card-title" style={{ marginBottom: 6 }}>
                <Check size={16} style={{ display: "inline", marginRight: 6, color: "var(--lp-success, #16a34a)" }} />
                Saved
              </div>
              {savedRow.webhookUrl && tab === "PUSH" && (
                <>
                  <p className="text-xs text-muted" style={{ marginBottom: 8 }}>
                    Send this URL to your JustDial account manager along with the header name + value
                    you set above. JustDial will POST every lead to this URL.
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
                </>
              )}
              {tab === "PULL" && (
                <p className="text-xs text-muted">
                  Pull integration active. The poller checks for new leads every {pull.pollIntervalSec || 300} seconds.
                  Use <b>Test Connection</b> to verify the endpoint works now.
                </p>
              )}
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
            {saving ? "Saving…" : savedRow ? "Save changes" : editing ? "Save changes" : "Save"}
          </button>
        </div>
      </div>
    </div>
  )
}

const emailTemplate = `Subject: API access request for CRM integration

Hi,

I want to integrate my JustDial leads with my CRM (Bizzfly). Please enable Push API delivery for my account.

If Push API is available on my plan: I will share the webhook URL after you confirm. Please tell me the auth header name and the secret value JustDial will send on every webhook call.

If Push API is NOT available on my plan: please send me the Pull API endpoint URL and authentication credentials (basic auth or API key — whichever applies).

Thanks.`

function PushForm({ form, setForm, editing }) {
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  return (
    <div className="card">
      <div className="card-title">Push API credentials</div>
      <p className="text-xs text-muted" style={{ marginBottom: 8 }}>
        JustDial will call your webhook URL on every new lead. They include a fixed auth header — paste
        the name + value below so Bizzfly can verify each request.
      </p>
      <div className="field">
        <label>Label</label>
        <input className="input" value={form.label} onChange={set("label")} placeholder='e.g. "JustDial Mumbai office"' />
      </div>
      <div className="grid grid-2" style={{ gap: "0 14px" }}>
        <div className="field">
          <label>Auth header name</label>
          <input className="input" value={form.headerName} onChange={set("headerName")} placeholder={editing ? "(unchanged)" : "X-JD-Auth"} />
        </div>
        <div className="field">
          <label>Auth header value</label>
          <input className="input" type="password" value={form.headerValue} onChange={set("headerValue")} placeholder={editing ? "(unchanged)" : ""} />
        </div>
      </div>
      <p className="text-xs text-muted">
        Common header names JustDial uses: <code>X-JD-Auth</code>, <code>JD-Signature</code>, <code>Authorization</code>.
        Bizzfly checks the value exactly — copy-paste from JustDial's email and don't add quotes.
      </p>
    </div>
  )
}

function PullForm({ form, setForm, editing }) {
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  return (
    <div className="card">
      <div className="card-title">Pull API credentials</div>
      <p className="text-xs text-muted" style={{ marginBottom: 8 }}>
        Bizzfly will call JustDial's endpoint every few minutes and dedupe leads by their JustDial lead ID.
        Minimum poll interval is 300 seconds — JustDial rate-limits aggressive callers.
      </p>
      <div className="field">
        <label>Label</label>
        <input className="input" value={form.label} onChange={set("label")} placeholder='e.g. "JustDial Pune (pull)"' />
      </div>
      <div className="field">
        <label>Endpoint URL</label>
        <input className="input" value={form.endpointUrl} onChange={set("endpointUrl")} placeholder={editing ? "(unchanged)" : "https://api.justdial.com/leads/..."} />
      </div>
      <div className="grid grid-2" style={{ gap: "0 14px" }}>
        <div className="field">
          <label>Auth type</label>
          <select className="select" value={form.authType} onChange={set("authType")}>
            <option value="BASIC">Basic Auth (username + password)</option>
            <option value="API_KEY_HEADER">API Key in header</option>
            <option value="API_KEY_QUERY">API Key in query string</option>
            <option value="NONE">No auth</option>
          </select>
        </div>
        <div className="field">
          <label>Poll interval (seconds)</label>
          <input
            className="input"
            type="number"
            min="300"
            step="60"
            value={form.pollIntervalSec}
            onChange={(e) => setForm({ ...form, pollIntervalSec: e.target.value })}
          />
        </div>
        {form.authType === "BASIC" && (
          <>
            <div className="field">
              <label>Username</label>
              <input className="input" value={form.username} onChange={set("username")} placeholder={editing ? "(unchanged)" : ""} />
            </div>
            <div className="field">
              <label>Password</label>
              <input className="input" type="password" value={form.password} onChange={set("password")} placeholder={editing ? "(unchanged)" : ""} />
            </div>
          </>
        )}
        {(form.authType === "API_KEY_HEADER" || form.authType === "API_KEY_QUERY") && (
          <>
            <div className="field">
              <label>{form.authType === "API_KEY_HEADER" ? "Header name" : "Query param name"}</label>
              <input className="input" value={form.apiKeyName} onChange={set("apiKeyName")} placeholder={editing ? "(unchanged)" : ""} />
            </div>
            <div className="field">
              <label>API key value</label>
              <input className="input" type="password" value={form.apiKeyValue} onChange={set("apiKeyValue")} placeholder={editing ? "(unchanged)" : ""} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function CopyableBlock({ text }) {
  return (
    <div style={{ position: "relative" }}>
      <pre
        style={{
          background: "var(--lp-surface, #0e0e14)",
          color: "var(--lp-text, #e5e7eb)",
          padding: 10,
          borderRadius: 6,
          fontSize: "0.733rem",
          lineHeight: 1.5,
          whiteSpace: "pre-wrap",
          margin: 0,
        }}
      >
        {text}
      </pre>
      <div style={{ position: "absolute", top: 6, right: 6 }}>
        <CopyButton text={text} label="Email" />
      </div>
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
