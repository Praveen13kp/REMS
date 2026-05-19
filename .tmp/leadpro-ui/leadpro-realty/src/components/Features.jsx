const features = [
  {
    title: 'Lead Management',
    description: 'Capture every enquiry with structured metadata - name, phone, budget, project of interest, source, and status. No more leads lost in spreadsheets or WhatsApp groups.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
        <path d="M11.7 2.805a.75.75 0 01.6 0A60.65 60.65 0 0122.83 8.72a.75.75 0 01-.231 1.337 49.949 49.949 0 00-9.902 3.912l-.003.002-.34.18a.75.75 0 01-.707 0A50.009 50.009 0 007.5 12.174v-.224c0-.131.067-.248.172-.311a54.614 54.614 0 014.653-2.52.75.75 0 00-.65-1.352 56.129 56.129 0 00-4.78 2.589 1.858 1.858 0 00-.859 1.228 49.803 49.803 0 00-4.634-1.527.75.75 0 01-.231-1.337A60.653 60.653 0 0111.7 2.805z" />
        <path d="M13.06 15.473a48.45 48.45 0 017.666-3.282c.134 1.414.22 2.843.255 4.285a.75.75 0 01-.46.71 47.878 47.878 0 00-8.105 4.342.75.75 0 01-.832 0 47.877 47.877 0 00-8.104-4.342.75.75 0 01-.461-.71c.035-1.442.121-2.87.255-4.286A48.4 48.4 0 016 13.18v1.27a1.5 1.5 0 00-.14 2.508c-.09.38-.222.753-.397 1.11.452.213.901.434 1.346.661a6.729 6.729 0 00.551-1.608 1.5 1.5 0 00.14-2.67v-.645a48.549 48.549 0 013.44 1.668 2.25 2.25 0 002.12 0z" />
        <path d="M4.462 19.462c.42-.419.753-.89 1-1.394.453.213.902.434 1.347.661a6.743 6.743 0 01-1.286 1.794.75.75 0 11-1.06-1.06z" />
      </svg>
    ),
    color: 'from-brand-500 to-brand-700'
  },
  {
    title: 'Lead Assignment',
    description: 'Assign leads to agents with one click. Capacity rules prevent overload, priority surfaces top opportunities first, and reassignment is logged with reason capture.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
        <path d="M4.5 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM14.25 8.625a3.375 3.375 0 116.75 0 3.375 3.375 0 01-6.75 0zM1.5 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63 13.067 13.067 0 01-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 01-.364-.63l-.001-.122zM17.25 19.128l-.001.144a2.25 2.25 0 01-.233.96 10.088 10.088 0 005.06-1.01.75.75 0 00.42-.643 4.875 4.875 0 00-6.957-4.611 8.586 8.586 0 011.71 5.157v.003z" />
      </svg>
    ),
    color: 'from-purple-500 to-purple-700'
  },
  {
    title: 'Follow-Up Tracking',
    description: 'Today\'s, missed, and upcoming follow-ups in clear sections. Calendar view, email reminders, and one-click reschedule keep your team on top of every conversation.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
        <path fillRule="evenodd" d="M6.75 2.25A.75.75 0 017.5 3v1.5h9V3A.75.75 0 0118 3v1.5h.75a3 3 0 013 3v11.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V7.5a3 3 0 013-3H6V3a.75.75 0 01.75-.75zm13.5 9a1.5 1.5 0 00-1.5-1.5H5.25a1.5 1.5 0 00-1.5 1.5v7.5a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5v-7.5z" clipRule="evenodd" />
      </svg>
    ),
    color: 'from-emerald-500 to-emerald-700'
  },
  {
    title: 'AI Lead Scoring',
    description: 'Hot / Warm / Cold classification with a configurable rule engine. Scores update automatically as leads progress, so your best opportunities never go cold.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
        <path fillRule="evenodd" d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813A3.75 3.75 0 007.466 7.89l.813-2.846A.75.75 0 019 4.5zM18 1.5a.75.75 0 01.728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 010 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 01-1.456 0l-.258-1.036a2.625 2.625 0 00-1.91-1.91l-1.036-.258a.75.75 0 010-1.456l1.036-.258a2.625 2.625 0 001.91-1.91l.258-1.036A.75.75 0 0118 1.5zM16.5 15a.75.75 0 01.712.513l.394 1.183c.15.447.5.799.948.948l1.183.395a.75.75 0 010 1.422l-1.183.395c-.447.15-.799.5-.948.948l-.395 1.183a.75.75 0 01-1.422 0l-.395-1.183a1.5 1.5 0 00-.948-.948l-1.183-.395a.75.75 0 010-1.422l1.183-.395c.447-.15.799-.5.948-.948l.395-1.183A.75.75 0 0116.5 15z" clipRule="evenodd" />
      </svg>
    ),
    color: 'from-red-500 to-orange-600'
  },
  {
    title: 'Reports & Analytics',
    description: 'Sales analytics, agent performance, and lead source effectiveness. Export to CSV or PDF, schedule weekly summaries, and finally answer "which source converts best?".',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
        <path fillRule="evenodd" d="M2.25 13.5a8.25 8.25 0 018.25-8.25.75.75 0 01.75.75v6.75H18a.75.75 0 01.75.75 8.25 8.25 0 01-16.5 0z" clipRule="evenodd" />
        <path fillRule="evenodd" d="M12.75 3a.75.75 0 01.75-.75 8.25 8.25 0 018.25 8.25.75.75 0 01-.75.75h-7.5a.75.75 0 01-.75-.75V3z" clipRule="evenodd" />
      </svg>
    ),
    color: 'from-amber-500 to-yellow-600'
  },
  {
    title: 'Multi-Tenant Support',
    description: 'Every real estate company gets its own isolated workspace with role-based access for owners, managers, and agents. Tenant-level branding, data export, and audit trails included.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
        <path fillRule="evenodd" d="M3 2.25a.75.75 0 000 1.5h.375a.75.75 0 01.75.75v6.75a3 3 0 003 3h6.75a.75.75 0 010 1.5h-1.5a.75.75 0 00-.75.75 2.25 2.25 0 002.25 2.25h6a.75.75 0 000-1.5h-2.625a.75.75 0 01-.75-.75v-1.5h.375A1.875 1.875 0 0019.5 13.5V8.25a3 3 0 00-3-3h-6.75a.75.75 0 010-1.5h1.5a.75.75 0 00.75-.75 2.25 2.25 0 00-2.25-2.25H3.75A.75.75 0 003 2.25z" clipRule="evenodd" />
      </svg>
    ),
    color: 'from-cyan-500 to-blue-600'
  }
]

