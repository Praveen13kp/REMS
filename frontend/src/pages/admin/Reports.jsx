import { useState } from "react"
import {
  Download,
  Settings2,
  CheckCircle,
  IndianRupee,
  TrendingUp,
  Percent,
} from "lucide-react"
import { toast } from "sonner"

import { fmt } from "@/lib/format"

// Visual port from leadpro-realty/src/pages/Reports.jsx.
// chart.js is NOT installed yet — all charts are stubbed placeholders.
// TODO: chart.js wiring pending — S4-FE-A-05.
// TODO: replace stub KPI numbers with /reports/* endpoints when backend lands.

const KPI_STUB = {
  bookings: 0,
  totalRevenue: 0,
  avgDealSize: 0,
  conversion: 0,
}

const ChartStub = ({ name }) => (
  <div className="chart-wrap">
    <div
      style={{
        display: "grid",
        placeItems: "center",
        color: "var(--lp-text-muted)",
        minHeight: 220,
        fontSize: 13,
        textAlign: "center",
        padding: 16,
      }}
    >
      {name} (chart.js wiring pending)
    </div>
  </div>
)

const ChartStubTall = ({ name }) => (
  <div className="chart-wrap tall">
    <div
      style={{
        display: "grid",
        placeItems: "center",
        color: "var(--lp-text-muted)",
        minHeight: 280,
        fontSize: 13,
        textAlign: "center",
        padding: 16,
      }}
    >
      {name} (chart.js wiring pending)
    </div>
  </div>
)

const KpiCard = ({ label, value, trend, icon: Icon, color }) => (
  <div className="kpi-card">
    <div className={`kpi-icon kpi-icon-${color}`}>
      <Icon size={20} />
    </div>
    <div className="kpi-body">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {trend ? <div className="kpi-trend">{trend}</div> : null}
    </div>
  </div>
)

export default function Reports() {
  const [tab, setTab] = useState(0)

  const kpi = KPI_STUB

  return (
    <>
      <div className="content-head">
        <div>
          <h1>Reports &amp; Analytics</h1>
          <p>Insights into sales performance and lead behaviour.</p>
        </div>
        <div className="row">
          <select className="select" style={{ width: "auto" }} defaultValue="30">
            <option value="30">Last 30 days</option>
            <option value="7">Last 7 days</option>
            <option value="q">This Quarter</option>
            <option value="y">This Year</option>
          </select>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => toast.info("Export lands with S4-FE-A-05")}
          >
            <Download size={16} /> Export
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => toast.info("Report builder lands with S4-FE-A-05")}
          >
            <Settings2 size={16} /> Build Report
          </button>
        </div>
      </div>

      <div className="tabs">
        {["Sales Analytics", "Agent Performance", "Lead Analytics"].map((t, i) => (
          <button
            key={t}
            type="button"
            className={`tab ${tab === i ? "active" : ""}`}
            onClick={() => setTab(i)}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 0 && (
        <>
          <div className="kpi-grid">
            <KpiCard label="Bookings" value={kpi.bookings} trend="—" icon={CheckCircle} color="green" />
            <KpiCard
              label="Revenue"
              value={fmt.inr(kpi.totalRevenue)}
              trend="—"
              icon={IndianRupee}
              color="amber"
            />
            <KpiCard
              label="Avg Deal Size"
              value={fmt.inr(kpi.avgDealSize)}
              trend="—"
              icon={TrendingUp}
              color="blue"
            />
            <KpiCard
              label="Conversion Rate"
              value={kpi.conversion + "%"}
              trend="—"
              icon={Percent}
              color="purple"
            />
          </div>
          <div
            className="grid"
            style={{ gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 24 }}
          >
            <div className="card">
              <div className="card-title">Revenue Trend</div>
              <ChartStubTall name="Revenue Trend" />
            </div>
            <div className="card">
              <div className="card-title">Funnel</div>
              <ChartStubTall name="Funnel" />
            </div>
          </div>
          <div className="card">
            <div className="card-title">Conversion by Project</div>
            <ChartStub name="Conversion by Project" />
          </div>
        </>
      )}

      {tab === 1 && (
        <>
          <div className="card mb-4">
            <div className="card-title">Calls vs Bookings (per agent)</div>
            <ChartStub name="Calls vs Bookings" />
          </div>
          <div className="card">
            <div className="card-title">Detailed Performance</div>
            <div className="table-scroll">
              <table className="data">
                <thead>
                  <tr>
                    <th>Agent</th>
                    <th>Total</th>
                    <th>Active</th>
                    <th>Booked</th>
                    <th>Conv. Rate</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={6}>
                      <div
                        style={{
                          padding: "20px 12px",
                          textAlign: "center",
                          color: "var(--lp-text-muted)",
                          fontSize: 13,
                        }}
                      >
                        Agent performance data pending — S4-FE-A-05.
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 2 && (
        <div className="grid grid-2" style={{ gap: 16 }}>
          <div className="card">
            <div className="card-title">Leads by Source</div>
            <ChartStub name="Leads by Source" />
          </div>
          <div className="card">
            <div className="card-title">Leads by City</div>
            <ChartStub name="Leads by City" />
          </div>
        </div>
      )}
    </>
  )
}
