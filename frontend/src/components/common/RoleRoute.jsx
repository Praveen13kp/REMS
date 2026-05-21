import { Navigate, Outlet } from "react-router-dom"

import { useAuthStore } from "@/stores/authStore"

// `redirectTo` lets the caller send denied users somewhere useful instead
// of the generic 403. Used for super admins hitting tenant routes: instead
// of a wall, bounce them to /admin where their actual workflow lives.
export default function RoleRoute({ allowedRoles = [], redirectTo }) {
  const user = useAuthStore((s) => s.user)

  if (!user || !allowedRoles.includes(user.role)) {
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

  return <Outlet />
}
