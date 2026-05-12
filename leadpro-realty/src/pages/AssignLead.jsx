import { Link } from 'react-router-dom'

const aiLeads = [
  { id: 1, name: 'Arjun Mehta', priority: 'HOT', score: 92, status: 'Interested', project: 'Skyline Towers', budget: '₹1.2 Cr', source: 'MagicBricks' },
  { id: 2, name: 'Rajiv Khanna', priority: 'HOT', score: 88, status: 'New', project: 'Crystal Bay', budget: '₹2.1 Cr', source: '99Acres' },
  { id: 3, name: 'Sneha Iyer', priority: 'WARM', score: 71, status: 'Site Visit', project: 'Green Valley', budget: '₹85 L', source: 'Walk-In' },
  { id: 4, name: 'Anil Joshi', priority: 'WARM', score: 65, status: 'Interested', project: 'Riverside Heights', budget: '₹1.5 Cr', source: 'Referral' },
  { id: 5, name: 'Pooja Verma', priority: 'COLD', score: 38, status: 'New', project: 'Urban Square', budget: '₹65 L', source: 'Facebook Ads' },
  { id: 6, name: 'Sara Khan', priority: 'COLD', score: 29, status: 'New', project: 'Skyline Towers', budget: '₹70 L', source: 'Walk-In' }
]

const agents = [
  { name: 'Rohan K.', load: 8, capacity: 12 },
  { name: 'Meera S.', load: 6, capacity: 10 },
  { name: 'Aditya P.', load: 9, capacity: 12 },
  { name: 'Kavya R.', load: 4, capacity: 10 }
]

const priorityColor = {
  HOT: { tag: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300', dot: 'bg-rose-500', ring: 'ring-rose-500/40' },
  WARM: { tag: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', dot: 'bg-amber-500', ring: 'ring-amber-500/40' },
  COLD: { tag: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300', dot: 'bg-sky-500', ring: 'ring-sky-500/40' }
}

export default function AssignLead() {
  return (
    <div className="space-y-6">
      <div>
        <Link to="/leads" className="text-sm text-brand-600 dark:text-brand-400 hover:underline">&larr; Back to Leads</Link>
        <h1 className="text-2xl sm:text-3xl font-bold font-display mt-2">Assign Leads to Agents</h1>
        <p className="text-sm text-ink-500 dark:text-ink-400 mt-1">AI-scored leads ranked Hot, Warm, and Cold. Assign your highest-scoring leads to top performers first.</p>
      </div>

      {/* AI feature banner */}
      <div className="rounded-2xl bg-grad-brand text-white p-6 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 h-48 w-48 rounded-full bg-white/15 blur-2xl" />
        <div className="absolute bottom-0 left-1/3 h-32 w-32 rounded-full bg-pink-300/30 blur-2xl" />
        <div className="relative grid sm:grid-cols-4 gap-4 items-center">
          <div className="sm:col-span-2">
            <span className="inline-flex items-center gap-2 bg-white/15 backdrop-blur px-3 py-1 rounded-full text-xs font-semibold mb-2">
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor"><path d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813A3.75 3.75 0 007.466 7.89l.813-2.846A.75.75 0 019 4.5z"/></svg>
              AI-Powered
            </span>
            <h3 className="text-lg sm:text-xl font-bold font-display">Smart Lead Scoring is on</h3>
            <p className="text-sm text-white/85 mt-1">We rank every lead Hot, Warm, or Cold based on budget fit, response speed, and engagement signals.</p>
          </div>
          {[
            { tag: 'HOT', count: 2 },
            { tag: 'WARM', count: 2 },
            { tag: 'COLD', count: 2 }
          ].map(s => (
            <div key={s.tag} className="bg-white/10 backdrop-blur border border-white/15 rounded-xl px-4 py-3 text-center">
              <p className="text-2xl font-extrabold">{s.count}</p>
              <p className="text-xs font-semibold mt-0.5">{s.tag} LEADS</p>
            </div>
          ))}
        </div>
      </div>

      {/* Agent capacity strip */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {agents.map(a => {
          const pct = Math.round((a.load/a.capacity)*100)
          return (
            <div key={a.name} className="card p-4">
              <div className="flex items-center gap-3 mb-3">
                <span className="h-10 w-10 rounded-full bg-grad-brand text-white flex items-center justify-center text-sm font-bold">{a.name.split(' ').map(s=>s[0]).join('')}</span>
                <div>
                  <p className="font-semibold text-sm">{a.name}</p>
                  <p className="text-xs text-ink-500">{a.load}/{a.capacity} active leads</p>
                </div>
              </div>
              <div className="h-2 rounded-full bg-ink-100 dark:bg-midnight-700 overflow-hidden">
                <div className={`h-full rounded-full ${pct > 80 ? 'bg-rose-500' : pct > 60 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          )
        })}
      </div>

      <div className="card">
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="text-left text-xs uppercase text-ink-500 dark:text-ink-400 border-b border-ink-200 dark:border-midnight-700">
                <th className="px-3 py-3 font-semibold">Lead Name</th>
                <th className="px-3 py-3 font-semibold">Priority</th>
                <th className="px-3 py-3 font-semibold">AI Score</th>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="px-3 py-3 font-semibold">Available Agents</th>
                <th className="px-3 py-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 dark:divide-midnight-700">
              {aiLeads.map(l => {
                const c = priorityColor[l.priority]
                return (
                  <tr key={l.id} className="hover:bg-ink-50 dark:hover:bg-midnight-800">
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <span className={`relative h-10 w-10 rounded-full bg-grad-brand text-white flex items-center justify-center text-xs font-bold ring-2 ${c.ring}`}>
                          {l.name.split(' ').map(s=>s[0]).join('')}
                          <span className={`absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full ${c.dot} ring-2 ring-white dark:ring-midnight-850`} />
                        </span>
                        <div>
                          <p className="font-medium">{l.name}</p>
                          <p className="text-xs text-ink-500">{l.project} &bull; {l.budget}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3"><span className={`badge ${c.tag}`}>{l.priority}</span></td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-ink-100 dark:bg-midnight-700 overflow-hidden">
                          <div className={`h-full ${c.dot} rounded-full`} style={{ width: `${l.score}%` }} />
                        </div>
                        <span className="font-semibold text-xs">{l.score}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-ink-500 dark:text-ink-400">{l.status}</td>
                    <td className="px-3 py-3">
                      <select className="input-field py-2 text-sm w-full max-w-[180px]">
                        {agents.map(a => <option key={a.name}>{a.name} ({a.capacity - a.load} slots)</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button className="btn-gradient py-2 px-4 text-sm">Assign</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
