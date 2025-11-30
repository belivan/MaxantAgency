'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { cn } from '@/lib/utils';

interface MainContentProps {
  children: React.ReactNode;
}

// Pages that should not show sidebar (public/marketing pages)
const PUBLIC_PAGES = ['/', '/about', '/terms', '/privacy'];

export function MainContent({ children }: MainContentProps) {
  const pathname = usePathname();
  const { isSignedIn } = useAuth();

  const isPublicPage = PUBLIC_PAGES.includes(pathname);
  const showSidebar = isSignedIn && !isPublicPage;

  return (
    <main
      className={cn(
        'pt-14 flex-1', // Always have header padding
        showSidebar && 'md:ml-56' // Only add sidebar offset when sidebar is visible
      )}
    >
      {children}
    </main>
  );
}
