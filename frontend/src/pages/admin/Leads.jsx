import { Users } from "lucide-react"
import PageHeader from "@/components/common/PageHeader"
import EmptyState from "@/components/common/EmptyState"

export default function Leads() {
  return (
    <>
      <PageHeader title="Leads" description="Manage your leads" />
      <EmptyState
        title="Leads"
        description="Lead list and management coming in Sprint 2."
        icon={Users}
      />
    </>
  )
}
