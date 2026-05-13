import { useApp } from '../store.jsx';

export default function Contact() {
  const { toast } = useApp();
  return (
    <section className="public-page">
      <div className="section-title"><h2>Talk To Sales</h2><p>Tell us what you're working on. We'll get back within 1 business day.</p></div>
      <div style={{ maxWidth: 560, margin: '0 auto' }} className="card">
        <form onSubmit={(e) => { e.preventDefault(); toast('Thanks — our team will reach out shortly.', 'success'); e.target.reset(); }}>
          <div className="grid grid-2" style={{ gap: '0 12px' }}>
            <div className="field"><label>First name <span className="req">*</span></label><input className="input" required /></div>
            <div className="field"><label>Last name <span className="req">*</span></label><input className="input" required /></div>
          </div>
          <div className="field"><label>Work email <span className="req">*</span></label><input className="input" type="email" required /></div>
          <div className="field"><label>Company</label><input className="input" /></div>
          <div className="field">
            <label>Team size</label>
            <select className="select"><option>1–10</option><option>11–50</option><option>51–200</option><option>200+</option></select>
          </div>
          <div className="field"><label>How can we help?</label><textarea className="textarea" rows={4} /></div>
          <button className="btn btn-primary" type="submit" style={{ width: '100%', justifyContent: 'center' }}>Send Message</button>
        </form>
      </div>
    </section>
  );
}
