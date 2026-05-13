import { Users, Route, Phone, MessageSquare, Calendar, FileText, Shield, Globe, BarChart3 } from 'lucide-react';

export default function Features() {
  const items = [
    [Users, 'Lead Capture', 'Forms, APIs, integrations with MagicBricks/99acres'],
    [Route, 'Pipeline Stages', 'Customisable funnel from New to Booked'],
    [Phone, 'Click-to-Call', 'Built-in calling with auto call logging'],
    [MessageSquare, 'WhatsApp Integration', 'Send templates and track replies'],
    [Calendar, 'Site Visit Scheduling', 'Calendar sync, reminders, route planning'],
    [FileText, 'Document Vault', 'Brochures, agreements, KYC docs in one place'],
    [Shield, 'Role-Based Access', 'Granular permissions per role and module'],
    [Globe, 'Multi-Branch', 'Manage multiple branches and brands'],
    [BarChart3, 'Custom Reports', 'Report builder with scheduled email delivery'],
  ];
  return (
    <section className="public-page">
      <div className="section-title"><h2>All The Features</h2><p>Built end-to-end for real estate workflows.</p></div>
      <div className="feature-grid">
        {items.map(([Ic, t, d]) => (
          <div key={t} className="feature">
            <div className="feature-icon"><Ic size={22} /></div>
            <h3>{t}</h3><p>{d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
