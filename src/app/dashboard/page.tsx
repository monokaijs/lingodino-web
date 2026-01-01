'use client';

import {Card, CardContent, CardHeader, CardTitle, CardDescription} from '@/components/ui/card';
import {IconBooks, IconVocabulary, IconLanguage, IconHeadphones, IconArrowRight} from '@tabler/icons-react';
import Link from 'next/link';
import {Button} from '@/components/ui/button';

const features = [
  {
    title: 'Courses',
    description: 'Manage language courses and lessons',
    icon: IconBooks,
    href: '/dashboard/courses',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    title: 'Vocabulary',
    description: 'Build vocabulary collections and word lists',
    icon: IconVocabulary,
    href: '/dashboard/vocabulary-collections',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  {
    title: 'Grammar',
    description: 'Create grammar rules and examples',
    icon: IconLanguage,
    href: '/dashboard/grammar-collections',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  {
    title: 'Audio Conversations',
    description: 'Generate AI dialogue with ElevenLabs',
    icon: IconHeadphones,
    href: '/dashboard/conversations',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
];

export default function DashboardPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {features.map(feature => (
          <Card key={feature.title} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{feature.title}</CardTitle>
              <div className={`p-2 rounded-full ${feature.bgColor}`}>
                <feature.icon className={`h-4 w-4 ${feature.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="mb-4">{feature.description}</CardDescription>
              <Button variant="outline" size="sm" asChild className="w-full">
                <Link href={feature.href}>
                  Open
                  <IconArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Welcome to LingoDino Admin</CardTitle>
            <CardDescription>Manage your language learning content from this central hub.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Use the sidebar to navigate to different sections. You can manage users, create courses, organize
              vocabulary, and generate AI audio content.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
