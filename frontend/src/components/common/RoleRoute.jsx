import { Navigate, Outlet, useLocation } from "react-router-dom"

import { useAuthStore } from "@/stores/authStore"
import { useModuleAccess } from "@/hooks/useModuleAccess"

export default function RoleRoute({ allowedRoles = [], redirectTo, module: moduleKey }) {
  const user = useAuthStore((s) => s.user)
  const location = useLocation()
  const moduleAccess = useModuleAccess()

  if (!user) {
    return <Navigate to={`/login?from=${encodeURIComponent(location.pathname + location.search)}`} replace />
  }

  if (!allowedRoles.includes(user.role)) {
    if (redirectTo) {
      return <Navigate to={redirectTo} replace />
    }
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-2 px-4 text-center">
        <p className="text-2xl font-semibold">403</p>
        <p className="text-sm text-muted-foreground">
          You don&apos;t have permission to view this page.
        </p>
      </div>
    )
  }

  if (moduleKey && !moduleAccess(moduleKey)) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-2 px-4 text-center">
        <p className="text-2xl font-semibold">Access Restricted</p>
        <p className="text-sm text-muted-foreground">
          This module has been restricted for your role.
        </p>
      </div>
    )
  }

  return <Outlet />
}
