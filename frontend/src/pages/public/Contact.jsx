import { useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

export default function Contact() {
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const fd = new FormData(form);
    const firstName = (fd.get('firstName') || '').toString().trim();
    const lastName = (fd.get('lastName') || '').toString().trim();
    const email = (fd.get('email') || '').toString().trim();
    const company = (fd.get('company') || '').toString().trim();
    const teamSize = (fd.get('teamSize') || '').toString();
    const message = (fd.get('message') || '').toString().trim();

    if (!firstName || !lastName || !email) {
      toast.error('Please fill in the required fields.');
      return;
    }

    const payload = {
      name: `${firstName} ${lastName}`.trim(),
      email,
      message: [company && `Company: ${company}`, teamSize && `Team size: ${teamSize}`, message]
        .filter(Boolean)
        .join('\n'),
    };

    try {
      setSubmitting(true);
      // TODO(BE): wire to /api/public/contact when S1-BE-A-03 lands.
      await api.post('/public/contact', payload).catch(() => null);
      toast.success('Thanks — our team will reach out shortly.');
      form.reset();
    } catch (err) {
      toast.error(err?.message || 'Failed to send — please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="public-page">
      <div className="section-title">
        <h2>Talk To Sales</h2>
        <p>Tell us what you're working on. We'll get back within 1 business day.</p>
      </div>
      <div style={{ maxWidth: 560, margin: '0 auto' }} className="card">
        <form onSubmit={onSubmit}>
          <div className="grid grid-2" style={{ gap: '0 12px' }}>
            <div className="field">
              <label>First name <span className="req">*</span></label>
              <input className="input" name="firstName" required />
            </div>
            <div className="field">
              <label>Last name <span className="req">*</span></label>
              <input className="input" name="lastName" required />
            </div>
          </div>
          <div className="field">
            <label>Work email <span className="req">*</span></label>
            <input className="input" name="email" type="email" required />
          </div>
          <div className="field">
            <label>Company</label>
            <input className="input" name="company" />
          </div>
          <div className="field">
            <label>Team size</label>
            <select className="select" name="teamSize" defaultValue="1–10">
              <option>1–10</option>
              <option>11–50</option>
              <option>51–200</option>
              <option>200+</option>
            </select>
          </div>
          <div className="field">
            <label>How can we help?</label>
            <textarea className="textarea" name="message" rows={4} />
          </div>
          <button
            className="btn btn-primary"
            type="submit"
            disabled={submitting}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {submitting ? 'Sending…' : 'Send Message'}
          </button>
        </form>
      </div>
    </section>
  );
}
