import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import AppSidebar from '@/components/common/Sidebar'
import Navbar from '@/components/common/Navbar'

function DashboardLayout({ children }) {
  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset>
        <Navbar />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default DashboardLayout
import { Outlet } from "react-router-dom"

export default function DashboardLayout() {
  return (
    <div className="min-h-svh">
      <Outlet />
    </div>
  )
}
