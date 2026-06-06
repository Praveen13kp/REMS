import { useEffect, useRef, useState } from 'react';
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
  Star,
  Quote,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  TrendingUp,
  BarChart3,
  Bell,
  Layers,
  Target,
  Send,
  Rocket,
  Store,
  PhoneCall,
  LayoutTemplate,
} from 'lucide-react';

import PricingSection from '@/components/marketing/PricingSection';
import {
  FacebookIcon,
  InstagramIcon,
  GoogleAdsIcon,
  RazorpayIcon,
  GmailIcon,
} from '@/components/marketing/BrandIcons';
import '@/styles/premium-landing.css';

const initials = (n) =>
  n
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

// Deterministic particle field (no Math.random — keeps renders stable).
const PARTICLES = [
  { left: '8%', size: 4, dur: 14, delay: 0, top: '20%' },
  { left: '18%', size: 6, dur: 18, delay: 3, top: '60%' },
  { left: '27%', size: 3, dur: 12, delay: 6, top: '35%' },
  { left: '38%', size: 5, dur: 20, delay: 1, top: '75%' },
  { left: '46%', size: 4, dur: 16, delay: 4, top: '15%' },
  { left: '55%', size: 7, dur: 22, delay: 2, top: '55%' },
  { left: '63%', size: 3, dur: 13, delay: 7, top: '30%' },
  { left: '71%', size: 5, dur: 19, delay: 5, top: '70%' },
  { left: '79%', size: 4, dur: 15, delay: 0, top: '25%' },
  { left: '87%', size: 6, dur: 21, delay: 3, top: '65%' },
  { left: '94%', size: 3, dur: 17, delay: 6, top: '45%' },
  { left: '12%', size: 5, dur: 23, delay: 8, top: '85%' },
  { left: '34%', size: 4, dur: 14, delay: 9, top: '90%' },
  { left: '68%', size: 5, dur: 18, delay: 4, top: '88%' },
];

const HERO_BARS = [42, 58, 48, 72, 60, 88, 70, 80, 64, 92, 78, 96];

// Animate a number from 0 → target once it scrolls into view.
function CountUp({ to, prefix = '', suffix = '', decimals = 0, duration = 1400 }) {
  const ref = useRef(null);
  // Respect reduced-motion by landing on the final value immediately — done in
  // the initializer so we never setState synchronously inside the effect.
  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const [val, setVal] = useState(prefersReduced ? to : 0);
  const done = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReduced) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || done.current) return;
        done.current = true;
        io.disconnect();
        const start = performance.now();
        const tick = (now) => {
          const p = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - p, 3);
          setVal(to * eased);
          if (p < 1) requestAnimationFrame(tick);
          else setVal(to);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [to, duration, prefersReduced]);

  const display =
    decimals > 0
      ? val.toFixed(decimals)
      : Math.round(val).toLocaleString('en-IN');

  return (
    <span ref={ref}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}

