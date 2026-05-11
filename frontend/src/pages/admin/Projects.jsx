import { Building2 } from 'lucide-react'
import PageHeader from '@/components/common/PageHeader'
import EmptyState from '@/components/common/EmptyState'

function ProjectsPage() {
  return (
    <>
      <PageHeader title="Projects" description="Manage your real estate projects" />
      <EmptyState
        title="Projects"
        description="Project management coming in Sprint 3."
        icon={Building2}
      />
    </>
  )
}

export default ProjectsPage
export default function Projects() {
  return <div className="p-6"><h1 className="text-2xl font-semibold">Projects</h1></div>
}
