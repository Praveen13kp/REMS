import { Navigate } from 'react-router-dom'
import useAuthStore from '@/store/authStore'

function ProtectedRoutes({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  return children
}

export default ProtectedRoutes
