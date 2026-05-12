import { useNavigate } from 'react-router-dom';
import { Building2, CheckCircle } from 'lucide-react';

export default function AuthSide({ heading = 'Welcome back!' }) {
  const nav = useNavigate();
  return (
    <div className="auth-side">
      <div className="auth-side-inner">
        <div className="brand" onClick={() => nav('/')}>
          <span className="brand-mark"><Building2 size={18} /></span>
          <span>LeadPro Realty</span>
        </div>
      </div>
      <div className="auth-side-inner auth-hero">
        <h2>{heading}</h2>
        <p>Manage your real estate leads smarter. From first call to final booking — all in one workspace.</p>
        <div className="auth-feats">
          {[
            'AI-powered lead scoring identifies hot prospects automatically',
            'Smart assignment routes leads to the right agent instantly',
            'Never miss a follow-up with automated reminders',
            'Built-in WhatsApp & call logging for full activity trail',
          ].map((t) => (
            <div className="auth-feat" key={t}><CheckCircle size={18} /><span>{t}</span></div>
          ))}
        </div>
      </div>
      <div className="auth-side-inner text-muted text-sm">© 2026 LeadPro Realty</div>
    </div>
  );
}
