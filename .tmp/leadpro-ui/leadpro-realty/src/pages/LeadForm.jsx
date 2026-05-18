import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../store.jsx';

export default function LeadForm() {
  const { data, updateData, toast } = useApp();
  const nav = useNavigate();
  const { id } = useParams();
  const editing = !!id;
  const existing = editing ? data.leads.find((x) => x.id === id) : null;
  const cities = ['Mumbai', 'Pune', 'Bengaluru', 'Hyderabad', 'Chennai', 'Delhi', 'Gurugram', 'Noida', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Surat'];
  const [form, setForm] = useState(existing || { name: '', email: '', phone: '', city: 'Mumbai', projectId: 'p1', budget: 8500000, source: 'Website', status: 'New', priority: 'Warm', notes: '', assignedTo: '' });
  const agents = data.users.filter((u) => u.role === 'agent' && u.active);
  const setF = (k, v) => setForm({ ...form, [k]: v });

  const submit = (e) => {
    e.preventDefault();
    if (!form.name || !form.phone) { toast('Name and phone are required', 'error'); return; }
    const proj = data.projects.find((p) => p.id === form.projectId);
    const payload = { ...form, projectName: proj.name, budget: +form.budget, assignedTo: form.assignedTo || null };
    if (editing) {
      updateData((d) => { d.leads = d.leads.map((l) => l.id === id ? { ...l, ...payload, updatedAt: Date.now() } : l); });
      toast('Lead updated', 'success');
      nav(`/app/leads/${id}`);
    } else {
      const newL = { id: 'ld_' + Math.floor(Math.random() * 100000), ...payload, score: Math.floor(Math.random() * 60 + 30), nextFollowUp: Date.now() + 86400000 * 3, createdAt: Date.now(), updatedAt: Date.now(), revenue: 0 };
      updateData((d) => { d.leads = [newL, ...d.leads]; });
      toast('Lead created', 'success');
      nav('/app/leads');
    }
  };

  return (
    <>
      <div className="content-head">
        <div>
          <a onClick={() => nav('/app/leads')} style={{ color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer' }}>← Back</a>
          <h1 style={{ marginTop: 6 }}>{editing ? 'Edit' : 'Add'} Lead</h1>
        </div>
      </div>
      <form className="card" style={{ maxWidth: 760 }} onSubmit={submit}>
        <div className="grid grid-2" style={{ gap: '0 16px' }}>
          <div className="field"><label>Customer name <span className="req">*</span></label><input className="input" value={form.name} onChange={(e) => setF('name', e.target.value)} required /></div>
          <div className="field"><label>Phone <span className="req">*</span></label><input className="input" value={form.phone} onChange={(e) => setF('phone', e.target.value)} required /></div>
        </div>
        <div className="grid grid-2" style={{ gap: '0 16px' }}>
          <div className="field"><label>Email</label><input className="input" type="email" value={form.email} onChange={(e) => setF('email', e.target.value)} /></div>
          <div className="field"><label>City</label><select className="select" value={form.city} onChange={(e) => setF('city', e.target.value)}>{cities.map((c) => <option key={c}>{c}</option>)}</select></div>
        </div>
        <div className="grid grid-2" style={{ gap: '0 16px' }}>
          <div className="field"><label>Interested project <span className="req">*</span></label><select className="select" value={form.projectId} onChange={(e) => setF('projectId', e.target.value)}>{data.projects.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.city}</option>)}</select></div>
          <div className="field"><label>Budget (INR) <span className="req">*</span></label><input className="input" type="number" value={form.budget} onChange={(e) => setF('budget', e.target.value)} required /></div>
        </div>
        <div className="grid grid-2" style={{ gap: '0 16px' }}>
          <div className="field"><label>Source</label><select className="select" value={form.source} onChange={(e) => setF('source', e.target.value)}>{data.sources.map((s) => <option key={s}>{s}</option>)}</select></div>
          <div className="field"><label>Priority</label><select className="select" value={form.priority} onChange={(e) => setF('priority', e.target.value)}>{data.priorities.map((p) => <option key={p}>{p}</option>)}</select></div>
        </div>
        <div className="grid grid-2" style={{ gap: '0 16px' }}>
          <div className="field"><label>Status</label><select className="select" value={form.status} onChange={(e) => setF('status', e.target.value)}>{data.statuses.map((s) => <option key={s}>{s}</option>)}</select></div>
          <div className="field"><label>Assign to agent</label><select className="select" value={form.assignedTo || ''} onChange={(e) => setF('assignedTo', e.target.value)}><option value="">— Unassigned —</option>{agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
        </div>
        <div className="field"><label>Notes</label><textarea className="textarea" rows={4} value={form.notes} onChange={(e) => setF('notes', e.target.value)} placeholder="Customer requirements, preferences, special asks…" /></div>
        <div className="row mt-4" style={{ justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" className="btn btn-secondary" onClick={() => nav('/app/leads')}>Cancel</button>
          <button type="submit" className="btn btn-primary">{editing ? 'Save Changes' : 'Create Lead'}</button>
        </div>
      </form>
    </>
  );
}
