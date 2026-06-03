import { useEffect, useState } from "react"
import {
  Bell,
  Eye,
  EyeOff,
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
  X,
} from "lucide-react"
import { toast } from "sonner"
import { useTheme } from "next-themes"

import { api } from "@/lib/api"
import { useAuthStore } from "@/stores/authStore"
import { getBaseModules, getEffectiveModules, ALL_MODULES, RESTRICTABLE_ROLES, MODULE_LABELS } from "@/lib/modules"
import { roleLabel } from "@/lib/format"
import Profile from "@/pages/admin/Profile"
import IntegrationsPanel from "@/pages/admin/settings/integrations/IntegrationsPanel"
import StageEditor from "@/components/pipeline/StageEditor"
import {
  ACCENT_CHANGED_EVENT,
  DEFAULT_ACCENT,
  getAccentForCompany,
  saveAccentForCompany,
  getTextSizeForCompany,
  saveTextSizeForCompany,

  lighten,
  darken,
} from "@/lib/appearance"

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
  ["email-templates", FileText, "Email Templates"],
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
  if (tab === "email-templates") return <EmailTemplatesTab />
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
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await api.get("/company/me")
        // BE returns `{ success: true, data: <companyObj> }`. The api
        // interceptor already strips the axios wrapper, so we land on
        // that envelope and the company itself is at .data. The legacy
        // fallbacks are kept for safety against shape drift.
        const c = res?.data ?? res?.company ?? res
        if (!cancelled && c) {
          setForm((prev) => ({
            ...prev,
            name: c.name ?? prev.name,
            industry: c.industry ?? prev.industry,
            timezone: c.timezone ?? prev.timezone,
            currency: c.currency ?? prev.currency,
            dateFormat: c.dateFormat ?? prev.dateFormat,
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

  const update = (k) => (e) => {
    const val = e.target.value
    setForm((f) => {
      const next = { ...f, [k]: val }
      // Auto-set currency when timezone changes — the most common mapping
      // for Indian real-estate CRMs. User can still override manually.
      if (k === "timezone") {
        if (val.startsWith("Asia/Kolkata") || val.startsWith("Asia/Mumbai")) next.currency = "INR"
        else if (val.startsWith("Asia/Dubai") || val.startsWith("Asia/Muscat")) next.currency = "AED"
        else if (val.startsWith("America/")) next.currency = "USD"
        else if (val.startsWith("Europe/London")) next.currency = "GBP"
        else if (val.startsWith("Europe/")) next.currency = "EUR"
        else if (val.startsWith("Australia/")) next.currency = "AUD"
        else if (val.startsWith("Asia/Singapore")) next.currency = "SGD"
      }
      return next
    })
  }

  const save = async () => {
    setSaving(true)
    try {
      // General settings persist on the Company row (migration
      // company_general_settings added industry / dateFormat). The app is
      // English-only, so there's no language field. Trim strings; skip name
      // if blank so we don't save an empty workspace name (BE enforces min(2)).
      const payload = {
        timezone: form.timezone,
        currency: form.currency,
        industry: form.industry?.trim() || null,
        dateFormat: form.dateFormat,
      }
      if (form.name?.trim()) payload.name = form.name.trim()
      await api.patch("/company/me", payload)
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
            <option value="Asia/Kolkata (IST)">Asia/Kolkata (IST)</option>
            <option value="Asia/Dubai">Asia/Dubai (GST)</option>
            <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
            <option value="America/New_York">America/New_York (EST)</option>
            <option value="America/Chicago">America/Chicago (CST)</option>
            <option value="America/Los_Angeles">America/Los Angeles (PST)</option>
            <option value="Europe/London">Europe/London (GMT)</option>
            <option value="Europe/Berlin">Europe/Berlin (CET)</option>
            <option value="Australia/Sydney">Australia/Sydney (AEST)</option>
            <option value="UTC">UTC</option>
          </select>
        </div>
        <div className="field">
          <label>Currency</label>
          <select className="select" value={form.currency} onChange={update("currency")} disabled={loading}>
            <option value="INR">INR (₹)</option>
            <option value="USD">USD ($)</option>
            <option value="AED">AED (د.إ)</option>
            <option value="GBP">GBP (£)</option>
            <option value="EUR">EUR (€)</option>
            <option value="AUD">AUD (A$)</option>
            <option value="SGD">SGD (S$)</option>
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

function PasswordField({ label, value, onChange }) {
  const [show, setShow] = useState(false)
  return (
    <div className="field">
      <label>{label}</label>
      <div className="input-group">
        <input
          className="input"
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          style={{ paddingRight: 40 }}
        />
        <button
          type="button"
          className="toggle-pw"
          onClick={() => setShow((s) => !s)}
          tabIndex={-1}
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  )
}

function SecurityTab() {
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" })
  const [twoFa, setTwoFa] = useState(false)
  const [saving, setSaving] = useState(false)

  const updatePw = async () => {
    if (!pw.current) {
      toast.error("Enter your current password")
      return
    }
    if (!pw.next || pw.next.length < 8) {
      toast.error("New password must be at least 8 characters")
      return
    }
    if (pw.next !== pw.confirm) {
      toast.error("New passwords don't match")
      return
    }
    setSaving(true)
    try {
      await api.post("/users/me/change-password", {
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
        <PasswordField
          label="Current password"
          value={pw.current}
          onChange={(e) => setPw({ ...pw, current: e.target.value })}
        />
        <div className="grid grid-2" style={{ gap: "0 14px" }}>
          <PasswordField
            label="New password"
            value={pw.next}
            onChange={(e) => setPw({ ...pw, next: e.target.value })}
          />
          <PasswordField
            label="Confirm new password"
            value={pw.confirm}
            onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
          />
        </div>
        <button className="btn btn-primary" onClick={updatePw} disabled={saving}>
          {saving ? "Updating…" : "Update Password"}
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
          onClick={() => toast.success("Preferences saved")}
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
//
// Accent color math + CSS-var application moved to lib/appearance.js so
// the boot path (App.jsx) and the Settings UI share the same per-tenant
// storage rules. See that module for the lighten/darken helpers.

const TEXT_SIZES = [
  { key: "small",   label: "Small" },
  { key: "default", label: "Default" },
  { key: "large",   label: "Large" },
]

// Tenant-scoped email-template library. Templates show up in the lead
// detail "Send Email" composer; `{{lead.name}}`, `{{user.name}}`, and
// `{{company.name}}` are expanded server-side when the message is sent.
function EmailTemplatesTab() {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null) // null | "new" | template object
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get("/email-templates")
      setTemplates(res?.data ?? [])
    } catch (err) {
      toast.error(err?.message || "Failed to load templates")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const save = async (data) => {
    setSaving(true)
    try {
      if (editing && editing !== "new") {
        await api.patch(`/email-templates/${editing.id}`, data)
        toast.success("Template updated")
      } else {
        await api.post("/email-templates", data)
        toast.success("Template created")
      }
      setEditing(null)
      load()
    } catch (err) {
      toast.error(err?.message || "Failed to save template")
    } finally {
      setSaving(false)
    }
  }

  const remove = async (tpl) => {
    if (!window.confirm(`Delete template "${tpl.name}"?`)) return
    try {
      await api.delete(`/email-templates/${tpl.id}`)
      toast.success("Template deleted")
      load()
    } catch (err) {
      toast.error(err?.message || "Failed to delete")
    }
  }

  return (
    <>
      <div className="card">
        <div
          className="row row-between"
          style={{ alignItems: "center", marginBottom: 14 }}
        >
          <div>
            <div className="card-title" style={{ marginBottom: 2 }}>
              Email Templates
            </div>
            <p className="text-xs text-muted" style={{ margin: 0 }}>
              Reusable email bodies that show up in the lead Send Email
              composer. Use{" "}
              <code>{"{{lead.name}}"}</code>, <code>{"{{user.name}}"}</code>,{" "}
              and <code>{"{{company.name}}"}</code> as variables.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setEditing("new")}
          >
            <Mail size={14} /> New template
          </button>
        </div>

        {loading ? (
          <p className="text-muted text-sm">Loading…</p>
        ) : templates.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "32px 16px",
              border: "1px dashed var(--lp-border)",
              borderRadius: 8,
            }}
          >
            <Mail
              size={28}
              style={{
                color: "var(--lp-text-muted)",
                opacity: 0.5,
                marginBottom: 8,
              }}
            />
            <div style={{ fontWeight: 600, marginBottom: 4 }}>
              No templates yet
            </div>
            <p className="text-muted text-sm" style={{ margin: 0 }}>
              Create reusable email bodies for follow-ups, site visits, and
              outreach.
            </p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Subject</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((t) => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 600 }}>{t.name}</td>
                    <td>
                      {t.category ? (
                        <span className="badge badge-info">{t.category}</span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td
                      style={{
                        maxWidth: 320,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={t.subject}
                    >
                      {t.subject}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div
                        className="row"
                        style={{ justifyContent: "flex-end", gap: 4 }}
                      >
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          onClick={() => setEditing(t)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn-icon btn-ghost"
                          onClick={() => remove(t)}
                          title="Delete"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <EmailTemplateEditor
          template={editing === "new" ? null : editing}
          saving={saving}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}
    </>
  )
}

function EmailTemplateEditor({ template, saving, onClose, onSave }) {
  const [name, setName] = useState(template?.name || "")
  const [category, setCategory] = useState(template?.category || "")
  const [subject, setSubject] = useState(template?.subject || "")
  const [body, setBody] = useState(template?.body || "")

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{
          maxWidth: 640,
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div className="modal-head" style={{ flexShrink: 0 }}>
          <h3 style={{ margin: 0 }}>
            {template ? "Edit template" : "New template"}
          </h3>
          <button
            type="button"
            className="btn-icon btn-ghost"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="modal-body" style={{ overflowY: "auto", flex: 1 }}>
          <div className="field">
            <label>
              Name <span className="req">*</span>
            </label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. First Contact"
            />
          </div>
          <div className="field">
            <label>Category</label>
            <input
              className="input"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Outreach, Follow-up, Site Visit"
            />
          </div>
          <div className="field">
            <label>
              Subject <span className="req">*</span>
            </label>
            <input
              className="input"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Thanks for your interest, {{lead.name}}"
            />
          </div>
          <div className="field">
            <label>
              Body <span className="req">*</span>
            </label>
            <textarea
              className="input"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              placeholder={
                "Hi {{lead.name}},\n\nThanks for reaching out…\n\nBest,\n{{user.name}}"
              }
              style={{ resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 }}
            />
            <div className="text-xs text-muted" style={{ marginTop: 4 }}>
              Variables: <code>{"{{lead.name}}"}</code>,{" "}
              <code>{"{{user.name}}"}</code>,{" "}
              <code>{"{{company.name}}"}</code>
            </div>
          </div>
        </div>
        <div className="modal-foot" style={{ flexShrink: 0 }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={saving}
            onClick={() => onSave({ name, category, subject, body })}
          >
            {saving ? "Saving…" : "Save template"}
          </button>
        </div>
      </div>
    </div>
  )
}

function AppearanceTab() {
  const { theme, setTheme } = useTheme()
  // Per-tenant accent / text-size — keyed by the current user's
  // companyId so a Channel Partner (or anyone with multiple workspaces)
  // sees each company's brand instead of the last one they touched.
  const companyId = useAuthStore((s) => s.user?.companyId || null)

  const [accentHex, setAccentHex] = useState(
    () => getAccentForCompany(companyId) || DEFAULT_ACCENT,
  )
  const [textSize, setTextSize] = useState(
    () => getTextSizeForCompany(companyId),
  )
  // When the tenant context changes (switch workspace) re-sync the
  // controls so the form reflects the company we're configuring. Also
  // listen for the Navbar's brand-colour picker so both stay in lockstep.
  useEffect(() => {
    setAccentHex(getAccentForCompany(companyId) || DEFAULT_ACCENT)
    setTextSize(getTextSizeForCompany(companyId))
    const onAccent = (e) => {
      if (!e?.detail || e.detail.companyId === companyId) {
        setAccentHex(e?.detail?.hex || getAccentForCompany(companyId))
      }
    }
    window.addEventListener(ACCENT_CHANGED_EVENT, onAccent)
    return () => window.removeEventListener(ACCENT_CHANGED_EVENT, onAccent)
  }, [companyId])

  const handleAccentChange = (hex) => {
    setAccentHex(hex)
    saveAccentForCompany(companyId, hex)
  }

  const applyTextSize = (key) => {
    setTextSize(key)
    saveTextSizeForCompany(companyId, key)
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
            onClick={() => handleAccentChange(DEFAULT_ACCENT)}
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
  const user = useAuthStore((s) => s.user)
  const setModuleRestrictions = useAuthStore((s) => s.setModuleRestrictions)
  const isOwner = user?.role === "OWNER"
  const [restrictions, setRestrictions] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await api.get("/company/me/module-restrictions")
        if (!cancelled) setRestrictions(res?.data ?? {})
      } catch {
        if (!cancelled) setRestrictions({})
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const isModuleRestricted = (role, mod) => {
    if (!restrictions) return true
    const roleRests = restrictions[role]
    if (!roleRests) return true
    return roleRests.includes(mod)
  }

  const toggleModule = async (role, mod) => {
    const base = getBaseModules(role)
    if (!base || !base.includes(mod)) return

    const next = { ...(restrictions || {}) }
    const current = [...(next[role] || [...base])]

    if (current.includes(mod)) {
      const updated = current.filter((m) => m !== mod)
      if (updated.length === 0) {
        next[role] = []
      } else {
        next[role] = updated
      }
    } else {
      next[role] = [...current, mod]
    }

    setRestrictions(next)
    setSaving(true)
    try {
      const res = await api.patch("/company/me/module-restrictions", { restrictions: next })
      const saved = res?.data ?? next
      setRestrictions(saved)
      setModuleRestrictions(saved)
    } catch (err) {
      toast.error(err?.message || "Failed to save restrictions")
      const reload = await api.get("/company/me/module-restrictions")
      setRestrictions(reload?.data ?? {})
    } finally {
      setSaving(false)
    }
  }

  const resetRole = async (role) => {
    const base = getBaseModules(role)
    if (!base) return
    const next = { ...(restrictions || {}) }
    delete next[role]
    setRestrictions(next)
    setSaving(true)
    try {
      const res = await api.patch("/company/me/module-restrictions", { restrictions: next })
      const saved = res?.data ?? next
      setRestrictions(saved)
      setModuleRestrictions(saved)
      toast.success(`${roleLabel(role)} restrictions reset to default`)
    } catch (err) {
      toast.error(err?.message || "Failed to reset")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="card">
        <div className="card-title">Roles & Permissions</div>
        <p className="text-muted text-sm">Loading…</p>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="card-title">Roles & Permissions</div>
      <p className="text-muted text-sm" style={{ marginTop: -8, marginBottom: 14 }}>
        {isOwner
          ? "Restrict which modules each role can access. Grey checkboxes are the role's base (maximum) module set — you can only remove modules, not add beyond what the role already has."
          : "Your workspace Owner can restrict which modules each role can access."}
      </p>
      <div className="perm-matrix">
        <table className="data">
          <thead>
            <tr>
              <th>Module</th>
              {RESTRICTABLE_ROLES.map((r) => (
                <th key={r}>{roleLabel(r)}</th>
              ))}
              <th style={{ textAlign: "center" }}>Owner / Admin</th>
            </tr>
          </thead>
          <tbody>
            {ALL_MODULES.map((mod) => (
              <tr key={mod}>
                <td>{mod}</td>
                {RESTRICTABLE_ROLES.map((r) => {
                  const base = getBaseModules(r)
                  const inBase = base && base.includes(mod)
                  const checked = inBase && (restrictions?.[r] ? restrictions[r].includes(mod) : true)
                  const dimmed = !inBase
                  return (
                    <td key={r} style={{ textAlign: "center" }}>
                      {inBase ? (
                        <label className="checkbox" style={{ justifyContent: "center", opacity: dimmed ? 0.3 : 1 }}>
                          <input
                            type="checkbox"
                            checked={!!checked}
                            disabled={!isOwner || saving}
                            onChange={() => toggleModule(r, mod)}
                          />
                        </label>
                      ) : (
                        <span style={{ color: "var(--lp-text-dim, var(--lp-text-muted))", fontSize: "0.8rem" }}>—</span>
                      )}
                    </td>
                  )
                })}
                <td style={{ textAlign: "center", color: "var(--lp-success)" }}>✓</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {isOwner && (
        <div className="row mt-4" style={{ gap: 8 }}>
          {RESTRICTABLE_ROLES.map((r) => (
            <button
              key={r}
              className="btn btn-secondary btn-sm"
              disabled={saving || (!restrictions?.[r])}
              onClick={() => resetRole(r)}
            >
              Reset {roleLabel(r)}
            </button>
          ))}
        </div>
      )}
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
    toast.success("Webhook added")
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
