import { Navigate } from "react-router-dom"
import { useAuthStore } from "@/stores/authStore"
import OwnerDashboard from "@/components/dashboards/OwnerDashboard"
import AgentDashboard from "@/components/dashboards/AgentDashboard"
import ManagerDashboard from "@/components/dashboards/ManagerDashboard"

// Role dispatcher.
export default function Dashboard() {
  const user = useAuthStore((s) => s.user)
  const role = user?.role

  if (role === "SUPER_ADMIN") return <Navigate to="/admin" replace />
  if (role === "AGENT") return <AgentDashboard />
  if (role === "MANAGER") return <ManagerDashboard />
  return <OwnerDashboard />
}
