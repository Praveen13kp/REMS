import { Construction } from 'lucide-react'

function EmptyState({ title = 'Coming Soon', description, icon: Icon }) {
  const DisplayIcon = Icon ?? Construction
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
      <DisplayIcon className="mb-4 size-12 text-muted-foreground/50" />
      <h3 className="mb-1 text-lg font-medium text-foreground">{title}</h3>
      <p className="max-w-sm text-center text-sm text-muted-foreground">
        {description ?? 'Being built in a future sprint.'}
      </p>
    </div>
  )
}

export default EmptyState