export default function Landing() {
  const nav = useNavigate();
  const [openFaq, setOpenFaq] = useState(0);

  useEffect(() => {
    document.documentElement.classList.add('landing-scroll');
    return () => document.documentElement.classList.remove('landing-scroll');
  }, []);

  // Scroll-reveal: add `.in` to every `.plp-reveal` as it enters the viewport.
  useEffect(() => {
    const els = Array.from(document.querySelectorAll('.plp-reveal'));
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Pointer-tracked glow for feature cards.
  const onFeatureMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
  };

  const features = [
    [Users, 'Lead Management', 'Capture leads from Facebook, Instagram, Google, IndiaMART, JustDial, and your website. A Kanban pipeline tracks status from first contact through booking.'],
    [UserCheck, 'Assignment & Privacy', 'Manually assign leads to agents or auto-balance by workload. Role-based privacy masks PII from agents who shouldn\'t see it.'],
    [CalendarClock, 'Follow-Up & Aging Alerts', 'A lead-aging scheduler flags stale leads. Tasks tied to leads keep agents accountable. Notifications surface what needs action.'],
    [Sparkles, 'Duplicate Detection', 'Hard match on phone/email plus soft match on name + city — never create the same lead twice, even across different sources.'],
    [LineChart, 'Reports & Audit Log', 'Role-based dashboards for Owner / Manager / Agent. Per-lead activity log plus a company-wide audit feed on Enterprise.'],
    [Building, 'Multi-Tenant Support', 'Run multiple brands or branches on a single platform with full data isolation between tenants.'],
  ];

  const showcase = [
    [Layers, 'Unified pipeline', 'Drag leads across customisable stages — every source, one board, real-time updates.'],
    [Target, 'Smart assignment', 'Auto-balance new leads to the least-loaded active agents, or assign manually in a click.'],
    [Bell, 'Never miss a follow-up', 'Aging alerts and task reminders push the right action to the right agent at the right time.'],
  ];

  const stats = [
    { value: <CountUp to={1200} suffix="+" />, label: 'Active Teams' },
    { value: <CountUp to={2400} prefix="₹" suffix=" Cr" />, label: 'Deals Tracked' },
    { value: <CountUp to={38} suffix="K+" />, label: 'Agents Onboarded' },
    { value: <CountUp to={99.9} decimals={1} suffix="%" />, label: 'Uptime SLA' },
  ];

  const testimonials = [
    ['Rajesh Sharma', 'Sales Director, Skyline Realty', 'We doubled site visits in 90 days. The follow-up reminders alone are worth the subscription — our agents stopped losing track of warm leads.'],
    ['Priya Patel', 'Founder, GreenSpace Builders', 'Capturing Facebook + IndiaMART leads in one inbox saved us hours every week. Duplicate detection caught dozens of double-entries our team kept making.'],
    ['Karan Mehta', 'Sales Manager, Capital Estates', 'Switching from spreadsheets to LeadPro saved us 12 hours of admin work per week. Worth every rupee.'],
  ];

  // Each channel gets its own brand glyph (or a semantic lucide icon where no
  // brand logo exists) tinted with the brand colour.
  const channels = [
    { name: 'Facebook Lead Ads', Icon: FacebookIcon, color: '#1877F2' },
    { name: 'Instagram', Icon: InstagramIcon, color: '#E4405F' },
    { name: 'Google Ads', Icon: GoogleAdsIcon, color: '#4285F4' },
    { name: 'IndiaMART', Icon: Store, color: '#2F80B6' },
    { name: 'JustDial', Icon: PhoneCall, color: '#F26F21' },
    { name: 'Website Forms', Icon: LayoutTemplate, color: '#8B5CF6' },
    { name: 'Razorpay', Icon: RazorpayIcon, color: '#3395FF' },
    { name: 'Gmail SMTP', Icon: GmailIcon, color: '#EA4335' },
  ];

  const faqs = [
    ['Is there a free trial?', 'Yes — every new account starts on Basic with a 7-day free trial. No credit card required.'],
    ['Can I import existing leads?', 'Yes. CSV import is built in with column mapping. Pro and Enterprise also support BYO integrations from Facebook, Instagram, Google Ads, IndiaMART, JustDial, and any website form.'],
    ['Does it work on mobile?', 'Yes — the web app is fully responsive and works on phones and tablets out of the box. (Native iOS / Android apps are on the roadmap.)'],
    ['How is data secured?', 'AES-256 encryption at rest for integration credentials, TLS 1.3 in transit, per-tenant data isolation, and role-based access with PII masking for agents.'],
    ['Can I customise lead stages?', 'Yes — Pro and Enterprise can add, rename, and reorder pipeline stages. Basic uses the default 6-stage pipeline.'],
    ['Is a GST invoice provided?', 'Yes — invoices come through Razorpay with GST line items where applicable.'],
  ];

  const submitContact = (e) => {
    e.preventDefault();
    const f = e.currentTarget.elements;
    const email = (f.email?.value || '').trim();
    const company = (f.company?.value || '').trim();
    const name = (f.name?.value || '').trim();
    if (!email || !/.+@.+\..+/.test(email)) {
      toast.error('Enter a valid email');
      return;
    }
    // Carry what they typed into the signup form (email → ownerEmail,
    // company → companyName; name is forwarded for when signup collects it).
    const params = new URLSearchParams({ email });
    if (company) params.set('company', company);
    if (name) params.set('name', name);
    nav(`/signup?${params.toString()}`);
  };

  return (
    <div className="landing-page plp">
      {/* Animated background */}
      <div className="plp-bg" aria-hidden="true">
        <div className="plp-orb plp-orb-1" />
        <div className="plp-orb plp-orb-2" />
        <div className="plp-orb plp-orb-3" />
        <div className="plp-grid-overlay" />
        <div className="plp-particles">
          {PARTICLES.map((p, i) => (
            <span
              key={i}
              className="plp-particle"
              style={{
                left: p.left,
                top: p.top,
                width: p.size,
                height: p.size,
                animationDuration: `${p.dur}s`,
                animationDelay: `${p.delay}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* ============================ HERO ============================ */}
      <section id="home" className="public-page landing-section plp-hero">
        <div className="plp-hero-copy plp-reveal">
          <span className="plp-eyebrow"><Zap size={13} /> Trusted by 1,200+ real estate teams</span>
          <h1>
            Manage Leads.{' '}
            <span className="plp-grad-text">Close Deals.</span>
            <br />
            Grow Your Real Estate Business.
          </h1>
          <p className="plp-hero-sub">
            A smart CRM &amp; lead-management platform for brokers, builders, and
            sales teams. Track every enquiry from first call to closure — without
            losing a single hot lead.
          </p>
          <div className="plp-cta-row">
            <button className="btn plp-btn-glow" onClick={() => nav('/signup')}>
              Get Started Free <ArrowRight size={16} />
            </button>
            <button className="btn plp-btn-ghost" onClick={() => nav('/features')}>
              <Rocket size={16} /> Explore Features
            </button>
          </div>
          <div className="plp-trust">
            <span><Check size={14} /> Kanban Lead Pipeline</span>
            <span><Check size={14} /> Multi-Source Capture</span>
            <span><Check size={14} /> Role-Based Privacy</span>
          </div>
          <div className="plp-avatars">
            <div className="plp-avatar-stack">
              {['Aarav N', 'Priya M', 'Karan I', 'Sara K'].map((n) => (
                <div key={n} className="avatar">{initials(n)}</div>
              ))}
            </div>
            <div className="plp-avatars-text">
              <span className="plp-stars">
                {[0, 1, 2, 3, 4].map((i) => <Star key={i} size={13} fill="currentColor" />)}
              </span>
              <br />
              <b>4.9/5</b> from 380+ sales teams
            </div>
          </div>
        </div>

        <div className="plp-hero-visual plp-reveal" style={{ '--plp-delay': '120ms' }}>
          <div className="plp-dash">
            <div className="plp-dash-bar">
              <i /><i /><i />
              <span>LeadPro · Live Dashboard</span>
            </div>
            <div className="plp-dash-kpis">
              <div className="plp-dash-kpi">
                <div className="v">386</div>
                <div className="l">Total Leads</div>
                <div className="t up"><TrendingUp size={11} /> 12%</div>
              </div>
              <div className="plp-dash-kpi">
                <div className="v">₹4.2 Cr</div>
                <div className="l">Pipeline Value</div>
                <div className="t up"><TrendingUp size={11} /> 8%</div>
              </div>
              <div className="plp-dash-kpi">
                <div className="v">68%</div>
                <div className="l">Win Rate</div>
                <div className="t up"><TrendingUp size={11} /> 5%</div>
              </div>
            </div>
            <div className="plp-dash-chart">
              {HERO_BARS.map((h, i) => (
                <div
                  key={i}
                  className="bar"
                  style={{ '--plp-h': `${h}%`, '--plp-d': `${i * 70}ms` }}
                />
              ))}
            </div>
          </div>

          <div className="plp-kpi plp-kpi-1">
            <div className="ic"><Users size={18} /></div>
            <div>
              <div className="v">+248</div>
              <div className="l">New leads this week</div>
            </div>
          </div>
          <div className="plp-kpi plp-kpi-2">
            <div className="ic"><ShieldCheck size={18} /></div>
            <div>
              <div className="v">0 dupes</div>
              <div className="l">Auto-deduplicated</div>
            </div>
          </div>
          <div className="plp-kpi plp-kpi-3">
            <div className="ic"><BarChart3 size={18} /></div>
            <div>
              <div className="v">₹4.2 Cr</div>
              <div className="l">Closed this quarter</div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== TRUSTED-BY MARQUEE ===================== */}
      <section className="public-page landing-section-compact plp-logos plp-reveal">
        <div className="plp-logos-label">Captures leads from every channel you run</div>
        <div className="plp-marquee">
          <div className="plp-marquee-track">
            {[...channels, ...channels].map(({ name, Icon, color }, i) => (
              <span key={i} className="plp-chip">
                <span className="plp-chip-ic" style={{ color, background: `color-mix(in srgb, ${color} 16%, transparent)` }}>
                  <Icon size={15} />
                </span>
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ========================== FEATURES ========================== */}
      <section id="features" className="public-page landing-section">
        <div className="plp-section-head plp-reveal">
          <span className="plp-eyebrow"><Sparkles size={13} /> Features</span>
          <h2>Everything You Need To <span className="plp-grad-text">Manage Leads</span></h2>
          <p>Built for the way real estate sales teams actually work — from first enquiry to final booking.</p>
        </div>
        <div className="plp-features">
          {features.map(([Ic, t, d], i) => (
            <div
              key={t}
              className="plp-feature plp-reveal"
              style={{ '--plp-delay': `${i * 70}ms` }}
              onMouseMove={onFeatureMove}
            >
              <div className="plp-feature-ic"><Ic size={24} /></div>
              <h3>{t}</h3>
              <p>{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===================== DASHBOARD SHOWCASE ===================== */}
      <section className="public-page landing-section plp-showcase">
        <div className="plp-reveal">
          <span className="plp-eyebrow"><LineChart size={13} /> Dashboard</span>
          <h2 style={{ fontSize: 'clamp(2rem, 4vw, 2.8rem)', lineHeight: 1.1, letterSpacing: '-.02em', margin: '16px 0 12px' }}>
            Your whole pipeline, <span className="plp-grad-text">at a glance</span>
          </h2>
          <p style={{ color: 'var(--lp-text-muted)', fontSize: '1.08rem', lineHeight: 1.6 }}>
            A single real-time workspace for owners, managers, and agents — with
            the numbers that matter always one glance away.
          </p>
          <ul className="plp-showcase-list">
            {showcase.map(([Ic, t, d]) => (
              <li key={t}>
                <div className="ic"><Ic size={19} /></div>
                <div>
                  <h4>{t}</h4>
                  <p>{d}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="plp-showcase-panel plp-reveal" style={{ '--plp-delay': '120ms' }}>
          <div className="plp-glass">
            <div className="plp-panel-head">
              <span className="title">Lead Pipeline</span>
              <div className="plp-panel-tabs">
                <span className="active">Kanban</span>
                <span>Table</span>
                <span>Calendar</span>
              </div>
            </div>
            <div className="plp-pipeline">
              {[
                ['New', '#60A5FA', [['Aarav Sharma', 'Skyline · ₹1.2 Cr'], ['Neha Roy', 'Greens · ₹80 L']]],
                ['Contacted', '#A78BFA', [['Karan Iyer', 'Royal · ₹2.1 Cr']]],
                ['Site Visit', '#F59E0B', [['Priya Mehta', 'Greens · ₹95 L'], ['Vikram S', 'Aurum · ₹3 Cr']]],
                ['Booked', '#10B981', [['Sara Khan', 'Skyline · ₹1.6 Cr']]],
              ].map(([col, dot, cards]) => (
                <div key={col} className="plp-pipe-col">
                  <div className="hd"><span>{col}</span><span className="dot" style={{ background: dot }} /></div>
                  {cards.map(([n, m]) => (
                    <div key={n} className="plp-pipe-card">
                      <div className="n">{n}</div>
                      <div className="m">{m}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="plp-float-card plp-float-tr">
            <div className="ic"><Check size={16} /></div>
            <div>
              <div className="v">Lead booked</div>
              <div className="l">Sara Khan · ₹1.6 Cr</div>
            </div>
          </div>
          <div className="plp-float-card plp-float-bl">
            <div className="ic"><Bell size={16} /></div>
            <div>
              <div className="v">3 follow-ups due</div>
              <div className="l">Assigned to you</div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================== STATS =========================== */}
      <section className="public-page landing-section-compact">
        <div className="plp-stats plp-reveal">
          {stats.map((s) => (
            <div key={s.label} className="plp-stat">
              <div className="v plp-grad-text">{s.value}</div>
              <div className="l">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ======================= TESTIMONIALS ======================== */}
      <section className="public-page landing-section">
        <div className="plp-section-head plp-reveal">
          <span className="plp-eyebrow"><Star size={13} /> Testimonials</span>
          <h2>Loved by <span className="plp-grad-text">Sales Teams</span></h2>
          <p>From boutique brokerages to large builders across India.</p>
        </div>
        <div className="plp-testimonials">
          {testimonials.map(([n, r, q], i) => (
            <div key={n} className="plp-testimonial plp-reveal" style={{ '--plp-delay': `${i * 80}ms` }}>
              <Quote className="plp-quote-mark" size={28} />
              <div className="stars">
                {[0, 1, 2, 3, 4].map((s) => <Star key={s} size={15} fill="currentColor" />)}
              </div>
              <p>{q}</p>
              <div className="plp-t-meta">
                <div className="avatar">{initials(n)}</div>
                <div>
                  <div className="n">{n}</div>
                  <div className="r">{r}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ========================== PRICING ========================== */}
      <div className="plp-reveal">
        <PricingSection />
      </div>

      {/* ============================ FAQ ============================ */}
      <section className="public-page landing-section">
        <div className="plp-section-head plp-reveal">
          <span className="plp-eyebrow"><Sparkles size={13} /> FAQ</span>
          <h2>Frequently Asked <span className="plp-grad-text">Questions</span></h2>
          <p>Everything you need to know before you start your free trial.</p>
        </div>
        <div className="plp-faq-wrap plp-reveal">
          {faqs.map(([q, a], i) => (
            <div key={q} className={`plp-faq ${openFaq === i ? 'open' : ''}`}>
              <div className="plp-faq-q" onClick={() => setOpenFaq(openFaq === i ? -1 : i)}>
                {q}
                <ChevronDown size={18} />
              </div>
              <div className="plp-faq-a"><p>{a}</p></div>
            </div>
          ))}
        </div>
      </section>

      {/* ========================== CONTACT ========================== */}
      <section id="contact" className="public-page landing-section">
        <div className="plp-contact-card plp-reveal">
          <div className="plp-contact-grid">
            <div>
              <span className="plp-eyebrow"><Send size={13} /> Get Started</span>
              <h2 style={{ marginTop: 16 }}>Start closing more deals today.</h2>
              <p>
                Join 1,200+ real estate teams who run their pipeline on LeadPro
                Realty. Set up in minutes — no credit card required.
              </p>
              <div className="plp-contact-points">
                <a href="mailto:hello@leadpro.realty"><Mail size={16} /> hello@leadpro.realty</a>
                <a href="tel:+918000000000"><Phone size={16} /> +91 80000 00000</a>
                <span><MapPin size={16} /> Pune · Mumbai · Bengaluru</span>
              </div>
            </div>
            <form className="plp-contact-form" onSubmit={submitContact}>
              <div className="row">
                <input className="input" name="name" placeholder="Your name" aria-label="Your name" />
                <input className="input" name="company" placeholder="Company" aria-label="Company" />
              </div>
              <input className="input" type="email" name="email" placeholder="you@company.com" aria-label="Email" required />
              <textarea className="textarea" name="message" rows={3} placeholder="Tell us about your team (optional)" aria-label="Message" />
              <button className="btn plp-btn-glow" type="submit" style={{ justifyContent: 'center' }}>
                Get Started Free <ArrowRight size={16} />
              </button>
              <p className="plp-contact-note">
                <Check size={13} /> No credit card required · 7-day free trial · We&apos;ll pre-fill your details
              </p>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
