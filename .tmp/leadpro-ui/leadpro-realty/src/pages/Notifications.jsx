import { useState } from 'react';
import { CheckCheck, Trash2, BellOff, Info, CheckCircle, AlertTriangle, AlertCircle, X } from 'lucide-react';
import { useApp, fmt } from '../store.jsx';

const ICONS = { info: Info, success: CheckCircle, warning: AlertTriangle, error: AlertCircle };
const COLORS = { info: 'blue', success: 'green', warning: 'amber', error: 'red' };

export default function Notifications() {
  const { data, updateData, toast, setModal } = useApp();
  const [filter, setFilter] = useState({ status: 'all', type: 'all', search: '' });
  const all = data.notifications.slice().sort((a, b) => b.ts - a.ts);
  const totalUnread = all.filter((n) => !n.read).length;
  const totalRead = all.length - totalUnread;
  let ns = all;
  if (filter.status === 'unread') ns = ns.filter((n) => !n.read);
  else if (filter.status === 'read') ns = ns.filter((n) => n.read);
  if (filter.type !== 'all') ns = ns.filter((n) => n.type === filter.type);
  if (filter.search) { const q = filter.search.toLowerCase(); ns = ns.filter((n) => (n.title + n.desc).toLowerCase().includes(q)); }

  const markRead = (id) => updateData((d) => { d.notifications = d.notifications.map((n) => n.id === id ? { ...n, read: true } : n); });
  const markAll = () => { updateData((d) => { d.notifications = d.notifications.map((n) => ({ ...n, read: true })); }); toast('Marked all read', 'success'); };
  const clearAll = () => setModal({
    title: 'Clear all notifications?',
    body: <p className="text-muted text-sm">This cannot be undone.</p>,
    actions: [
      { label: 'Cancel', cls: 'btn-secondary' },
      { label: 'Clear', cls: 'btn-danger', onClick: () => { updateData((d) => { d.notifications = []; }); toast('Cleared', 'success'); } },
    ],
  });
  const remove = (id) => { updateData((d) => { d.notifications = d.notifications.filter((n) => n.id !== id); }); toast('Notification deleted', 'info'); };
  const hasFilter = filter.status !== 'all' || filter.type !== 'all' || filter.search;

  return (
    <>
      <div className="content-head">
        <div><h1>Notifications</h1><p>{totalUnread} unread of {all.length} total.</p></div>
        <div className="row">
          <button className="btn btn-secondary" onClick={markAll} disabled={totalUnread === 0}><CheckCheck size={14} /> Mark all read</button>
          <button className="btn btn-secondary" onClick={clearAll} disabled={all.length === 0}><Trash2 size={14} /> Clear all</button>
        </div>
      </div>
      <div className="card card-pad-0">
        <div className="table-toolbar" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
            {[['all', 'All', all.length], ['unread', 'Unread', totalUnread], ['read', 'Read', totalRead]].map(([k, l, c]) => (
              <button key={k} className={`btn btn-sm ${filter.status === k ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter({ ...filter, status: k })}>
                {l} <span style={{ marginLeft: 4, padding: '1px 8px', borderRadius: 999, background: filter.status === k ? 'rgba(0,0,0,.15)' : 'var(--surface-3)', color: filter.status === k ? '#0A0A0F' : 'var(--text-muted)', fontSize: 11, fontWeight: 600 }}>{c}</span>
              </button>
            ))}
          </div>
          <select className="select" style={{ width: 'auto' }} value={filter.type} onChange={(e) => setFilter({ ...filter, type: e.target.value })}>
            <option value="all">All Types</option>
            <option value="info">Info</option>
            <option value="success">Success</option>
            <option value="warning">Warning</option>
            <option value="error">Alert</option>
          </select>
          <input className="input" style={{ flex: 1, minWidth: 160, maxWidth: 280 }} value={filter.search} placeholder="Search notifications…" onChange={(e) => setFilter({ ...filter, search: e.target.value })} />
          {hasFilter && <button className="btn btn-ghost btn-sm" onClick={() => setFilter({ status: 'all', type: 'all', search: '' })}>Clear</button>}
        </div>
        <div className="notif-list">
          {ns.length === 0 ? (
            <div className="empty-state"><div className="icon"><BellOff size={28} /></div><h3>{all.length === 0 ? 'No notifications' : 'No matches'}</h3><p>{all.length === 0 ? "You're all caught up." : 'Try clearing filters.'}</p></div>
          ) : ns.map((n) => {
            const Ic = ICONS[n.type] || Info;
            return (
              <div key={n.id} className={`notif ${n.read ? '' : 'unread'}`} onClick={() => markRead(n.id)}>
                <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
                  <div className={`kpi-icon kpi-icon-${COLORS[n.type] || 'amber'}`} style={{ width: 32, height: 32, flexShrink: 0 }}><Ic size={14} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="t">{n.title}</div>
                    <div className="d">{n.desc}</div>
                    <div className="ts">{fmt.ago(n.ts)}</div>
                  </div>
                  {!n.read && <span className="badge badge-purple" style={{ flexShrink: 0 }}>New</span>}
                  <button className="btn-icon btn-ghost" onClick={(e) => { e.stopPropagation(); remove(n.id); }} title="Delete" style={{ flexShrink: 0 }}><X size={14} /></button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
