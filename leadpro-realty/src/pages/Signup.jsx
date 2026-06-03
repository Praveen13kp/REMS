import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import AuthSide from '../components/AuthSide.jsx';
import { useApp, fmt, uid } from '../store.jsx';

export default function Signup() {
  const { data, updateData, setCurrentUser, toast } = useApp();
  const [show, setShow] = useState(false);
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const nav = useNavigate();

  const strength = (() => {
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return s;
  })();
  const colors = ['var(--error)', 'var(--warning)', 'var(--info)', 'var(--success)'];
  const labels = ['Weak', 'Fair', 'Good', 'Strong'];

  const submit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const co = fd.get('co').trim(), name = fd.get('name').trim(), email = fd.get('email').trim(), phone = fd.get('phone').trim();
    if (pw !== pw2) { toast('Passwords do not match', 'error'); return; }
    if (pw.length < 8) { toast('Password must be at least 8 characters', 'error'); return; }
    if (!fd.get('tc')) { toast('Please accept the Terms', 'error'); return; }
    if (data.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) { toast('Email already registered', 'error'); return; }
    const NAME_REGEX = /^[a-zA-ZÀ-ÖØ-öø-ÿ\s'.-]+$/;
    if (!NAME_REGEX.test(name)) { toast('Name cannot contain numbers', 'error'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast('Enter a valid email address', 'error'); return; }
    if (phone && !/^\+\d{1,4}\d{8,15}$/.test(phone)) { toast('Enter a valid phone number with country code', 'error'); return; }
    const newOrgId = uid('org');
    const newUser = { id: uid('u'), name, email, phone: fd.get('phone'), role: 'admin', orgId: newOrgId, avatar: fmt.initials(name), active: true, createdAt: Date.now(), lastLogin: Date.now() };
    updateData((d) => {
      d.orgs = [...d.orgs, { id: newOrgId, name: co, industry: 'Real Estate', timezone: 'Asia/Kolkata', currency: 'INR', plan: 'Free', userCount: 1, createdAt: Date.now() }];
      d.users = [...d.users, newUser];
    });
    setCurrentUser(newUser);
    toast('Account created! Welcome.', 'success');
    nav('/app/dashboard');
  };

  return (
    <div className="auth-wrap">
      <AuthSide heading="Start your 14-day free trial" />
      <div className="auth-form-wrap">
        <div className="auth-form">
          <h1>Create your company account</h1>
          <p>Already on LeadPro? <a onClick={() => nav('/login')}>Sign in</a></p>
          <form onSubmit={submit}>
            <div className="grid grid-2" style={{ gap: '0 12px' }}>
              <div className="field"><label>Company name <span className="req">*</span></label><input className="input" name="co" required /></div>
              <div className="field"><label>Owner name <span className="req">*</span></label><input className="input" name="name" required /></div>
            </div>
            <div className="field"><label>Email <span className="req">*</span></label><input className="input" name="email" type="email" required /></div>
            <div className="field"><label>Phone</label><input className="input" name="phone" placeholder="+91 98xxxxxxxx" /></div>
            <div className="field">
              <label>Password <span className="req">*</span></label>
              <div className="input-group">
                <input className="input" type={show ? 'text' : 'password'} value={pw} onChange={(e) => setPw(e.target.value)} required />
                <button type="button" className="toggle-pw" onClick={() => setShow(!show)}>{show ? <EyeOff size={16} /> : <Eye size={16} />}</button>
              </div>
              <div className="pw-strength"><div style={{ width: strength * 25 + '%', background: colors[Math.max(0, strength - 1)] || 'var(--error)' }} /></div>
              <span className="text-xs text-muted">{pw ? `Strength: ${labels[Math.max(0, strength - 1)] || 'Weak'}` : 'Use 8+ characters with mixed case, numbers, symbols'}</span>
            </div>
            <div className="field"><label>Confirm password <span className="req">*</span></label><input className="input" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} required /></div>
            <label className="checkbox mb-4"><input type="checkbox" name="tc" required /> I agree to the Terms of Service and Privacy Policy</label>
            <button className="btn btn-primary" type="submit">Create Account</button>
          </form>
        </div>
      </div>
    </div>
  );
}
