import { Navigate } from "react-router-dom"
import { useAuthStore } from "@/stores/authStore"

export default function RedirectIfAuthed({ children, to = "/dashboard" }) {
  const status = useAuthStore((s) => s.status)
  if (status === "loading" || status === "idle") {
    return null
  }
  if (status === "authenticated") {
    return <Navigate to={to} replace />
  }
  return children
}
