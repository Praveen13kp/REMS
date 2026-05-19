import { useState } from 'react';
import { Sliders, User, Shield, Bell, Plug, Mail, CreditCard, Palette, UsersRound, Key, FileText, PlusSquare, Webhook } from 'lucide-react';
import { useApp } from '../store.jsx';
import Profile from './Profile.jsx';

const TABS = [
  ['general', Sliders, 'General'],
  ['profile', User, 'Profile'],
  ['security', Shield, 'Security'],
  ['notifications', Bell, 'Notifications'],
  ['integrations', Plug, 'Integrations'],
  ['email', Mail, 'Email (SMTP)'],
  ['billing', CreditCard, 'Billing'],
  ['appearance', Palette, 'Appearance'],
  ['roles', UsersRound, 'Roles & Permissions'],
  ['api', Key, 'API Keys'],
  ['audit', FileText, 'Audit Log'],
  ['fields', PlusSquare, 'Custom Fields'],
  ['webhooks', Webhook, 'Webhooks'],
];

export default function Settings() {
  const [tab, setTab] = useState('general');
  return (
    <>
      <div className="content-head"><div><h1>Settings</h1><p>Manage your workspace, security, and integrations.</p></div></div>
      <div className="grid" style={{ gridTemplateColumns: '240px 1fr', gap: 20 }}>
        <div className="card" style={{ padding: 8 }}>
          {TABS.map(([k, Ic, l]) => (
            <button key={k} className={`nav-item ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}><Ic size={16} /><span>{l}</span></button>
          ))}
        </div>
        <div><TabContent tab={tab} /></div>
      </div>
    </>
  );
}

function TabContent({ tab }) {
  const { theme, setTheme, sidebarCollapsed, setSidebarCollapsed, toast, data } = useApp();
  if (tab === 'profile') return <Profile />;
  if (tab === 'general') return (
    <div className="card">
      <h3 style={{ fontSize: 18, marginBottom: 6 }}>General Settings</h3>
      <p className="text-muted text-sm" style={{ marginBottom: 18 }}>Workspace configuration.</p>
      <div className="grid grid-2" style={{ gap: '0 14px' }}>
        <div className="field"><label>Workspace name</label><input className="input" defaultValue="Skyline Realty Group" /></div>
        <div className="field"><label>Industry</label><input className="input" defaultValue="Real Estate" /></div>
        <div className="field"><label>Timezone</label><select className="select"><option>Asia/Kolkata (IST)</option><option>Asia/Dubai</option></select></div>
        <div className="field"><label>Currency</label><select className="select"><option>INR (₹)</option><option>USD ($)</option></select></div>
        <div className="field"><label>Date format</label><select className="select"><option>DD/MM/YYYY</option><option>MM/DD/YYYY</option></select></div>
        <div className="field"><label>Language</label><select className="select"><option>English</option><option>Hindi</option></select></div>
      </div>
      <div className="row mt-4" style={{ justifyContent: 'flex-end' }}><button className="btn btn-primary" onClick={() => toast('Settings saved', 'success')}>Save Changes</button></div>
    </div>
  );
  if (tab === 'security') return (
    <>
      <div className="card mb-4">
        <h3 style={{ fontSize: 18, marginBottom: 14 }}>Change Password</h3>
        <div className="field"><label>Current password</label><input className="input" type="password" /></div>
        <div className="grid grid-2" style={{ gap: '0 14px' }}>
          <div className="field"><label>New password</label><input className="input" type="password" /></div>
          <div className="field"><label>Confirm new password</label><input className="input" type="password" /></div>
        </div>
        <button className="btn btn-primary" onClick={() => toast('Password updated', 'success')}>Update Password</button>
      </div>
      <div className="card">
        <h3 style={{ fontSize: 18, marginBottom: 14 }}>Two-Factor Authentication</h3>
        <div className="row row-between"><span className="text-muted text-sm">Add an extra layer of security.</span>
          <label className="switch"><input type="checkbox" /><span className="switch-slider" /></label>
        </div>
      </div>
    </>
  );
  if (tab === 'notifications') return (
    <div className="card">
      <h3 style={{ fontSize: 18, marginBottom: 18 }}>Notification Preferences</h3>
      {['New lead assigned', 'Follow-up reminder', 'Lead status changed', 'New booking', 'Daily summary', 'Weekly report'].map((l, i) => (
        <div key={l} className="row row-between" style={{ padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
          <div><div style={{ fontWeight: 600, fontSize: 14 }}>{l}</div><div className="text-xs text-muted">Receive notifications when this happens</div></div>
          <div className="row" style={{ gap: 12 }}>
            <label className="checkbox"><input type="checkbox" defaultChecked={i < 5} /> Email</label>
            <label className="checkbox"><input type="checkbox" defaultChecked /> In-app</label>
            <label className="checkbox"><input type="checkbox" defaultChecked={i < 3} /> Push</label>
          </div>
        </div>
      ))}
      <div className="row mt-4" style={{ justifyContent: 'flex-end' }}><button className="btn btn-primary" onClick={() => toast('Preferences saved', 'success')}>Save</button></div>
    </div>
  );
  if (tab === 'integrations') {
    const intgs = [['MagicBricks', 'Lead syndication', 'connected'], ['99acres', 'Lead syndication', 'connected'], ['WhatsApp Business', 'Messaging', 'connected'], ['Razorpay', 'Payments', 'connected'], ['Google Calendar', 'Calendar sync', 'disconnected'], ['Mailchimp', 'Email marketing', 'disconnected'], ['Twilio', 'SMS & Voice', 'disconnected'], ['Slack', 'Team alerts', 'connected']];
    return (
      <div className="card"><h3 style={{ fontSize: 18, marginBottom: 14 }}>Integrations</h3>
        <div className="grid grid-2" style={{ gap: 14 }}>
          {intgs.map(([n, d, s]) => (
            <div key={n} className="card" style={{ background: 'var(--surface-2)' }}>
              <div className="row row-between"><div><div style={{ fontWeight: 600 }}>{n}</div><div className="text-xs text-muted">{d}</div></div>
                <span className={`badge ${s === 'connected' ? 'badge-success' : 'badge-muted'}`}>{s}</span>
              </div>
              <button className="btn btn-secondary btn-sm mt-3" style={{ width: '100%', justifyContent: 'center' }} onClick={() => toast(s === 'connected' ? 'Disconnected' : 'Connected', 'success')}>{s === 'connected' ? 'Disconnect' : 'Connect'}</button>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (tab === 'appearance') return (
    <div className="card">
      <h3 style={{ fontSize: 18, marginBottom: 14 }}>Appearance</h3>
      <div className="field"><label>Theme</label>
        <div className="row" style={{ gap: 10 }}>
          <button className={`btn ${theme === 'dark' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTheme('dark')}>Dark</button>
          <button className={`btn ${theme === 'light' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTheme('light')}>Light</button>
        </div>
      </div>
      <div className="field"><label>Sidebar</label>
        <div className="row"><label className="checkbox"><input type="checkbox" checked={sidebarCollapsed} onChange={(e) => setSidebarCollapsed(e.target.checked)} /> Collapsed by default</label></div>
      </div>
    </div>
  );
  if (tab === 'billing') return (
    <>
      <div className="card mb-4" style={{ background: 'linear-gradient(135deg,rgba(139,92,246,.1),rgba(139,92,246,.02))', borderColor: 'rgba(139,92,246,.3)' }}>
        <div className="row row-between"><div><h3 style={{ fontSize: 18 }}>{data.plan} Plan</h3><p className="text-muted text-sm">₹4,999/month</p></div>
          <div className="row"><button className="btn btn-secondary">Downgrade</button><button className="btn btn-primary">Upgrade</button></div>
        </div>
      </div>
      <div className="card"><div className="card-title">Billing History</div>
        <div className="table-scroll"><table className="data"><thead><tr><th>Invoice</th><th>Date</th><th>Plan</th><th>Amount</th><th>Status</th></tr></thead><tbody>
          {data.invoices.map((i) => <tr key={i.id}><td><code>{i.id}</code></td><td>{new Date(i.date).toLocaleDateString()}</td><td>{i.plan}</td><td>₹{i.amount.toLocaleString('en-IN')}</td><td><span className="badge badge-success">{i.status}</span></td></tr>)}
        </tbody></table></div>
      </div>
    </>
  );
  if (tab === 'audit') return (
    <div className="card"><h3 style={{ fontSize: 18, marginBottom: 14 }}>Audit Log</h3>
      <div className="table-scroll"><table className="data"><thead><tr><th>When</th><th>User</th><th>Action</th><th>Target</th><th>IP</th></tr></thead><tbody>
        {data.audit.map((a) => { const u = data.users.find((x) => x.id === a.userId); return <tr key={a.id}><td>{new Date(a.ts).toLocaleString()}</td><td>{u?.name}</td><td>{a.action}</td><td>{a.target}</td><td><code className="text-xs">{a.ip}</code></td></tr>; })}
      </tbody></table></div>
    </div>
  );
  return <div className="card"><h3 style={{ fontSize: 18 }}>{tab.charAt(0).toUpperCase() + tab.slice(1)}</h3><p className="text-muted text-sm mt-2">Coming soon.</p></div>;
}
