import { useEffect, useState } from "react"
import {
  Bell,
  FileText,
  Mail,
  Palette,
  Plug,
  Shield,
  Sliders,
  User,
  UsersRound,
  Webhook,
  Workflow,
} from "lucide-react"
import { toast } from "sonner"
import { useTheme } from "next-themes"

import { api } from "@/lib/api"
import { useAuthStore } from "@/stores/authStore"
import Profile from "@/pages/admin/Profile"
import IntegrationsPanel from "@/pages/admin/settings/integrations/IntegrationsPanel"
import StageEditor from "@/components/pipeline/StageEditor"

// Visual port of leadpro-realty/src/pages/Settings.jsx.
// 13-tab settings page. Only General (PATCH /company/me) is wired to a real
// backend endpoint today; every other tab renders the UI against local stub
// state with a TODO comment pointing at the missing endpoint.
// AGENT role sees only Profile + Appearance + Notifications.

const ALL_TABS = [
  ["general", Sliders, "General"],
  ["pipeline", Workflow, "Pipeline"],
  ["profile", User, "Profile"],
  ["security", Shield, "Security"],
  ["notifications", Bell, "Notifications"],
  ["integrations", Plug, "Integrations"],
  ["email", Mail, "Email (SMTP)"],
  // Billing intentionally lives only at /admin/billing (sidebar) — no duplicate tab here.
  ["appearance", Palette, "Appearance"],
  ["roles", UsersRound, "Roles & Permissions"],
  // API Keys + Custom Fields removed — were unwired stubs. API Keys not
  // applicable (no public API surface); Custom Fields needs real BE work
  // (LeadCustomField table + lead form integration) before re-enabling.
  ["audit", FileText, "Audit Log"],
  ["webhooks", Webhook, "Webhooks"],
]

const AGENT_TABS = [
  ["profile", User, "Profile"],
  ["appearance", Palette, "Appearance"],
  ["notifications", Bell, "Notifications"],
]

// Super admin has no companyId, so General/Integrations/Email/Billing/
// Roles/API/Audit/Custom-Fields/Webhooks are all tenant-config and would
// either 403 or render an empty form. Only personal + visual prefs apply.
const SUPER_TABS = [
  ["profile", User, "Profile"],
  ["security", Shield, "Security"],
  ["appearance", Palette, "Appearance"],
  ["notifications", Bell, "Notifications"],
]

export default function Settings() {
  const user = useAuthStore((s) => s.user)
  const isAgent = user?.role === "AGENT" || user?.role === "agent"
  const isSuper = user?.role === "SUPER_ADMIN" || user?.role === "PLATFORM_ADMIN"
  const tabs = isAgent ? AGENT_TABS : isSuper ? SUPER_TABS : ALL_TABS
  const [tab, setTab] = useState(tabs[0][0])
  return (
    <>
      <div className="content-head">
        <div>
          <h1>Settings</h1>
          <p>Manage your workspace, security, and integrations.</p>
        </div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: "240px 1fr", gap: 20 }}>
        <div className="card" style={{ padding: 8 }}>
          {tabs.map(([k, Ic, l]) => (
            <button
              key={k}
              className={`nav-item ${tab === k ? "active" : ""}`}
              onClick={() => setTab(k)}
            >
              <Ic size={16} />
              <span>{l}</span>
            </button>
          ))}
        </div>
        <div style={{ minWidth: 0 }}>
          <TabContent tab={tab} />
        </div>
      </div>
    </>
  )
}

function TabContent({ tab }) {
  if (tab === "general") return <GeneralTab />
  if (tab === "pipeline") return <StageEditor />
  if (tab === "profile") return <Profile />
  if (tab === "security") return <SecurityTab />
  if (tab === "notifications") return <NotificationsTab />
  if (tab === "integrations") return <IntegrationsTab />
  if (tab === "email") return <EmailTab />
  if (tab === "appearance") return <AppearanceTab />
  if (tab === "roles") return <RolesTab />
  if (tab === "audit") return <AuditTab />
  if (tab === "webhooks") return <WebhooksTab />
  return (
    <div className="card">
      <div className="card-title">{tab}</div>
      <p className="text-muted text-sm">Coming soon.</p>
    </div>
  )
}

// ---------------- General (wired: GET/PATCH /company/me) ----------------

