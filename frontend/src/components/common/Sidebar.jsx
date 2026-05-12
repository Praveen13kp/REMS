import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, Building2, Briefcase, Settings, ClipboardCheck,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { ROLE_MENU_ITEMS } from '@/utils/constants'
import {
  Sidebar as SidebarPrimitive,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'

const iconMap = {
  LayoutDashboard, Users, Building2, Briefcase, Settings, ClipboardCheck,
}

function AppSidebar() {
  const user = useAuthStore((s) => s.user)
  const location = useLocation()
  const role = user?.role ?? 'AGENT'
  const menuItems = ROLE_MENU_ITEMS[role] ?? ROLE_MENU_ITEMS.AGENT

  return (
    <SidebarPrimitive collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Building2 className="size-4" />
          </span>
          <span className="truncate text-sm font-semibold group-data-[collapsible=icon]:hidden">
            RELMS
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const Icon = iconMap[item.icon]
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton asChild isActive={location.pathname === item.path} tooltip={item.label}>
                      <NavLink to={item.path} className="flex items-center gap-2">
                        {Icon && <Icon className="size-4" />}
                        <span>{item.label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </SidebarPrimitive>
  )
}

export default AppSidebar
