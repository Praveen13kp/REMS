import { useState } from 'react';
import { Sparkles, CheckCircle } from 'lucide-react';
import { useApp, fmt, priorityCls } from '../store.jsx';

export default function Assign() {
  const { data, updateData, toast } = useApp();
  const unassigned = data.leads.filter((l) => !l.assignedTo && l.status !== 'Booked' && l.status !== 'Lost');
  const agents = data.users.filter((u) => u.role === 'agent' && u.active);
  const [picks, setPicks] = useState({});

  const setPick = (lid, aid) => setPicks({ ...picks, [lid]: aid });
  const assign = (lid) => {
    const aid = picks[lid] || agents[0]?.id;
    if (!aid) return;
    updateData((d) => { d.leads = d.leads.map((l) => l.id === lid ? { ...l, assignedTo: aid, updatedAt: Date.now() } : l); });
    toast(`Assigned to ${data.users.find((u) => u.id === aid).name.split(' ')[0]}`, 'success');
  };
  const autoAll = () => {
    const counts = Object.fromEntries(agents.map((a) => [a.id, data.leads.filter((l) => l.assignedTo === a.id && l.status !== 'Booked' && l.status !== 'Lost').length]));
    const updates = unassigned.map((l) => {
      const a = agents.slice().sort((x, y) => counts[x.id] - counts[y.id])[0];
      counts[a.id]++;
      return { id: l.id, aid: a.id };
    });
    updateData((d) => { d.leads = d.leads.map((l) => { const u = updates.find((x) => x.id === l.id); return u ? { ...l, assignedTo: u.aid, updatedAt: Date.now() } : l; }); });
    toast(`Auto-assigned ${updates.length} leads`, 'success');
  };

  return (
    <>
      <div className="content-head">
        <div><h1>Assign Leads</h1><p>{unassigned.length} unassigned {unassigned.length === 1 ? 'lead' : 'leads'}. Use AI scoring to prioritise hot prospects.</p></div>
        <button className="btn btn-secondary" onClick={autoAll}><Sparkles size={16} /> Auto-Assign All</button>
      </div>
      <div className="card mb-4" style={{ background: 'linear-gradient(135deg,rgba(139,92,246,.08),rgba(139,92,246,.02))', borderColor: 'rgba(139,92,246,.3)' }}>
        <div className="row" style={{ gap: 14 }}>
          <div className="kpi-icon kpi-icon-amber" style={{ width: 42, height: 42 }}><Sparkles size={20} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700 }}>AI Lead Scoring is on</div>
            <div className="text-muted text-sm">Leads scored by source, budget, recency, and engagement signals. <span className="badge badge-hot">Hot</span> = score ≥ 70 · <span className="badge badge-warm">Warm</span> = 40–69 · <span className="badge badge-cold">Cold</span> = &lt; 40</div>
          </div>
        </div>
      </div>
      <div className="table-wrap">
        <div className="table-toolbar">
          <span style={{ fontWeight: 600 }}>{unassigned.length} unassigned leads</span>
          <div style={{ marginLeft: 'auto' }}><span className="text-muted text-sm">Sorted by AI score (highest first)</span></div>
        </div>
        <div className="table-scroll">
          {unassigned.length === 0 ? (
            <div className="empty-state"><div className="icon"><CheckCircle size={28} /></div><h3>All caught up!</h3><p>No leads waiting for assignment.</p></div>
          ) : (
            <table className="data">
              <thead><tr><th>Lead</th><th>Project</th><th>Budget</th><th>Source</th><th>AI Score</th><th>Priority</th><th>Available Agents</th><th /></tr></thead>
              <tbody>
                {unassigned.slice().sort((a, b) => b.score - a.score).map((l) => (
                  <tr key={l.id}>
                    <td>
                      <div className="row">
                        <div className="avatar sm">{fmt.initials(l.name)}</div>
                        <div><div style={{ fontWeight: 600 }}>{l.name}</div><div className="text-xs text-muted">{l.phone}</div></div>
                      </div>
                    </td>
                    <td>{l.projectName}</td>
                    <td>{fmt.inr(l.budget)}</td>
                    <td>{l.source}</td>
                    <td>
                      <div className="row" style={{ gap: 6 }}>
                        <div style={{ width: 80, height: 6, background: 'var(--surface-3)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: l.score + '%', height: '100%', background: l.score >= 70 ? '#EF4444' : l.score >= 40 ? '#F59E0B' : '#3B82F6' }} />
                        </div>
                        <span className="text-xs" style={{ fontWeight: 600 }}>{l.score}</span>
                      </div>
                    </td>
                    <td><span className={`badge ${priorityCls(l.priority)}`}>{l.priority}</span></td>
                    <td>
                      <select className="select" style={{ minWidth: 160 }} value={picks[l.id] || agents[0]?.id} onChange={(e) => setPick(l.id, e.target.value)}>
                        {agents.map((a) => <option key={a.id} value={a.id}>{a.name} · {a.dept || ''}</option>)}
                      </select>
                    </td>
                    <td><button className="btn btn-sm btn-primary" onClick={() => assign(l.id)}>Assign</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      <div className="card mt-4">
        <div className="card-title">Agent Workload</div>
        <div className="grid grid-3" style={{ gap: 12 }}>
          {agents.map((a) => {
            const c = data.leads.filter((l) => l.assignedTo === a.id && l.status !== 'Booked' && l.status !== 'Lost').length;
            return (
              <div key={a.id} className="card" style={{ background: 'var(--surface-2)', padding: 14 }}>
                <div className="row" style={{ gap: 10 }}>
                  <div className="avatar">{a.avatar || fmt.initials(a.name)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{a.name}</div>
                    <div className="text-xs text-muted">{a.dept || ''}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: 20, color: 'var(--accent)' }}>{c}</div>
                    <div className="text-xs text-muted">active</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
