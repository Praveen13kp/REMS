import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';

export default function Pricing() {
  const [annual, setAnnual] = useState(false);
  const nav = useNavigate();
  const plans = [
    { name: 'Free', price: 0, desc: 'For solo brokers getting started', feats: ['Up to 50 leads', '1 user', 'Basic reports', 'Email support', 'Mobile app'] },
    { name: 'Pro', price: annual ? 3999 : 4999, desc: 'For growing sales teams', feats: ['Unlimited leads', 'Up to 25 users', 'AI lead scoring', 'Advanced analytics', 'Lead assignment rules', 'Priority support', 'API access'], featured: true },
    { name: 'Enterprise', price: annual ? 11999 : 14999, desc: 'For builders & large brokerages', feats: ['Everything in Pro', 'Unlimited users', 'Multi-organisation', 'Custom integrations', 'Dedicated CSM', '99.9% SLA', 'Custom contracts'] },
  ];
  return (
    <section className="public-page" style={{ textAlign: 'center' }}>
      <div className="section-title"><h2>Simple, Honest Pricing</h2><p>Pick a plan that fits your team. Switch anytime.</p></div>
      <div className="billing-toggle">
        <button className={!annual ? 'active' : ''} onClick={() => setAnnual(false)}>Monthly</button>
        <button className={annual ? 'active' : ''} onClick={() => setAnnual(true)}>Annual <span style={{ opacity: 0.7, marginLeft: 4 }}>−20%</span></button>
      </div>
      <div className="pricing-grid">
        {plans.map((p) => (
          <div key={p.name} className={`price-card ${p.featured ? 'featured' : ''}`}>
            <div className="price-name">{p.name}</div>
            <div className="price-amount">{p.price === 0 ? 'Free' : '₹' + p.price.toLocaleString('en-IN')}<span>{p.price ? '/mo' : ''}</span></div>
            <p className="text-muted text-sm mt-2">{p.desc}</p>
            <ul className="price-feats">
              {p.feats.map((f) => <li key={f}><Check size={16} /> {f}</li>)}
            </ul>
            <button className={`btn ${p.featured ? 'btn-primary' : 'btn-secondary'}`} style={{ width: '100%', justifyContent: 'center' }} onClick={() => nav('/signup')}>{p.price === 0 ? 'Start Free' : 'Choose ' + p.name}</button>
          </div>
        ))}
      </div>
    </section>
  );
}
