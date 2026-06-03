import { useState } from 'react';
import { useApp } from '../store.jsx';

export default function Contact() {
  const { toast } = useApp();
  const [errors, setErrors] = useState({});
  const handleSubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const firstName = (fd.get('firstName') || '').trim();
    const lastName = (fd.get('lastName') || '').trim();
    const email = (fd.get('email') || '').trim();
    const NAME_REGEX = /^[a-zA-ZÀ-ÖØ-öø-ÿ\s'.-]+$/;
    const errs = {};
    if (!NAME_REGEX.test(firstName)) errs.firstName = 'Name cannot contain numbers';
    if (!NAME_REGEX.test(lastName)) errs.lastName = 'Name cannot contain numbers';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Enter a valid email address';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    toast('Thanks — our team will reach out shortly.', 'success');
    e.target.reset();
  };
  return (
    <section className="public-page">
      <div className="section-title"><h2>Talk To Sales</h2><p>Tell us what you're working on. We'll get back within 1 business day.</p></div>
      <div style={{ maxWidth: 560, margin: '0 auto' }} className="card">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-2" style={{ gap: '0 12px' }}>
            <div className="field"><label>First name <span className="req">*</span></label><input className="input" name="firstName" required />
              {errors.firstName && <span className="text-xs" style={{ color: 'var(--error)' }}>{errors.firstName}</span>}</div>
            <div className="field"><label>Last name <span className="req">*</span></label><input className="input" name="lastName" required />
              {errors.lastName && <span className="text-xs" style={{ color: 'var(--error)' }}>{errors.lastName}</span>}</div>
          </div>
          <div className="field"><label>Work email <span className="req">*</span></label><input className="input" name="email" type="email" required />
            {errors.email && <span className="text-xs" style={{ color: 'var(--error)' }}>{errors.email}</span>}</div>
          <div className="field"><label>Company</label><input className="input" name="company" /></div>
          <div className="field">
            <label>Team size</label>
            <select className="select" name="teamSize"><option>1–10</option><option>11–50</option><option>51–200</option><option>200+</option></select>
          </div>
          <div className="field"><label>How can we help?</label><textarea className="textarea" name="message" rows={4} /></div>
          <button className="btn btn-primary" type="submit" style={{ width: '100%', justifyContent: 'center' }}>Send Message</button>
        </form>
      </div>
    </section>
  );
}
