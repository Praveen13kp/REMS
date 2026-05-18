import { useState } from 'react';
import { UserPlus, Search, Pencil, UserX, UserCheck, Trash2 } from 'lucide-react';
import { useApp, fmt, roleLabel, uid } from '../store.jsx';

export default function UsersMgmt() {
  const { data, updateData, toast, setModal } = useApp();
  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState('');
  const users = data.users.filter((u) => u.role !== 'super_admin' && (!search || (u.name + u.email).toLowerCase().includes(search.toLowerCase())));

  const invite = () => {
    setModal({
      title: 'Invite User',
      body: (
        <>
          <div className="grid grid-2" style={{ gap: '0 14px' }}>
            <div className="field"><label>Full name</label><input className="input" id="iu-name" /></div>
            <div className="field"><label>Email</label><input className="input" id="iu-email" type="email" /></div>
          </div>
          <div className="grid grid-2" style={{ gap: '0 14px' }}>
            <div className="field"><label>Role</label><select className="select" id="iu-role"><option value="admin">Admin</option><option value="manager">Manager</option><option value="agent">Agent</option><option value="viewer">Viewer</option></select></div>
            <div className="field"><label>Department</label><select className="select" id="iu-dept"><option>Sales North</option><option>Sales South</option><option>Marketing</option><option>Support</option></select></div>
          </div>
        </>
      ),
      actions: [
        { label: 'Cancel', cls: 'btn-secondary' },
        { label: 'Send Invite', cls: 'btn-primary', onClick: () => {
          const name = document.getElementById('iu-name').value.trim();
          const email = document.getElementById('iu-email').value.trim();
          if (!name || !email) { toast('Name and email required', 'error'); return; }
          updateData((d) => { d.users = [...d.users, { id: uid('u'), name, email, phone: '', role: document.getElementById('iu-role').value, orgId: 'org_main', dept: document.getElementById('iu-dept').value, avatar: fmt.initials(name), active: true, createdAt: Date.now(), lastLogin: null }]; });
          toast('Invitation sent', 'success');
        }},
      ],
    });
  };

  const editUser = (u) => {
    setModal({
      title: 'Edit User',
      body: (
        <>
          <div className="grid grid-2" style={{ gap: '0 14px' }}>
            <div className="field"><label>Name</label><input className="input" id="eu-name" defaultValue={u.name} /></div>
            <div className="field"><label>Email</label><input className="input" id="eu-email" defaultValue={u.email} /></div>
          </div>
          <div className="grid grid-2" style={{ gap: '0 14px' }}>
            <div className="field"><label>Role</label><select className="select" id="eu-role" defaultValue={u.role}>{['admin', 'manager', 'agent', 'viewer'].map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}</select></div>
            <div className="field"><label>Department</label><input className="input" id="eu-dept" defaultValue={u.dept || ''} /></div>
          </div>
        </>
      ),
      actions: [
        { label: 'Cancel', cls: 'btn-secondary' },
        { label: 'Save', cls: 'btn-primary', onClick: () => {
          const name = document.getElementById('eu-name').value;
          updateData((d) => { d.users = d.users.map((x) => x.id === u.id ? { ...x, name, email: document.getElementById('eu-email').value, role: document.getElementById('eu-role').value, dept: document.getElementById('eu-dept').value, avatar: fmt.initials(name) } : x); });
          toast('User updated', 'success');
        }},
      ],
    });
  };

  const toggleActive = (u) => {
    updateData((d) => { d.users = d.users.map((x) => x.id === u.id ? { ...x, active: !x.active } : x); });
    toast(u.active ? 'User deactivated' : 'User activated', 'success');
  };
  const removeUser = (u) => {
    setModal({
      title: 'Delete user?',
      body: <p className="text-muted text-sm">Permanently delete {u.name}? Their leads will become unassigned.</p>,
      actions: [
        { label: 'Cancel', cls: 'btn-secondary' },
        { label: 'Delete', cls: 'btn-danger', onClick: () => {
          updateData((d) => { d.leads = d.leads.map((l) => l.assignedTo === u.id ? { ...l, assignedTo: null } : l); d.users = d.users.filter((x) => x.id !== u.id); });
          toast('User deleted', 'success');
        }},
      ],
    });
  };

  const permDefault = (mod, role) => {
    if (role === 'super_admin') return true;
    if (role === 'viewer') return ['Leads', 'Reports', 'Files'].includes(mod);
    if (role === 'agent') return ['Leads', 'Files'].includes(mod);
    if (role === 'manager') return ['Leads', 'Lead Assignment', 'Reports', 'Files'].includes(mod);
    return mod !== 'Audit Log' || role === 'admin';
  };

  return (
    <>
      <div className="content-head">
        <div><h1>User Management</h1><p>{users.length} {users.length === 1 ? 'user' : 'users'} in your organisation.</p></div>
        <button className="btn btn-primary" onClick={invite}><UserPlus size={16} /> Invite User</button>
      </div>
      <div className="tabs">
        {['All Users', 'Roles & Permissions', 'Pending Invitations'].map((t, i) => (
          <button key={t} className={`tab ${tab === i ? 'active' : ''}`} onClick={() => setTab(i)}>{t}</button>
        ))}
      </div>
      {tab === 0 && (
        <div className="table-wrap">
          <div className="table-toolbar">
            <div className="topbar-search">
              <Search size={16} />
              <input value={search} placeholder="Search users…" onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="table-scroll">
            <table className="data">
              <thead><tr><th>User</th><th>Role</th><th>Department</th><th>Status</th><th>Last Login</th><th>Created</th><th /></tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td><div className="row"><div className="avatar">{u.avatar || fmt.initials(u.name)}</div><div><div style={{ fontWeight: 600 }}>{u.name}</div><div className="text-xs text-muted">{u.email}</div></div></div></td>
                    <td><span className={`badge ${u.role === 'admin' ? 'badge-warning' : u.role === 'manager' ? 'badge-info' : u.role === 'agent' ? 'badge-success' : 'badge-muted'}`}>{roleLabel(u.role)}</span></td>
                    <td>{u.dept || '—'}</td>
                    <td><span className={`badge ${u.active ? 'badge-success' : 'badge-error'}`}>{u.active ? 'Active' : 'Inactive'}</span></td>
                    <td>{u.lastLogin ? fmt.ago(u.lastLogin) : '—'}</td>
                    <td>{fmt.date(u.createdAt)}</td>
                    <td>
                      <div className="row-actions">
                        <button className="btn-icon btn-ghost" onClick={() => editUser(u)} title="Edit"><Pencil size={14} /></button>
                        <button className="btn-icon btn-ghost" onClick={() => toggleActive(u)} title="Toggle">{u.active ? <UserX size={14} /> : <UserCheck size={14} />}</button>
                        <button className="btn-icon btn-ghost" onClick={() => removeUser(u)} title="Delete"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {tab === 1 && (
        <div className="card">
          <div className="card-title">Permission Matrix</div>
          <div className="table-scroll">
            <table className="perm-matrix">
              <thead><tr><th>Module</th><th>Super Admin</th><th>Admin</th><th>Manager</th><th>Agent</th><th>Viewer</th></tr></thead>
              <tbody>
                {['Leads', 'Lead Assignment', 'Reports', 'User Management', 'Settings', 'Billing', 'Files', 'Audit Log'].map((m) => (
                  <tr key={m}>
                    <td>{m}</td>
                    {['super_admin', 'admin', 'manager', 'agent', 'viewer'].map((r) => (
                      <td key={r}><label className="checkbox" style={{ justifyContent: 'center' }}><input type="checkbox" defaultChecked={permDefault(m, r)} /></label></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {tab === 2 && (
        <div className="card"><div className="empty-state"><div className="icon"><UserPlus size={28} /></div><h3>No pending invitations</h3><p>Invited users will appear here until they accept.</p><button className="btn btn-primary" onClick={invite}><UserPlus size={14} /> Invite User</button></div></div>
      )}
    </>
  );
}
