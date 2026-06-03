import { useEffect, useMemo, useState } from "react"
import { NavLink, Outlet, useNavigate } from "react-router-dom"
import {
  Activity,
  BarChart3,
  Bell,
  Briefcase,
  Lock,
  Building2,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  Handshake,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Moon,
  PanelLeftClose,
  Search,
  SettingsIcon,
  Share2,
  Sun,
  User,
  Wallet,
} from "lucide-react"
import { useTheme } from "next-themes"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { useAuthStore } from "@/stores/authStore"
import { applyAccentForCompany } from "@/lib/appearance"

// Stand-alone layout for the Channel Partner workspace. Has its own
// sidebar, company switcher in the navbar, and inherits the leadpro
// design system (dark + light themes, glass cards, rounded surfaces).
//
// Active company is the single source of truth for the workspace and is
// exposed to nested routes via Outlet context.

export const STORAGE_KEY = "cp:activeCompanyId"

// Calendar + Kanban are view modes inside the Leads pages (table /
// kanban / calendar toggle in the toolbar), not top-level destinations,
// so they're omitted from the sidebar. Mirrors the owner Leads UX.
const NAV = [
  { to: "/cp", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/cp/private", label: "Private Leads", icon: Lock },
  { to: "/cp/my-leads", label: "My Leads", icon: Briefcase },
  { to: "/cp/shared", label: "Shared Leads", icon: Share2 },
  { to: "/cp/companies", label: "Companies", icon: Building2 },
  { to: "/cp/follow-ups", label: "Follow-ups", icon: CheckSquare },
  { to: "/cp/activities", label: "Activities", icon: Activity },
  { to: "/cp/notifications", label: "Notifications", icon: Bell },
  { to: "/cp/deals", label: "Deals", icon: Handshake },
  { to: "/cp/commission", label: "Commission", icon: Wallet },
  { to: "/cp/chat", label: "Chat", icon: MessageSquare },
  { to: "/cp/documents", label: "Documents", icon: Folder },
  { to: "/cp/analytics", label: "Analytics", icon: BarChart3 },
]
const ACCOUNT_NAV = [
  { to: "/cp/profile", label: "Profile", icon: User },
  { to: "/cp/settings", label: "Settings", icon: SettingsIcon },
]

export default function CpLayout() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const signOut = useAuthStore((s) => s.signOut)
  const { theme, setTheme } = useTheme()
  const isDark = theme === "dark"

  const [collapsed, setCollapsed] = useState(false)
  const [companies, setCompanies] = useState([])
  const [activeCompanyId, setActiveCompanyId] = useState(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [unread, setUnread] = useState(0)

  // Per-company brand colour follows the CP's currently-selected
  // workspace, not their auth user.companyId (CPs can be linked to many
  // companies and switch between them). Re-apply the saved accent on
  // every switch; it's edited from Settings → Appearance.
  useEffect(() => {
    if (!activeCompanyId) return
    applyAccentForCompany(activeCompanyId)
  }, [activeCompanyId])

  // Load companies + last selection
  useEffect(() => {
    let cancelled = false
    api
      .get("/channel-partner/companies")
      .then((res) => {
        if (cancelled) return
        const list = res?.data ?? []
        setCompanies(list)
        if (list.length === 0) return
        const stored = window.localStorage.getItem(STORAGE_KEY)
        const valid = list.find((c) => c.id === stored && c.status === "ACTIVE")
        const fallback = list.find((c) => c.status === "ACTIVE") || list[0]
        setActiveCompanyId(valid?.id || fallback?.id)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!activeCompanyId) return
    window.localStorage.setItem(STORAGE_KEY, activeCompanyId)
    api.patch("/channel-partner/default-company", { companyId: activeCompanyId }).catch(() => {})
  }, [activeCompanyId])

  // Unread notification badge — light poll every 60s
  useEffect(() => {
    let cancelled = false
    const fetch = () => {
      api
        .get("/notifications/unread-count")
        .then((res) => {
          if (cancelled) return
          const count = res?.data?.count ?? res?.count ?? 0
          setUnread(count)
        })
        .catch(() => {})
    }
    fetch()
    const t = setInterval(fetch, 60_000)
    return () => {
      cancelled = true
      clearInterval(t)
    }
  }, [])

  const activeCompanies = useMemo(
    () => companies.filter((c) => c.status === "ACTIVE"),
    [companies],
  )
  const activeCompany = useMemo(
    () => companies.find((c) => c.id === activeCompanyId),
    [companies, activeCompanyId],
  )

  const handleSignOut = async () => {
    await signOut()
    navigate("/login", { replace: true })
  }

  return (
    <div className="leadpro-scope cp-shell">
      <aside className={`cp-sidebar ${collapsed ? "is-collapsed" : ""}`}>
        <div className="cp-brand">
          <span className="brand-mark">
            <Briefcase size={16} />
          </span>
          {!collapsed && <span className="brand-label">Channel Partner</span>}
        </div>
        <nav className="cp-nav">
          <div className="cp-nav-group-label">{!collapsed && "Workspace"}</div>
          {NAV.map((item) => (
            <NavItem key={item.to} {...item} collapsed={collapsed} badge={item.to === "/cp/notifications" && unread > 0 ? unread : null} />
          ))}
          <div className="cp-nav-group-label">{!collapsed && "Account"}</div>
          {ACCOUNT_NAV.map((item) => (
            <NavItem key={item.to} {...item} collapsed={collapsed} />
          ))}
        </nav>

        <div className="cp-sidebar-footer">
          <div className="cp-user-mini" title={user?.email}>
            <div className="avatar">{initials(user?.name || user?.email)}</div>
            {!collapsed && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="cp-user-name">{user?.name || user?.email}</div>
                <div className="cp-user-sub">Channel Partner</div>
              </div>
            )}
          </div>
        </div>
      </aside>

      <div className="cp-main">
        <header className="cp-topbar">
          <div className="row" style={{ gap: 12, alignItems: "center" }}>
            <button
              type="button"
              className="btn-icon btn-ghost"
              onClick={() => setCollapsed((v) => !v)}
              aria-label="Toggle sidebar"
            >
              <PanelLeftClose size={18} />
            </button>
            <CompanySwitcher
              companies={activeCompanies}
              active={activeCompany}
              open={pickerOpen}
              onToggle={() => setPickerOpen((v) => !v)}
              onPick={(id) => {
                setActiveCompanyId(id)
                setPickerOpen(false)
                toast.success(`Switched to ${companies.find((c) => c.id === id)?.name}`)
              }}
            />
          </div>

          <div className="cp-search">
            <Search size={14} />
            <input className="input" placeholder="Search leads, companies…" />
          </div>

          <div className="row" style={{ gap: 8, alignItems: "center" }}>
            <button
              type="button"
              className="btn-icon btn-ghost"
              onClick={() => setTheme(isDark ? "light" : "dark")}
              title={isDark ? "Switch to light mode" : "Switch to dark mode"}
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              type="button"
              className="btn-icon btn-ghost"
              onClick={() => navigate("/cp/notifications")}
              title="Notifications"
              style={{ position: "relative" }}
            >
              <Bell size={18} />
              {unread > 0 && <span className="cp-bell-badge">{unread > 9 ? "9+" : unread}</span>}
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleSignOut}>
              <LogOut size={14} /> Sign out
            </button>
          </div>
        </header>

        <main className="cp-content">
          <Outlet context={{ activeCompany, activeCompanyId, companies, setActiveCompanyId }} />
        </main>
      </div>

    </div>
  )
}

