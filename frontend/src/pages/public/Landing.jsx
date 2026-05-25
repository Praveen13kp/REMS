import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Zap,
  ArrowRight,
  Check,
  Users,
  UserCheck,
  CalendarClock,
  Sparkles,
  LineChart,
  Building,
  ChevronDown,
} from 'lucide-react';

import PricingSection from '@/components/marketing/PricingSection';

const initials = (n) =>
  n
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

export default function Landing() {
  const nav = useNavigate();
  const [openFaq, setOpenFaq] = useState(-1);

  useEffect(() => {
    document.documentElement.classList.add('landing-scroll');
    return () => document.documentElement.classList.remove('landing-scroll');
  }, []);

  const features = [
    [Users, 'Lead Management', 'Capture leads from Facebook, Instagram, Google, IndiaMART, JustDial, and your website. Kanban pipeline tracks status from first contact through booking.'],
    [UserCheck, 'Assignment & Privacy', 'Manually assign leads to agents or auto-balance by workload. Role-based privacy masks PII from agents who shouldn\'t see it.'],
    [CalendarClock, 'Follow-Up & Aging Alerts', 'Lead aging scheduler flags stale leads. Tasks tied to leads keep agents accountable. Notifications surface what needs action.'],
    [Sparkles, 'Duplicate Detection', 'Hard match on phone/email plus soft match on name+city — never create the same lead twice, even from different sources.'],
    [LineChart, 'Reports & Audit Log', 'Role-based dashboards for Owner / Manager / Agent. Per-lead activity log plus a company-wide audit feed (Enterprise).'],
    [Building, 'Multi-Tenant Support', 'Run multiple brands or branches on a single platform with full data isolation between tenants.'],
  ];
  const steps = [
    ['01', 'Capture', 'Connect your website forms, ads, and lead sources. Every enquiry lands in one inbox.'],
    ['02', 'Assign', 'Manually assign leads to your agents or use Auto-Assign to balance the load across active staff.'],
    ['03', 'Close', 'Agents follow up, track activity, and convert — you watch the pipeline fill in real time.'],
  ];
  const stats = [['1,200+', 'Active Teams'], ['₹2,400 Cr', 'Deals Tracked'], ['38K+', 'Agents'], ['99.9%', 'Uptime SLA']];
  const testimonials = [
    ['Rajesh Sharma', 'Sales Director, Skyline Realty', '"We doubled site visits in 90 days. The follow-up reminders alone are worth the subscription — our agents stopped losing track of warm leads."'],
    ['Priya Patel', 'Founder, GreenSpace Builders', '"Capturing Facebook + IndiaMART leads in one inbox saved us hours every week. Duplicate detection alone caught dozens of double-entries our team kept making."'],
    ['Karan Mehta', 'Sales Manager, Capital Estates', '"Switching from spreadsheets to LeadPro saved us 12 hours of admin work per week. Worth every rupee."'],
  ];
  const integrations = ['Facebook Lead Ads', 'Instagram', 'Google Ads', 'IndiaMART', 'JustDial', 'Website Forms', 'Razorpay', 'Gmail SMTP'];
  const faqs = [
    ['Is there a free trial?', 'Yes, every new account starts on Basic with a 7-day free trial. No credit card required.'],
    ['Can I import existing leads?', 'Yes. CSV import is built in with column mapping. Pro and Enterprise plans also support BYO integrations from Facebook, Instagram, Google Ads, IndiaMART, JustDial, and any website form.'],
    ['Does it work on mobile?', 'Yes — the web app is fully responsive and works on phones and tablets out of the box. (Native iOS / Android apps are on the roadmap.)'],
    ['How is data secured?', 'AES-256 encryption at rest for integration credentials, TLS 1.3 in transit, per-tenant data isolation, and role-based access with PII masking for agents.'],
    ['Can I customise lead stages?', 'Yes — Pro and Enterprise can add, rename, and reorder pipeline stages. Basic uses the default 6-stage pipeline.'],
    ['Is GST invoice provided?', 'Yes — invoices come through Razorpay with GST line items where applicable.'],
  ];

  return (
    <div className="landing-page">
      <section id="home" className="public-page landing-section">
        <div className="hero">
          <div>
            <span className="badge badge-warning" style={{ marginBottom: 18 }}><Zap size={12} /> Trusted by 1,200+ real estate teams</span>
            <h1>Manage Leads. <span>Close Deals.</span><br />Grow Your Real Estate Business.</h1>
            <p>A smart lead management platform for brokers, builders, and real estate sales teams. Track every enquiry from first call to closure — without losing a single hot lead.</p>
            <div className="hero-cta">
              <button className="btn btn-primary" onClick={() => nav('/signup')}>Get Started Free <ArrowRight size={16} /></button>
            </div>
            <div className="hero-points">
              <span><Check size={14} /> Kanban Lead Pipeline</span>
              <span><Check size={14} /> Multi-Source Capture</span>
              <span><Check size={14} /> Role-Based Privacy</span>
              <span><Check size={14} /> 7-Day Free Trial</span>
            </div>
          </div>
          <div className="dashboard-mockup">
            <div className="mockup-bar"><span /><span /><span /></div>
            <div className="mockup-grid">
              <div className="mockup-stat"><div className="v">386</div><div className="l">Total Leads</div></div>
              <div className="mockup-stat"><div className="v">₹4.2 Cr</div><div className="l">Revenue</div></div>
            </div>
            <div className="mockup-chart">
              <div className="mockup-bars">
                {[40, 60, 45, 80, 65, 90, 70, 85, 55, 75, 95, 80].map((h, i) => <div key={i} style={{ height: h + '%' }} />)}
              </div>
            </div>
            <div className="mockup-table">
              <div className="mockup-row" style={{ fontWeight: 600, color: 'var(--text)' }}><span>Customer</span><span>Project</span><span>Status</span></div>
              <div className="mockup-row"><span>Aarav Sharma</span><span>Skyline</span><span style={{ color: 'var(--success)' }}>Booked</span></div>
              <div className="mockup-row"><span>Priya Mehta</span><span>Greens</span><span style={{ color: 'var(--warning)' }}>Hot</span></div>
              <div className="mockup-row"><span>Karan Iyer</span><span>Royal</span><span style={{ color: 'var(--info)' }}>Visit</span></div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="public-page landing-section">
        <div className="section-title"><h2>Everything You Need To Manage Leads</h2><p>Built for the way real estate sales teams actually work — from first enquiry to final booking.</p></div>
        <div className="feature-grid">
          {features.map(([Ic, t, d]) => (
            <div key={t} className="feature">
              <div className="feature-icon"><Ic size={22} /></div>
              <h3>{t}</h3><p>{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="public-page landing-section">
        <div className="section-title"><h2>How It Works</h2><p>Three simple steps to a fully tracked sales pipeline.</p></div>
        <div className="grid grid-3">
          {steps.map(([n, t, d]) => (
            <div key={n} className="card" style={{ textAlign: 'center', padding: 32 }}>
              <div style={{ fontSize: 48, fontWeight: 800, color: 'var(--accent)', opacity: 0.5 }}>{n}</div>
              <h3 style={{ margin: '12px 0 8px', fontSize: 20 }}>{t}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="public-page landing-section landing-section-compact">
        <div className="stats-banner">
          {stats.map(([v, l]) => <div key={l} className="stat-banner"><div className="v">{v}</div><div className="l">{l}</div></div>)}
        </div>
      </section>

      <PricingSection />

      <section className="public-page landing-section">
        <div className="section-title"><h2>Loved by Sales Teams</h2><p>From boutique brokerages to large builders.</p></div>
        <div className="testimonial-grid">
          {testimonials.map(([n, r, q]) => (
            <div key={n} className="testimonial">
              <p className="t-quote">{q}</p>
              <div className="t-meta">
                <div className="avatar">{initials(n)}</div>
                <div><div style={{ fontWeight: 600, fontSize: 14 }}>{n}</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r}</div></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="public-page landing-section">
        <div className="section-title"><h2>Plays Nice With Your Stack</h2></div>
        <div className="integrations">
          {integrations.map((b) => <div key={b} className="integration">{b}</div>)}
        </div>
      </section>

      <section className="public-page landing-section">
        <div className="section-title"><h2>Frequently Asked Questions</h2></div>
        <div style={{ maxWidth: 780, margin: '0 auto' }}>
          {faqs.map(([q, a], i) => (
            <div key={q} className={`faq ${openFaq === i ? 'open' : ''}`}>
              <div className="faq-q" onClick={() => setOpenFaq(openFaq === i ? -1 : i)}>
                {q}<ChevronDown size={18} />
              </div>
              <div className="faq-a">{a}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="contact" className="public-page landing-section">
        <div className="cta-banner">
          <h2>Start closing more deals today.</h2>
          <p>Join 1,200+ real estate teams who run their pipeline on LeadPro Realty.</p>
          <form
            className="row cta-form"
            style={{ justifyContent: 'center', gap: 8, maxWidth: 480, margin: '0 auto' }}
            onSubmit={(e) => {
              e.preventDefault();
              const v = (e.currentTarget.elements.email?.value || '').trim();
              if (!v || !/.+@.+\..+/.test(v)) {
                toast.error('Enter a valid email');
                return;
              }
              nav(`/signup?email=${encodeURIComponent(v)}`);
            }}
          >
            <input
              className="input"
              type="email"
              name="email"
              placeholder="you@company.com"
              style={{ flex: 1, minWidth: 0 }}
              required
            />
            <button className="btn btn-primary" type="submit">
              Get Started <ArrowRight size={14} />
            </button>
          </form>
        </div>
      </section>

    </div>
  );
}
