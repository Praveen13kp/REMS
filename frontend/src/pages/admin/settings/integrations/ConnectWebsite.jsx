import { useEffect, useMemo, useState } from "react"
import { Check, Copy, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { integrationsService } from "@/services/integrationsService"

// 32 bytes → 64 hex chars. Webhook secret is generated client-side and
// shown ONCE on save. Tenant must copy it before leaving the modal. We
// could also regenerate from the BE but doing it here keeps the server
// stateless about the original plaintext until the create POST lands.
function generateSecret() {
  const arr = new Uint8Array(32)
  crypto.getRandomValues(arr)
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("")
}

const STANDARD_FIELDS = ["name", "phone", "email", "city"]

const SAMPLE_MAPPING = [
  { src: "your-name", dst: "name" },
  { src: "mobile_no", dst: "phone" },
  { src: "email_id", dst: "email" },
  { src: "city_name", dst: "city" },
]

export default function ConnectWebsite({ editing, onClose, onSaved }) {
  const [label, setLabel] = useState("")
  const [requireSignature, setRequireSignature] = useState(true)
  const [secret, setSecret] = useState("")
  const [fieldMap, setFieldMap] = useState(SAMPLE_MAPPING)
  const [saving, setSaving] = useState(false)
  const [savedRow, setSavedRow] = useState(null)

  useEffect(() => {
    if (editing) {
      setLabel(editing.label || "")
      setSavedRow(editing)
      // We can't read back the secret (encrypted at rest). Tenant must
      // regenerate if they want it again. Non-secret flags + fieldMap come
      // from the BE in editing.credentials.
      setSecret("")
      const creds = editing.credentials || {}
      setRequireSignature(creds.requireSignature !== false)
      const map = creds.fieldMap && Object.keys(creds.fieldMap).length
        ? Object.entries(creds.fieldMap).map(([src, dst]) => ({ src, dst }))
        : SAMPLE_MAPPING
      setFieldMap(map)
    } else {
      setSecret(generateSecret())
    }
  }, [editing])

  const fieldMapObject = useMemo(() => {
    const obj = {}
    for (const row of fieldMap) {
      const k = String(row.src || "").trim()
      const v = String(row.dst || "").trim()
      if (k && v) obj[k] = v
    }
    return obj
  }, [fieldMap])

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
        // Always send credentials patch so flag toggles (requireSignature,
        // fieldMap) persist. BE merges onto existing creds, so omitting
        // webhookSecret keeps the stored one — only rotate if the tenant
        // entered a new value here.
        patch.credentials = {
          requireSignature,
          fieldMap: fieldMapObject,
        }
        if (secret) patch.credentials.webhookSecret = secret
        row = await integrationsService.update(editing.id, patch)
        toast.success("Integration updated")
      } else {
        row = await integrationsService.create({
          provider: "WEBSITE_FORM",
          label: label.trim(),
          credentials: {
            webhookSecret: secret,
            requireSignature,
            fieldMap: fieldMapObject,
          },
        })
        toast.success("Webhook URL generated — copy it into your form builder")
      }
      setSavedRow(row)
    } catch (err) {
      const msg = err?.details?.[0]?.message || err?.message || "Save failed"
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const rotateSecret = () => {
    setSecret(generateSecret())
    toast.info("New secret generated — save to apply")
  }

  const sendTestEvent = async () => {
    if (!savedRow?.webhookUrl) return
    try {
      const body = {
        "your-name": "Test Lead",
        "mobile_no": "+919999999999",
        "email_id": "test@example.com",
        "city_name": "Pune",
        notes: "Sent from Bizzfly test button",
      }
      const headers = { "Content-Type": "application/json" }
      if (requireSignature && secret) {
        // Sign client-side. This works only when the modal still has the
        // plaintext secret in memory — i.e. immediately after save.
        const sig = await hmacSha256Hex(secret, JSON.stringify(body))
        headers["x-bizzfly-signature"] = `sha256=${sig}`
      }
      const res = await fetch(savedRow.webhookUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      })
      const j = await res.json().catch(() => ({}))
      if (res.ok && j.ok !== false) {
        toast.success(`Test lead created${j.deduped ? " (deduped)" : ""}`)
      } else {
        toast.error(`Test failed: ${j.error?.message || res.status}`)
      }
    } catch (err) {
      toast.error(err?.message || "Test failed")
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 760, maxHeight: "90vh", overflowY: "auto" }}>
        <div className="modal-head">
          <div className="card-title" style={{ marginBottom: 0 }}>
            {editing ? "Edit website webhook" : "Connect a website form"}
          </div>
        </div>
        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="card">
            <div className="card-title">Connection</div>
            <div className="field">
              <label>Label</label>
              <input
                className="input"
                placeholder='e.g. "Main landing page" or "Mumbai microsite"'
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>
            <div className="field">
              <label className="checkbox" style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={requireSignature}
                  onChange={(e) => setRequireSignature(e.target.checked)}
                />
                Require signed requests (HMAC-SHA256)
              </label>
              <div className="text-xs text-muted" style={{ marginTop: 4 }}>
                Recommended. Disable only if your form builder can't add an HMAC header
                (Webflow, Elementor without code). In that case the URL itself is your secret —
                don't share it.
              </div>
            </div>
            <div className="field">
              <label>Signing secret {editing && "(blank = keep existing)"}</label>
              <div className="row" style={{ gap: 8 }}>
                <input
                  className="input"
                  readOnly
                  value={secret}
                  style={{ flex: 1, fontFamily: "monospace", fontSize: "0.8rem" }}
                />
                <button className="btn btn-secondary btn-sm" onClick={rotateSecret} type="button">
                  Generate new
                </button>
                {secret && <CopyButton text={secret} label="Secret" />}
              </div>
              <div className="text-xs text-muted" style={{ marginTop: 4 }}>
                Shown only in this modal session. After you save, we encrypt it and can't show it again —
                copy it now.
              </div>
            </div>
          </div>

          <FieldMapEditor rows={fieldMap} onChange={setFieldMap} />

          {savedRow?.webhookUrl && (
            <div className="card" style={{ background: "var(--lp-surface-2, rgba(120,120,160,0.08))" }}>
              <div className="card-title" style={{ marginBottom: 6 }}>
                <Check size={16} style={{ display: "inline", marginRight: 6, color: "var(--lp-success, #16a34a)" }} />
                Webhook URL
              </div>
              <p className="text-xs text-muted" style={{ marginBottom: 8 }}>
                Paste this into your form builder's webhook integration. Every form submission will be POSTed
                here as JSON.
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
                <button className="btn btn-secondary btn-sm" onClick={sendTestEvent}>
                  Send test event
                </button>
                <button className="btn btn-primary btn-sm" onClick={() => onSaved?.()}>Done</button>
              </div>

              <Snippets
                url={savedRow.webhookUrl}
                landingUrl={savedRow.landingUrl}
                secret={secret}
                requireSignature={requireSignature}
              />
            </div>
          )}
        </div>
        <div className="modal-foot">
          <button className="btn btn-secondary" onClick={onClose}>{savedRow ? "Close" : "Cancel"}</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>
            {saving ? "Saving…" : savedRow ? "Save changes" : editing ? "Save changes" : "Save & generate webhook"}
          </button>
        </div>
      </div>
    </div>
  )
}

