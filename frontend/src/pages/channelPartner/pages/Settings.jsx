import { useTheme } from "next-themes"
import { Bell, Moon, Sun } from "lucide-react"

export default function Settings() {
  const { theme, setTheme } = useTheme()
  const isDark = theme === "dark"
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
        <div className="row" style={{ gap: 10 }}>
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
