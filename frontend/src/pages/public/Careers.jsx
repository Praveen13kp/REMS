import { Briefcase, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Careers() {
  const nav = useNavigate();
  return (
    <section className="public-page landing-section">
      <div className="section-title">
        <h2>Careers</h2>
        <p>Help us build the CRM that real estate sales teams actually love.</p>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center', padding: '48px 24px', border: '1px dashed var(--border)', borderRadius: 12 }}>
        <Briefcase size={36} style={{ opacity: 0.5, marginBottom: 12 }} />
        <h3 style={{ marginTop: 0 }}>No open roles right now</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.7, maxWidth: 520, margin: '0 auto 20px' }}>
          We're not actively hiring at the moment, but we're always glad to hear
          from talented engineers, designers, and sales folks who care about real
          estate. Drop us a note and we'll keep you in mind for future openings.
        </p>
        <button className="btn btn-primary" onClick={() => nav('/contact')}>
          Get in touch <ArrowRight size={14} />
        </button>
      </div>
    </section>
  );
}
