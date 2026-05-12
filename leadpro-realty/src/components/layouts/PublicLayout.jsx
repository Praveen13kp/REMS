import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { Building2, ArrowRight, Sun, Moon } from 'lucide-react';
import { useApp } from '../../store.jsx';

export default function PublicLayout() {
  const { theme, setTheme, toast } = useApp();
  const nav = useNavigate();
  const loc = useLocation();
  const links = [['/', 'Home'], ['/features', 'Features'], ['/pricing', 'Pricing'], ['/contact', 'Contact']];
  return (
    <>
      <nav className="public-nav">
        <div className="public-nav-inner">
          <div className="brand" onClick={() => nav('/')}>
            <span className="brand-mark"><Building2 size={18} /></span>
            <span>LeadPro Realty</span>
          </div>
          <div className="nav-links">
            {links.map(([to, l]) => (
              <Link key={to} to={to} className={loc.pathname === to ? 'active' : ''}>{l}</Link>
            ))}
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn-icon btn-ghost" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} title="Toggle theme">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className="btn btn-ghost" onClick={() => nav('/login')}>Login</button>
            <button className="btn btn-primary" onClick={() => nav('/signup')}>Sign Up <ArrowRight size={14} /></button>
          </div>
        </div>
      </nav>
      <Outlet context={{ toast }} />
      <Footer />
    </>
  );
}

function Footer() {
  const { toast } = useApp();
  const nav = useNavigate();
  return (
    <footer className="public-footer">
      <div className="footer-inner">
        <div>
          <div className="brand" style={{ marginBottom: 14 }}>
            <span className="brand-mark"><Building2 size={18} /></span>
            <span>LeadPro Realty</span>
          </div>
          <p className="text-muted text-sm" style={{ maxWidth: 300 }}>The smart CRM for real estate sales teams in India and beyond. Capture, assign, follow up, and close — all in one place.</p>
        </div>
        <div>
          <h4>Product</h4>
          <ul>
            <li><a onClick={() => nav('/features')}>Features</a></li>
            <li><a onClick={() => nav('/pricing')}>Pricing</a></li>
            <li><a onClick={() => toast('Changelog opened', 'info')}>Changelog</a></li>
            <li><a onClick={() => toast('Roadmap opened', 'info')}>Roadmap</a></li>
          </ul>
        </div>
        <div>
          <h4>Company</h4>
          <ul>
            <li><a onClick={() => nav('/contact')}>Contact</a></li>
            <li><a onClick={() => toast('About', 'info')}>About</a></li>
            <li><a onClick={() => toast('Blog', 'info')}>Blog</a></li>
            <li><a onClick={() => toast('Careers', 'info')}>Careers</a></li>
          </ul>
        </div>
        <div>
          <h4>Stay Updated</h4>
          <p className="text-muted text-sm" style={{ marginBottom: 10 }}>Monthly newsletter, no spam.</p>
          <div className="row">
            <input className="input" placeholder="email@company.com" style={{ flex: 1 }} />
            <button className="btn btn-primary btn-sm" onClick={() => toast('Subscribed!', 'success')}>Subscribe</button>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <div>© 2026 LeadPro Realty. All rights reserved.</div>
        <div className="row" style={{ gap: 18 }}>
          <a onClick={() => toast('Privacy', 'info')}>Privacy</a>
          <a onClick={() => toast('Terms', 'info')}>Terms</a>
          <a onClick={() => toast('Security', 'info')}>Security</a>
        </div>
      </div>
    </footer>
  );
}
