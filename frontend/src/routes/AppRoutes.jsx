import { Routes, Route } from 'react-router-dom'
import ProtectedRoutes from '@/routes/ProtectedRoutes'
import DashboardLayout from '@/layouts/DashboardLayout'
import DashboardPage from '@/pages/admin/Dashboard'
import LeadsPage from '@/pages/admin/Leads'
import ProjectsPage from '@/pages/admin/Projects'
import TeamPage from '@/pages/admin/Team'

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/*"
        element={
          <ProtectedRoutes>
            <DashboardLayout>
              <Routes>
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="leads" element={<LeadsPage />} />
                <Route path="projects" element={<ProjectsPage />} />
                <Route path="team" element={<TeamPage />} />
                <Route path="*" element={<DashboardPage />} />
              </Routes>
            </DashboardLayout>
          </ProtectedRoutes>
        }
      />
    </Routes>
  )
}

export default AppRoutes
