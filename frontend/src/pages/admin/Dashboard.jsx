import { useAuthStore } from "@/stores/authStore"
import OwnerDashboard from "@/components/dashboards/OwnerDashboard"
import AgentDashboard from "@/components/dashboards/AgentDashboard"

// Role dispatcher. S4-FE-A-02 (manager) will plug in here.
export default function Dashboard() {
  const user = useAuthStore((s) => s.user)
  const role = user?.role

  if (role === "AGENT") return <AgentDashboard />
  if (role === "OWNER" || role === "ADMIN") return <OwnerDashboard />

  // MANAGER falls through to OwnerDashboard until S4-FE-A-02 ships.
  return <OwnerDashboard />
}