function FieldMapEditor({ rows, onChange }) {
  const add = () => onChange([...rows, { src: "", dst: "name" }])
  const remove = (i) => onChange(rows.filter((_, idx) => idx !== i))
  const update = (i, key, val) => onChange(rows.map((r, idx) => (idx === i ? { ...r, [key]: val } : r)))

  return (
    <div className="card">
      <div className="card-title">Field mapping</div>
      <p className="text-xs text-muted" style={{ marginBottom: 8 }}>
        Translate your form's field names into standard Lead fields. Anything not listed below is
        appended to the lead's notes. Common aliases (e.g. <code>email</code>, <code>mobile</code>,
        <code>phone_number</code>) are matched automatically even if not in this list.
      </p>
      <div className="table-scroll">
        <table className="data" style={{ width: "100%" }}>
          <thead>
            <tr>
              <th style={{ width: "45%" }}>Your form field name</th>
              <th style={{ width: "45%" }}>Bizzfly field</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                <td>
                  <input
                    className="input"
                    value={row.src}
                    onChange={(e) => update(i, "src", e.target.value)}
                    placeholder="e.g. your-name"
                  />
                </td>
                <td>
                  <select
                    className="select"
                    value={row.dst}
                    onChange={(e) => update(i, "dst", e.target.value)}
                  >
                    {STANDARD_FIELDS.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <button className="btn btn-ghost btn-sm" onClick={() => remove(i)} title="Remove">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button className="btn btn-secondary btn-sm" onClick={add} style={{ marginTop: 8 }}>
        <Plus size={14} /> Add mapping
      </button>
    </div>
  )
}

