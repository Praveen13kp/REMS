import { useEffect, useState } from "react"
import {
  Bell,
  CreditCard,
  FileText,
  Key,
  Mail,
  Palette,
  Plug,
  PlusSquare,
  Shield,
  Sliders,
  User,
  UsersRound,
  Webhook,
} from "lucide-react"
import { toast } from "sonner"
import { useTheme } from "next-themes"

import { api } from "@/lib/api"
import { useAuthStore } from "@/stores/authStore"
import Profile from "@/pages/admin/Profile"

// Visual port of leadpro-realty/src/pages/Settings.jsx.
// 13-tab settings page. Only General (PATCH /company/me) is wired to a real
// backend endpoint today; every other tab renders the UI against local stub
// state with a TODO comment pointing at the missing endpoint.
// AGENT role sees only Profile + Appearance + Notifications.

const ALL_TABS = [
  ["general", Sliders, "General"],
  ["profile", User, "Profile"],
  ["security", Shield, "Security"],
  ["notifications", Bell, "Notifications"],
  ["integrations", Plug, "Integrations"],
  ["email", Mail, "Email (SMTP)"],
  ["billing", CreditCard, "Billing"],
  ["appearance", Palette, "Appearance"],
  ["roles", UsersRound, "Roles & Permissions"],
  ["api", Key, "API Keys"],
  ["audit", FileText, "Audit Log"],
  ["fields", PlusSquare, "Custom Fields"],
  ["webhooks", Webhook, "Webhooks"],
]

const AGENT_TABS = [
  ["profile", User, "Profile"],
  ["appearance", Palette, "Appearance"],
  ["notifications", Bell, "Notifications"],
]

