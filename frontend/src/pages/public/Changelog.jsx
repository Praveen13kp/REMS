import { Sparkles } from 'lucide-react';

export default function Changelog() {
  return (
    <section className="public-page landing-section">
      <div className="section-title">
        <h2>Changelog</h2>
        <p>Updates, improvements, and fixes shipped to LeadPro Realty.</p>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center', padding: '48px 24px', border: '1px dashed var(--border)', borderRadius: 12 }}>
        <Sparkles size={36} style={{ opacity: 0.5, marginBottom: 12 }} />
        <h3 style={{ marginTop: 0 }}>Coming soon</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.7, maxWidth: 460, margin: '0 auto' }}>
          We're putting together a public changelog so you can track every new
          feature, integration, and improvement we ship. Check back shortly.
        </p>
      </div>
    </section>
  );
}
