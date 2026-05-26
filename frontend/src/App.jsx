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
import ResetPassword from "@/pages/auth/ResetPassword"
import AcceptInvite from "@/pages/auth/AcceptInvite"
import SignupWelcome from "@/pages/auth/SignupWelcome"
import ChoosePlan from "@/pages/auth/ChoosePlan"
import Dashboard from "@/pages/admin/Dashboard"
import Leads from "@/pages/admin/Leads"
import LeadDetail from "@/pages/admin/LeadDetail"
import LeadEdit from "@/pages/admin/LeadEdit"
import AddLead from "@/pages/admin/AddLead"
import Assign from "@/pages/admin/Assign"
import FollowUps from "@/pages/admin/FollowUps"
import Reports from "@/pages/admin/Reports"
import Files from "@/pages/admin/Files"
import Tasks from "@/pages/admin/Tasks"
import UsersMgmt from "@/pages/admin/UsersMgmt"
import Notifications from "@/pages/admin/Notifications"
import Settings from "@/pages/admin/Settings"
import Profile from "@/pages/admin/Profile"
import Projects from "@/pages/admin/Projects"
import Billing from "@/pages/admin/Billing"
import AuditLog from "@/pages/admin/AuditLog"
import SuperAdmin from "@/pages/superadmin/SuperAdmin"
import SuperAdminLogin from "@/pages/superadmin/SuperAdminLogin"
import Orgs from "@/pages/superadmin/Orgs"
import Subscriptions from "@/pages/superadmin/Subscriptions"
import CompanyUsers from "@/pages/superadmin/CompanyUsers"
import PlatformAuditLog from "@/pages/superadmin/PlatformAuditLog"
import CompanyAuditLog from "@/pages/superadmin/CompanyAuditLog"
import Invoices from "@/pages/superadmin/Invoices"
import Plans from "@/pages/superadmin/Plans"
import CpLayout from "@/layouts/CpLayout"
import CpDashboardHome from "@/pages/channelPartner/pages/DashboardHome"
import CpLeadsTable from "@/pages/channelPartner/pages/LeadsTable"
import CpCompanies from "@/pages/channelPartner/pages/Companies"
import CpFollowUps from "@/pages/channelPartner/pages/FollowUps"
import CpActivities from "@/pages/channelPartner/pages/Activities"
import CpNotifications from "@/pages/channelPartner/pages/Notifications"
import CpDeals from "@/pages/channelPartner/pages/Deals"
import CpCommission from "@/pages/channelPartner/pages/Commission"
import CpChat from "@/pages/channelPartner/pages/Chat"
import CpDocuments from "@/pages/channelPartner/pages/Documents"
import CpAnalytics from "@/pages/channelPartner/pages/Analytics"
import CpProfile from "@/pages/channelPartner/pages/Profile"
import CpSettings from "@/pages/channelPartner/pages/Settings"
import CpLeadWorkspace from "@/pages/channelPartner/pages/LeadWorkspace"
import ChannelPartners from "@/pages/admin/ChannelPartners"
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
import About from "@/pages/public/About"
import Privacy from "@/pages/public/Privacy"
import Terms from "@/pages/public/Terms"
import Security from "@/pages/public/Security"
import Changelog from "@/pages/public/Changelog"
import Roadmap from "@/pages/public/Roadmap"
import Blog from "@/pages/public/Blog"
import Careers from "@/pages/public/Careers"
import { Toaster } from "@/components/ui/sonner"
import { useAuthStore } from "@/stores/authStore"
import PlanLimitModal from "@/components/common/PlanLimitModal"

