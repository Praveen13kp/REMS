import { useState } from 'react';
import { Upload } from 'lucide-react';
import { useApp, fmt, roleLabel } from '../store.jsx';

export default function Profile() {
  const { currentUser, setCurrentUser, updateData, toast } = useApp();
  const [form, setForm] = useState({ name: currentUser.name, email: currentUser.email, phone: currentUser.phone || '', dept: currentUser.dept || '' });
  if (!currentUser) return null;
  const setF = (k, v) => setForm({ ...form, [k]: v });
  const save = () => {
    const updated = { ...currentUser, ...form, avatar: fmt.initials(form.name) };
    setCurrentUser(updated);
    updateData((d) => { d.users = d.users.map((u) => u.id === currentUser.id ? updated : u); });
    toast('Profile updated', 'success');
  };
  return (
    <div className="card">
      <div className="row" style={{ gap: 18, marginBottom: 24 }}>
        <div className="avatar lg" style={{ width: 80, height: 80, fontSize: 24 }}>{currentUser.avatar || fmt.initials(currentUser.name)}</div>
        <div>
          <h3 style={{ fontSize: 20 }}>{currentUser.name}</h3>
          <p className="text-muted">{currentUser.email}</p>
          <span className="badge badge-info mt-2">{roleLabel(currentUser.role)}</span>
        </div>
        <button className="btn btn-secondary" style={{ marginLeft: 'auto' }} onClick={() => toast('Avatar upload', 'info')}><Upload size={14} /> Change Photo</button>
      </div>
      <div className="grid grid-2" style={{ gap: '0 14px' }}>
        <div className="field"><label>Full name</label><input className="input" value={form.name} onChange={(e) => setF('name', e.target.value)} /></div>
        <div className="field"><label>Email</label><input className="input" value={form.email} onChange={(e) => setF('email', e.target.value)} /></div>
        <div className="field"><label>Phone</label><input className="input" value={form.phone} onChange={(e) => setF('phone', e.target.value)} /></div>
        <div className="field"><label>Department</label><input className="input" value={form.dept} onChange={(e) => setF('dept', e.target.value)} /></div>
      </div>
      <div className="row mt-4" style={{ justifyContent: 'flex-end' }}><button className="btn btn-primary" onClick={save}>Save Changes</button></div>
    </div>
  );
}
