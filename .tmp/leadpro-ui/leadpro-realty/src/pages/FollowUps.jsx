import { useNavigate } from 'react-router-dom';
import { Phone, MessageSquare, AlertTriangle, CalendarClock, Calendar, PhoneCall, ListChecks, Lightbulb } from 'lucide-react';
import { useApp, fmt, statusCls, priorityCls } from '../store.jsx';
import KpiCard from '../components/KpiCard.jsx';

export default function FollowUps() {
  const { visibleLeads, toast } = useApp();
  const nav = useNavigate();
  const leads = visibleLeads();
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(); end.setHours(23, 59, 59, 999);
  const today = leads.filter((l) => l.nextFollowUp && l.nextFollowUp >= start.getTime() && l.nextFollowUp <= end.getTime() && l.status !== 'Booked' && l.status !== 'Lost');
  const missed = leads.filter((l) => l.nextFollowUp && l.nextFollowUp < start.getTime() && l.status !== 'Booked' && l.status !== 'Lost');
  const upcoming = leads.filter((l) => l.nextFollowUp && l.nextFollowUp > end.getTime() && l.status !== 'Booked' && l.status !== 'Lost').sort((a, b) => a.nextFollowUp - b.nextFollowUp);

  const Table = ({ rows, missedFlag }) => (
    <div className="table-scroll">
      <table className="data">
        <thead><tr><th>Customer</th><th>Project</th><th>{missedFlag ? 'Was due' : 'Due'}</th><th>Last Contact</th><th>Status</th><th>Priority</th><th /></tr></thead>
        <tbody>
          {rows.map((l) => (
            <tr key={l.id}>
              <td><div className="row" style={{ cursor: 'pointer' }} onClick={() => nav(`/app/leads/${l.id}`)}>
                <div className="avatar sm">{fmt.initials(l.name)}</div>
                <div><div style={{ fontWeight: 600 }}>{l.name}</div><div className="text-xs text-muted">{l.phone}</div></div>
              </div></td>
              <td>{l.projectName}</td>
              <td><span style={missedFlag ? { color: 'var(--error)', fontWeight: 600 } : {}}>{fmt.date(l.nextFollowUp)}</span></td>
              <td>{fmt.ago(l.updatedAt)}</td>
              <td><span className={`badge ${statusCls(l.status)}`}>{l.status}</span></td>
              <td><span className={`badge ${priorityCls(l.priority)}`}>{l.priority}</span></td>
              <td>
                <div className="row" style={{ gap: 4 }}>
                  <button className="btn-icon btn-ghost" onClick={() => toast(`Calling ${l.name}…`, 'info')}><Phone size={14} /></button>
                  <button className="btn-icon btn-ghost" onClick={() => toast(`Opening WhatsApp…`, 'info')}><MessageSquare size={14} /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      <div className="content-head"><div><h1>Follow-Ups</h1><p>Stay on top of every customer touchpoint.</p></div></div>
      <div className="kpi-grid">
        <KpiCard label="Today's Calls" value={today.length} icon={PhoneCall} color="amber" />
        <KpiCard label="Missed" value={missed.length} icon={AlertTriangle} color="red" />
        <KpiCard label="Upcoming (7 days)" value={upcoming.filter((l) => l.nextFollowUp < Date.now() + 7 * 86400000).length} icon={Calendar} color="blue" />
        <KpiCard label="Total Active" value={today.length + missed.length + upcoming.length} icon={ListChecks} color="green" />
      </div>
      <div className="card mb-4" style={{ background: 'linear-gradient(135deg,rgba(59,130,246,.08),rgba(59,130,246,.02))', borderColor: 'rgba(59,130,246,.25)' }}>
        <div className="row" style={{ gap: 14 }}>
          <div className="kpi-icon kpi-icon-blue" style={{ width: 42, height: 42 }}><Lightbulb size={20} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700 }}>Smart Suggestion</div>
            <div className="text-muted text-sm">{missed.length ? <><b>{missed.length} missed follow-ups</b> are at high risk of going cold. Prioritise them today.</> : 'You\'re all caught up. Nice work!'}</div>
          </div>
        </div>
      </div>
      <div className="card mb-4">
        <div className="card-title"><span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><AlertTriangle size={16} style={{ color: 'var(--error)' }} />Missed Follow-Ups ({missed.length})</span></div>
        {missed.length ? <Table rows={missed} missedFlag /> : <p className="text-muted text-sm" style={{ padding: '14px 0' }}>No missed follow-ups. 👏</p>}
      </div>
      <div className="card mb-4">
        <div className="card-title"><span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><CalendarClock size={16} style={{ color: 'var(--accent)' }} />Today ({today.length})</span></div>
        {today.length ? <Table rows={today} /> : <p className="text-muted text-sm" style={{ padding: '14px 0' }}>No follow-ups scheduled today.</p>}
      </div>
      <div className="card">
        <div className="card-title"><span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Calendar size={16} style={{ color: 'var(--info)' }} />Upcoming ({upcoming.length})</span></div>
        {upcoming.length ? <Table rows={upcoming.slice(0, 15)} /> : <p className="text-muted text-sm" style={{ padding: '14px 0' }}>Nothing upcoming.</p>}
      </div>
    </>
  );
}
