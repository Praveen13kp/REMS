export const ROLES = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  AGENT: 'AGENT',
}

export const ROLE_MENU_ITEMS = {
  OWNER: [
    { label: 'Dashboard', path: '/dashboard', icon: 'LayoutDashboard' },
    { label: 'Leads', path: '/leads', icon: 'Users' },
    { label: 'Projects', path: '/projects', icon: 'Building2' },
    { label: 'Team', path: '/team', icon: 'Briefcase' },
    { label: 'Settings', path: '/settings', icon: 'Settings' },
  ],
  ADMIN: [
    { label: 'Dashboard', path: '/dashboard', icon: 'LayoutDashboard' },
    { label: 'Leads', path: '/leads', icon: 'Users' },
    { label: 'Projects', path: '/projects', icon: 'Building2' },
    { label: 'Team', path: '/team', icon: 'Briefcase' },
    { label: 'Settings', path: '/settings', icon: 'Settings' },
  ],
  MANAGER: [
    { label: 'Dashboard', path: '/dashboard', icon: 'LayoutDashboard' },
    { label: 'Leads', path: '/leads', icon: 'Users' },
    { label: 'Projects', path: '/projects', icon: 'Building2' },
    { label: 'Team', path: '/team', icon: 'Briefcase' },
  ],
  AGENT: [
    { label: 'Dashboard', path: '/dashboard', icon: 'LayoutDashboard' },
    { label: 'My Leads', path: '/leads', icon: 'Users' },
    { label: 'Projects', path: '/projects', icon: 'Building2' },
    { label: 'My Tasks', path: '/tasks', icon: 'ClipboardCheck' },
  ],
}
