import { useEffect, useState } from "react"
import { useOutletContext } from "react-router-dom"
import { useTheme } from "next-themes"
import { Bell, Moon, Sun } from "lucide-react"

import {
  ACCENT_CHANGED_EVENT,
  DEFAULT_ACCENT,
  getAccentForCompany,
  saveAccentForCompany,
  lighten,
  darken,
} from "@/lib/appearance"

export default function Settings() {
  const { theme, setTheme } = useTheme()
  const isDark = theme === "dark"

  // Brand colour follows the CP's currently-selected workspace (CPs can
  // be linked to many companies and switch between them), exposed by
  // CpLayout via Outlet context.
  const { activeCompanyId } = useOutletContext() ?? {}
  const [accentHex, setAccentHex] = useState(
    () => getAccentForCompany(activeCompanyId) || DEFAULT_ACCENT,
  )

  // Re-read on company switch and stay in lockstep with any other
  // surface that changes the accent.
  useEffect(() => {
    setAccentHex(getAccentForCompany(activeCompanyId) || DEFAULT_ACCENT)
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

  return (
    <>
      <div className="cp-page-head">
        <div>
          <h1>Settings</h1>
          <p>Preferences for your channel partner workspace.</p>
        </div>
      </div>

      <div className="cp-card" style={{ maxWidth: 720 }}>
        <div className="cp-card-title">Appearance</div>

        <div className="field" style={{ marginBottom: 16 }}>
          <label>Theme</label>
          <div className="row" style={{ gap: 10, marginTop: 6 }}>
            <button
              type="button"
              className={`btn ${!isDark ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setTheme("light")}
            >
              <Sun size={14} /> Light
            </button>
            <button
              type="button"
              className={`btn ${isDark ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setTheme("dark")}
            >
              <Moon size={14} /> Dark
            </button>
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
                width: 44,
                height: 44,
                borderRadius: 8,
                border: "2px solid var(--lp-border)",
                padding: 2,
                cursor: activeCompanyId ? "pointer" : "not-allowed",
                background: "none",
              }}
            />
            <code style={{ fontSize: "0.867rem", color: "var(--lp-text-muted)" }}>
              {accentHex.toUpperCase()}
            </code>
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

      <div className="cp-card" style={{ marginTop: 16, maxWidth: 720 }}>
        <div className="cp-card-title">
          <span><Bell size={14} /> Notifications</span>
        </div>
        <p className="text-muted text-sm">
          You'll receive a bell notification for: new leads shared by a company, lead status updates,
          follow-up reminders, and direct messages. Email digest preferences are coming soon.
        </p>
      </div>
    </>
  )
}
