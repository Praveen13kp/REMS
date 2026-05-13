import { useNavigate } from 'react-router-dom';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler } from 'chart.js';
import { Users, UserPlus, CheckCircle, IndianRupee, Plus, Download, Flame, UserCheck, TrendingUp, CalendarClock } from 'lucide-react';
import { useApp, fmt, statusCls, priorityCls } from '../store.jsx';
import KpiCard from '../components/KpiCard.jsx';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler);

export default function Dashboard() {
  const { currentUser } = useApp();
  if (!currentUser) return null;
  if (currentUser.role === 'agent') return <AgentDashboard />;
  if (currentUser.role === 'manager') return <ManagerDashboard />;
  return <AdminDashboard />;
}

function chartOpts(theme, extra = {}) {
  const dark = theme === 'dark';
  const grid = dark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)';
  const text = dark ? '#A1A1AA' : '#52525B';
  return {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { grid: { color: grid }, ticks: { color: text, font: { size: 11 } } },
      y: { grid: { color: grid }, ticks: { color: text, font: { size: 11 } }, beginAtZero: true },
    },
    plugins: {
      legend: { labels: { color: text, font: { size: 11 } } },
      tooltip: { backgroundColor: dark ? '#1C1C24' : '#FFFFFF', titleColor: dark ? '#F8F8FA' : '#18181B', bodyColor: text, borderColor: dark ? '#26262F' : '#E4E4E7', borderWidth: 1 },
    },
    ...extra,
  };
}

