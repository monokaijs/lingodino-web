'use client';

import * as React from 'react';
import {
  IconBook,
  IconBooks,
  IconClipboardList,
  IconDashboard,
  IconHelp,
  IconInnerShadowTop,
  IconQuestionMark,
  IconSearch,
  IconSettings,
  IconUsers,
  IconVocabulary,
  IconLanguage,
  IconHeadphones,
} from '@tabler/icons-react';

import { NavMain } from '@/components/nav-main';
import { NavSecondary } from '@/components/nav-secondary';
import { NavUser } from '@/components/nav-user';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: {
    name: string;
    email: string;
    avatar: string;
  };
}

const data = {
  navMain: [
    {
      title: 'Bảng điều khiển',
      url: '/dashboard',
      icon: IconDashboard,
    },
    {
      title: 'Khóa học',
      url: '/dashboard/courses',
      icon: IconBooks,
    },
    {
      title: 'Bài kiểm tra',
      url: '/dashboard/exams',
      icon: IconClipboardList,
    },
    {
      title: 'Từ vựng',
      url: '/dashboard/vocabulary-collections',
      icon: IconVocabulary,
    },
    {
      title: 'Ngữ pháp',
      url: '/dashboard/grammar-collections',
      icon: IconLanguage,
    },
    {
      title: 'Hội thoại âm thanh',
      url: '/dashboard/conversations',
      icon: IconHeadphones,
    },
    {
      title: 'Người dùng',
      url: '/dashboard/users',
      icon: IconUsers,
    },
  ],
  navSecondary: [
    {
      title: 'Cài đặt',
      url: '#',
      icon: IconSettings,
    },
    {
      title: 'Trợ giúp',
      url: '#',
      icon: IconHelp,
    },
    {
      title: 'Tìm kiếm',
      url: '#',
      icon: IconSearch,
    },
  ],
};

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:p-1.5!">
              <a href="/dashboard">
                <IconInnerShadowTop className="size-5!" />
                <span className="text-base font-semibold">LingoDino</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
