'use client';

import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useState } from 'react';
import { signIn } from 'next-auth/react';

export function LoginForm({ className, ...props }: React.ComponentProps<'div'>) {
  const [isLoading, setIsLoading] = useState<'google' | 'apple' | null>(null);

  const handleGoogleLogin = async () => {
    setIsLoading('google');
    await signIn('google', { callbackUrl: '/dashboard' });
  };

  const handleAppleLogin = async () => {
    setIsLoading('apple');
    await signIn('apple', { callbackUrl: '/dashboard' });
  };

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Chào mừng trở lại</CardTitle>
          <CardDescription>Đăng nhập bằng tài khoản Apple hoặc Google</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleGoogleLogin} disabled={isLoading !== null} variant="outline" className="w-full">
            {isLoading === 'google' ? 'Đang tải...' : 'Tiếp tục với Google'}
          </Button>

          <Button onClick={handleAppleLogin} disabled={isLoading !== null} variant="outline" className="w-full">
            {isLoading === 'apple' ? 'Đang tải...' : 'Tiếp tục với Apple'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
