import { Lock, Server, Eye, FileCheck, KeyRound, AlertTriangle } from 'lucide-react';

const pillars = [
  [Lock, 'Encryption', 'TLS 1.3 in transit between your browser and our servers. Integration credentials (Facebook, Google, IndiaMART tokens) are encrypted at rest with AES-256. Passwords are stored using bcrypt with a per-account salt — we never store plaintext passwords.'],
  [Server, 'Tenant Isolation', 'Every record in our database is scoped to a tenant ID. Application-layer middleware injects this scope on every query, so a request authenticated as Company A cannot read or write records belonging to Company B — even by direct ID guessing.'],
  [Eye, 'Role-Based Access & PII Masking', 'Owners, Managers, and Agents see different slices of the same data. Agents can be configured to see only their assigned leads with phone and email partially masked, so PII exposure is minimised by default.'],
  [FileCheck, 'Audit Logging', 'Sensitive actions — invites, role changes, exports, integration setup, billing changes — are recorded in an append-only audit log scoped to your tenant. Enterprise plans can export the log for compliance reviews.'],
  [KeyRound, 'Authentication', 'Email + password authentication backed by secure session cookies (HttpOnly, SameSite). Password reset links and invite tokens are single-use and time-limited. Rate limiting protects login and password-reset endpoints from brute-force attempts.'],
  [AlertTriangle, 'Incident Response', 'We monitor application logs for anomalies and rate-limit abuse. In the event of a confirmed security incident affecting your data, we will notify the account owner by email within 72 hours and post a public incident report.'],
];

export default function Security() {
  return (
    <section className="public-page landing-section">
      <div className="section-title">
        <h2>Security</h2>
        <p>How we protect your leads, your team, and your customers' data.</p>
      </div>

      <div style={{ maxWidth: 780, margin: '0 auto 40px', color: 'var(--text-muted)', fontSize: 15, lineHeight: 1.7 }}>
        <p>
          LeadPro Realty handles personal contact information of your prospects
          and customers. Security is not optional — it's a precondition for the
          product existing. Here's how we protect data at every layer.
        </p>
      </div>

      <div className="feature-grid">
        {pillars.map(([Ic, t, d]) => (
          <div key={t} className="feature">
            <div className="feature-icon"><Ic size={22} /></div>
            <h3>{t}</h3>
            <p>{d}</p>
          </div>
        ))}
      </div>

      <div style={{ maxWidth: 780, margin: '48px auto 0', padding: 24, border: '1px solid var(--border)', borderRadius: 12, background: 'var(--surface)' }}>
        <h3 style={{ marginTop: 0 }}>Reporting a Vulnerability</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.7, margin: 0 }}>
          If you believe you've found a security issue in LeadPro Realty, please
          email <a href="mailto:security@bizzfly.com">security@bizzfly.com</a> with
          details and reproduction steps. We aim to acknowledge reports within 2
          business days and will credit researchers in our public disclosures
          unless you ask to remain anonymous.
        </p>
      </div>
    </section>
  );
}
