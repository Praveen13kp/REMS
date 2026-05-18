import { TrendingUp, TrendingDown } from 'lucide-react';

export default function KpiCard({ label, value, trend, dir = 'up', icon: Ic, color = 'amber' }) {
  return (
    <div className="kpi">
      <div className="kpi-head">
        <span className="l">{label}</span>
        <div className={`kpi-icon kpi-icon-${color}`}>{Ic && <Ic size={18} />}</div>
      </div>
      <div className="kpi-value">{value}</div>
      {trend && (
        <div className={`kpi-trend ${dir}`}>
          {dir === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {trend} vs last period
        </div>
      )}
    </div>
  );
}
