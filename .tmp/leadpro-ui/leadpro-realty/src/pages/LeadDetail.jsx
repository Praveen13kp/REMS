import { useNavigate, useParams } from 'react-router-dom';
import { Phone, MessageSquare, Pencil, CalendarPlus, StickyNote, MapPin, Mail, Trash2, UserCog, SearchX } from 'lucide-react';
import { useApp, fmt, statusCls } from '../store.jsx';

export default function LeadDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { data, updateData, toast, setModal } = useApp();
  const l = data.leads.find((x) => x.id === id);
  if (!l) return (
    <div className="empty-state">
      <div className="icon"><SearchX size={28} /></div>
      <h3>Lead not found</h3>
      <button className="btn btn-primary" onClick={() => nav('/app/leads')}>Back to leads</button>
    </div>
  );
  const ag = data.users.find((u) => u.id === l.assignedTo);

  const changeStatus = (s) => {
    updateData((d) => { d.leads = d.leads.map((x) => x.id === id ? { ...x, status: s, updatedAt: Date.now(), revenue: s === 'Booked' ? x.budget : x.revenue } : x); });
    toast(`Status changed to ${s}`, 'success');
  };
  const reassign = () => {
    const agents = data.users.filter((u) => u.role === 'agent' && u.active);
    setModal({
      title: 'Assign agent',
      body: <div className="field"><label>Agent</label><select className="select" id="reassign-to" defaultValue={l.assignedTo || ''}>{agents.map((a) => <option key={a.id} value={a.id}>{a.name} — {a.dept || ''}</option>)}</select></div>,
      actions: [
        { label: 'Cancel', cls: 'btn-secondary' },
        { label: 'Assign', cls: 'btn-primary', onClick: () => { const v = document.getElementById('reassign-to').value; updateData((d) => { d.leads = d.leads.map((x) => x.id === id ? { ...x, assignedTo: v, updatedAt: Date.now() } : x); }); toast('Lead assigned', 'success'); } },
      ],
    });
  };
  const del = () => {
    setModal({
      title: 'Delete lead?',
      body: <p className="text-muted text-sm">Permanently delete {l.name}?</p>,
      actions: [
        { label: 'Cancel', cls: 'btn-secondary' },
        { label: 'Delete', cls: 'btn-danger', onClick: () => { updateData((d) => { d.leads = d.leads.filter((x) => x.id !== id); }); toast('Lead deleted', 'success'); nav('/app/leads'); } },
      ],
    });
  };

  return (
    <>
      <div className="content-head">
        <div>
          <a onClick={() => nav('/app/leads')} style={{ color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer' }}>← Back to leads</a>
          <h1 style={{ marginTop: 6 }}>{l.name}</h1>
          <p>{l.phone} · {l.email}</p>
        </div>
        <div className="row">
          <button className="btn btn-secondary" onClick={() => toast(`Calling ${l.name}…`, 'info')}><Phone size={16} /> Call</button>
          <button className="btn btn-secondary" onClick={() => toast(`Opening WhatsApp for ${l.name}…`, 'info')}><MessageSquare size={16} /> WhatsApp</button>
          <button className="btn btn-primary" onClick={() => nav(`/app/leads/${id}/edit`)}><Pencil size={16} /> Edit</button>
        </div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <div className="stack">
          <div className="card">
            <div className="card-title">Lead Information</div>
            <div className="grid grid-2" style={{ gap: 14 }}>
              <Row k="Project" v={l.projectName} />
              <Row k="Budget" v={fmt.inr(l.budget)} />
              <Row k="Source" v={l.source} />
              <Row k="City" v={l.city} />
              <Row k="Created" v={fmt.date(l.createdAt)} />
              <Row k="Last Updated" v={fmt.ago(l.updatedAt)} />
              <Row k="AI Score" v={
                <div className="row">
                  <div style={{ flex: 1, height: 6, background: 'var(--surface-3)', borderRadius: 3, maxWidth: 120, overflow: 'hidden' }}>
                    <div style={{ width: l.score + '%', height: '100%', background: 'var(--accent)' }} />
                  </div>
                  <span className="text-sm" style={{ fontWeight: 600 }}>{l.score}/100</span>
                </div>
              } />
              <Row k="Next Follow-Up" v={l.nextFollowUp ? fmt.date(l.nextFollowUp) : '—'} />
            </div>
            <div className="field mt-4">
              <label>Notes</label>
              <div className="card" style={{ background: 'var(--surface-2)', padding: 14 }}>{l.notes || 'No notes added.'}</div>
            </div>
          </div>
          <div className="card">
            <div className="card-title">Status & Workflow</div>
            <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
              {data.statuses.map((s) => (
                <button key={s} className={`badge ${l.status === s ? statusCls(s) : 'badge-muted'}`} style={{ padding: '8px 14px', cursor: 'pointer', border: '1px solid ' + (l.status === s ? 'transparent' : 'var(--border)') }} onClick={() => changeStatus(s)}>{s}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="stack">
          <div className="card">
            <div className="card-title">Assigned Agent</div>
            {ag ? (
              <>
                <div className="row" style={{ gap: 12 }}>
                  <div className="avatar lg">{ag.avatar || fmt.initials(ag.name)}</div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{ag.name}</div>
                    <div className="text-xs text-muted">{ag.email}</div>
                    <div className="text-xs text-muted mt-2">{ag.dept || ''}</div>
                  </div>
                </div>
                <button className="btn btn-secondary mt-4" style={{ width: '100%', justifyContent: 'center' }} onClick={reassign}><UserCog size={14} /> Reassign</button>
              </>
            ) : (
              <>
                <p className="text-muted text-sm">Not assigned yet.</p>
                <button className="btn btn-primary mt-3" style={{ width: '100%', justifyContent: 'center' }} onClick={reassign}>Assign Agent</button>
              </>
            )}
          </div>
          <div className="card">
            <div className="card-title">Quick Actions</div>
            <div className="stack" style={{ gap: 6 }}>
              <button className="nav-item" onClick={() => toast('Follow-up scheduled', 'success')}><CalendarPlus size={16} /><span>Schedule Follow-Up</span></button>
              <button className="nav-item" onClick={() => toast('Note added', 'success')}><StickyNote size={16} /><span>Add Note</span></button>
              <button className="nav-item" onClick={() => toast('Site visit logged', 'success')}><MapPin size={16} /><span>Log Site Visit</span></button>
              <button className="nav-item" onClick={() => toast('Email sent', 'success')}><Mail size={16} /><span>Send Email</span></button>
              <button className="nav-item" style={{ color: 'var(--error)' }} onClick={del}><Trash2 size={16} /><span>Delete Lead</span></button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Row({ k, v }) { return <div><div className="text-xs text-muted">{k}</div><div style={{ fontWeight: 500, marginTop: 2 }}>{v}</div></div>; }
