import { Outlet } from "react-router-dom"

import { useAuthStore } from "@/stores/authStore"

export default function RoleRoute({ allowedRoles = [] }) {
  const user = useAuthStore((s) => s.user)

  if (!user || !allowedRoles.includes(user.role)) {
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