export default function Settings() {
  const user = useAuthStore((s) => s.user)
  const isAgent = user?.role === "AGENT" || user?.role === "agent"
  const tabs = isAgent ? AGENT_TABS : ALL_TABS
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
  if (tab === "profile") return <Profile />
  if (tab === "security") return <SecurityTab />
  if (tab === "notifications") return <NotificationsTab />
  if (tab === "integrations") return <IntegrationsTab />
  if (tab === "email") return <EmailTab />
  if (tab === "billing") return <BillingTab />
  if (tab === "appearance") return <AppearanceTab />
  if (tab === "roles") return <RolesTab />
  if (tab === "api") return <ApiKeysTab />
  if (tab === "audit") return <AuditTab />
  if (tab === "fields") return <CustomFieldsTab />
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

function NotificationsTab() {
  // TODO: BE endpoint missing — notification preferences not persisted
  const labels = [
    "New lead assigned",
    "Follow-up reminder",
    "Lead status changed",
    "New booking",
    "Daily summary",
    "Weekly report",
  ]
  const [prefs, setPrefs] = useState(() =>
    labels.map((_, i) => ({ email: i < 5, inapp: true, push: i < 3 })),
  )

  const toggle = (i, key) =>
    setPrefs((p) => p.map((row, idx) => (idx === i ? { ...row, [key]: !row[key] } : row)))

  return (
    <div className="card">
      <div className="card-title">Notification Preferences</div>
      {labels.map((l, i) => (
        <div
          key={l}
          className="row row-between"
          style={{ padding: "14px 0", borderBottom: "1px solid var(--lp-border)" }}
        >
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{l}</div>
            <div className="text-xs text-muted">Receive notifications when this happens</div>
          </div>
          <div className="row" style={{ gap: 12 }}>
            <label className="checkbox">
              <input type="checkbox" checked={prefs[i].email} onChange={() => toggle(i, "email")} /> Email
            </label>
            <label className="checkbox">
              <input type="checkbox" checked={prefs[i].inapp} onChange={() => toggle(i, "inapp")} /> In-app
            </label>
            <label className="checkbox">
              <input type="checkbox" checked={prefs[i].push} onChange={() => toggle(i, "push")} /> Push
            </label>
          </div>
        </div>
      ))}
      <div className="row mt-4" style={{ justifyContent: "flex-end" }}>
        <button className="btn btn-primary" onClick={() => toast.success("Preferences saved (stub)")}>
          Save changes
        </button>
      </div>
    </div>
  )
}

// ---------------- Integrations (stub) ----------------

function IntegrationsTab() {
  // TODO: BE endpoint missing — integration connect/disconnect not wired
  const initial = [
    ["MagicBricks", "Lead syndication", "connected"],
    ["99acres", "Lead syndication", "connected"],
    ["WhatsApp Business", "Messaging", "connected"],
    ["Razorpay", "Payments", "connected"],
    ["Google Calendar", "Calendar sync", "disconnected"],
    ["Mailchimp", "Email marketing", "disconnected"],
    ["Twilio", "SMS & Voice", "disconnected"],
    ["Slack", "Team alerts", "connected"],
  ]
  const [items, setItems] = useState(initial)
  const flip = (name) =>
    setItems((arr) =>
      arr.map(([n, d, s]) =>
        n === name ? [n, d, s === "connected" ? "disconnected" : "connected"] : [n, d, s],
      ),
    )

  return (
    <div className="card">
      <div className="card-title">Integrations</div>
      <div className="grid grid-2" style={{ gap: 14 }}>
        {items.map(([n, d, s]) => (
          <div key={n} className="card" style={{ background: "var(--lp-surface-2)" }}>
            <div className="row row-between">
              <div>
                <div style={{ fontWeight: 600 }}>{n}</div>
                <div className="text-xs text-muted">{d}</div>
              </div>
              <span className={`badge ${s === "connected" ? "badge-success" : "badge-muted"}`}>{s}</span>
            </div>
            <button
              className="btn btn-secondary btn-sm mt-3"
              style={{ width: "100%", justifyContent: "center" }}
              onClick={() => {
                flip(n)
                toast.success(s === "connected" ? "Disconnected" : "Connected")
              }}
            >
              {s === "connected" ? "Disconnect" : "Connect"}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------- Email / SMTP (stub) ----------------

function EmailTab() {
  // TODO: BE endpoint missing — SMTP settings not persisted
  const [form, setForm] = useState({
    host: "smtp.example.com",
    port: "587",
    username: "",
    password: "",
    fromEmail: "",
    fromName: "",
  })
  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  return (
    <div className="card">
      <div className="card-title">Email (SMTP)</div>
      <div className="grid grid-2" style={{ gap: "0 14px" }}>
        <div className="field">
          <label>SMTP host</label>
          <input className="input" value={form.host} onChange={update("host")} />
        </div>
        <div className="field">
          <label>Port</label>
          <input className="input" value={form.port} onChange={update("port")} />
        </div>
        <div className="field">
          <label>Username</label>
          <input className="input" value={form.username} onChange={update("username")} />
        </div>
        <div className="field">
          <label>Password</label>
          <input className="input" type="password" value={form.password} onChange={update("password")} />
        </div>
        <div className="field">
          <label>From email</label>
          <input className="input" value={form.fromEmail} onChange={update("fromEmail")} />
        </div>
        <div className="field">
          <label>From name</label>
          <input className="input" value={form.fromName} onChange={update("fromName")} />
        </div>
      </div>
      <div className="row mt-4" style={{ justifyContent: "flex-end", gap: 8 }}>
        <button className="btn btn-secondary" onClick={() => toast.info("Test email sent (stub)")}>
          Send test email
        </button>
        <button className="btn btn-primary" onClick={() => toast.success("SMTP saved (stub)")}>
          Save changes
        </button>
      </div>
    </div>
  )
}

// ---------------- Billing (stub) ----------------

function BillingTab() {
  // TODO: BE endpoint missing — plan and invoices come from stub data
  const invoices = [
    { id: "INV-00012", date: Date.now() - 86400000 * 3, plan: "Pro", amount: 4999, status: "Paid" },
    { id: "INV-00011", date: Date.now() - 86400000 * 33, plan: "Pro", amount: 4999, status: "Paid" },
    { id: "INV-00010", date: Date.now() - 86400000 * 63, plan: "Pro", amount: 4999, status: "Paid" },
  ]
  return (
    <>
      <div
        className="card mb-4"
        style={{
          background: "linear-gradient(135deg,rgba(139,92,246,.1),rgba(139,92,246,.02))",
          borderColor: "rgba(139,92,246,.3)",
        }}
      >
        <div className="row row-between">
          <div>
            <div className="card-title">Pro Plan</div>
            <p className="text-muted text-sm">₹4,999/month</p>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn-secondary">Downgrade</button>
            <button className="btn btn-primary">Upgrade</button>
          </div>
        </div>
      </div>
      <div className="card">
        <div className="card-title">Billing History</div>
        <div className="table-scroll">
          <table className="data">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Date</th>
                <th>Plan</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((i) => (
                <tr key={i.id}>
                  <td>
                    <code>{i.id}</code>
                  </td>
                  <td>{new Date(i.date).toLocaleDateString()}</td>
                  <td>{i.plan}</td>
                  <td>₹{i.amount.toLocaleString("en-IN")}</td>
                  <td>
                    <span className="badge badge-success">{i.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

// ---------------- Appearance (stub — local theme toggle only) ----------------

function AppearanceTab() {
  const { theme, setTheme } = useTheme()
  const [collapsed, setCollapsed] = useState(false)
  return (
    <div className="card">
      <div className="card-title">Appearance</div>
      <div className="field">
        <label>Theme</label>
        <div className="row" style={{ gap: 10 }}>
          <button
            className={`btn ${theme === "dark" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setTheme("dark")}
          >
            Dark
          </button>
          <button
            className={`btn ${theme === "light" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setTheme("light")}
          >
            Light
          </button>
        </div>
      </div>
      <div className="field">
        <label>Sidebar</label>
        <div className="row">
          <label className="checkbox">
            <input
              type="checkbox"
              checked={collapsed}
              onChange={(e) => setCollapsed(e.target.checked)}
            />{" "}
            Collapsed by default
          </label>
        </div>
      </div>
    </div>
  )
}

// ---------------- Roles & Permissions (stub) ----------------

function RolesTab() {
  // TODO: BE endpoint missing — RBAC matrix is hard-coded
  const roles = ["Owner", "Admin", "Manager", "Agent"]
  const perms = [
    "View leads",
    "Edit leads",
    "Delete leads",
    "Manage users",
    "Manage settings",
    "Export data",
  ]
  return (
    <div className="card">
      <div className="card-title">Roles & Permissions</div>
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
            {perms.map((p, i) => (
              <tr key={p}>
                <td>{p}</td>
                {roles.map((r, ri) => (
                  <td key={r}>
                    <input type="checkbox" defaultChecked={ri === 0 || (ri === 1 && i < 5) || (ri === 2 && i < 3) || (ri === 3 && i < 2)} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="row mt-4" style={{ justifyContent: "flex-end" }}>
        <button className="btn btn-primary" onClick={() => toast.success("Roles saved (stub)")}>
          Save changes
        </button>
      </div>
    </div>
  )
}

// ---------------- API Keys (stub) ----------------

function ApiKeysTab() {
  // TODO: BE endpoint missing — API key issuance/revocation not wired
  const [keys, setKeys] = useState([
    { id: "k_1", name: "Production", prefix: "sk_live_8a2…", createdAt: Date.now() - 86400000 * 14 },
    { id: "k_2", name: "Staging", prefix: "sk_test_3f0…", createdAt: Date.now() - 86400000 * 60 },
  ])
  const issue = () => {
    setKeys((arr) => [
      { id: "k_" + Date.now(), name: "New Key", prefix: "sk_test_" + Math.random().toString(36).slice(2, 6) + "…", createdAt: Date.now() },
      ...arr,
    ])
    toast.success("API key issued (stub)")
  }
  const revoke = (id) => {
    setKeys((arr) => arr.filter((k) => k.id !== id))
    toast.success("API key revoked (stub)")
  }
  return (
    <div className="card">
      <div className="row row-between" style={{ marginBottom: 12 }}>
        <div className="card-title" style={{ marginBottom: 0 }}>API Keys</div>
        <button className="btn btn-primary" onClick={issue}>Issue new key</button>
      </div>
      <div className="table-scroll">
        <table className="data">
          <thead>
            <tr>
              <th>Name</th>
              <th>Key</th>
              <th>Created</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {keys.map((k) => (
              <tr key={k.id}>
                <td>{k.name}</td>
                <td><code>{k.prefix}</code></td>
                <td>{new Date(k.createdAt).toLocaleDateString()}</td>
                <td>
                  <button className="btn btn-secondary btn-sm" onClick={() => revoke(k.id)}>Revoke</button>
                </td>
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

// ---------------- Custom Fields (stub) ----------------

function CustomFieldsTab() {
  // TODO: BE endpoint missing — custom field definitions not persisted
  const [fields, setFields] = useState([
    { id: "cf_1", label: "Budget Range", key: "budget_range", type: "Text" },
    { id: "cf_2", label: "Preferred BHK", key: "preferred_bhk", type: "Select" },
  ])
  const [draft, setDraft] = useState({ label: "", key: "", type: "Text" })
  const add = () => {
    if (!draft.label) return
    setFields((arr) => [...arr, { id: "cf_" + Date.now(), ...draft }])
    setDraft({ label: "", key: "", type: "Text" })
    toast.success("Field added (stub)")
  }
  const remove = (id) => setFields((arr) => arr.filter((f) => f.id !== id))
  return (
    <div className="card">
      <div className="card-title">Custom Fields</div>
      <div className="grid grid-2" style={{ gap: "0 14px", marginBottom: 12 }}>
        <div className="field">
          <label>Label</label>
          <input
            className="input"
            value={draft.label}
            onChange={(e) => setDraft({ ...draft, label: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Key</label>
          <input
            className="input"
            value={draft.key}
            onChange={(e) => setDraft({ ...draft, key: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Type</label>
          <select
            className="select"
            value={draft.type}
            onChange={(e) => setDraft({ ...draft, type: e.target.value })}
          >
            <option>Text</option>
            <option>Number</option>
            <option>Select</option>
            <option>Date</option>
          </select>
        </div>
        <div className="field" style={{ alignSelf: "end" }}>
          <button className="btn btn-primary" onClick={add}>Add field</button>
        </div>
      </div>
      <div className="table-scroll">
        <table className="data">
          <thead>
            <tr>
              <th>Label</th>
              <th>Key</th>
              <th>Type</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {fields.map((f) => (
              <tr key={f.id}>
                <td>{f.label}</td>
                <td><code>{f.key}</code></td>
                <td>{f.type}</td>
                <td>
                  <button className="btn btn-secondary btn-sm" onClick={() => remove(f.id)}>Remove</button>
                </td>
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
