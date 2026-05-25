import { Newspaper } from 'lucide-react';

export default function Blog() {
  return (
    <section className="public-page landing-section">
      <div className="section-title">
        <h2>Blog</h2>
        <p>Tips, playbooks, and product stories for real estate sales teams.</p>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center', padding: '48px 24px', border: '1px dashed var(--border)', borderRadius: 12 }}>
        <Newspaper size={36} style={{ opacity: 0.5, marginBottom: 12 }} />
        <h3 style={{ marginTop: 0 }}>Coming soon</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: "0.933rem", lineHeight: 1.7, maxWidth: 460, margin: '0 auto' }}>
          We're working on practical articles about lead management, follow-up
          discipline, and team workflows for Indian real estate. First posts land
          shortly.
        </p>
      </div>
    </section>
  );
}
