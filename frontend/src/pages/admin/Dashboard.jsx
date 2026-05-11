import { LayoutDashboard } from "lucide-react"
import PageHeader from "@/components/common/PageHeader"
import EmptyState from "@/components/common/EmptyState"

export default function Dashboard() {
  return (
    <>
      <PageHeader title="Dashboard" description="Overview of your real estate business" />
      <EmptyState
        title="Dashboard"
        description="Analytics and KPIs coming in Sprint 1."
        icon={LayoutDashboard}
      />
    </>
  )
}
