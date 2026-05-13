import { useState } from 'react';
import { Outlet, useNavigate, useLocation, NavLink } from 'react-router-dom';
import {
  Building2, LayoutDashboard, Users, UserCheck, CalendarClock, BarChart3, Folder, UserCog, Bell, Settings as SettingsIcon, Shield, Building,
  PanelLeftClose, PanelLeftOpen, Search, Sun, Moon, Menu, ChevronRight, Home, LogOut, User, HelpCircle,
} from 'lucide-react';
import { useApp, fmt, roleLabel } from '../../store.jsx';

const navIcons = {
  'super-admin': Shield, orgs: Building, dashboard: LayoutDashboard, leads: Users, assign: UserCheck,
  'follow-ups': CalendarClock, reports: BarChart3, files: Folder, 'users-mgmt': UserCog,
  notifications: Bell, settings: SettingsIcon,
};

export default function AppLayout() {
  const { currentUser, sidebarCollapsed, setSidebarCollapsed, theme, setTheme, data, setCurrentUser, setModal } = useApp();
  const nav = useNavigate();
  const loc = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  if (!currentUser) return null;

  const isSuper = currentUser.role === 'super_admin';
  const isAdmin = currentUser.role === 'admin' || isSuper;
  const role = currentUser.role;

  const mainNav = [];
  if (isSuper) {
    mainNav.push({ key: 'super-admin', label: 'Platform Admin' });
    mainNav.push({ key: 'orgs', label: 'Organisations' });
  }
  mainNav.push({ key: 'dashboard', label: 'Dashboard' });
  mainNav.push({ key: 'leads', label: 'Leads' });
  if (role === 'admin' || role === 'manager') mainNav.push({ key: 'assign', label: 'Assign Leads' });
  mainNav.push({ key: 'follow-ups', label: 'Follow-Ups' });
  if (isAdmin || role === 'manager') mainNav.push({ key: 'reports', label: 'Reports' });
  mainNav.push({ key: 'files', label: 'Files' });

  const settingsNav = [];
  if (isAdmin) settingsNav.push({ key: 'users-mgmt', label: 'User Management' });
  const unread = data.notifications.filter((n) => !n.read).length;
  settingsNav.push({ key: 'notifications', label: 'Notifications', badge: unread });
  settingsNav.push({ key: 'settings', label: 'Settings' });

  const subview = loc.pathname.split('/')[2] || 'dashboard';
  const subviewLabels = { dashboard: 'Dashboard', leads: 'Leads', assign: 'Assign Leads', 'follow-ups': 'Follow-Ups', reports: 'Reports', 'users-mgmt': 'User Management', settings: 'Settings', profile: 'Profile', notifications: 'Notifications', files: 'Files', 'super-admin': 'Platform Admin', orgs: 'Organisations' };

  const goTo = (key) => {
    nav('/app/' + key);
    setMobileOpen(false);
  };

  const renderNavItem = ({ key, label, badge }) => {
    const Ic = navIcons[key] || LayoutDashboard;
    const active = subview === key;
    return (
      <button key={key} className={`nav-item ${active ? 'active' : ''}`} onClick={() => goTo(key)}>
        <Ic size={18} />
        <span>{label}</span>
        {badge > 0 && <span className="badge badge-muted">{badge}</span>}
      </button>
    );
  };

  const openProfileMenu = () => {
    setModal({
      title: 'Account',
      body: (
        <>
          <div className="row" style={{ gap: 14, marginBottom: 18 }}>
            <div className="avatar lg">{currentUser.avatar || fmt.initials(currentUser.name)}</div>
            <div>
              <div style={{ fontWeight: 600 }}>{currentUser.name}</div>
              <div className="text-muted text-sm">{currentUser.email}</div>
              <span className="badge badge-info" style={{ marginTop: 4 }}>{roleLabel(currentUser.role)}</span>
            </div>
          </div>
          <div className="stack" style={{ gap: 6 }}>
            <button className="nav-item" onClick={() => { setModal(null); nav('/app/profile'); }}><User size={16} /><span>My Profile</span></button>
            <button className="nav-item" onClick={() => { setModal(null); nav('/app/settings'); }}><SettingsIcon size={16} /><span>Settings</span></button>
            <button className="nav-item" onClick={() => { setModal(null); }}><HelpCircle size={16} /><span>Help & Docs</span></button>
            <button className="nav-item" style={{ color: 'var(--error)' }} onClick={() => { setCurrentUser(null); setModal(null); nav('/'); }}><LogOut size={16} /><span>Sign out</span></button>
          </div>
        </>
      ),
    });
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`} id="sidebar">
        <div className="sidebar-head">
          <div className="brand"><span className="brand-mark"><Building2 size={16} /></span><span>LeadPro</span></div>
          <button className="btn-icon btn-ghost" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
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
            {settingsNav.map(renderNavItem)}
          </div>
        </nav>
        <div className="sidebar-foot">
          <div className="user-mini" onClick={() => nav('/app/profile')}>
            <div className="avatar">{currentUser.avatar || fmt.initials(currentUser.name)}</div>
            <div className="user-mini-info">
              <div className="n">{currentUser.name}</div>
              <div className="r">{roleLabel(currentUser.role)}</div>
            </div>
          </div>
        </div>
      </aside>

      <div className={`sidebar-overlay ${mobileOpen ? 'show' : ''}`} onClick={() => setMobileOpen(false)} />

      <div className="main-area">
        <header className="topbar">
          <div className="row">
            <button className="btn-icon btn-ghost mobile-menu-btn" onClick={() => setMobileOpen(true)}><Menu size={20} /></button>
            <div className="breadcrumbs">
              <Home size={14} />
              <span>App</span>
              <ChevronRight size={12} />
              <span className="current">{subviewLabels[subview] || subview}</span>
            </div>
          </div>
          <div className="topbar-search">
            <Search size={16} />
            <input placeholder="Search leads, users, projects…" />
          </div>
          <div className="topbar-actions">
            <button className="btn-icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} title="Toggle theme">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className="btn-icon" onClick={() => nav('/app/notifications')} title="Notifications">
              <Bell size={18} />
              {unread > 0 && <span className="notif-dot" />}
            </button>
            <button className="btn-icon" onClick={openProfileMenu}><div className="avatar sm">{currentUser.avatar || fmt.initials(currentUser.name)}</div></button>
          </div>
        </header>
        <main className="content"><Outlet /></main>
      </div>
    </div>
  );
}
