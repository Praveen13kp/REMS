import { Wallet, TrendingUp, Clock, CheckCircle } from "lucide-react"

// Placeholder shell. Backend financial model (Commission, Payout, rates,
// transactions) hasn't been built yet — once it lands, this page wires
// to GET /channel-partner/commission/summary.

export default function Commission() {
  return (
    <>
      <div className="cp-page-head">
        <div>
          <h1>Commission</h1>
          <p>Track earnings, pending payouts, and monthly reports.</p>
        </div>
      </div>

      <div className="cp-kpi-grid">
        <Kpi label="Total Earnings" value="₹0" icon={Wallet} />
        <Kpi label="Pending" value="₹0" icon={Clock} />
        <Kpi label="Paid" value="₹0" icon={CheckCircle} />
        <Kpi label="This month" value="₹0" icon={TrendingUp} />
      </div>

      <div className="cp-coming-soon">
        <Wallet size={32} style={{ opacity: 0.5 }} />
        <h2>Commission tracking — coming soon</h2>
        <p>
          The financial layer (commission rates per company, deal attribution,
          payout records, monthly reports) is on the roadmap. Once shipped,
          you'll see live earnings here and an export-to-CSV for accounting.
        </p>
      </div>
    </>
  )
}

function Kpi({ label, value, icon: Icon }) {
  return (
    <div className="cp-kpi">
      <div className="cp-kpi-icon"><Icon size={16} /></div>
      <div className="cp-kpi-label">{label}</div>
      <div className="cp-kpi-value">{value}</div>
    </div>
  )
}
