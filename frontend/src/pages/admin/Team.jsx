import { Briefcase } from 'lucide-react'
import PageHeader from '@/components/common/PageHeader'
import EmptyState from '@/components/common/EmptyState'

function TeamPage() {
  return (
    <>
      <PageHeader title="Team" description="Manage your team members" />
      <EmptyState
        title="Team"
        description="Team management coming in Sprint 4."
        icon={Briefcase}
      />
    </>
  )
}

export default TeamPage
