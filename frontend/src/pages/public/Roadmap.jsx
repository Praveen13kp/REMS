import { Map } from 'lucide-react';

export default function Roadmap() {
  return (
    <section className="public-page landing-section">
      <div className="section-title">
        <h2>Roadmap</h2>
        <p>What we're building next at LeadPro Realty.</p>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center', padding: '48px 24px', border: '1px dashed var(--border)', borderRadius: 12 }}>
        <Map size={36} style={{ opacity: 0.5, marginBottom: 12 }} />
        <h3 style={{ marginTop: 0 }}>Coming soon</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: "0.933rem", lineHeight: 1.7, maxWidth: 460, margin: '0 auto' }}>
          A public roadmap is in the works. In the meantime, if there's a feature
          you'd like to see in LeadPro Realty, tell us on the contact page.
        </p>
      </div>
    </section>
  );
}