function App() {
  const fetchSession = useAuthStore((s) => s.fetchSession)

  useEffect(() => {
    fetchSession()
    // Restore appearance preferences saved from Settings → Appearance
    const accent = localStorage.getItem("lp-accent-hex")
    const textSize = localStorage.getItem("lp-text-size")
    if (accent) {
      const n = parseInt(accent.slice(1), 16)
      const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
      const lighten = (c, a) => Math.min(255, Math.round(c + (255 - c) * a))
      const darken  = (c, a) => Math.round(c * (1 - a))
      const toHex = (...cs) => '#' + cs.map(v => v.toString(16).padStart(2, '0')).join('')
      document.documentElement.style.setProperty('--lp-accent', accent)
      document.documentElement.style.setProperty('--lp-accent-2',      toHex(lighten(r,.2), lighten(g,.2), lighten(b,.2)))
      document.documentElement.style.setProperty('--lp-accent-strong', toHex(darken(r,.1),  darken(g,.1),  darken(b,.1)))
      document.documentElement.style.setProperty('--lp-accent-deep',   toHex(darken(r,.2),  darken(g,.2),  darken(b,.2)))
    }
    if (textSize) document.documentElement.setAttribute("data-text-size", textSize)
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
          <Route path="/about" element={<About />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/security" element={<Security />} />
          <Route path="/changelog" element={<Changelog />} />
          <Route path="/roadmap" element={<Roadmap />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/careers" element={<Careers />} />
        </Route>

        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/accept-invite" element={<AcceptInvite />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/signup/welcome" element={<SignupWelcome />} />
          <Route path="/signup/choose-plan" element={<ChoosePlan />} />
        </Route>

        <Route path="/superadmin/login" element={<SuperAdminLogin />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<RoleRoute allowedRoles={["CHANNEL_PARTNER"]} />}>
            <Route element={<CpLayout />}>
              <Route path="/cp" element={<CpDashboardHome />} />
              <Route path="/cp/my-leads" element={<CpLeadsTable scope="own" />} />
              <Route path="/cp/shared" element={<CpLeadsTable scope="shared" />} />
              <Route path="/cp/private" element={<CpLeadsTable scope="private" />} />
              <Route path="/cp/companies" element={<CpCompanies />} />
              <Route path="/cp/follow-ups" element={<CpFollowUps />} />
              <Route path="/cp/activities" element={<CpActivities />} />
              <Route path="/cp/notifications" element={<CpNotifications />} />
              <Route path="/cp/deals" element={<CpDeals />} />
              <Route path="/cp/commission" element={<CpCommission />} />
              <Route path="/cp/chat" element={<CpChat />} />
              <Route path="/cp/documents" element={<CpDocuments />} />
              <Route path="/cp/analytics" element={<CpAnalytics />} />
              <Route path="/cp/profile" element={<CpProfile />} />
              <Route path="/cp/settings" element={<CpSettings />} />
              <Route path="/cp/leads/:id" element={<CpLeadWorkspace />} />
            </Route>
          </Route>
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
            {/* Tenant-scoped routes — every page below depends on the user
                having a companyId. Super admin has none, so bounce them to
                their platform-admin landing instead of rendering empty/403
                states. */}
            <Route
              element={
                <RoleRoute
                  allowedRoles={["OWNER", "ADMIN", "MANAGER", "AGENT", "CHANNEL_PARTNER"]}
                  redirectTo="/admin"
                />
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/leads" element={<Leads />} />
              <Route path="/leads/:id" element={<LeadDetail />} />
              <Route path="/leads/:id/edit" element={<LeadEdit />} />
              <Route path="/assign" element={<Assign />} />
              <Route path="/follow-ups" element={<FollowUps />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/users-mgmt" element={<UsersMgmt />} />
              <Route path="/team" element={<Navigate to="/users-mgmt" replace />} />
              <Route path="/projects" element={<Projects />} />
            </Route>

            {/* AGENT cannot create leads and has no company-wide Files
                browser. Backend also gates POST /api/leads to manager+. */}
            <Route
              element={
                <RoleRoute allowedRoles={["OWNER", "ADMIN", "MANAGER"]} redirectTo="/dashboard" />
              }
            >
              <Route path="/leads/new" element={<AddLead />} />
              <Route path="/files" element={<Files />} />
              <Route path="/channel-partners" element={<ChannelPartners />} />
            </Route>

            {/* Billing is OWNER + ADMIN only (BE controller enforces the
                same). Lives under /admin/billing — the upgrade modal,
                trial banner, and pre-flight locks all link here. */}
            <Route
              element={
                <RoleRoute allowedRoles={["OWNER", "ADMIN"]} redirectTo="/dashboard" />
              }
            >
              <Route path="/admin/billing" element={<Billing />} />
              <Route path="/audit-log" element={<AuditLog />} />
            </Route>

            {/* Cross-role surfaces — usable by everyone including super admin. */}
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/profile" element={<Profile />} />

            <Route element={<RoleRoute allowedRoles={["SUPER_ADMIN"]} />}>
              <Route path="/admin" element={<SuperAdmin />} />
              <Route path="/admin/orgs" element={<Orgs />} />
              <Route path="/admin/subscriptions" element={<Subscriptions />} />
              <Route path="/admin/audit-log" element={<PlatformAuditLog />} />
              <Route path="/admin/orgs/:id/audit-log" element={<CompanyAuditLog />} />
              <Route path="/admin/orgs/:id/users" element={<CompanyUsers />} />
              <Route path="/admin/invoices" element={<Invoices />} />
              <Route path="/admin/plans" element={<Plans />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
      <PlanLimitModal />
    </ThemeProvider>
  )
}

export default App