function GeneralTab() {
  const [form, setForm] = useState({
    name: "",
    industry: "Real Estate",
    timezone: "Asia/Kolkata (IST)",
    currency: "INR",
    dateFormat: "DD/MM/YYYY",
    language: "English",
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const data = await api.get("/company/me")
        const c = data?.company ?? data?.data?.company ?? data
        if (!cancelled && c) {
          setForm((prev) => ({
            ...prev,
            name: c.name ?? prev.name,
            industry: c.industry ?? prev.industry,
            timezone: c.timezone ?? prev.timezone,
            currency: c.currency ?? prev.currency,
            dateFormat: c.dateFormat ?? prev.dateFormat,
            language: c.language ?? prev.language,
          }))
        }
      } catch {
        // ignore — leave defaults
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const save = async () => {
    setSaving(true)
    try {
      await api.patch("/company/me", form)
      toast.success("Settings saved")
    } catch (err) {
      toast.error(err?.message || "Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card">
      <div className="card-title">General Settings</div>
      <p className="text-muted text-sm" style={{ marginBottom: 18 }}>
        Workspace configuration.
      </p>
      <div className="grid grid-2" style={{ gap: "0 14px" }}>
        <div className="field">
          <label>Workspace name</label>
          <input className="input" value={form.name} onChange={update("name")} disabled={loading} />
        </div>
        <div className="field">
          <label>Industry</label>
          <input className="input" value={form.industry} onChange={update("industry")} disabled={loading} />
        </div>
        <div className="field">
          <label>Timezone</label>
          <select className="select" value={form.timezone} onChange={update("timezone")} disabled={loading}>
            <option>Asia/Kolkata (IST)</option>
            <option>Asia/Dubai</option>
            <option>UTC</option>
          </select>
        </div>
        <div className="field">
          <label>Currency</label>
          <select className="select" value={form.currency} onChange={update("currency")} disabled={loading}>
            <option value="INR">INR (₹)</option>
            <option value="USD">USD ($)</option>
            <option value="AED">AED (د.إ)</option>
          </select>
        </div>
        <div className="field">
          <label>Date format</label>
          <select className="select" value={form.dateFormat} onChange={update("dateFormat")} disabled={loading}>
            <option>DD/MM/YYYY</option>
            <option>MM/DD/YYYY</option>
            <option>YYYY-MM-DD</option>
          </select>
        </div>
        <div className="field">
          <label>Language</label>
          <select className="select" value={form.language} onChange={update("language")} disabled={loading}>
            <option>English</option>
            <option>Hindi</option>
          </select>
        </div>
      </div>
      <div className="row mt-4" style={{ justifyContent: "flex-end" }}>
        <button className="btn btn-primary" onClick={save} disabled={saving || loading}>
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  )
}

// ---------------- Security (stub) ----------------

function SecurityTab() {
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" })
  const [twoFa, setTwoFa] = useState(false)
  const [saving, setSaving] = useState(false)

  const updatePw = async () => {
    if (!pw.current || !pw.next || pw.next !== pw.confirm) {
      toast.error("Check password fields")
      return
    }
    setSaving(true)
    try {
      await api.post("/users/me/password", {
        currentPassword: pw.current,
        newPassword: pw.next,
      })
      toast.success("Password updated")
      setPw({ current: "", next: "", confirm: "" })
    } catch (err) {
      toast.error(err?.message || "Failed to update password")
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="card mb-4">
        <div className="card-title">Change Password</div>
        <div className="field">
          <label>Current password</label>
          <input
            className="input"
            type="password"
            value={pw.current}
            onChange={(e) => setPw({ ...pw, current: e.target.value })}
          />
        </div>
        <div className="grid grid-2" style={{ gap: "0 14px" }}>
          <div className="field">
            <label>New password</label>
            <input
              className="input"
              type="password"
              value={pw.next}
              onChange={(e) => setPw({ ...pw, next: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Confirm new password</label>
            <input
              className="input"
              type="password"
              value={pw.confirm}
              onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
            />
          </div>
        </div>
        <button className="btn btn-primary" onClick={updatePw} disabled={saving}>
          {saving ? "Updating..." : "Update Password"}
        </button>
      </div>
      <div className="card">
        <div className="card-title">Two-Factor Authentication</div>
        <div className="row row-between">
          <span className="text-muted text-sm">Add an extra layer of security.</span>
          <label className="switch">
            <input type="checkbox" checked={twoFa} onChange={(e) => setTwoFa(e.target.checked)} />
            <span className="switch-slider" />
          </label>
        </div>
      </div>
    </>
  )
}

// ---------------- Notifications (stub) ----------------

// Tenant notification preferences — lead lifecycle events that apply to
// OWNER/ADMIN/MANAGER/AGENT roles. None of these make sense for a super
// admin (no leads, no follow-ups, no bookings), so SUPER_ADMIN gets a
// different panel below.
const TENANT_PREFS = [
  { key: "lead_assigned", label: "New lead assigned", defaultEmail: true, defaultInapp: true, defaultPush: true },
  { key: "followup_reminder", label: "Follow-up reminder", defaultEmail: true, defaultInapp: true, defaultPush: true },
  { key: "lead_status_changed", label: "Lead status changed", defaultEmail: true, defaultInapp: true, defaultPush: true },
  { key: "new_booking", label: "New booking", defaultEmail: true, defaultInapp: true, defaultPush: false },
  { key: "daily_summary", label: "Daily summary", defaultEmail: true, defaultInapp: true, defaultPush: false },
  { key: "weekly_report", label: "Weekly report", defaultEmail: false, defaultInapp: true, defaultPush: false },
]

// Platform-level notification toggles for SUPER_ADMIN. These map to events
// the platform itself generates (tenant lifecycle, security, ops). No Push
// column — super admin doesn't have a mobile app yet.
const PLATFORM_PREFS = [
  {
    key: "tenant_signup",
    label: "New tenant sign-up",
    blurb: "A new organisation completes self-registration or is created from the admin panel.",
    defaultEmail: true,
    defaultInapp: true,
  },
  {
    key: "tenant_suspended",
    label: "Tenant suspended or deleted",
    blurb: "Any super admin suspends, reactivates, or deletes an organisation.",
    defaultEmail: true,
    defaultInapp: true,
  },
  {
    key: "failed_admin_login",
    label: "Failed platform-admin sign-in",
    blurb: "Security alert — someone tried to access /superadmin/login and the password was wrong.",
    defaultEmail: true,
    defaultInapp: true,
  },
  {
    key: "storage_high",
    label: "Storage above 80%",
    blurb: "Platform storage approaches capacity. Acts on the rollup from /admin/health.",
    defaultEmail: true,
    defaultInapp: true,
  },
  {
    key: "integration_failure",
    label: "Tenant integration broken",
    blurb: "A tenant's Meta / Google / IndiaMART credential expires or fails health-check.",
    defaultEmail: false,
    defaultInapp: true,
  },
  {
    key: "system_job_failed",
    label: "Background job failed",
    blurb: "Lead-aging scheduler, webhook poller, or health-check tick threw an unhandled error.",
    defaultEmail: false,
    defaultInapp: true,
  },
]

function PrefsTable({ rows, prefs, onToggle, columns }) {
  return (
    <>
      {rows.map((row) => (
        <div
          key={row.key}
          className="row row-between"
          style={{ padding: "14px 0", borderBottom: "1px solid var(--lp-border)" }}
        >
          <div style={{ flex: 1, minWidth: 0, paddingRight: 16 }}>
            <div style={{ fontWeight: 600, fontSize: "0.933rem" }}>{row.label}</div>
            <div className="text-xs text-muted">
              {row.blurb || "Receive notifications when this happens"}
            </div>
          </div>
          <div className="row" style={{ gap: 12, flexShrink: 0 }}>
            {columns.map((col) => (
              <label key={col} className="checkbox">
                <input
                  type="checkbox"
                  checked={prefs[row.key]?.[col] ?? false}
                  onChange={() => onToggle(row.key, col)}
                />{" "}
                {col === "inapp" ? "In-app" : col[0].toUpperCase() + col.slice(1)}
              </label>
            ))}
          </div>
        </div>
      ))}
    </>
  )
}

function NotificationsTab() {
  const user = useAuthStore((s) => s.user)
  const isSuper = user?.role === "SUPER_ADMIN" || user?.role === "PLATFORM_ADMIN"

  const rows = isSuper ? PLATFORM_PREFS : TENANT_PREFS
  const columns = isSuper ? ["email", "inapp"] : ["email", "inapp", "push"]

  // TODO: BE endpoint missing — preferences not persisted yet. Stored in
  // component state so toggles work for the session; "Save changes" is a
  // no-op stub until the prefs API ships.
  const [prefs, setPrefs] = useState(() => {
    const out = {}
    for (const r of rows) {
      out[r.key] = {
        email: r.defaultEmail,
        inapp: r.defaultInapp,
        push: r.defaultPush ?? false,
      }
    }
    return out
  })

  const toggle = (key, col) =>
    setPrefs((p) => ({
      ...p,
      [key]: { ...p[key], [col]: !p[key]?.[col] },
    }))

  return (
    <div className="card">
      <div className="card-title">
        {isSuper ? "Platform Notification Preferences" : "Notification Preferences"}
      </div>
      {isSuper && (
        <p className="text-xs text-muted" style={{ marginTop: -8, marginBottom: 8 }}>
          Choose how you&apos;d like to be alerted about platform events. Email
          delivery and in-app bell are coming online incrementally — toggles
          save your preference for when each wire-up lands.
        </p>
      )}
      <PrefsTable rows={rows} prefs={prefs} onToggle={toggle} columns={columns} />
      <div className="row mt-4" style={{ justifyContent: "flex-end" }}>
        <button
          className="btn btn-primary"
          onClick={() => toast.success("Preferences saved (stub)")}
        >
          Save changes
        </button>
      </div>
    </div>
  )
}

// ---------------- Integrations (wired: /api/intake/*) ----------------

const INTAKE_SOURCES = [
  {
    key: "facebook",
    label: "Facebook Lead Ads",
    blurb: "Capture leads submitted from your Facebook lead-form ads directly into this workspace.",
    setupSteps: [
      "Open Facebook Business Manager → Events Manager → Webhooks.",
      'Add a webhook for the "Leadgen" object using the URL below.',
      "Paste the secret (shown once on regenerate) into the Verify Token field.",
      "Subscribe your page to the leadgen event.",
    ],
  },
  {
    key: "instagram",
    label: "Instagram Lead Ads",
    blurb: "Capture leads from Instagram lead-form ads. Uses the same Meta webhook signature scheme.",
    setupSteps: [
      "Open Meta Business Suite → Settings → Webhooks for Instagram.",
      "Add a webhook for leadgen pointing to the URL below.",
      "Use the secret as the Verify Token.",
    ],
  },
]

function IntegrationsTab() {
  const user = useAuthStore((s) => s.user)
  const isOwner = user?.role === "OWNER"
  const [sources, setSources] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busyKey, setBusyKey] = useState(null)
  const [revealedTokens, setRevealedTokens] = useState({}) // { facebook: "...", instagram: "..." }
  const [openSetup, setOpenSetup] = useState({})
  const [confirmRegen, setConfirmRegen] = useState(null) // source key

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const data = await api.get("/intake/config")
        if (!cancelled) setSources(data?.sources ?? null)
      } catch (err) {
        if (!cancelled) toast.error(err?.message || "Failed to load integrations")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const toggleEnabled = async (key, next) => {
    if (!isOwner) return
    setBusyKey(key)
    try {
      const data = await api.patch(`/intake/${key}`, { enabled: next })
      setSources(data?.sources ?? sources)
      toast.success(next ? "Intake enabled" : "Intake disabled")
    } catch (err) {
      toast.error(err?.message || "Failed to update")
    } finally {
      setBusyKey(null)
    }
  }

  const regenerate = async (key) => {
    if (!isOwner) return
    setBusyKey(key)
    try {
      const data = await api.post("/intake/regenerate", { source: key })
      setSources(data?.view ?? sources)
      // Show the cleartext token ONCE so the OWNER can copy it.
      setRevealedTokens((m) => ({ ...m, [key]: data?.token || null }))
      toast.success("Token regenerated — copy it now, it won't be shown again")
    } catch (err) {
      toast.error(err?.message || "Failed to regenerate")
    } finally {
      setBusyKey(null)
      setConfirmRegen(null)
    }
  }

  const copyToClipboard = async (text, label) => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${label} copied`)
    } catch {
      toast.error("Copy failed — select and copy manually")
    }
  }

  if (loading) {
    return (
      <div className="card">
        <div className="card-title">Integrations</div>
        <p className="text-muted text-sm">Loading…</p>
      </div>
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="card">
        <div className="card-title">Lead intake</div>
        <p className="text-muted text-sm" style={{ marginBottom: 0 }}>
          Wire Facebook and Instagram lead-form ads so submissions land directly in your leads list.
          {!isOwner && " Read-only — only the workspace owner can change these."}
        </p>
      </div>

      {INTAKE_SOURCES.map(({ key, label, blurb, setupSteps }) => {
        const cfg = sources?.[key] || { enabled: false, hasToken: false, maskedToken: null, webhookUrl: null }
        const revealed = revealedTokens[key]
        const isOpen = openSetup[key]
        return (
          <div key={key} className="card">
            <div className="row row-between" style={{ marginBottom: 8 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: "1rem" }}>{label}</div>
                <div className="text-xs text-muted" style={{ marginTop: 2 }}>{blurb}</div>
              </div>
              <div className="row" style={{ gap: 10 }}>
                <span className={`badge ${cfg.enabled ? "badge-success" : "badge-muted"}`}>
                  {cfg.enabled ? "on" : "off"}
                </span>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={cfg.enabled}
                    disabled={!isOwner || busyKey === key}
                    onChange={(e) => toggleEnabled(key, e.target.checked)}
                  />
                  <span className="switch-slider" />
                </label>
              </div>
            </div>

            <div className="field" style={{ marginTop: 10 }}>
              <label>Webhook URL</label>
              <div className="row" style={{ gap: 8 }}>
                <input
                  className="input"
                  readOnly
                  value={cfg.webhookUrl || "— enable to generate —"}
                  style={{ flex: 1 }}
                />
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={!cfg.webhookUrl}
                  onClick={() => copyToClipboard(cfg.webhookUrl, "Webhook URL")}
                >
                  Copy
                </button>
              </div>
            </div>

            <div className="field">
              <label>Token</label>
              <div className="row" style={{ gap: 8 }}>
                <input
                  className="input"
                  readOnly
                  value={revealed || cfg.maskedToken || "—"}
                  style={{ flex: 1, fontFamily: "monospace" }}
                />
                {revealed ? (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setRevealedTokens((m) => ({ ...m, [key]: null }))}
                  >
                    Hide
                  </button>
                ) : null}
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={!revealed && !cfg.maskedToken}
                  onClick={() => copyToClipboard(revealed || "", "Token")}
                  title={revealed ? "Copy token" : "Token is masked — regenerate to see it once"}
                >
                  Copy
                </button>
                {isOwner && (
                  <button
                    className="btn btn-danger btn-sm"
                    disabled={busyKey === key}
                    onClick={() => setConfirmRegen(key)}
                  >
                    Regenerate
                  </button>
                )}
              </div>
              {revealed && (
                <div className="text-xs" style={{ color: "var(--lp-warning, #d97706)", marginTop: 6 }}>
                  This is the only time the token is shown. Copy it now.
                </div>
              )}
            </div>

            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setOpenSetup((m) => ({ ...m, [key]: !m[key] }))}
              style={{ marginTop: 4 }}
            >
              {isOpen ? "Hide setup instructions" : "Show setup instructions"}
            </button>
            {isOpen && (
              <ol style={{ margin: "8px 0 0 18px", padding: 0, color: "var(--lp-text-muted)", fontSize: "0.867rem" }}>
                {setupSteps.map((s, i) => (
                  <li key={i} style={{ marginBottom: 4 }}>{s}</li>
                ))}
              </ol>
            )}
          </div>
        )
      })}

      {confirmRegen && (
        <div className="modal-backdrop" onClick={() => setConfirmRegen(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div className="card-title" style={{ marginBottom: 0 }}>Regenerate token?</div>
            </div>
            <div className="modal-body">
              <p className="text-sm">
                The current webhook will stop accepting new leads immediately. You'll need to paste the new
                token into Facebook Business Manager. Continue?
              </p>
            </div>
            <div className="modal-foot">
              <button className="btn btn-secondary" onClick={() => setConfirmRegen(null)}>Cancel</button>
              <button
                className="btn btn-danger"
                disabled={busyKey === confirmRegen}
                onClick={() => regenerate(confirmRegen)}
              >
                {busyKey === confirmRegen ? "Regenerating…" : "Regenerate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Multi-provider BYO integrations (Meta, Google, JustDial, IndiaMART, website forms). */}
      <IntegrationsPanel />
    </div>
  )
}

// ---------------- Email / SMTP ----------------

const EMPTY_SMTP_FORM = {
  host: "",
  port: "",
  secure: false,
  username: "",
  password: "",
  fromEmail: "",
  fromName: "",
}

function EmailTab() {
  const user = useAuthStore((s) => s.user)
  const [form, setForm] = useState(EMPTY_SMTP_FORM)
  const [hasPassword, setHasPassword] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  // Where the "Send test email" goes. Defaults to the SMTP username (most
  // likely a real inbox the admin owns) so test mails don't get sent to a
  // synthetic demo address like owner@demo.com and bounce silently.
  const [testRecipient, setTestRecipient] = useState("")

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api
      .get("/company/me/smtp")
      .then((res) => {
        if (cancelled) return
        const d = res?.data ?? res
        setForm({
          host: d?.host || "",
          port: d?.port != null ? String(d.port) : "",
          secure: !!d?.secure,
          username: d?.username || "",
          password: "",
          fromEmail: d?.fromEmail || "",
          fromName: d?.fromName || "",
        })
        setHasPassword(!!d?.hasPassword)
        // Pre-fill the test recipient with the SMTP username when present
        // (real mailbox the admin controls), else the logged-in user's email.
        setTestRecipient(d?.username || user?.email || "")
      })
      .catch((err) => {
        if (!cancelled) toast.error(err?.message || "Failed to load SMTP settings")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const update = (k) => (e) => {
    const v = e.target.type === "checkbox" ? e.target.checked : e.target.value
    setForm((f) => ({ ...f, [k]: v }))
  }

  const buildPayload = () => ({
    host: form.host.trim() || null,
    port: form.port === "" ? null : Number(form.port),
    secure: !!form.secure,
    username: form.username.trim() || null,
    // Empty password means "keep existing" — only send when the user typed
    // a new one. The BE preserves the stored ciphertext in that case.
    password: form.password ? form.password : undefined,
    fromEmail: form.fromEmail.trim() || null,
    fromName: form.fromName.trim() || null,
  })

  const onSave = async () => {
    setSaving(true)
    try {
      const res = await api.patch("/company/me/smtp", buildPayload())
      const d = res?.data ?? res
      setHasPassword(!!d?.hasPassword)
      setForm((f) => ({ ...f, password: "" })) // wipe the field so the saved secret stays opaque
      toast.success(
        d?.configured
          ? "SMTP saved. Outgoing tenant mail will use this server."
          : "SMTP settings saved.",
      )
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || err?.message || "Failed to save SMTP settings")
    } finally {
      setSaving(false)
    }
  }

  const onTest = async () => {
    setTesting(true)
    try {
      const recipient = (testRecipient || form.username || user?.email || "").trim()
      if (!recipient || !/.+@.+\..+/.test(recipient)) {
        toast.error("Enter a valid email to send the test to.")
        setTesting(false)
        return
      }
      const payload = { ...buildPayload(), recipientEmail: recipient }
      const res = await api.post("/company/me/smtp/test", payload)
      const d = res?.data ?? res
      toast.success(`Test email sent to ${d?.recipient || recipient}.`)
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || err?.message || "Test send failed")
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return (
      <div className="card">
        <div className="card-title">Email (SMTP)</div>
        <p style={{ color: "var(--lp-text-muted)", fontSize: 14 }}>Loading…</p>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="card-title">Email (SMTP)</div>
      <p className="text-muted text-sm" style={{ marginTop: -8, marginBottom: 16 }}>
        Optional. When configured, invite emails sent from this workspace will
        go through your own SMTP server. Leave blank to use the LeadPro default.
      </p>
      <div className="grid grid-2" style={{ gap: "0 14px" }}>
        <div className="field">
          <label>SMTP host</label>
          <input className="input" placeholder="smtp.gmail.com" value={form.host} onChange={update("host")} />
        </div>
        <div className="field">
          <label>Port</label>
          <input className="input" placeholder="587" value={form.port} onChange={update("port")} inputMode="numeric" />
        </div>
        <div className="field">
          <label>Username</label>
          <input className="input" placeholder="you@yourdomain.com" value={form.username} onChange={update("username")} />
        </div>
        <div className="field">
          <label>Password / App password</label>
          <input
            className="input"
            type="password"
            placeholder={hasPassword ? "•••••••• (saved — leave blank to keep)" : ""}
            value={form.password}
            onChange={update("password")}
            autoComplete="new-password"
          />
        </div>
        <div className="field">
          <label>From email</label>
          <input className="input" placeholder="noreply@yourdomain.com" value={form.fromEmail} onChange={update("fromEmail")} />
        </div>
        <div className="field">
          <label>From name</label>
          <input className="input" placeholder="Your Company" value={form.fromName} onChange={update("fromName")} />
        </div>
        <div className="field" style={{ gridColumn: "span 2" }}>
          <label className="checkbox" style={{ marginTop: 6 }}>
            <input type="checkbox" checked={!!form.secure} onChange={update("secure")} />
            Use TLS (port 465 implies secure automatically)
          </label>
        </div>
      </div>
      <div
        className="row mt-4"
        style={{ alignItems: "flex-end", gap: 8, flexWrap: "wrap" }}
      >
        <div className="field" style={{ flex: 1, minWidth: 220, marginBottom: 0 }}>
          <label>Send test email to</label>
          <input
            className="input"
            type="email"
            placeholder="you@yourdomain.com"
            value={testRecipient}
            onChange={(e) => setTestRecipient(e.target.value)}
          />
        </div>
        <button className="btn btn-secondary" onClick={onTest} disabled={testing || saving}>
          {testing ? "Sending…" : "Send test email"}
        </button>
        <button className="btn btn-primary" onClick={onSave} disabled={saving || testing}>
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  )
}

// ---------------- Appearance ----------------

// Derive lighter/darker accent variants from a base hex color
function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
function rgbToHex(r, g, b) {
  return "#" + [r, g, b].map((v) => Math.min(255, Math.max(0, Math.round(v))).toString(16).padStart(2, "0")).join("")
}
function lighten(hex, amt) {
  const [r, g, b] = hexToRgb(hex)
  return rgbToHex(r + (255 - r) * amt, g + (255 - g) * amt, b + (255 - b) * amt)
}
function darken(hex, amt) {
  const [r, g, b] = hexToRgb(hex)
  return rgbToHex(r * (1 - amt), g * (1 - amt), b * (1 - amt))
}

function applyAccentColor(hex) {
  const root = document.documentElement
  root.style.setProperty("--lp-accent", hex)
  root.style.setProperty("--lp-accent-2", lighten(hex, 0.2))
  root.style.setProperty("--lp-accent-strong", darken(hex, 0.1))
  root.style.setProperty("--lp-accent-deep", darken(hex, 0.2))
  localStorage.setItem("lp-accent-hex", hex)
}

const TEXT_SIZES = [
  { key: "small",   label: "Small" },
  { key: "default", label: "Default" },
  { key: "large",   label: "Large" },
]

function AppearanceTab() {
  const { theme, setTheme } = useTheme()

  const [accentHex, setAccentHex] = useState(
    () => localStorage.getItem("lp-accent-hex") || "#8B5CF6"
  )
  const [textSize, setTextSize] = useState(
    () => localStorage.getItem("lp-text-size") || "default"
  )
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("lp-sidebar-collapsed") === "true"
  )

  const handleAccentChange = (hex) => {
    setAccentHex(hex)
    applyAccentColor(hex)
  }

  const applyTextSize = (key) => {
    setTextSize(key)
    document.documentElement.setAttribute("data-text-size", key)
    localStorage.setItem("lp-text-size", key)
  }

  const applyCollapsed = (val) => {
    setCollapsed(val)
    localStorage.setItem("lp-sidebar-collapsed", String(val))
  }

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div className="card-title" style={{ marginBottom: 0 }}>Appearance</div>

      {/* Theme */}
      <div className="field" style={{ marginBottom: 0 }}>
        <label>Theme</label>
        <div className="row" style={{ gap: 10 }}>
          {["dark", "light"].map((t) => (
            <button
              key={t}
              className={`btn ${theme === t ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setTheme(t)}
            >
              {t === "dark" ? "Dark" : "Light"}
            </button>
          ))}
        </div>
      </div>

      {/* Brand colour — free picker */}
      <div className="field" style={{ marginBottom: 0 }}>
        <label>Brand colour</label>
        <div className="row" style={{ gap: 12, alignItems: "center", marginTop: 6 }}>
          <input
            type="color"
            value={accentHex}
            onChange={(e) => handleAccentChange(e.target.value)}
            style={{
              width: 44,
              height: 44,
              borderRadius: 8,
              border: "2px solid var(--lp-border)",
              padding: 2,
              cursor: "pointer",
              background: "none",
            }}
          />
          <code style={{ fontSize: "0.867rem", color: "var(--lp-text-muted)" }}>{accentHex.toUpperCase()}</code>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => handleAccentChange("#8B5CF6")}
            style={{ marginLeft: "auto" }}
          >
            Reset
          </button>
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
          {[
            { label: "Base",   val: accentHex },
            { label: "Light",  val: lighten(accentHex, 0.2) },
            { label: "Strong", val: darken(accentHex, 0.1) },
            { label: "Deep",   val: darken(accentHex, 0.2) },
          ].map(({ label, val }) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{ width: 32, height: 32, borderRadius: 6, background: val, border: "1px solid var(--lp-border)" }} />
              <div className="text-xs text-muted" style={{ marginTop: 3 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Text size */}
      <div className="field" style={{ marginBottom: 0 }}>
        <label>Text size</label>
        <div className="row" style={{ gap: 10 }}>
          {TEXT_SIZES.map(({ key, label }) => (
            <button
              key={key}
              className={`btn ${textSize === key ? "btn-primary" : "btn-secondary"}`}
              onClick={() => applyTextSize(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Sidebar */}
      <div className="field" style={{ marginBottom: 0 }}>
        <label>Sidebar</label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={collapsed}
            onChange={(e) => applyCollapsed(e.target.checked)}
          />{" "}
          Collapsed by default
        </label>
      </div>
    </div>
  )
}

// ---------------- Roles & Permissions (read-only matrix) ----------------
//
// LeadPro uses a fixed role hierarchy enforced server-side
// (authMiddleware + requireRole). The matrix below mirrors that fixed
// hierarchy so admins can see who can do what — it's informational, not
// configurable. Granular per-tenant permissions would require a real
// permissions table + middleware rewrite (not planned for this MVP).

function RolesTab() {
  // ADMIN exists in the BE enum but isn't used in practice and overlaps
  // ~99% with OWNER, so we don't surface it to company admins. SUPER_ADMIN
  // is a platform-level role (companyId=null) and never belongs in the
  // company-side view either.
  const roles = ["Owner", "Manager", "Agent"]
  const perms = [
    "View leads",
    "Edit leads",
    "Delete leads",
    "Manage users",
    "Manage settings",
    "Export data",
  ]
  // Matches the actual BE checks: OWNER does everything; MANAGER manages
  // leads + a couple of team actions; AGENT is read/edit only on their
  // own scope.
  const allowed = (perm, role) => {
    if (role === "Owner") return true
    if (role === "Manager") return ["View leads", "Edit leads", "Delete leads"].includes(perm)
    if (role === "Agent") return ["View leads", "Edit leads"].includes(perm)
    return false
  }
  return (
    <div className="card">
      <div className="card-title">Roles & Permissions</div>
      <p className="text-muted text-sm" style={{ marginTop: -8, marginBottom: 14 }}>
        These are the built-in roles and what each can do. Granular per-role
        customisation isn't supported yet — assign a teammate one of these
        roles from <b>User Management</b>.
      </p>
      <div className="perm-matrix">
        <table className="data">
          <thead>
            <tr>
              <th>Permission</th>
              {roles.map((r) => (
                <th key={r}>{r}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {perms.map((p) => (
              <tr key={p}>
                <td>{p}</td>
                {roles.map((r) => (
                  <td key={r} style={{ color: allowed(p, r) ? "var(--lp-success)" : "var(--lp-text-dim, var(--lp-text-muted))", textAlign: "center" }}>
                    {allowed(p, r) ? "✓" : "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ---------------- Audit Log (stub) ----------------

function AuditTab() {
  // TODO: BE endpoint missing — audit log not implemented
  const rows = [
    { id: "a1", ts: Date.now() - 3600000, user: "Aman Verma", action: "login", target: "session", ip: "10.0.0.4" },
    { id: "a2", ts: Date.now() - 7200000, user: "Priya Shah", action: "lead.update", target: "lead#142", ip: "10.0.0.7" },
    { id: "a3", ts: Date.now() - 86400000, user: "Aman Verma", action: "settings.update", target: "company", ip: "10.0.0.4" },
  ]
  return (
    <div className="card">
      <div className="card-title">Audit Log</div>
      <div className="table-scroll">
        <table className="data">
          <thead>
            <tr>
              <th>When</th>
              <th>User</th>
              <th>Action</th>
              <th>Target</th>
              <th>IP</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id}>
                <td>{new Date(a.ts).toLocaleString()}</td>
                <td>{a.user}</td>
                <td>{a.action}</td>
                <td>{a.target}</td>
                <td><code className="text-xs">{a.ip}</code></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ---------------- Webhooks (stub) ----------------

function WebhooksTab() {
  // TODO: BE endpoint missing — webhook subscriptions not persisted
  const [hooks, setHooks] = useState([
    { id: "wh_1", url: "https://example.com/hooks/lead-created", event: "lead.created", active: true },
  ])
  const [draft, setDraft] = useState({ url: "", event: "lead.created" })
  const add = () => {
    if (!draft.url) return
    setHooks((arr) => [...arr, { id: "wh_" + Date.now(), ...draft, active: true }])
    setDraft({ url: "", event: "lead.created" })
    toast.success("Webhook added (stub)")
  }
  const remove = (id) => setHooks((arr) => arr.filter((h) => h.id !== id))
  return (
    <div className="card">
      <div className="card-title">Webhooks</div>
      <div className="grid grid-2" style={{ gap: "0 14px", marginBottom: 12 }}>
        <div className="field">
          <label>Endpoint URL</label>
          <input
            className="input"
            value={draft.url}
            onChange={(e) => setDraft({ ...draft, url: e.target.value })}
            placeholder="https://example.com/hooks"
          />
        </div>
        <div className="field">
          <label>Event</label>
          <select
            className="select"
            value={draft.event}
            onChange={(e) => setDraft({ ...draft, event: e.target.value })}
          >
            <option>lead.created</option>
            <option>lead.updated</option>
            <option>lead.status.changed</option>
            <option>booking.created</option>
          </select>
        </div>
        <div className="field" style={{ alignSelf: "end" }}>
          <button className="btn btn-primary" onClick={add}>Add webhook</button>
        </div>
      </div>
      <div className="table-scroll">
        <table className="data">
          <thead>
            <tr>
              <th>URL</th>
              <th>Event</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {hooks.map((h) => (
              <tr key={h.id}>
                <td><code>{h.url}</code></td>
                <td>{h.event}</td>
                <td>
                  <span className={`badge ${h.active ? "badge-success" : "badge-muted"}`}>
                    {h.active ? "active" : "paused"}
                  </span>
                </td>
                <td>
                  <button className="btn btn-secondary btn-sm" onClick={() => remove(h.id)}>Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
