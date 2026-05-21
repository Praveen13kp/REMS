import { useState } from "react"
import { Outlet, useLocation, useNavigate } from "react-router-dom"
import { useTheme } from "next-themes"
import {
  Activity, BarChart3, Bell, Building, Building2, CalendarClock, ChevronRight, CheckSquare,
  CreditCard, Layers,
  Folder, HelpCircle, Home, LayoutDashboard, LogOut, Menu, Moon, PanelLeftClose,
  PanelLeftOpen, Settings as SettingsIcon, Shield, Sun, User,
  UserCheck, UserCog, Users, X,
} from "lucide-react"

import { useAuthStore } from "@/stores/authStore"
import TrialBanner from "@/components/common/TrialBanner"
import TrialPill from "@/components/common/TrialPill"

const NAV_ICONS = {
  "super-admin": Shield,
  orgs: Building,
  dashboard: LayoutDashboard,
  leads: Users,
  assign: UserCheck,
  "follow-ups": CalendarClock,
  tasks: CheckSquare,
  reports: BarChart3,
  files: Folder,
  "users-mgmt": UserCog,
  "admin-billing": CreditCard,
  "admin-subscriptions": CreditCard,
  "admin-invoices": CreditCard,
  "admin-plans": Layers,
  "audit-log": Activity,
  "admin-audit": Activity,
  "admin-users": Users,
  notifications: Bell,
  settings: SettingsIcon,
}

const ROLE_LABEL = {
  OWNER: "Owner",
  SUPER_ADMIN: "Platform Admin",
  ADMIN: "Admin",
  MANAGER: "Manager",
  AGENT: "Agent",
}

const SUBVIEW_LABELS = {
  dashboard: "Dashboard",
  leads: "Leads",
  assign: "Assign Leads",
  "follow-ups": "Follow-Ups",
  tasks: "Tasks",
  reports: "Reports",
  "users-mgmt": "User Management",
  settings: "Settings",
  profile: "Profile",
  notifications: "Notifications",
  files: "Files",
  admin: "Platform Admin",
  "admin-orgs": "Organisations",
  "admin-billing": "Billing",
  "admin-subscriptions": "Subscriptions",
  "admin-invoices": "Invoices",
  "admin-plans": "Plans",
  "admin-audit": "Platform audit log",
  "admin-users": "Platform users",
  "audit-log": "Audit log",
  projects: "Projects",
  team: "Team",
}

