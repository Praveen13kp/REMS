import { TrendingUp, TrendingDown } from "lucide-react"

export default function KpiCard({
  label,
  value,
  trend,
  dir = "up",
  icon: Icon,
  color = "amber",
}) {
  return (
    <div className="kpi">
      <div className="kpi-head">
        <span className="l">{label}</span>
        <div className={`kpi-icon kpi-icon-${color}`}>
          {Icon && <Icon size={18} />}
        </div>
      </div>
      <div className="kpi-value">{value}</div>
      {trend && (
        <div className={`kpi-trend ${dir}`}>
          {dir === "up" ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {trend}
        </div>
      )}
    </div>
  )
}
