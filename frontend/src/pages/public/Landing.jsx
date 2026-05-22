import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Zap,
  ArrowRight,
  PlayCircle,
  Check,
  Users,
  UserCheck,
  CalendarClock,
  Sparkles,
  LineChart,
  Building,
  ChevronDown,
  ChevronUp,
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
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add('landing-scroll');
    return () => document.documentElement.classList.remove('landing-scroll');
  }, []);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 520);

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToTop = () => {
    const topSection = document.getElementById('home');
    if (topSection) {
      topSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const features = [
    [Users, 'Lead Management', 'Capture leads from every source — website, ads, walk-ins, expos. Track status from first contact through closure.'],
    [UserCheck, 'Smart Assignment', 'Auto-assign leads to the right agent based on city, project, language, or workload — never let a lead go cold.'],
    [CalendarClock, 'Follow-Up Tracking', 'Never miss a call. Automated reminders for site visits, callbacks, and scheduled meetings.'],
    [Sparkles, 'AI Lead Scoring', 'Identify hot vs cold leads with ML-based scoring trained on your historical conversion data.'],
    [LineChart, 'Reports & Analytics', 'Sales velocity, agent performance, source attribution, project-level conversion — all in one dashboard.'],
    [Building, 'Multi-Tenant Support', 'Run multiple brands, branches, or builders on a single platform with full data isolation.'],
  ];
  const steps = [
    ['01', 'Capture', 'Connect your website forms, ads, and lead sources. Every enquiry lands in one inbox.'],
    ['02', 'Assign', 'Smart routing distributes leads to agents by city, language, or specialisation.'],
    ['03', 'Close', 'Agents follow up, track activity, and convert — you watch the pipeline fill in real time.'],
  ];
  const stats = [['1,200+', 'Active Teams'], ['₹2,400 Cr', 'Deals Tracked'], ['38K+', 'Agents'], ['99.9%', 'Uptime SLA']];
  const testimonials = [
    ['Rajesh Sharma', 'Sales Director, Skyline Realty', '"We doubled site visits in 90 days. The follow-up reminders alone are worth the subscription — our agents stopped losing track of warm leads."'],
    ['Priya Patel', 'Founder, GreenSpace Builders', '"The AI scoring is uncannily accurate. Our team prioritises hot leads first and conversion jumped 32%."'],
    ['Karan Mehta', 'Sales Manager, Capital Estates', '"Switching from spreadsheets to LeadPro saved us 12 hours of admin work per week. Worth every rupee."'],
  ];
  const integrations = ['MagicBricks', '99acres', 'Housing.com', 'WhatsApp', 'Razorpay', 'Zoho', 'Google', 'Facebook', 'Twilio', 'Tally', 'Mailchimp', 'Slack'];
  const faqs = [
    ['Is there a free trial?', 'Yes, every new account starts on Basic with a 7-day free trial. No credit card required.'],
    ['Can I import existing leads?', 'Absolutely. Bulk import from CSV/Excel with column mapping is built in. We also have direct integrations with MagicBricks and 99acres.'],
    ['Does it work on mobile?', 'Yes — fully responsive web app plus iOS and Android apps for agents in the field.'],
    ['How is data secured?', 'SOC 2 Type II compliant, AES-256 encryption at rest, TLS 1.3 in transit, daily backups, and India-based data residency.'],
    ['Can I customise lead stages?', 'Yes. Every status, field, and workflow can be configured per organisation under Settings → Custom Fields.'],
    ['Is GST invoice provided?', 'Yes, automated GST-compliant invoicing for all Indian customers.'],
  ];

  const openDemo = () => {
    toast.info('Demo: schedule a live walkthrough with our team.');
  };

  const ctaSubmit = () => {
    const v = document.getElementById('cta-email').value.trim();
    if (!v || !/.+@.+\..+/.test(v)) {
      toast.error('Enter a valid email');
      return;
    }
    toast.success('Thanks! Check your inbox to continue setup.');
    setTimeout(() => nav('/signup'), 800);
  };

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
              <button className="btn btn-secondary" onClick={openDemo}><PlayCircle size={16} /> Watch Demo</button>
            </div>
            <div className="hero-points">
              <span><Check size={14} /> Easy Lead Tracking</span>
              <span><Check size={14} /> Smart Assignment</span>
              <span><Check size={14} /> Role-Based Access</span>
              <span><Check size={14} /> AI Lead Scoring</span>
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
          <div className="row">
            <input className="input" id="cta-email" placeholder="you@company.com" style={{ flex: 1 }} />
            <button className="btn btn-primary" onClick={ctaSubmit}>Get Started <ArrowRight size={14} /></button>
          </div>
        </div>
      </section>

      <button
        type="button"
        className={`scroll-top-btn ${showScrollTop ? 'show' : ''}`}
        onClick={scrollToTop}
        aria-label="Scroll to top"
        title="Scroll to top"
      >
        <ChevronUp size={18} />
      </button>
    </div>
  );
}
