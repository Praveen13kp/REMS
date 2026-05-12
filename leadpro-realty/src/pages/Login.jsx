import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, Chrome, Github, Square } from 'lucide-react';
import AuthSide from '../components/AuthSide.jsx';
import { useApp } from '../store.jsx';

export default function Login() {
  const { data, setCurrentUser, toast, updateData } = useApp();
  const [email, setEmail] = useState('admin@leadpro.io');
  const [pw, setPw] = useState('demo123');
  const [show, setShow] = useState(false);
  const nav = useNavigate();

  const submit = (e) => {
    e.preventDefault();
    if (!email || !pw) { toast('Enter email and password', 'error'); return; }
    const user = data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) { toast('No account found with that email', 'error'); return; }
    setCurrentUser(user);
    updateData((d) => {
      d.users = d.users.map((u) => u.id === user.id ? { ...u, lastLogin: Date.now() } : u);
      d.audit = [{ id: 'a_' + Date.now(), userId: user.id, action: 'Logged in', ts: Date.now(), ip: '192.168.1.10', target: '-' }, ...d.audit];
    });
    toast(`Welcome back, ${user.name.split(' ')[0]}!`, 'success');
    nav('/app/dashboard');
  };

  return (
    <div className="auth-wrap">
      <AuthSide heading="Welcome back!" />
      <div className="auth-form-wrap">
        <div className="auth-form">
          <h1>Sign in to your account</h1>
          <p>Don't have one? <a onClick={() => nav('/signup')}>Create account</a></p>
          <div className="oauth-btns">
            <button className="oauth-btn" onClick={() => toast('Google sign-in (demo only)', 'info')}><Chrome size={18} /></button>
            <button className="oauth-btn" onClick={() => toast('Microsoft sign-in (demo only)', 'info')}><Square size={18} /></button>
            <button className="oauth-btn" onClick={() => toast('GitHub sign-in (demo only)', 'info')}><Github size={18} /></button>
          </div>
          <div className="auth-divider">or sign in with email</div>
          <form onSubmit={submit}>
            <div className="field"><label>Email <span className="req">*</span></label><input className="input" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
            <div className="field">
              <label>Password <span className="req">*</span></label>
              <div className="input-group">
                <input className="input" type={show ? 'text' : 'password'} value={pw} onChange={(e) => setPw(e.target.value)} required />
                <button type="button" className="toggle-pw" onClick={() => setShow(!show)}>{show ? <EyeOff size={16} /> : <Eye size={16} />}</button>
              </div>
            </div>
            <div className="row row-between mb-4">
              <label className="checkbox"><input type="checkbox" defaultChecked /> Remember me</label>
              <a onClick={() => nav('/forgot')} style={{ color: 'var(--accent)', fontSize: 14, cursor: 'pointer' }}>Forgot password?</a>
            </div>
            <button className="btn btn-primary" type="submit">Sign In <ArrowRight size={16} /></button>
          </form>
          <div className="auth-foot">
            <div style={{ background: 'var(--surface-2)', padding: 12, borderRadius: 8, marginTop: 18, fontSize: 12, textAlign: 'left' }}>
              <strong style={{ color: 'var(--text)' }}>Demo accounts (any password works):</strong><br />
              <code style={{ color: 'var(--accent)' }}>super@leadpro.io</code> — Super Admin<br />
              <code style={{ color: 'var(--accent)' }}>admin@leadpro.io</code> — Admin<br />
              <code style={{ color: 'var(--accent)' }}>priya@leadpro.io</code> — Manager<br />
              <code style={{ color: 'var(--accent)' }}>neha@leadpro.io</code> — Agent
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
