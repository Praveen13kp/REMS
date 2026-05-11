import { useEffect } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"

import AuthLayout from "@/layouts/AuthLayout"
import DashboardLayout from "@/layouts/DashboardLayout"
import ProtectedRoute from "@/components/common/ProtectedRoute"
import Login from "@/pages/auth/Login"
import Signup from "@/pages/auth/Signup"
import ForgotPassword from "@/pages/auth/ForgotPassword"
import Dashboard from "@/pages/admin/Dashboard"
import Leads from "@/pages/admin/Leads"
import Projects from "@/pages/admin/Projects"
import Team from "@/pages/admin/Team"
import UiCheck from "@/pages/UiCheck"
import { Toaster } from "@/components/ui/sonner"
import { useAuthStore } from "@/stores/authStore"

function App() {
  const fetchSession = useAuthStore((s) => s.fetchSession)

  useEffect(() => {
    fetchSession()
  }, [fetchSession])

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/leads" element={<Leads />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/team" element={<Team />} />
          </Route>
        </Route>

        {/* TEMP: smoke-test for shadcn primitives (S0-FE-A-03). Remove with S0-FE-A-02. */}
        <Route path="/__ui-check" element={<UiCheck />} />

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  )
}

export default App
