import { AppSidebar } from '@/components/app-sidebar'
import { SiteHeader } from '@/components/site-header'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { withAuthPage } from '@/lib/utils/withAuthPage'
import { authDecode } from '@/lib/utils/authDecode'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await withAuthPage({
    redirectTo: '/login',
  })

  const decoded = await authDecode()
  const user = {
    name: (decoded?.fullName as string) || (decoded?.name as string) || 'User',
    email: (decoded?.email as string) || '',
    avatar: (decoded?.photo as string) || (decoded?.picture as string) || '',
  }

  return (
    <SidebarProvider
      style={
        {
          '--sidebar-width': 'calc(var(--spacing) * 72)',
          '--header-height': 'calc(var(--spacing) * 12)',
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" user={user} />
      <SidebarInset>
        <SiteHeader />
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
