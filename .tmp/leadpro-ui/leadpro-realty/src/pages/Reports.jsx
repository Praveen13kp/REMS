import { useState } from 'react';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler } from 'chart.js';
import { Download, Settings2, CheckCircle, IndianRupee, TrendingUp, Percent } from 'lucide-react';
import { useApp, fmt } from '../store.jsx';
import KpiCard from '../components/KpiCard.jsx';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler);

function chartOpts(theme, extra = {}) {
  const dark = theme === 'dark';
  return {
    responsive: true, maintainAspectRatio: false,
    scales: { x: { grid: { color: dark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)' }, ticks: { color: dark ? '#A1A1AA' : '#52525B', font: { size: 11 } } }, y: { grid: { color: dark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)' }, ticks: { color: dark ? '#A1A1AA' : '#52525B', font: { size: 11 } }, beginAtZero: true } },
    plugins: { legend: { labels: { color: dark ? '#A1A1AA' : '#52525B', font: { size: 11 } } } },
    ...extra,
  };
}

export default function Reports() {
  const { visibleLeads, data, theme } = useApp();
  const [tab, setTab] = useState(0);
  const leads = visibleLeads();
  const accent = theme === 'dark' ? '#C4B5FD' : '#8B5CF6';

  const months = [], revenue = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    months.push(d.toLocaleDateString('en-IN', { month: 'short' }));
    revenue.push(leads.filter((l) => l.status === 'Booked' && new Date(l.updatedAt).getMonth() === d.getMonth()).reduce((s, l) => s + l.budget, 0) / 100000);
  }
  const stages = ['New', 'Contacted', 'Interested', 'Site Visit', 'Negotiation', 'Booked'];
  const counts = stages.map((s) => leads.filter((l) => stages.indexOf(l.status) >= stages.indexOf(s)).length);
  const projs = data.projects.map((p) => p.name);
  const projConv = data.projects.map((p) => leads.filter((l) => l.projectId === p.id && l.status === 'Booked').length);
  const agents = data.users.filter((u) => u.role === 'agent');
  const aLabels = agents.map((a) => a.name.split(' ')[0]);
  const calls = agents.map((a) => data.leads.filter((l) => l.assignedTo === a.id).length * 2);
  const books = agents.map((a) => data.leads.filter((l) => l.assignedTo === a.id && l.status === 'Booked').length);
  const sources = data.sources;
  const sCounts = sources.map((s) => leads.filter((l) => l.source === s).length);
  const cities = ['Mumbai', 'Pune', 'Bengaluru', 'Hyderabad', 'Chennai', 'Delhi', 'Gurugram'];
  const cCounts = cities.map((c) => leads.filter((l) => l.city === c).length);

  const booked = leads.filter((l) => l.status === 'Booked');
  const totalRev = booked.reduce((s, l) => s + l.budget, 0);
  const avg = booked.length ? Math.round(totalRev / booked.length) : 0;
  const conv = leads.length ? Math.round(booked.length / leads.length * 100) : 0;

  return (
    <>
      <div className="content-head">
        <div><h1>Reports & Analytics</h1><p>Insights into sales performance and lead behaviour.</p></div>
        <div className="row">
          <select className="select" style={{ width: 'auto' }}><option>Last 30 days</option><option>Last 7 days</option><option>This Quarter</option><option>This Year</option></select>
          <button className="btn btn-secondary"><Download size={16} /> Export</button>
          <button className="btn btn-primary"><Settings2 size={16} /> Build Report</button>
        </div>
      </div>
      <div className="tabs">
        {['Sales Analytics', 'Agent Performance', 'Lead Analytics'].map((t, i) => (
          <button key={t} className={`tab ${tab === i ? 'active' : ''}`} onClick={() => setTab(i)}>{t}</button>
        ))}
      </div>

      {tab === 0 && (
        <>
          <div className="kpi-grid">
            <KpiCard label="Bookings" value={booked.length} trend="+24%" icon={CheckCircle} color="green" />
            <KpiCard label="Revenue" value={fmt.inr(totalRev)} trend="+18.7%" icon={IndianRupee} color="amber" />
            <KpiCard label="Avg Deal Size" value={fmt.inr(avg)} trend="+5.2%" icon={TrendingUp} color="blue" />
            <KpiCard label="Conversion Rate" value={conv + '%'} trend="+3.1%" icon={Percent} color="purple" />
          </div>
          <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 24 }}>
            <div className="card"><div className="card-title">Revenue Trend</div><div className="chart-wrap tall"><Line data={{ labels: months, datasets: [{ label: 'Revenue (₹ lakhs)', data: revenue, borderColor: accent, backgroundColor: 'rgba(139,92,246,.12)', fill: true, tension: 0.35, borderWidth: 2, pointRadius: 3 }] }} options={chartOpts(theme)} /></div></div>
            <div className="card"><div className="card-title">Funnel</div><div className="chart-wrap tall"><Bar data={{ labels: stages, datasets: [{ data: counts, backgroundColor: ['#3B82F6', '#60A5FA', '#F59E0B', '#FBBF24', '#FB923C', '#10B981'], borderRadius: 4 }] }} options={chartOpts(theme, { plugins: { legend: { display: false } }, indexAxis: 'y' })} /></div></div>
          </div>
          <div className="card"><div className="card-title">Conversion by Project</div><div className="chart-wrap"><Bar data={{ labels: projs, datasets: [{ label: 'Bookings', data: projConv, backgroundColor: accent, borderRadius: 4 }] }} options={chartOpts(theme)} /></div></div>
        </>
      )}
      {tab === 1 && (
        <>
          <div className="card mb-4"><div className="card-title">Calls vs Bookings (per agent)</div><div className="chart-wrap"><Bar data={{ labels: aLabels, datasets: [{ label: 'Calls', data: calls, backgroundColor: 'rgba(59,130,246,.5)', borderRadius: 4 }, { label: 'Bookings', data: books, backgroundColor: '#10B981', borderRadius: 4 }] }} options={chartOpts(theme)} /></div></div>
          <div className="card">
            <div className="card-title">Detailed Performance</div>
            <div className="table-scroll">
              <table className="data">
                <thead><tr><th>Agent</th><th>Total</th><th>Active</th><th>Booked</th><th>Conv. Rate</th><th>Revenue</th></tr></thead>
                <tbody>
                  {agents.map((a) => {
                    const ld = data.leads.filter((l) => l.assignedTo === a.id);
                    const closed = ld.filter((l) => l.status === 'Booked');
                    const c = ld.length ? Math.round(closed.length / ld.length * 100) : 0;
                    return (
                      <tr key={a.id}>
                        <td><div className="row"><div className="avatar sm">{a.avatar || fmt.initials(a.name)}</div><span style={{ fontWeight: 600 }}>{a.name}</span></div></td>
                        <td>{ld.length}</td>
                        <td>{ld.filter((l) => l.status !== 'Booked' && l.status !== 'Lost').length}</td>
                        <td>{closed.length}</td>
                        <td><span className={`badge ${c > 30 ? 'badge-success' : c > 15 ? 'badge-warning' : 'badge-error'}`}>{c}%</span></td>
                        <td>{fmt.inr(closed.reduce((s, l) => s + l.budget, 0))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      {tab === 2 && (
        <div className="grid grid-2" style={{ gap: 16 }}>
          <div className="card"><div className="card-title">Leads by Source</div><div className="chart-wrap"><Doughnut data={{ labels: sources, datasets: [{ data: sCounts, backgroundColor: ['#F59E0B', '#3B82F6', '#10B981', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'], borderWidth: 0 }] }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: theme === 'dark' ? '#A1A1AA' : '#52525B', font: { size: 11 }, boxWidth: 12 } } }, cutout: '62%' }} /></div></div>
          <div className="card"><div className="card-title">Leads by City</div><div className="chart-wrap"><Bar data={{ labels: cities, datasets: [{ data: cCounts, backgroundColor: '#8B5CF6', borderRadius: 4 }] }} options={chartOpts(theme, { plugins: { legend: { display: false } } })} /></div></div>
        </div>
      )}
    </>
  );
}
