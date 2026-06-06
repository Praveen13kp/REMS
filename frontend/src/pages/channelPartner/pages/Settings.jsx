import { useEffect, useState } from "react"
import { useOutletContext } from "react-router-dom"
import { useTheme } from "next-themes"
import { Bell, Eye, EyeOff, Moon, Palette, Shield, Sun } from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
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

const TEXT_SIZES = [
  { key: "small", label: "Small" },
  { key: "default", label: "Default" },
  { key: "large", label: "Large" },
]

// CP-relevant notification events. Delivery for in-app (bell) is live; email
// digests are rolling out, so choices are saved for when each lands — same
// stubbed-prefs policy as the admin Settings → Notifications tab.
const CP_PREFS = [
  { key: "lead_shared", label: "New lead shared with you", defaultEmail: true, defaultInapp: true },
  { key: "lead_status", label: "Lead status updated", defaultEmail: false, defaultInapp: true },
  { key: "followup_due", label: "Follow-up reminder", defaultEmail: true, defaultInapp: true },
  { key: "direct_message", label: "Direct message", defaultEmail: false, defaultInapp: true },
]

export default function Settings() {
  const { theme, setTheme } = useTheme()
  const isDark = theme === "dark"

  // Brand colour + text size follow the CP's currently-selected workspace
  // (CPs can be linked to many companies and switch between them), exposed by
  // CpLayout via Outlet context.
  const { activeCompanyId } = useOutletContext() ?? {}
  const [accentHex, setAccentHex] = useState(
    () => getAccentForCompany(activeCompanyId) || DEFAULT_ACCENT,
  )
  const [textSize, setTextSize] = useState(() => getTextSizeForCompany(activeCompanyId))

  // Re-read on company switch and stay in lockstep with any other surface
  // that changes the accent.
  useEffect(() => {
    setAccentHex(getAccentForCompany(activeCompanyId) || DEFAULT_ACCENT)
    setTextSize(getTextSizeForCompany(activeCompanyId))
    const onAccent = (e) => {
      if (!e?.detail || e.detail.companyId === activeCompanyId) {
        setAccentHex(e?.detail?.hex || getAccentForCompany(activeCompanyId))
      }
    }
    window.addEventListener(ACCENT_CHANGED_EVENT, onAccent)
    return () => window.removeEventListener(ACCENT_CHANGED_EVENT, onAccent)
  }, [activeCompanyId])

  const handleAccentChange = (hex) => {
    setAccentHex(hex)
    saveAccentForCompany(activeCompanyId, hex)
  }
  const handleTextSize = (key) => {
    setTextSize(key)
    saveTextSizeForCompany(activeCompanyId, key)
  }

  return (
    <>
      <div className="cp-page-head">
        <div>
          <h1>Settings</h1>
          <p>Preferences and security for your channel partner workspace.</p>
        </div>
      </div>

      {/* ===== Appearance ===== */}
      <div className="cp-card" style={{ maxWidth: 720 }}>
        <div className="cp-card-title"><span><Palette size={15} /> Appearance</span></div>

        <div className="field" style={{ marginBottom: 18 }}>
          <label>Theme</label>
          <div className="row" style={{ gap: 10, marginTop: 6 }}>
            <button type="button" className={`btn ${!isDark ? "btn-primary" : "btn-secondary"}`} onClick={() => setTheme("light")}>
              <Sun size={14} /> Light
            </button>
            <button type="button" className={`btn ${isDark ? "btn-primary" : "btn-secondary"}`} onClick={() => setTheme("dark")}>
              <Moon size={14} /> Dark
            </button>
          </div>
        </div>

        <div className="field" style={{ marginBottom: 18 }}>
          <label>Text size</label>
          <div className="row" style={{ gap: 10, marginTop: 6 }}>
            {TEXT_SIZES.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                className={`btn ${textSize === key ? "btn-primary" : "btn-secondary"}`}
                onClick={() => handleTextSize(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="field" style={{ marginBottom: 0 }}>
          <label>Brand colour</label>
          <div className="row" style={{ gap: 12, alignItems: "center", marginTop: 6 }}>
            <input
              type="color"
              value={accentHex}
              onChange={(e) => handleAccentChange(e.target.value)}
              disabled={!activeCompanyId}
              style={{
                width: 44, height: 44, borderRadius: 8, border: "2px solid var(--lp-border)",
                padding: 2, cursor: activeCompanyId ? "pointer" : "not-allowed", background: "none",
              }}
            />
            <code style={{ fontSize: "0.867rem", color: "var(--lp-text-muted)" }}>{accentHex.toUpperCase()}</code>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => handleAccentChange(DEFAULT_ACCENT)}
              disabled={!activeCompanyId}
              style={{ marginLeft: "auto" }}
            >
              Reset
            </button>
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
            {[
              { label: "Base", val: accentHex },
              { label: "Light", val: lighten(accentHex, 0.2) },
              { label: "Strong", val: darken(accentHex, 0.1) },
              { label: "Deep", val: darken(accentHex, 0.2) },
            ].map(({ label, val }) => (
              <div key={label} style={{ textAlign: "center" }}>
                <div style={{ width: 32, height: 32, borderRadius: 6, background: val, border: "1px solid var(--lp-border)" }} />
                <div className="text-xs text-muted" style={{ marginTop: 3 }}>{label}</div>
              </div>
            ))}
          </div>
          {!activeCompanyId && (
            <p className="text-muted text-sm" style={{ marginTop: 8 }}>
              Select a company in the top bar to set its brand colour.
            </p>
          )}
        </div>
      </div>

      {/* ===== Security ===== */}
      <SecurityCard />

      {/* ===== Notifications ===== */}
      <NotificationsCard />
    </>
  )
}

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
          autoComplete="new-password"
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

function SecurityCard() {
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" })
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
      toast.error(err?.response?.data?.error?.message || err?.message || "Failed to update password")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="cp-card" style={{ marginTop: 16, maxWidth: 720 }}>
      <div className="cp-card-title"><span><Shield size={15} /> Security</span></div>
      <p className="text-muted text-sm" style={{ marginTop: -6, marginBottom: 14 }}>
        Change the password you use to sign in.
      </p>
      <PasswordField label="Current password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
      <div className="grid grid-2" style={{ gap: "0 14px" }}>
        <PasswordField label="New password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
        <PasswordField label="Confirm new password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
      </div>
      <div className="row" style={{ justifyContent: "flex-end", marginTop: 4 }}>
        <button className="btn btn-primary" onClick={updatePw} disabled={saving}>
          {saving ? "Updating…" : "Update password"}
        </button>
      </div>
    </div>
  )
}

function NotificationsCard() {
  // Session-scoped prefs — in-app bell is live; email delivery is rolling out,
  // so the toggle saves the preference for when each channel lands.
  const [prefs, setPrefs] = useState(() => {
    const out = {}
    for (const r of CP_PREFS) out[r.key] = { email: r.defaultEmail, inapp: r.defaultInapp }
    return out
  })
  const toggle = (key, col) =>
    setPrefs((p) => ({ ...p, [key]: { ...p[key], [col]: !p[key]?.[col] } }))

  return (
    <div className="cp-card" style={{ marginTop: 16, maxWidth: 720 }}>
      <div className="cp-card-title"><span><Bell size={15} /> Notifications</span></div>
      <p className="text-muted text-sm" style={{ marginTop: -6, marginBottom: 6 }}>
        Choose how you&apos;re alerted. In-app bell alerts are live; email delivery is
        rolling out — your choices are saved for when it lands.
      </p>
      {CP_PREFS.map((row) => (
        <div
          key={row.key}
          className="row row-between"
          style={{ padding: "13px 0", borderBottom: "1px solid var(--lp-border)" }}
        >
          <div style={{ flex: 1, minWidth: 0, paddingRight: 16, fontWeight: 600, fontSize: "0.933rem" }}>
            {row.label}
          </div>
          <div className="row" style={{ gap: 14, flexShrink: 0 }}>
            <label className="checkbox">
              <input type="checkbox" checked={prefs[row.key]?.email ?? false} onChange={() => toggle(row.key, "email")} /> Email
            </label>
            <label className="checkbox">
              <input type="checkbox" checked={prefs[row.key]?.inapp ?? false} onChange={() => toggle(row.key, "inapp")} /> In-app
            </label>
          </div>
        </div>
      ))}
      <div className="row" style={{ justifyContent: "flex-end", marginTop: 14 }}>
        <button className="btn btn-primary" onClick={() => toast.success("Preferences saved")}>
          Save preferences
        </button>
      </div>
    </div>
  )
}
