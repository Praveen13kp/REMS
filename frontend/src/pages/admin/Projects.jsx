import { Building2 } from "lucide-react"
import PageHeader from "@/components/common/PageHeader"
import EmptyState from "@/components/common/EmptyState"

export default function Projects() {
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
