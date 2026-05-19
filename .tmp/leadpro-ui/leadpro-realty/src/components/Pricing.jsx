import { useState } from 'react'

const plans = [
  {
    name: 'Starter',
    description: 'For solo brokers and small teams getting organised.',
    monthly: 29,
    yearly: 24,
    features: [
      'Up to 5 agents',
      '1,000 leads / month',
      'Lead management & assignment',
      'Follow-up tracking',
      'Email reminders',
      'Basic reports'
    ],
    cta: 'Start Free Trial',
    highlighted: false
  },
  {
    name: 'Professional',
    description: 'For growing real estate teams that need AI scoring.',
    monthly: 79,
    yearly: 65,
    features: [
      'Up to 25 agents',
      '10,000 leads / month',
      'Everything in Starter',
      'AI Lead Scoring (Hot/Warm/Cold)',
      'Smart Follow-Up Suggestions',
      'Advanced reports + scheduled delivery',
      'Custom Lead Sources & Projects',
      'Priority email support'
    ],
    cta: 'Start Free Trial',
    highlighted: true
  },
  {
    name: 'Enterprise',
    description: 'For brokerages and builders with custom needs.',
    monthly: 199,
    yearly: 165,
    features: [
      'Unlimited agents',
      'Unlimited leads',
      'Everything in Professional',
      'Custom AI scoring rules',
      'Dedicated tenant workspace',
      'Audit log & data export',
      'SSO & advanced RBAC',
      'Dedicated account manager'
    ],
    cta: 'Contact Sales',
    highlighted: false
  }
]

export default function Pricing() {
  const [billing, setBilling] = useState('yearly')

  return (
    <section id="pricing" className="section bg-slate-50 dark:bg-slate-900/40">
      <div className="container-custom">
        <div className="max-w-3xl mx-auto text-center">
          <span className="inline-block px-4 py-1.5 rounded-full bg-brand-50 dark:bg-brand-950 text-sm font-medium text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
            Simple pricing
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Pricing that scales <span className="gradient-text">with your team</span>
          </h2>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
            14-day free trial on every plan. No credit card. Cancel anytime.
          </p>

          {/* Billing toggle */}
          <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1">
            <button
              onClick={() => setBilling('monthly')}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                billing === 'monthly'
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling('yearly')}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${
                billing === 'yearly'
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Yearly
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${billing === 'yearly' ? 'bg-white/20' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'}`}>
                Save 17%
              </span>
            </button>
          </div>
        </div>

        <div className="mt-12 grid lg:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-8 transition-all duration-300 ${
                plan.highlighted
                  ? 'bg-gradient-to-br from-brand-600 to-brand-800 dark:from-brand-700 dark:to-brand-950 text-white shadow-2xl scale-100 lg:scale-105 border-2 border-brand-500'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:shadow-soft'
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1 rounded-full bg-amber-400 text-amber-950 text-xs font-bold shadow-md">
                    MOST POPULAR
                  </span>
                </div>
              )}

              <div>
                <h3 className={`text-xl font-bold ${plan.highlighted ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                  {plan.name}
                </h3>
                <p className={`mt-2 text-sm ${plan.highlighted ? 'text-brand-100' : 'text-slate-600 dark:text-slate-400'}`}>
                  {plan.description}
                </p>
              </div>

              <div className="mt-6 flex items-baseline gap-1">
                <span className={`text-5xl font-extrabold ${plan.highlighted ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                  ${billing === 'yearly' ? plan.yearly : plan.monthly}
                </span>
                <span className={plan.highlighted ? 'text-brand-200' : 'text-slate-500 dark:text-slate-400'}>
                  /agent/mo
                </span>
              </div>
              {billing === 'yearly' && (
                <p className={`mt-1 text-xs ${plan.highlighted ? 'text-brand-200' : 'text-slate-500 dark:text-slate-400'}`}>
                  billed annually
                </p>
              )}

              <a
                href="#signup"
                className={`mt-6 block text-center font-semibold rounded-lg px-6 py-3 transition-all ${
                  plan.highlighted
                    ? 'bg-white text-brand-700 hover:bg-brand-50'
                    : 'bg-brand-600 text-white hover:bg-brand-700'
                }`}
              >
                {plan.cta}
              </a>

              <ul className="mt-8 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className={`h-5 w-5 flex-shrink-0 mt-0.5 ${plan.highlighted ? 'text-brand-200' : 'text-emerald-500'}`}
                    >
                      <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                    </svg>
                    <span className={`text-sm ${plan.highlighted ? 'text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                      {f}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
