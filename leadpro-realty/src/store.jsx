import { createContext, useContext, useEffect, useReducer, useState, useCallback } from 'react';

/* ── Format helpers ── */
export const fmt = {
  inr: (n) => '₹' + Number(n).toLocaleString('en-IN'),
  date: (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
  dateShort: (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
  ago: (d) => {
    const diff = (Date.now() - new Date(d)) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
    return fmt.dateShort(d);
  },
  initials: (n) => n.split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase(),
};
export const uid = (p = 'id') => p + '_' + Math.random().toString(36).slice(2, 9);
export const roleLabel = (r) => ({ super_admin: 'Super Admin', admin: 'Admin', manager: 'Manager', agent: 'Agent', viewer: 'Viewer' }[r] || r);
export const priorityCls = (p) => ({ Hot: 'badge-hot', Warm: 'badge-warm', Cold: 'badge-cold' }[p] || 'badge-muted');
export const statusCls = (s) => ({ New: 'badge-info', Contacted: 'badge-info', Interested: 'badge-warning', 'Site Visit': 'badge-warning', Negotiation: 'badge-warning', Booked: 'badge-success', Lost: 'badge-error' }[s] || 'badge-muted');

/* ── Seed data ── */
function seed() {
  const orgId = 'org_main';
  const indianFirst = ['Aarav','Vivaan','Aditya','Vihaan','Arjun','Sai','Reyansh','Krishna','Ishaan','Shaurya','Atharv','Advait','Diya','Saanvi','Aanya','Aadhya','Anika','Pari','Myra','Ananya','Riya','Tara','Kiara','Avni','Ira','Ravi','Priya','Karan','Neha','Rohan','Sneha','Amit','Pooja','Vikram','Meera','Suresh','Anjali','Rajesh','Kavita','Manoj'];
  const indianLast = ['Sharma','Verma','Patel','Singh','Kumar','Gupta','Joshi','Rao','Reddy','Iyer','Nair','Menon','Khanna','Kapoor','Mehta','Shah','Desai','Pillai','Bhatt','Trivedi','Agarwal','Bansal','Chopra','Malhotra','Saxena'];
  const cities = ['Mumbai','Pune','Bengaluru','Hyderabad','Chennai','Delhi','Gurugram','Noida','Kolkata','Ahmedabad','Jaipur','Surat'];
  const projects = [
    { id: 'p1', name: 'Skyline Heights', city: 'Mumbai', priceMin: 8500000, priceMax: 24000000, type: 'Apartment' },
    { id: 'p2', name: 'Green Meadows Villa', city: 'Pune', priceMin: 12000000, priceMax: 35000000, type: 'Villa' },
    { id: 'p3', name: 'Lakeview Residency', city: 'Bengaluru', priceMin: 6500000, priceMax: 18000000, type: 'Apartment' },
    { id: 'p4', name: 'Urban Square', city: 'Hyderabad', priceMin: 7800000, priceMax: 21000000, type: 'Apartment' },
    { id: 'p5', name: 'Royal Palms', city: 'Gurugram', priceMin: 14000000, priceMax: 42000000, type: 'Penthouse' },
    { id: 'p6', name: 'Marina Bay Towers', city: 'Chennai', priceMin: 9500000, priceMax: 28000000, type: 'Apartment' },
    { id: 'p7', name: 'Heritage Greens', city: 'Jaipur', priceMin: 5500000, priceMax: 14000000, type: 'Plot' },
    { id: 'p8', name: 'Skyrise One', city: 'Noida', priceMin: 8200000, priceMax: 23500000, type: 'Apartment' },
  ];
  const sources = ['Website','Facebook Ads','Google Ads','Walk-in','Referral','MagicBricks','99acres','Property Expo'];
  const statuses = ['New','Contacted','Interested','Site Visit','Negotiation','Booked','Lost'];
  const priorities = ['Hot','Warm','Cold'];
  const users = [
    { id: 'u_super', name: 'Platform Admin', email: 'super@leadpro.io', phone: '+91 98765 00000', role: 'super_admin', orgId: null, avatar: 'PA', active: true, createdAt: Date.now() - 1000 * 86400 * 200, lastLogin: Date.now() - 3600000 },
    { id: 'u_admin', name: 'Rajesh Sharma', email: 'admin@leadpro.io', phone: '+91 98201 11122', role: 'admin', orgId, avatar: 'RS', active: true, createdAt: Date.now() - 1000 * 86400 * 180, lastLogin: Date.now() - 7200000 },
    { id: 'u_mgr1', name: 'Priya Patel', email: 'priya@leadpro.io', phone: '+91 98203 33344', role: 'manager', orgId, dept: 'Sales North', avatar: 'PP', active: true, createdAt: Date.now() - 1000 * 86400 * 150, lastLogin: Date.now() - 1800000 },
    { id: 'u_mgr2', name: 'Karan Mehta', email: 'karan@leadpro.io', phone: '+91 99205 55566', role: 'manager', orgId, dept: 'Sales South', avatar: 'KM', active: true, createdAt: Date.now() - 1000 * 86400 * 120, lastLogin: Date.now() - 86400000 },
    { id: 'u_ag1', name: 'Neha Gupta', email: 'neha@leadpro.io', phone: '+91 98214 77788', role: 'agent', orgId, dept: 'Sales North', mgrId: 'u_mgr1', avatar: 'NG', active: true, createdAt: Date.now() - 1000 * 86400 * 100, lastLogin: Date.now() - 900000 },
    { id: 'u_ag2', name: 'Rohan Singh', email: 'rohan@leadpro.io', phone: '+91 98215 88899', role: 'agent', orgId, dept: 'Sales North', mgrId: 'u_mgr1', avatar: 'RS', active: true, createdAt: Date.now() - 1000 * 86400 * 90, lastLogin: Date.now() - 18000000 },
    { id: 'u_ag3', name: 'Sneha Iyer', email: 'sneha@leadpro.io', phone: '+91 98216 99900', role: 'agent', orgId, dept: 'Sales South', mgrId: 'u_mgr2', avatar: 'SI', active: true, createdAt: Date.now() - 1000 * 86400 * 80, lastLogin: Date.now() - 86400000 },
    { id: 'u_ag4', name: 'Amit Joshi', email: 'amit@leadpro.io', phone: '+91 98217 11211', role: 'agent', orgId, dept: 'Sales South', mgrId: 'u_mgr2', avatar: 'AJ', active: true, createdAt: Date.now() - 1000 * 86400 * 70, lastLogin: Date.now() - 28800000 },
    { id: 'u_ag5', name: 'Pooja Desai', email: 'pooja@leadpro.io', phone: '+91 98218 22322', role: 'agent', orgId, dept: 'Sales North', mgrId: 'u_mgr1', avatar: 'PD', active: true, createdAt: Date.now() - 1000 * 86400 * 60, lastLogin: Date.now() - 172800000 },
    { id: 'u_view', name: 'Kavita Saxena', email: 'viewer@leadpro.io', phone: '+91 98219 33433', role: 'viewer', orgId, avatar: 'KS', active: true, createdAt: Date.now() - 1000 * 86400 * 40, lastLogin: Date.now() - 43200000 },
  ];
  const orgs = [
    { id: orgId, name: 'Skyline Realty Group', industry: 'Real Estate', timezone: 'Asia/Kolkata', currency: 'INR', plan: 'Pro', userCount: 9, createdAt: Date.now() - 1000 * 86400 * 180 },
    { id: 'org_2', name: 'GreenSpace Builders', industry: 'Real Estate', timezone: 'Asia/Kolkata', currency: 'INR', plan: 'Starter', userCount: 4, createdAt: Date.now() - 1000 * 86400 * 45 },
    { id: 'org_3', name: 'Capital Estates Pvt Ltd', industry: 'Real Estate', timezone: 'Asia/Kolkata', currency: 'INR', plan: 'Enterprise', userCount: 21, createdAt: Date.now() - 1000 * 86400 * 240 },
  ];
  const agents = users.filter((u) => u.role === 'agent');
  const leads = [];
  for (let i = 0; i < 38; i++) {
    const fn = indianFirst[Math.floor(Math.random() * indianFirst.length)];
    const ln = indianLast[Math.floor(Math.random() * indianLast.length)];
    const proj = projects[Math.floor(Math.random() * projects.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const priority = priorities[Math.floor(Math.random() * priorities.length)];
    const agent = Math.random() > 0.1 ? agents[Math.floor(Math.random() * agents.length)] : null;
    const created = Date.now() - Math.floor(Math.random() * 1000 * 86400 * 120);
    const budget = proj.priceMin + Math.floor(Math.random() * (proj.priceMax - proj.priceMin));
    leads.push({
      id: 'ld_' + (1000 + i),
      name: `${fn} ${ln}`,
      email: `${fn.toLowerCase()}.${ln.toLowerCase()}${i}@email.com`,
      phone: '+91 9' + Math.floor(Math.random() * 900000000 + 100000000),
      city: cities[Math.floor(Math.random() * cities.length)],
      projectId: proj.id,
      projectName: proj.name,
      budget,
      source: sources[Math.floor(Math.random() * sources.length)],
      status,
      priority,
      assignedTo: agent?.id || null,
      score: Math.floor(Math.random() * 100),
      notes: 'Customer interested in 3BHK with east-facing balcony. Prefers ready-to-move properties.',
      nextFollowUp: Date.now() + Math.floor((Math.random() - 0.3) * 1000 * 86400 * 14),
      createdAt: created,
      updatedAt: created + Math.floor(Math.random() * 1000 * 86400 * 7),
      revenue: status === 'Booked' ? budget : 0,
    });
  }
  const notifications = [];
  for (let i = 0; i < 15; i++) {
    const types = [
      { t: 'New lead assigned', d: `Lead ${leads[i % leads.length].name} was assigned to you`, type: 'info' },
      { t: 'Follow-up due today', d: `Call ${leads[(i + 3) % leads.length].name} regarding ${leads[(i + 3) % leads.length].projectName}`, type: 'warning' },
      { t: 'Deal booked', d: `${leads[(i + 1) % leads.length].name} booked at ${fmt.inr(leads[(i + 1) % leads.length].budget)}`, type: 'success' },
      { t: 'Lead status updated', d: `${leads[(i + 2) % leads.length].name} marked as Interested`, type: 'info' },
    ];
    const ev = types[i % types.length];
    notifications.push({ id: uid('nt'), title: ev.t, desc: ev.d, type: ev.type, read: i > 5, ts: Date.now() - i * 1000 * 3600 * Math.random() * 8 });
  }
  const activities = [];
  for (let i = 0; i < 20; i++) {
    const l = leads[i % leads.length];
    const ag = agents[i % agents.length];
    const acts = [
      { icon: 'Phone', text: `${ag.name} called ${l.name}`, time: Date.now() - i * 1000 * 3600 * 2 },
      { icon: 'MessageSquare', text: `${ag.name} sent WhatsApp to ${l.name}`, time: Date.now() - i * 1000 * 3600 * 3 },
      { icon: 'UserPlus', text: `${l.name} added as new lead`, time: Date.now() - i * 1000 * 3600 * 4 },
      { icon: 'CheckCircle', text: `${l.name} moved to ${l.status}`, time: Date.now() - i * 1000 * 3600 * 5 },
    ];
    activities.push({ id: uid('ac'), ...acts[i % acts.length] });
  }
  const invoices = [
    { id: 'INV-2025-001', date: Date.now() - 1000 * 86400 * 30, amount: 4999, status: 'Paid', plan: 'Pro Monthly' },
    { id: 'INV-2025-002', date: Date.now() - 1000 * 86400 * 60, amount: 4999, status: 'Paid', plan: 'Pro Monthly' },
    { id: 'INV-2025-003', date: Date.now() - 1000 * 86400 * 90, amount: 4999, status: 'Paid', plan: 'Pro Monthly' },
    { id: 'INV-2024-012', date: Date.now() - 1000 * 86400 * 120, amount: 4999, status: 'Paid', plan: 'Pro Monthly' },
  ];
  const files = [
    { id: uid('f'), name: 'Skyline Brochure.pdf', size: 2456789, type: 'pdf', uploadedBy: 'u_admin', uploadedAt: Date.now() - 1000 * 86400 * 5 },
    { id: uid('f'), name: 'Site Layout Plan.png', size: 845321, type: 'image', uploadedBy: 'u_mgr1', uploadedAt: Date.now() - 1000 * 86400 * 8 },
    { id: uid('f'), name: 'Price List Q1 2026.xlsx', size: 132456, type: 'excel', uploadedBy: 'u_admin', uploadedAt: Date.now() - 1000 * 86400 * 12 },
    { id: uid('f'), name: 'Customer Agreement Template.docx', size: 524288, type: 'doc', uploadedBy: 'u_mgr2', uploadedAt: Date.now() - 1000 * 86400 * 20 },
  ];
  const audit = [];
  for (let i = 0; i < 18; i++) {
    const u = users[i % users.length];
    const evs = ['Logged in', 'Updated lead', 'Created lead', 'Changed lead status', 'Assigned lead', 'Updated profile', 'Changed password'];
    audit.push({ id: uid('a'), userId: u.id, action: evs[i % evs.length], ts: Date.now() - i * 1000 * 3600 * 2.5, ip: `192.168.1.${10 + i}`, target: 'Lead #' + (1000 + i) });
  }
  return { orgs, users, leads, projects, sources, statuses, priorities, notifications, activities, invoices, files, audit, plan: 'Pro', usage: { users: 9, usersLimit: 25, storageUsed: 2.4, storageLimit: 25 } };
}

/* ── Persistence ── */
const STORAGE_KEY = 'leadpro_realty_react_v1';
function loadState() {
  const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

/* ── Context ── */
const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

export function AppProvider({ children }) {
  const initial = loadState();
  const [data, setData] = useState(initial?.data || seed());
  const [currentUser, setCurrentUser] = useState(() => {
    if (initial?.currentUserId) return data.users.find((u) => u.id === initial.currentUserId) || null;
    return null;
  });
  const [theme, setTheme] = useState(initial?.theme || 'dark');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(initial?.sidebarCollapsed || false);
  const [toasts, setToasts] = useState([]);
  const [modal, setModal] = useState(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ data, currentUserId: currentUser?.id, theme, sidebarCollapsed }));
  }, [data, currentUser, theme, sidebarCollapsed]);

  const toast = useCallback((msg, type = 'success') => {
    const id = uid('t');
    setToasts((cur) => [...cur, { id, msg, type }]);
    setTimeout(() => setToasts((cur) => cur.filter((t) => t.id !== id)), 3500);
  }, []);

  const updateData = useCallback((mut) => {
    setData((cur) => {
      const next = { ...cur };
      mut(next);
      return next;
    });
  }, []);

  const visibleLeads = useCallback(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'super_admin' || currentUser.role === 'admin') return data.leads;
    if (currentUser.role === 'manager') {
      const teamIds = data.users.filter((x) => x.mgrId === currentUser.id || x.id === currentUser.id).map((x) => x.id);
      return data.leads.filter((l) => teamIds.includes(l.assignedTo));
    }
    if (currentUser.role === 'agent') return data.leads.filter((l) => l.assignedTo === currentUser.id);
    return data.leads;
  }, [currentUser, data]);

  const value = {
    data, setData, updateData,
    currentUser, setCurrentUser,
    theme, setTheme,
    sidebarCollapsed, setSidebarCollapsed,
    toast, toasts, setToasts,
    modal, setModal,
    visibleLeads,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/* ── UI atoms ── */
export function Toaster() {
  const { toasts, setToasts } = useApp();
  return (
    <div id="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type}`}>
          <span style={{ flex: 1, fontSize: 14 }}>{t.msg}</span>
          <button className="btn-ghost btn-icon" onClick={() => setToasts((cur) => cur.filter((x) => x.id !== t.id))}>×</button>
        </div>
      ))}
    </div>
  );
}

export function Modal() {
  const { modal, setModal } = useApp();
  if (!modal) return null;
  const close = () => setModal(null);
  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className={`modal ${modal.size || ''}`}>
        <div className="modal-head">
          <h3>{modal.title}</h3>
          <button className="btn-icon btn-ghost" onClick={close}>×</button>
        </div>
        <div className="modal-body">{modal.body}</div>
        {modal.actions?.length > 0 && (
          <div className="modal-foot">
            {modal.actions.map((a, i) => (
              <button key={i} className={`btn ${a.cls || 'btn-secondary'}`} onClick={() => { if (a.onClick) a.onClick(); if (a.close !== false) close(); }}>
                {a.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
