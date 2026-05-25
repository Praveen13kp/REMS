import { useOutletContext } from "react-router-dom"
import KanbanBoard from "@/components/leads/KanbanBoard"

// Drag-drop Kanban using the existing board component. CP scope is enforced
// server-side (pipeline.service.js — getBoardService scopes by role).
// Status updates fire LEAD_STATUS_CHANGED notifications via the lead service.

export default function Kanban() {
  const ctx = useOutletContext()
  const filters = ctx?.activeCompanyId ? { companyId: ctx.activeCompanyId } : {}
  return (
    <>
      <div className="cp-page-head">
        <div>
          <h1>Pipeline</h1>
          <p>Drag leads through your pipeline. Status changes notify the company in real time.</p>
        </div>
      </div>
      <KanbanBoard filters={filters} />
    </>
  )
}
