import { Link } from 'react-router-dom'

export default function Hero() {
  return (
    <section id="home" className="relative pt-28 sm:pt-32 lg:pt-40 pb-16 sm:pb-20 lg:pb-28 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-grid opacity-50 pointer-events-none" />
      <div className="absolute -top-32 -right-20 h-80 w-80 rounded-full bg-brand-300/30 dark:bg-brand-700/30 blur-3xl pointer-events-none" />
      <div className="absolute top-40 -left-20 h-72 w-72 rounded-full bg-purple-300/30 dark:bg-purple-800/20 blur-3xl pointer-events-none" />

      <div className="container-custom relative">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left content */}
          <div className="text-center lg:text-left animate-fade-in-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-950 px-4 py-1.5 text-sm font-medium text-brand-700 dark:text-brand-300">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" />
              </span>
              Multi-tenant SaaS CRM for Real Estate
            </span>

            <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Manage Leads. Close Deals. <span className="gradient-text">Grow</span> Your Real Estate Business.
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-slate-600 dark:text-slate-400 max-w-xl mx-auto lg:mx-0">
              A smart lead management platform for brokers, builders, and real estate sales teams. Capture, score, assign, and convert &mdash; all in one workspace.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <Link to="/signup" className="btn-gradient text-base">
                Get Started
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 ml-2">
                  <path fillRule="evenodd" d="M12.97 3.97a.75.75 0 011.06 0l7.5 7.5a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 11-1.06-1.06l6.22-6.22H3a.75.75 0 010-1.5h16.19l-6.22-6.22a.75.75 0 010-1.06z" clipRule="evenodd" />
                </svg>
              </Link>
              <a href="#features" className="btn-secondary text-base">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 mr-2">
                  <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                </svg>
                Watch Demo
              </a>
            </div>

            {/* Bullet points */}
            <ul className="mt-8 grid sm:grid-cols-2 gap-3 text-sm text-slate-700 dark:text-slate-300 max-w-md mx-auto lg:mx-0">
              {[
                'Easy Lead Tracking',
                'Smart Assignment',
                'Role-Based Access',
                'AI Lead Scoring'
              ].map((b) => (
                <li key={b} className="flex items-center gap-2 justify-center lg:justify-start">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-emerald-500 flex-shrink-0">
                    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                  </svg>
                  {b}
                </li>
              ))}
            </ul>
          </div>

          {/* Right - Dashboard preview */}
          <div className="relative animate-fade-in-up" style={{ animationDelay: '150ms' }}>
            <div className="relative mx-auto max-w-lg lg:max-w-none">
              {/* Floating cards behind */}
              <div className="absolute -top-6 -left-4 sm:-left-8 z-0 animate-float">
                <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-soft p-3 sm:p-4 w-44 sm:w-52">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">HOT LEAD</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Priya Sharma</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Budget: ₹1.2 Cr · Skyline Towers</p>
                </div>
              </div>
              <div className="absolute -bottom-6 -right-4 sm:-right-8 z-0 animate-float" style={{ animationDelay: '1.5s' }}>
                <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-soft p-3 sm:p-4 w-48 sm:w-56">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="h-4 w-4 text-emerald-500" viewBox="0 0 20 20" fill="currentColor"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" /></svg>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">FOLLOW-UP DONE</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Site visit booked</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Tomorrow · 11:00 AM</p>
                </div>
              </div>

              {/* Main dashboard mock */}
              <div className="relative z-10 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
                {/* Browser chrome */}
                <div className="flex items-center gap-1.5 px-4 py-3 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                  <span className="h-3 w-3 rounded-full bg-red-400" />
                  <span className="h-3 w-3 rounded-full bg-yellow-400" />
                  <span className="h-3 w-3 rounded-full bg-green-400" />
                  <div className="ml-3 flex-1 text-xs text-slate-500 dark:text-slate-400 truncate">app.leadproreallty.io/dashboard</div>
                </div>

                {/* Dashboard content */}
                <div className="p-4 sm:p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Welcome back</p>
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Sales Dashboard</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-8 w-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-xs font-bold">RK</span>
                    </div>
                  </div>

                  {/* KPI cards */}
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {[
                      { label: 'New Leads', value: '247', color: 'bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-300' },
                      { label: 'Hot Leads', value: '38', color: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300' },
                      { label: 'Booked', value: '12', color: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300' }
                    ].map((k) => (
                      <div key={k.label} className={`rounded-lg p-2 sm:p-3 ${k.color}`}>
                        <p className="text-[10px] sm:text-xs font-medium opacity-80">{k.label}</p>
                        <p className="text-base sm:text-xl font-bold">{k.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Mini chart */}
                  <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3 sm:p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Bookings - Last 7 days</p>
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">+24%</span>
                    </div>
                    <div className="flex items-end gap-1 sm:gap-1.5 h-16 sm:h-20">
                      {[40, 65, 50, 80, 60, 95, 75].map((h, i) => (
                        <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-brand-600 to-brand-400" style={{ height: `${h}%` }} />
                      ))}
                    </div>
                  </div>

                  {/* Recent leads list */}
                  <div className="space-y-2">
                    {[
                      { name: 'Arjun Mehta', tag: 'HOT', tagColor: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', source: 'MagicBricks' },
                      { name: 'Sneha Iyer', tag: 'WARM', tagColor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', source: 'Walk-In' }
                    ].map((l) => (
                      <div key={l.name} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-semibold">
                            {l.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-900 dark:text-white">{l.name}</p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">{l.source}</p>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${l.tagColor}`}>{l.tag}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