function Snippets({ url, landingUrl, secret, requireSignature }) {
  const [tab, setTab] = useState("curl")
  const tabs = [
    ["curl", "cURL"],
    ["wpforms", "WPForms"],
    ["webflow", "Webflow"],
    ["html", "Raw HTML+JS"],
    ["landing", "Landing Page"],
  ]
  const sample = JSON.stringify({
    "your-name": "Rahul Verma",
    "mobile_no": "+919999999999",
    "email_id": "rahul@example.com",
    "city_name": "Pune",
  })
  const curlSig = requireSignature && secret
    ? `\n  -H "x-bizzfly-signature: sha256=$(node -e 'console.log(require(\\"crypto\\").createHmac(\\"sha256\\",\\"${secret}\\").update(${JSON.stringify(sample)}).digest(\\"hex\\"))')" \\`
    : ""
  const curl = `curl -X POST "${url}" \\
  -H "Content-Type: application/json" \\${curlSig}
  -d '${sample}'`

  return (
    <div style={{ marginTop: 12 }}>
      <div className="row" style={{ gap: 6, marginBottom: 6 }}>
        {tabs.map(([k, l]) => (
          <button
            key={k}
            className={`btn btn-sm ${tab === k ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setTab(k)}
          >
            {l}
          </button>
        ))}
      </div>
      {tab === "curl" && <CodeBlock text={curl} />}
      {tab === "wpforms" && (
        <CodeBlock text={`WPForms Pro → edit form → Settings → Webhooks → Add New Webhook
  Request URL:    ${url}
  Request Method: POST
  Request Format: JSON
  ${requireSignature ? `Secret:         ${secret || "<your-secret>"}` : "Secret:         (leave blank — unsigned mode)"}
  Body:           map your form fields directly`} />
      )}
      {tab === "webflow" && (
        <CodeBlock text={`Webflow → Site Settings → Apps & Integrations → Webhooks → Add Webhook
  Trigger Type: Form Submission
  Webhook URL:  ${url}

Webflow does not support custom HMAC headers.${requireSignature ? `
  → Disable "Require signed requests" above, OR
  → Route Webflow through Make.com / Zapier first to add the
    x-bizzfly-signature: sha256=<hmac> header.` : ""}`} />
      )}
      {tab === "html" && (
        <CodeBlock text={`<form id="lead-form">
  <input name="your-name" required>
  <input name="mobile_no" required>
  <input name="email_id" type="email">
  <button>Submit</button>
</form>

<script>
document.getElementById('lead-form').addEventListener('submit', async (e) => {
  e.preventDefault()
  const data = Object.fromEntries(new FormData(e.target))
  await fetch('${url}', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  alert('Thank you!')
})
</script>${requireSignature ? `

NOTE: Browser JS can't compute HMAC safely (would expose your secret).
For signed mode either disable "Require signed requests" above, or
POST from your own backend after computing the signature server-side.` : ""}`} />
      )}
      {tab === "landing" && <LandingTab landingUrl={landingUrl} />}
    </div>
  )
}

function LandingTab({ landingUrl }) {
  if (!landingUrl) {
    return (
      <div className="text-xs text-muted" style={{ padding: 10 }}>
        Landing page URL will appear after you save the integration.
      </div>
    )
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <p className="text-xs text-muted" style={{ margin: 0 }}>
        Bizzfly hosts a ready-made landing page bound to this webhook. Share the URL — every form
        submission on it lands as a new lead, with HMAC signing handled server-side.
      </p>
      <div className="row" style={{ gap: 8 }}>
        <input
          className="input"
          readOnly
          value={landingUrl}
          style={{ flex: 1, fontFamily: "monospace", fontSize: "0.8rem" }}
        />
        <CopyButton text={landingUrl} label="Landing URL" />
        <a
          href={landingUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="btn btn-secondary btn-sm"
        >
          Open
        </a>
      </div>
      <div
        style={{
          border: "1px solid var(--lp-border, #e5e7eb)",
          borderRadius: 8,
          overflow: "hidden",
          background: "#fff",
        }}
      >
        <iframe
          title="Landing page preview"
          src={landingUrl}
          style={{ display: "block", width: "100%", height: 420, border: 0 }}
        />
      </div>
    </div>
  )
}

function CodeBlock({ text }) {
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
          overflowX: "auto",
          margin: 0,
        }}
      >
        {text}
      </pre>
      <div style={{ position: "absolute", top: 6, right: 6 }}>
        <CopyButton text={text} label="Snippet" />
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

// HMAC-SHA256 → hex using WebCrypto, so the "Send test event" button can
// sign the test payload from the browser. Works only because we have the
// plaintext secret in component state — not a primitive for prod use.
async function hmacSha256Hex(secret, payload) {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload))
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}