function NavItem({ to, label, icon: Icon, end, collapsed, badge }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => `cp-nav-item ${isActive ? "is-active" : ""}`}
    >
      <Icon size={16} />
      {!collapsed && <span className="cp-nav-label">{label}</span>}
      {!collapsed && badge ? <span className="cp-nav-badge">{badge}</span> : null}
    </NavLink>
  )
}

function CompanySwitcher({ companies, active, open, onToggle, onPick }) {
  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={onToggle}
        className="cp-switcher"
        title={active?.name}
      >
        <div
          className="cp-switcher-logo"
          style={{ background: active?.brandColor || "var(--lp-accent)" }}
        >
          {active?.logoUrl ? (
            <img src={active.logoUrl} alt="" />
          ) : (
            initials(active?.name || "C")
          )}
        </div>
        <div className="cp-switcher-text">
          <div className="cp-switcher-name">{active?.name || "Pick a company"}</div>
          <div className="cp-switcher-sub">{active?.city || ""}</div>
        </div>
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="cp-switcher-menu">
          {companies.length === 0 && (
            <div style={{ padding: 12, color: "var(--lp-text-muted)", fontSize: 13 }}>
              No active companies
            </div>
          )}
          {companies.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onPick(c.id)}
              className={`cp-switcher-row ${c.id === active?.id ? "is-active" : ""}`}
            >
              <div
                className="cp-switcher-logo sm"
                style={{ background: c.brandColor || "var(--lp-accent)" }}
              >
                {c.logoUrl ? <img src={c.logoUrl} alt="" /> : initials(c.name)}
              </div>
              <div style={{ flex: 1 }}>
                <div className="cp-switcher-name">{c.name}</div>
                <div className="cp-switcher-sub">{c.city || ""}</div>
              </div>
              {c.id === active?.id && <ChevronRight size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function initials(name) {
  return (name || "")
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()
}
