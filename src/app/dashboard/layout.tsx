import {AppSidebar} from '@/components/app-sidebar';
import {SiteHeader} from '@/components/site-header';
import {SidebarInset, SidebarProvider,} from '@/components/ui/sidebar';

import {withAuthPage} from '@/lib/utils/withAuthPage';

export default async function DashboardLayout({children}: { children: React.ReactNode }) {
  await withAuthPage({
    redirectTo: '/login',
  });
  return (
    <SidebarProvider
      style={
        {
          '--sidebar-width': 'calc(var(--spacing) * 72)',
          '--header-height': 'calc(var(--spacing) * 12)',
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset"/>
      <SidebarInset>
        <SiteHeader/>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
