import { Building, Users, Inbox, IndianRupee, Activity } from 'lucide-react';
import { useApp, fmt } from '../store.jsx';
import KpiCard from '../components/KpiCard.jsx';

export default function SuperAdmin() {
  const { data } = useApp();
  const totalRev = data.orgs.length * 4999 * 12;
  return (
    <>
      <div className="content-head"><div><h1>Platform Overview</h1><p>System-wide metrics across all organisations.</p></div></div>
      <div className="kpi-grid">
        <KpiCard label="Organisations" value={data.orgs.length} trend="+2" icon={Building} color="amber" />
        <KpiCard label="Total Users" value={data.users.length} trend="+18" icon={Users} color="blue" />
        <KpiCard label="Total Leads" value={data.leads.length} trend="+124" icon={Inbox} color="green" />
        <KpiCard label="MRR" value={fmt.inr(totalRev)} trend="+12.4%" icon={IndianRupee} color="purple" />
      </div>
      <div className="grid grid-2" style={{ gap: 14, marginBottom: 24 }}>
        <div className="card"><div className="card-title">System Health</div>
          {[['API Uptime', '99.98%', 'badge-success'], ['Database', 'Healthy', 'badge-success'], ['Email Service', 'Healthy', 'badge-success'], ['Background Jobs', '3 queued', 'badge-warning'], ['Storage', '78% used', 'badge-warning']].map(([k, v, c]) => (
            <div key={k} className="row row-between" style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}><span>{k}</span><span className={`badge ${c}`}>{v}</span></div>
          ))}
        </div>
        <div className="card"><div className="card-title">Recent Sign-Ups</div>
          {data.orgs.slice().sort((a, b) => b.createdAt - a.createdAt).map((o) => (
            <div key={o.id} className="row" style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div className="kpi-icon kpi-icon-amber" style={{ width: 32, height: 32 }}><Building size={14} /></div>
              <div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 14 }}>{o.name}</div><div className="text-xs text-muted">{o.userCount} users · {o.plan}</div></div>
              <span className="text-xs text-muted">{fmt.ago(o.createdAt)}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="card"><div className="card-title">Recent System Activity</div>
        {data.audit.slice(0, 10).map((a) => { const u = data.users.find((x) => x.id === a.userId); return (
          <div key={a.id} className="activity-item"><div className="activity-dot"><Activity size={14} style={{ color: 'var(--accent)' }} /></div>
            <div style={{ flex: 1 }}><div className="text-sm"><b>{u?.name || 'Unknown'}</b> — {a.action}</div><div className="activity-meta">{fmt.ago(a.ts)} · {a.ip}</div></div>
          </div>
        ); })}
      </div>
    </>
  );
}
