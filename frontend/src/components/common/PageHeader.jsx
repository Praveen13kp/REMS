function PageHeader({ title, description, actions }) {
  return (
    <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="mt-2 flex items-center gap-2 sm:mt-0">{actions}</div>}
    </div>
  )
}

export default PageHeader