function initials(name) {
  if (!name) return "U"
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function ProfileModal({ user, onClose, onNavigate, onSignOut }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Account</h3>
          <button className="btn-icon btn-ghost" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          <div className="row" style={{ gap: 14, marginBottom: 18 }}>
            <div className="avatar lg">{initials(user?.name)}</div>
            <div>
              <div style={{ fontWeight: 600 }}>{user?.name}</div>
              <div className="text-muted text-sm">{user?.email}</div>
              <span className="badge badge-info" style={{ marginTop: 4 }}>
                {ROLE_LABEL[user?.role] || user?.role || "User"}
              </span>
            </div>
          </div>
          <div className="stack" style={{ gap: 6 }}>
            <button className="nav-item" onClick={() => onNavigate("/profile")}>
              <User size={16} /><span>My Profile</span>
            </button>
            <button className="nav-item" onClick={() => onNavigate("/settings")}>
              <SettingsIcon size={16} /><span>Settings</span>
            </button>
            <button className="nav-item" onClick={onClose}>
              <HelpCircle size={16} /><span>Help & Docs</span>
            </button>
            <button className="nav-item" style={{ color: "var(--lp-error)" }} onClick={onSignOut}>
              <LogOut size={16} /><span>Sign out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DashboardLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { theme, setTheme } = useTheme()
  const user = useAuthStore((s) => s.user)
  const signOutAction = useAuthStore((s) => s.signOut)

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  if (!user) return null
  const role = user.role
  const isSuper = role === "SUPER_ADMIN"
  const isAdmin = role === "OWNER" || role === "ADMIN" || isSuper
  const isManager = role === "MANAGER"
  const isDark = theme === "dark"

  const mainNav = []
  if (isSuper) {
    // Super admin has no companyId, so every tenant-scoped page (Leads,
    // Tasks, Files, Settings/General, etc.) returns empty or 403. Restrict
    // their sidebar to platform-level surfaces only.
    mainNav.push({ key: "admin", label: "Platform Admin" })
    mainNav.push({ key: "admin-orgs", label: "Organisations" })
    mainNav.push({ key: "admin-plans", label: "Plans" })
    mainNav.push({ key: "admin-subscriptions", label: "Subscriptions" })
    mainNav.push({ key: "admin-invoices", label: "Invoices" })
    mainNav.push({ key: "admin-users", label: "All Users" })
    mainNav.push({ key: "admin-audit", label: "Audit Log" })
  } else {
    mainNav.push({ key: "dashboard", label: "Dashboard" })
    mainNav.push({ key: "leads", label: "Leads" })
    if (isAdmin || isManager) mainNav.push({ key: "assign", label: "Assign Leads" })
    mainNav.push({ key: "follow-ups", label: "Follow-Ups" })
    mainNav.push({ key: "tasks", label: "Tasks" })
    if (isAdmin || isManager) mainNav.push({ key: "projects", label: "Projects" })
    if (isAdmin || isManager) mainNav.push({ key: "reports", label: "Reports" })
    // Files is a company-wide storage browser — admin/manager only. Agents
    // attach files to specific leads from the Lead Detail page instead.
    if (isAdmin || isManager) mainNav.push({ key: "files", label: "Files" })
  }

  const accountNav = []
  // User Management is org-scoped, hide from super admin (the page itself
  // calls /api/users which 403s for a no-company user).
  if (isAdmin && !isSuper) accountNav.push({ key: "users-mgmt", label: "User Management" })
  // Billing is OWNER / ADMIN only — same role gate as the page.
  if (isAdmin && !isSuper) accountNav.push({ key: "admin-billing", label: "Billing" })
  // Audit log = OWNER/ADMIN only; same gate as BE endpoint.
  if (isAdmin && !isSuper) accountNav.push({ key: "audit-log", label: "Audit Log" })
  accountNav.push({ key: "notifications", label: "Notifications" })
  accountNav.push({ key: "settings", label: "Settings" })

  const subview = location.pathname.split("/")[1] || "dashboard"
  const adminSub = location.pathname.split("/")[2] || ""
  const goTo = (key) => {
    const map = {
      admin: "/admin",
      "admin-orgs": "/admin/orgs",
      "admin-subscriptions": "/admin/subscriptions",
      "admin-invoices": "/admin/invoices",
      "admin-plans": "/admin/plans",
      "admin-billing": "/admin/billing",
      "admin-audit": "/admin/audit-log",
      "admin-users": "/admin/users",
      "audit-log": "/audit-log",
    }
    navigate(map[key] || "/" + key)
    setMobileOpen(false)
  }

  const renderNavItem = ({ key, label, badge }) => {
    const iconKey = key === "admin-orgs" ? "orgs" : key
    const Icon = NAV_ICONS[iconKey] || LayoutDashboard
    const active =
      key === "admin"
        ? subview === "admin" && !adminSub
        : key === "admin-orgs"
          ? subview === "admin" && adminSub === "orgs"
          : key === "admin-subscriptions"
            ? subview === "admin" && adminSub === "subscriptions"
            : key === "admin-invoices"
              ? subview === "admin" && adminSub === "invoices"
              : key === "admin-plans"
                ? subview === "admin" && adminSub === "plans"
            : key === "admin-billing"
              ? subview === "admin" && adminSub === "billing"
              : key === "admin-audit"
                ? subview === "admin" && adminSub === "audit-log"
                : key === "admin-users"
                  ? subview === "admin" && adminSub === "users"
                  : subview === key
    return (
      <button
        key={key}
        className={`nav-item ${active ? "active" : ""}`}
        onClick={() => goTo(key)}
      >
        <Icon size={18} />
        <span>{label}</span>
        {badge > 0 && <span className="badge badge-muted">{badge}</span>}
      </button>
    )
  }

  const handleSignOut = async () => {
    await signOutAction()
    setProfileOpen(false)
    navigate("/")
  }

  return (
    <div className="leadpro-scope">
      <div className="app-shell">
        <aside className={`sidebar ${sidebarCollapsed ? "collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`}>
          <div className="sidebar-head">
            <div className="brand" onClick={() => goTo("dashboard")}>
              <span className="brand-mark"><Building2 size={16} /></span>
              <span>LeadPro</span>
            </div>
            <button className="btn-icon btn-ghost" onClick={() => setSidebarCollapsed(!sidebarCollapsed)} aria-label="Toggle sidebar">
              {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
          </div>
          <nav className="sidebar-nav">
            <div className="nav-section">
              <div className="nav-section-title">Main</div>
              {mainNav.map(renderNavItem)}
            </div>
            <div className="nav-section">
              <div className="nav-section-title">Account</div>
              {accountNav.map(renderNavItem)}
            </div>
          </nav>
          <div className="sidebar-foot">
            <div className="user-mini" onClick={() => goTo("profile")}>
              <div className="avatar">{initials(user.name)}</div>
              <div className="user-mini-info">
                <div className="n">{user.name}</div>
                <div className="r">{ROLE_LABEL[role] || role}</div>
              </div>
            </div>
          </div>
        </aside>

        {mobileOpen && (
          <div className="sidebar-overlay show" onClick={() => setMobileOpen(false)} />
        )}

        <div className="main-area">
          <header className="topbar">
            <div className="row">
              <button
                className="btn-icon btn-ghost mobile-menu-btn"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
              >
                <Menu size={20} />
              </button>
              <div className="breadcrumbs">
                <Home size={14} />
                <span>App</span>
                <ChevronRight size={12} />
                <span className="current">{SUBVIEW_LABELS[subview] || subview}</span>
              </div>
            </div>
            <div className="topbar-actions">
              <TrialPill />
              <button
                className="btn-icon"
                onClick={() => setTheme(isDark ? "light" : "dark")}
                title="Toggle theme"
                aria-label="Toggle theme"
              >
                {isDark ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button
                className="btn-icon"
                onClick={() => goTo("notifications")}
                title="Notifications"
                aria-label="Notifications"
              >
                <Bell size={18} />
              </button>
              <button
                className="btn-icon"
                onClick={() => setProfileOpen(true)}
                aria-label="Open profile menu"
              >
                <div className="avatar sm">{initials(user.name)}</div>
              </button>
            </div>
          </header>
          <main className="content">
            <TrialBanner />
            <Outlet />
          </main>
        </div>
      </div>

      {profileOpen && (
        <ProfileModal
          user={user}
          onClose={() => setProfileOpen(false)}
          onNavigate={(p) => { setProfileOpen(false); navigate(p) }}
          onSignOut={handleSignOut}
        />
      )}
    </div>
  )
}