function AdminDashboard() {
  const { currentUser, visibleLeads, theme, data } = useApp();
  const nav = useNavigate();
  const leads = visibleLeads();
  const total = leads.length;
  const newLeads = leads.filter((l) => l.status === 'New').length;
  const booked = leads.filter((l) => l.status === 'Booked').length;
  const revenue = leads.filter((l) => l.status === 'Booked').reduce((s, l) => s + l.budget, 0);

  const days = 30;
  const buckets = new Array(days).fill(0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  leads.forEach((l) => {
    const diff = Math.floor((today - new Date(l.createdAt).setHours(0, 0, 0, 0)) / 86400000);
    if (diff >= 0 && diff < days) buckets[days - 1 - diff]++;
  });
  const dayLabels = buckets.map((_, i) => { const d = new Date(today); d.setDate(d.getDate() - (days - 1 - i)); return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); });
  const accent = theme === 'dark' ? '#C4B5FD' : '#8B5CF6';
  const statuses = ['New', 'Contacted', 'Interested', 'Site Visit', 'Negotiation', 'Booked', 'Lost'];
  const statusCounts = statuses.map((s) => leads.filter((l) => l.status === s).length);
  const sources = data.sources;
  const sourceCounts = sources.map((s) => leads.filter((l) => l.source === s).length);
  const months = [], bookings = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    months.push(d.toLocaleDateString('en-IN', { month: 'short' }));
    bookings.push(leads.filter((l) => l.status === 'Booked' && new Date(l.updatedAt).getMonth() === d.getMonth()).length);
  }
  const recentLeads = leads.slice().sort((a, b) => b.createdAt - a.createdAt).slice(0, 6);
  const agents = data.users.filter((u) => u.role === 'agent');
  const ranked = agents.map((a) => {
    const ld = data.leads.filter((l) => l.assignedTo === a.id);
    const closed = ld.filter((l) => l.status === 'Booked');
    return { ...a, ldCount: ld.length, closedCount: closed.length, revenue: closed.reduce((s, l) => s + l.budget, 0) };
  }).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  return (
    <>
      <div className="content-head">
        <div>
          <h1>Welcome back, {currentUser.name.split(' ')[0]} 👋</h1>
          <p>Here's what's happening across your sales pipeline today.</p>
        </div>
        <div className="row">
          <button className="btn btn-secondary"><Download size={16} /> Export</button>
          <button className="btn btn-primary" onClick={() => nav('/app/leads/new')}><Plus size={16} /> Add Lead</button>
        </div>
      </div>

      <div className="kpi-grid">
        <KpiCard label="Total Leads" value={total} trend="+12.4%" dir="up" icon={Users} color="amber" />
        <KpiCard label="New This Week" value={newLeads} trend="+8.2%" dir="up" icon={UserPlus} color="blue" />
        <KpiCard label="Converted" value={booked} trend="+24.1%" dir="up" icon={CheckCircle} color="green" />
        <KpiCard label="Revenue" value={fmt.inr(revenue)} trend="+18.7%" dir="up" icon={IndianRupee} color="purple" />
      </div>

      <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 24 }}>
        <div className="card">
          <div className="card-title">Lead Activity (last 30 days)</div>
          <div className="chart-wrap">
            <Line data={{ labels: dayLabels, datasets: [{ label: 'New leads', data: buckets, borderColor: accent, backgroundColor: 'rgba(139,92,246,.12)', fill: true, tension: 0.35, pointRadius: 0, borderWidth: 2 }] }} options={chartOpts(theme, { plugins: { legend: { display: false } } })} />
          </div>
        </div>
        <div className="card">
          <div className="card-title">Lead Status Breakdown</div>
          <div className="chart-wrap">
            <Doughnut data={{ labels: statuses, datasets: [{ data: statusCounts, backgroundColor: ['#3B82F6', '#60A5FA', '#F59E0B', '#FBBF24', '#FB923C', '#10B981', '#EF4444'], borderWidth: 0 }] }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: theme === 'dark' ? '#A1A1AA' : '#52525B', font: { size: 11 }, boxWidth: 12 } } }, cutout: '62%' }} />
          </div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div className="card">
          <div className="card-title">Lead Sources</div>
          <div className="chart-wrap"><Bar data={{ labels: sources, datasets: [{ data: sourceCounts, backgroundColor: accent, borderRadius: 4 }] }} options={chartOpts(theme, { plugins: { legend: { display: false } }, indexAxis: 'y' })} /></div>
        </div>
        <div className="card">
          <div className="card-title">Monthly Bookings</div>
          <div className="chart-wrap"><Bar data={{ labels: months, datasets: [{ label: 'Bookings', data: bookings, backgroundColor: 'rgba(16,185,129,.7)', borderRadius: 6 }] }} options={chartOpts(theme, { plugins: { legend: { display: false } } })} /></div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
        <div className="card">
          <div className="card-title">
            Recent Leads
            <a onClick={() => nav('/app/leads')} style={{ color: 'var(--accent)', fontSize: 13, cursor: 'pointer' }}>View all →</a>
          </div>
          <RecentLeadsTable rows={recentLeads} />
        </div>
        <div className="card">
          <div className="card-title">Top Performing Agents</div>
          <div className="stack" style={{ gap: 14 }}>
            {ranked.map((a, i) => (
              <div key={a.id} className="row">
                <div style={{ width: 24, fontWeight: 700, color: 'var(--text-muted)' }}>{i + 1}</div>
                <div className="avatar">{a.avatar || fmt.initials(a.name)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{a.name}</div>
                  <div className="text-xs text-muted">{a.closedCount} bookings</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 14 }}>{fmt.inr(a.revenue)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function RecentLeadsTable({ rows }) {
  const { data } = useApp();
  const nav = useNavigate();
  if (!rows.length) return <p className="text-muted text-sm" style={{ padding: '20px 0' }}>No leads to show.</p>;
  return (
    <div className="table-scroll">
      <table className="data">
        <thead><tr><th>Customer</th><th>Project</th><th>Budget</th><th>Status</th><th>Agent</th></tr></thead>
        <tbody>
          {rows.map((l) => {
            const ag = data.users.find((u) => u.id === l.assignedTo);
            return (
              <tr key={l.id} style={{ cursor: 'pointer' }} onClick={() => nav(`/app/leads/${l.id}`)}>
                <td>
                  <div className="row">
                    <div className="avatar sm">{fmt.initials(l.name)}</div>
                    <div><div style={{ fontWeight: 600 }}>{l.name}</div><div className="text-xs text-muted">{l.phone}</div></div>
                  </div>
                </td>
                <td>{l.projectName}</td>
                <td>{fmt.inr(l.budget)}</td>
                <td><span className={`badge ${statusCls(l.status)}`}>{l.status}</span></td>
                <td>{ag ? (
                  <div className="row" style={{ gap: 6 }}>
                    <div className="avatar sm">{ag.avatar || fmt.initials(ag.name)}</div>
                    <span className="text-sm">{ag.name.split(' ')[0]}</span>
                  </div>
                ) : <span className="text-muted text-xs">Unassigned</span>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ManagerDashboard() {
  const { currentUser, visibleLeads, data, theme } = useApp();
  const nav = useNavigate();
  const leads = visibleLeads();
  const teamAgents = data.users.filter((x) => x.mgrId === currentUser.id);
  const pendingFu = leads.filter((l) => l.nextFollowUp && l.nextFollowUp < Date.now() + 86400000 && l.status !== 'Booked' && l.status !== 'Lost');
  const conversion = leads.length ? Math.round(leads.filter((l) => l.status === 'Booked').length / leads.length * 100) : 0;
  const labels = teamAgents.map((a) => a.name.split(' ')[0]);
  const closed = teamAgents.map((a) => leads.filter((l) => l.assignedTo === a.id && l.status === 'Booked').length);
  const totalArr = teamAgents.map((a) => leads.filter((l) => l.assignedTo === a.id).length);

  return (
    <>
      <div className="content-head">
        <div><h1>Team Dashboard</h1><p>Manage your team's leads and performance.</p></div>
        <button className="btn btn-primary" onClick={() => nav('/app/assign')}><UserCheck size={16} /> Assign Leads</button>
      </div>
      <div className="kpi-grid">
        <KpiCard label="Assigned Leads" value={leads.length} trend="+5.2%" dir="up" icon={Users} color="amber" />
        <KpiCard label="Pending Follow-Ups" value={pendingFu.length} trend="-12%" dir="down" icon={CalendarClock} color="red" />
        <KpiCard label="Conversion Rate" value={conversion + '%'} trend="+3.1%" dir="up" icon={TrendingUp} color="green" />
        <KpiCard label="Active Agents" value={teamAgents.filter((a) => a.active).length} trend="+1" dir="up" icon={UserCheck} color="blue" />
      </div>
      <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 24 }}>
        <div className="card">
          <div className="card-title">Team Performance</div>
          <div className="chart-wrap"><Bar data={{ labels, datasets: [{ label: 'Total Leads', data: totalArr, backgroundColor: 'rgba(139,92,246,.4)', borderRadius: 4 }, { label: 'Booked', data: closed, backgroundColor: '#10B981', borderRadius: 4 }] }} options={chartOpts(theme)} /></div>
        </div>
        <div className="card">
          <div className="card-title">Team Members</div>
          <div className="stack" style={{ gap: 10 }}>
            {teamAgents.map((a) => {
              const aLeads = leads.filter((l) => l.assignedTo === a.id);
              const c = aLeads.filter((l) => l.status === 'Booked').length;
              return (
                <div key={a.id} className="row">
                  <div className="avatar">{a.avatar || fmt.initials(a.name)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{a.name}</div>
                    <div className="text-xs text-muted">{aLeads.length} leads · {c} booked</div>
                  </div>
                  <span className="badge badge-success">{aLeads.length ? Math.round(c / aLeads.length * 100) : 0}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

function AgentDashboard() {
  const { currentUser, visibleLeads } = useApp();
  const nav = useNavigate();
  const myLeads = visibleLeads();
  const today = myLeads.filter((l) => l.nextFollowUp && new Date(l.nextFollowUp).toDateString() === new Date().toDateString());
  const hot = myLeads.filter((l) => l.priority === 'Hot').length;
  const closed = myLeads.filter((l) => l.status === 'Booked').length;
  return (
    <>
      <div className="content-head">
        <div><h1>Hi {currentUser.name.split(' ')[0]}, here are your leads.</h1><p>Stay on top of your follow-ups today.</p></div>
        <button className="btn btn-primary" onClick={() => nav('/app/leads/new')}><Plus size={16} /> Add Lead</button>
      </div>
      <div className="kpi-grid">
        <KpiCard label="My Leads" value={myLeads.length} icon={Users} color="amber" />
        <KpiCard label="Today's Follow-Ups" value={today.length} icon={CalendarClock} color="red" />
        <KpiCard label="Hot Leads" value={hot} icon={Flame} color="red" />
        <KpiCard label="Bookings" value={closed} icon={CheckCircle} color="green" />
      </div>
      <div className="card">
        <div className="card-title">Your Active Leads</div>
        <div className="lead-card-grid">
          {myLeads.slice(0, 8).map((l) => (
            <div key={l.id} className="lead-card" onClick={() => nav(`/app/leads/${l.id}`)}>
              <div className="lead-card-head">
                <div><div className="name">{l.name}</div><div className="phone">{l.phone}</div></div>
                <span className={`badge ${priorityCls(l.priority)}`}>{l.priority}</span>
              </div>
              <div className="project">{l.projectName}</div>
              <div className="text-sm" style={{ marginTop: 6, color: 'var(--accent)', fontWeight: 600 }}>{fmt.inr(l.budget)}</div>
              <div className="lead-card-foot">
                <span className={`badge ${statusCls(l.status)}`}>{l.status}</span>
                <span className="text-xs text-muted">{fmt.ago(l.updatedAt)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
