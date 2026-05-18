import { Plus, Search, Eye, Ban, Trash2 } from 'lucide-react';
import { useApp, fmt } from '../store.jsx';

export default function Orgs() {
  const { data, toast } = useApp();
  return (
    <>
      <div className="content-head"><div><h1>Organisations</h1><p>{data.orgs.length} active organisations on the platform.</p></div>
        <button className="btn btn-primary" onClick={() => toast('Create org flow', 'info')}><Plus size={16} /> New Organisation</button>
      </div>
      <div className="table-wrap">
        <div className="table-toolbar"><div className="topbar-search"><Search size={16} /><input placeholder="Search organisations…" /></div></div>
        <div className="table-scroll">
          <table className="data">
            <thead><tr><th>Organisation</th><th>Plan</th><th>Users</th><th>Industry</th><th>Created</th><th /></tr></thead>
            <tbody>
              {data.orgs.map((o) => (
                <tr key={o.id}>
                  <td><div className="row"><div className="avatar">{fmt.initials(o.name)}</div><div><div style={{ fontWeight: 600 }}>{o.name}</div><div className="text-xs text-muted">{o.timezone}</div></div></div></td>
                  <td><span className={`badge ${o.plan === 'Enterprise' ? 'badge-warning' : o.plan === 'Pro' ? 'badge-info' : 'badge-muted'}`}>{o.plan}</span></td>
                  <td>{o.userCount}</td>
                  <td>{o.industry}</td>
                  <td>{fmt.date(o.createdAt)}</td>
                  <td>
                    <div className="row-actions">
                      <button className="btn-icon btn-ghost" onClick={() => toast('View org', 'info')}><Eye size={14} /></button>
                      <button className="btn-icon btn-ghost" onClick={() => toast('Suspended', 'warning')}><Ban size={14} /></button>
                      <button className="btn-icon btn-ghost" onClick={() => toast('Deleted', 'success')}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
