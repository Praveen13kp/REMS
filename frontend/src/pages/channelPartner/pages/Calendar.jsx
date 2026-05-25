import { useOutletContext } from "react-router-dom"
import LeadsCalendar from "@/components/leads/LeadsCalendar"

// Calendar reuses the existing LeadsCalendar component (same one used
// in the Leads view's Calendar tab). The CP scope is enforced server-side.

export default function Calendar() {
  const ctx = useOutletContext()
  const filters = ctx?.activeCompanyId ? { companyId: ctx.activeCompanyId } : {}
  return (
    <>
      <div className="cp-page-head">
        <div>
          <h1>Calendar</h1>
          <p>Site visits, follow-ups, and callbacks across the selected company.</p>
        </div>
      </div>
      <div className="cp-card" style={{ padding: 0, overflow: "hidden" }}>
        <LeadsCalendar filters={filters} />
      </div>
    </>
  )
}