export default function Features() {
  return (
    <section id="features" className="section relative">
      <div className="container-custom">
        <div className="max-w-3xl mx-auto text-center">
          <span className="inline-block px-4 py-1.5 rounded-full bg-brand-50 dark:bg-brand-950 text-sm font-medium text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
            Everything you need
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Built for the way <span className="gradient-text">real estate</span> sales actually work
          </h2>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
            Six powerful modules - one focused workflow. Every feature designed around the realities of property sales, not generic CRM patterns.
          </p>
        </div>

        <div className="mt-12 sm:mt-16 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, idx) => (
            <div
              key={f.title}
              className="card group hover:border-brand-300 dark:hover:border-brand-700 hover:shadow-soft hover:-translate-y-1"
              style={{ animationDelay: `${idx * 75}ms` }}
            >
              <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${f.color} text-white shadow-md mb-4 group-hover:scale-110 transition-transform duration-300`}>
                {f.icon}
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                {f.title}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {f.description}
              </p>
            </div>
          ))}
        </div>

        {/* Stats strip */}
        <div className="mt-16 sm:mt-20 grid grid-cols-2 lg:grid-cols-4 gap-8 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 dark:from-brand-700 dark:to-brand-950 p-8 sm:p-10 text-white">
          {[
            { value: '5×', label: 'Faster lead response' },
            { value: '40%', label: 'Higher conversion' },
            { value: '50K+', label: 'Leads per tenant' },
            { value: '99.9%', label: 'Uptime SLA' }
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-3xl sm:text-4xl font-extrabold">{s.value}</p>
              <p className="mt-1 text-sm sm:text-base text-brand-100">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
