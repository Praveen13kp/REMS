import { Building2, Target, Users, Shield } from 'lucide-react';

const values = [
  [Target, 'Built for Indian real estate', 'Designed around how brokers, builders, and channel partners actually work — Kanban pipelines, multi-source lead capture, and follow-up reminders that match local sales motions.'],
  [Users, 'Sales teams come first', 'Every feature is shaped by feedback from sales managers and agents who use LeadPro daily. If it doesn\'t help close more deals, it doesn\'t ship.'],
  [Shield, 'Privacy by design', 'Per-tenant data isolation, role-based PII masking, and encryption at rest. Your leads are yours — never shared, never sold.'],
];

export default function About() {
  return (
    <section className="public-page landing-section">
      <div className="section-title">
        <h2>About LeadPro Realty</h2>
        <p>The smart CRM for real estate sales teams in India and beyond.</p>
      </div>

      <div style={{ maxWidth: 780, margin: '0 auto 48px', color: 'var(--text-muted)', fontSize: "1rem", lineHeight: 1.7 }}>
        <p style={{ marginBottom: 16 }}>
          LeadPro Realty was built to solve one problem: real estate sales teams lose
          deals because leads slip through the cracks. Spreadsheets, WhatsApp groups,
          and scattered ad inboxes don't scale — and warm enquiries go cold while no
          one follows up.
        </p>
        <p style={{ marginBottom: 16 }}>
          We bring every lead — from Facebook and Instagram ads, IndiaMART, JustDial,
          your website, and walk-ins — into one Kanban pipeline. Managers assign work
          fairly, agents see only what they should, and nothing gets forgotten.
        </p>
        <p>
          Today, 1,200+ teams across India use LeadPro to track ₹2,400+ Cr of
          deals. We're a small, independent team based out of India, and we ship
          improvements every week.
        </p>
      </div>

      <div className="feature-grid">
        {values.map(([Ic, t, d]) => (
          <div key={t} className="feature">
            <div className="feature-icon"><Ic size={22} /></div>
            <h3>{t}</h3>
            <p>{d}</p>
          </div>
        ))}
      </div>

      <div style={{ textAlign: 'center', marginTop: 48, color: 'var(--text-muted)', fontSize: "0.933rem" }}>
        <Building2 size={20} style={{ marginBottom: 8, opacity: 0.6 }} />
        <div>LeadPro Realty · India</div>
      </div>
    </section>
  );
}
