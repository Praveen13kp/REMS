const today = [
  { name: 'Arjun Mehta', last: 'Yesterday', next: 'Today, 4:00 PM', status: 'Pending', tag: 'HOT', tagColor: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300', ai: 'Strong intent — call before 5 PM today.' },
  { name: 'Sneha Iyer', last: '2 days ago', next: 'Today, 6:30 PM', status: 'Pending', tag: 'WARM', tagColor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', ai: 'Send project brochure first.' },
  { name: 'Rajiv Khanna', last: '3 days ago', next: 'Today, 7:00 PM', status: 'Pending', tag: 'HOT', tagColor: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300', ai: 'Mentioned competitor — offer site visit incentive.' }
]

const missed = [
  { name: 'Pooja Verma', last: 'Last Friday', next: '3 days overdue', status: 'Missed', tag: 'WARM', tagColor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', ai: 'High chance of losing lead — reach out now.' },
  { name: 'Anil Joshi', last: 'Last Wednesday', next: '5 days overdue', status: 'Missed', tag: 'COLD', tagColor: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300', ai: 'Try a low-pressure WhatsApp ping.' }
]

const upcoming = [
  { name: 'Nikhil Rao', last: 'Today', next: 'Tomorrow, 11:00 AM', status: 'Scheduled', tag: 'HOT', tagColor: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300', ai: 'Site visit confirmed — share location.' },
  { name: 'Sara Khan', last: 'Today', next: 'May 9, 3:00 PM', status: 'Scheduled', tag: 'WARM', tagColor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', ai: 'Discuss home loan options.' }
]

function FollowUpTable({ rows, kind }) {
  const tone = kind === 'missed' ? 'border-rose-300 dark:border-rose-700' : kind === 'today' ? 'border-emerald-300 dark:border-emerald-700' : 'border-brand-300 dark:border-brand-700'
  return (
    <div className={`card border-l-4 ${tone}`}>
      <div className="overflow-x-auto -mx-6 px-6">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="text-left text-xs uppercase text-ink-500 dark:text-ink-400 border-b border-ink-200 dark:border-midnight-700">
              <th className="px-2 py-3 font-semibold">Customer Name</th>
              <th className="px-2 py-3 font-semibold">Last Contact</th>
              <th className="px-2 py-3 font-semibold">Next Follow-Up</th>
              <th className="px-2 py-3 font-semibold">Status</th>
              <th className="px-2 py-3 font-semibold">AI Suggestion</th>
              <th className="px-2 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100 dark:divide-midnight-700">
            {rows.map(r => (
              <tr key={r.name} className="hover:bg-ink-50 dark:hover:bg-midnight-800">
                <td className="px-2 py-3">
                  <div className="flex items-center gap-3">
                    <span className="h-9 w-9 rounded-full bg-grad-brand text-white flex items-center justify-center text-xs font-bold">{r.name.split(' ').map(s=>s[0]).join('')}</span>
                    <div>
                      <p className="font-medium">{r.name}</p>
                      <span className={`badge mt-1 ${r.tagColor}`}>{r.tag}</span>
                    </div>
                  </div>
                </td>
                <td className="px-2 py-3 text-ink-500 dark:text-ink-400">{r.last}</td>
                <td className="px-2 py-3 font-medium">{r.next}</td>
                <td className="px-2 py-3"><span className={`badge ${r.status === 'Missed' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' : r.status === 'Pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'}`}>{r.status}</span></td>
                <td className="px-2 py-3 max-w-xs">
                  <div className="flex items-start gap-2 text-xs text-ink-600 dark:text-ink-300">
                    <span className="flex-shrink-0 h-5 w-5 rounded bg-grad-brand text-white flex items-center justify-center text-[9px] font-bold">AI</span>
                    {r.ai}
                  </div>
                </td>
                <td className="px-2 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <button className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-midnight-700" title="Call"><svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg></button>
                    <button className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-midnight-700" title="Message"><svg className="h-4 w-4 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg></button>
                    <button className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-midnight-700" title="Reschedule"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function FollowUp() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display">Follow-Up Tracker</h1>
          <p className="text-sm text-ink-500 dark:text-ink-400 mt-1">Today's, missed, and upcoming follow-ups with AI-powered suggestions.</p>
        </div>
        <button className="btn-gradient py-2.5 text-sm whitespace-nowrap">+ Schedule Follow-Up</button>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="card p-5 border-l-4 border-emerald-500">
          <p className="text-sm text-ink-500 dark:text-ink-400">Today's Follow-Ups</p>
          <p className="mt-2 text-3xl font-bold text-emerald-600 dark:text-emerald-400">{today.length}</p>
          <p className="mt-1 text-xs text-ink-500">All scheduled for today</p>
        </div>
        <div className="card p-5 border-l-4 border-rose-500">
          <p className="text-sm text-ink-500 dark:text-ink-400">Missed Follow-Ups</p>
          <p className="mt-2 text-3xl font-bold text-rose-600 dark:text-rose-400">{missed.length}</p>
          <p className="mt-1 text-xs text-ink-500">Action needed today</p>
        </div>
        <div className="card p-5 border-l-4 border-brand-500">
          <p className="text-sm text-ink-500 dark:text-ink-400">Upcoming Calls</p>
          <p className="mt-2 text-3xl font-bold text-brand-600 dark:text-brand-400">{upcoming.length}</p>
          <p className="mt-1 text-xs text-ink-500">In the next 7 days</p>
        </div>
      </div>

      {/* AI banner */}
      <div className="rounded-2xl bg-grad-brand text-white p-5 sm:p-6 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 h-48 w-48 rounded-full bg-white/15 blur-2xl" />
        <div className="relative flex items-start gap-4">
          <div className="hidden sm:flex h-12 w-12 rounded-2xl bg-white/15 backdrop-blur items-center justify-center flex-shrink-0">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813A3.75 3.75 0 007.466 7.89l.813-2.846A.75.75 0 019 4.5z"/></svg>
          </div>
          <div>
            <h3 className="font-bold font-display">Smart Follow-Up Suggestions</h3>
            <p className="text-sm text-white/85 mt-1">Our AI flags high-risk leads and tells you exactly when and how to reach out — based on engagement patterns and conversion likelihood.</p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold font-display mb-3">Today's Follow-Ups</h2>
        <FollowUpTable rows={today} kind="today" />
      </div>

      <div>
        <h2 className="text-xl font-bold font-display mb-3 flex items-center gap-2">Missed Follow-Ups <span className="badge bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">{missed.length} action needed</span></h2>
        <FollowUpTable rows={missed} kind="missed" />
      </div>

      <div>
        <h2 className="text-xl font-bold font-display mb-3">Upcoming Calls</h2>
        <FollowUpTable rows={upcoming} kind="upcoming" />
      </div>
    </div>
  )
}
