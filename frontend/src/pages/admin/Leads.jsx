import { Users } from 'lucide-react'
import PageHeader from '@/components/common/PageHeader'
import EmptyState from '@/components/common/EmptyState'

function LeadsPage() {
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

export default LeadsPage
export default function Leads() {
  return <div className="p-6"><h1 className="text-2xl font-semibold">Leads</h1></div>
}
