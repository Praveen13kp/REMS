import { useAuthStore } from "@/stores/authStore"
import OwnerDashboard from "@/components/dashboards/OwnerDashboard"

// Role dispatcher. S4-FE-A-02 (manager) and S4-FE-A-03 (agent) will plug in here.
export default function Dashboard() {
  const user = useAuthStore((s) => s.user)
  const role = user?.role

  if (role === "OWNER" || role === "ADMIN") return <OwnerDashboard />

  // Until S4-FE-A-02 / S4-FE-A-03 land, MANAGER and AGENT see the owner view
  // (gated by the BE) — they'll get 403 and see the retry. Replace below as
  // those tasks ship.
  return <OwnerDashboard />
}
