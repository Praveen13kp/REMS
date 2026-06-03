import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function AddLead() {
  const navigate = useNavigate()
  const [errors, setErrors] = useState({})
  function handleSubmit(e) {
    e.preventDefault()
    const fd = new FormData(e.target)
    const name = fd.get('name').trim()
    const phone = fd.get('phone').trim()
    const email = fd.get('email').trim()
    const NAME_REGEX = /^[a-zA-ZÀ-ÖØ-öø-ÿ\s'.-]+$/
    const errs = {}
    if (!NAME_REGEX.test(name)) errs.name = 'Name cannot contain numbers'
    if (!/^\+\d{1,4}\d{8,15}$/.test(phone)) errs.phone = 'Enter a valid phone number with country code'
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Enter a valid email address'
    setErrors(errs)
    if (Object.keys(errs).length) return
    navigate('/leads')
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Link to="/leads" className="text-sm text-brand-600 dark:text-brand-400 hover:underline">&larr; Back to Leads</Link>
        <h1 className="text-2xl sm:text-3xl font-bold font-display mt-2">Add New Lead</h1>
        <p className="text-sm text-ink-500 dark:text-ink-400 mt-1">Capture a new customer enquiry. Required fields are marked with *.</p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-6">
        <div>
          <h2 className="font-bold text-lg font-display mb-1">Customer Information</h2>
          <p className="text-xs text-ink-500 dark:text-ink-400 mb-4">Basic contact details for the new lead.</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Customer Name *</label>
              <input type="text" name="name" required placeholder="Full name" className="input-field" />
              {errors.name && <span className="text-xs" style={{ color: 'var(--error)' }}>{errors.name}</span>}
            </div>
            <div>
              <label className="label">Phone Number *</label>
              <input type="tel" name="phone" required placeholder="+91 98765 12345" className="input-field" />
              {errors.phone && <span className="text-xs" style={{ color: 'var(--error)' }}>{errors.phone}</span>}
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" name="email" placeholder="customer@email.com" className="input-field" />
              {errors.email && <span className="text-xs" style={{ color: 'var(--error)' }}>{errors.email}</span>}
            </div>
            <div>
              <label className="label">City</label>
              <input type="text" name="city" placeholder="Bangalore" className="input-field" />
            </div>
          </div>
        </div>

        <div className="border-t border-ink-200 dark:border-midnight-700 pt-6">
          <h2 className="font-bold text-lg font-display mb-1">Property & Budget</h2>
          <p className="text-xs text-ink-500 dark:text-ink-400 mb-4">What the customer is looking for.</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Budget Range *</label>
              <select required className="input-field">
                <option value="">Select budget</option>
                <option>Under ₹50 L</option>
                <option>₹50 L - ₹1 Cr</option>
                <option>₹1 Cr - ₹2 Cr</option>
                <option>₹2 Cr - ₹5 Cr</option>
                <option>Above ₹5 Cr</option>
              </select>
            </div>
            <div>
              <label className="label">Interested Project *</label>
              <select required className="input-field">
                <option value="">Select project</option>
                <option>Skyline Towers</option>
                <option>Green Valley Estates</option>
                <option>Riverside Heights</option>
                <option>Urban Square</option>
                <option>Crystal Bay Residences</option>
              </select>
            </div>
            <div>
              <label className="label">Property Type</label>
              <select className="input-field">
                <option>2 BHK Apartment</option>
                <option>3 BHK Apartment</option>
                <option>4 BHK Apartment</option>
                <option>Villa</option>
                <option>Plot</option>
                <option>Commercial</option>
              </select>
            </div>
            <div>
              <label className="label">Possession Timeline</label>
              <select className="input-field">
                <option>Immediate</option>
                <option>Within 3 months</option>
                <option>3-6 months</option>
                <option>6-12 months</option>
                <option>Just exploring</option>
              </select>
            </div>
          </div>
        </div>

        <div className="border-t border-ink-200 dark:border-midnight-700 pt-6">
          <h2 className="font-bold text-lg font-display mb-1">Source & Notes</h2>
          <p className="text-xs text-ink-500 dark:text-ink-400 mb-4">Where the lead came from and any context.</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Lead Source *</label>
              <select required className="input-field">
                <option value="">Select source</option>
                <option>MagicBricks</option>
                <option>99Acres</option>
                <option>Walk-In</option>
                <option>Referral</option>
                <option>Facebook Ads</option>
                <option>Instagram</option>
                <option>Google Ads</option>
                <option>Website</option>
              </select>
            </div>
            <div>
              <label className="label">Initial Status</label>
              <select className="input-field">
                <option>New</option>
                <option>Interested</option>
                <option>Site Visit</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Notes</label>
              <textarea rows={4} placeholder="Any additional context about the customer's preferences, timing, or constraints..." className="input-field resize-none" />
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
          <button type="reset" className="btn-secondary">Reset</button>
          <button type="submit" className="btn-gradient">Save Lead</button>
        </div>
      </form>
    </div>
  )
}
