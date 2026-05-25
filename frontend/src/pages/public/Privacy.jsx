export default function Privacy() {
  return (
    <section className="public-page landing-section">
      <div className="section-title">
        <h2>Privacy Policy</h2>
        <p>Last updated: 24 May 2026</p>
      </div>

      <div className="legal-content">
        <p>
          This Privacy Policy explains how LeadPro Realty ("we", "us", or "our")
          collects, uses, and protects information when you use our software-as-a-service
          customer relationship management platform (the "Service"). By using the
          Service, you agree to the practices described below.
        </p>

        <h3>1. Information We Collect</h3>
        <p>We collect the following categories of information:</p>
        <ul>
          <li><b>Account information</b> — name, work email, company name, role, and password (hashed) provided during sign-up.</li>
          <li><b>Customer data</b> — lead records, contact details, notes, files, and activity entered by you or imported through integrations you connect (Facebook Lead Ads, Instagram, Google Ads, IndiaMART, JustDial, website forms, CSV imports).</li>
          <li><b>Billing information</b> — processed by our payment provider (Razorpay). We store invoice metadata but do not store full card details on our servers.</li>
          <li><b>Usage data</b> — log entries, IP address, browser type, and audit events generated when you interact with the Service.</li>
        </ul>

        <h3>2. How We Use Information</h3>
        <ul>
          <li>To provide, maintain, and improve the Service.</li>
          <li>To authenticate users and enforce role-based access controls.</li>
          <li>To process subscription payments and issue tax invoices.</li>
          <li>To send transactional emails (invites, password resets, billing notices).</li>
          <li>To detect, prevent, and respond to fraud, abuse, or security incidents.</li>
        </ul>
        <p>We do not sell your data, and we do not use your customer data to train machine-learning models.</p>

        <h3>3. Data Storage &amp; Tenant Isolation</h3>
        <p>
          Customer data is stored in a multi-tenant database with logical isolation
          enforced at the application layer. Every record is scoped to your
          company, and queries cannot cross tenant boundaries. Integration
          credentials are encrypted at rest using AES-256.
        </p>

        <h3>4. Sharing &amp; Third Parties</h3>
        <p>We share information only with the following categories of processors:</p>
        <ul>
          <li><b>Payment processor</b> — Razorpay, for subscription billing.</li>
          <li><b>Email delivery</b> — SMTP providers used to send transactional email.</li>
          <li><b>Integration partners</b> — only when you explicitly connect them (e.g. Facebook Lead Ads, Google Ads).</li>
          <li><b>Law enforcement</b> — when required by valid legal process.</li>
        </ul>

        <h3>5. Your Rights</h3>
        <p>
          Under the Digital Personal Data Protection Act, 2023 and equivalent regimes,
          you can request access to, correction of, or deletion of personal information
          we hold about you. Email <a href="mailto:privacy@bizzfly.com">privacy@bizzfly.com</a>
          and we will respond within 30 days.
        </p>

        <h3>6. Data Retention</h3>
        <p>
          We retain customer data for as long as your subscription is active. On
          account closure, data is retained for 30 days to allow recovery, then
          permanently deleted from primary systems. Backups are purged on a rolling
          90-day cycle.
        </p>

        <h3>7. Children's Privacy</h3>
        <p>The Service is intended for business use only and is not directed at children under 18.</p>

        <h3>8. Changes to This Policy</h3>
        <p>
          We may update this policy from time to time. Material changes will be
          communicated by email or in-app notice at least 14 days before they take effect.
        </p>

        <h3>9. Contact</h3>
        <p>
          Questions or requests: <a href="mailto:privacy@bizzfly.com">privacy@bizzfly.com</a>.
        </p>
      </div>
    </section>
  );
}
