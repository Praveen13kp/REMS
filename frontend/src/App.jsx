import { useEffect } from "react"
import { Routes, Route, Navigate } from "react-router-dom"
import { ThemeProvider } from "next-themes"

import AuthLayout from "@/layouts/AuthLayout"
import DashboardLayout from "@/layouts/DashboardLayout"
import OnboardingLayout from "@/layouts/OnboardingLayout"
import PublicLayout from "@/layouts/PublicLayout"
import ProtectedRoute from "@/components/common/ProtectedRoute"
import RedirectIfAuthed from "@/components/common/RedirectIfAuthed"
import Login from "@/pages/auth/Login"
import Signup from "@/pages/auth/Signup"
import ForgotPassword from "@/pages/auth/ForgotPassword"
import Dashboard from "@/pages/admin/Dashboard"
import Leads from "@/pages/admin/Leads"
import LeadDetail from "@/pages/admin/LeadDetail"
import LeadEdit from "@/pages/admin/LeadEdit"
import AddLead from "@/pages/admin/AddLead"
import Assign from "@/pages/admin/Assign"
import FollowUps from "@/pages/admin/FollowUps"
import Reports from "@/pages/admin/Reports"
import Files from "@/pages/admin/Files"
import UsersMgmt from "@/pages/admin/UsersMgmt"
import Notifications from "@/pages/admin/Notifications"
import Settings from "@/pages/admin/Settings"
import Profile from "@/pages/admin/Profile"
import Projects from "@/pages/admin/Projects"
import SuperAdmin from "@/pages/superadmin/SuperAdmin"
import Orgs from "@/pages/superadmin/Orgs"
import RoleRoute from "@/components/common/RoleRoute"
import Welcome from "@/pages/onboarding/Welcome"
import Branding from "@/pages/onboarding/Branding"
import OnboardingTeam from "@/pages/onboarding/Team"
import OnboardingProjects from "@/pages/onboarding/Projects"
import OnboardingPipeline from "@/pages/onboarding/Pipeline"
import Landing from "@/pages/public/Landing"
import Pricing from "@/pages/public/Pricing"
import Features from "@/pages/public/Features"
import Contact from "@/pages/public/Contact"
import { Toaster } from "@/components/ui/sonner"
import { useAuthStore } from "@/stores/authStore"

function App() {
  const fetchSession = useAuthStore((s) => s.fetchSession)

  useEffect(() => {
    fetchSession()
  }, [fetchSession])

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route
            path="/"
            element={
              <RedirectIfAuthed>
                <Landing />
              </RedirectIfAuthed>
            }
          />
          <Route path="/features" element={<Features />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/contact" element={<Contact />} />
        </Route>

        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<OnboardingLayout />}>
            <Route path="/onboarding/welcome" element={<Welcome />} />
            <Route path="/onboarding/branding" element={<Branding />} />
            <Route path="/onboarding/team" element={<OnboardingTeam />} />
            <Route path="/onboarding/projects" element={<OnboardingProjects />} />
            <Route path="/onboarding/pipeline" element={<OnboardingPipeline />} />
          </Route>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />

            <Route path="/leads" element={<Leads />} />
            <Route path="/leads/new" element={<AddLead />} />
            <Route path="/leads/:id" element={<LeadDetail />} />
            <Route path="/leads/:id/edit" element={<LeadEdit />} />

            <Route path="/assign" element={<Assign />} />
            <Route path="/follow-ups" element={<FollowUps />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/files" element={<Files />} />

            <Route path="/users-mgmt" element={<UsersMgmt />} />
            <Route path="/team" element={<Navigate to="/users-mgmt" replace />} />

            <Route path="/notifications" element={<Notifications />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/profile" element={<Profile />} />

            <Route path="/projects" element={<Projects />} />

            <Route element={<RoleRoute allowedRoles={["SUPER_ADMIN"]} />}>
              <Route path="/admin" element={<SuperAdmin />} />
              <Route path="/admin/orgs" element={<Orgs />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </ThemeProvider>
  )
}

export default App
