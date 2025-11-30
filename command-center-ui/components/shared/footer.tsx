'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { cn } from '@/lib/utils';

// Pages that should not show sidebar (public/marketing pages)
const PUBLIC_PAGES = ['/', '/about', '/terms', '/privacy'];

export function Footer() {
  const pathname = usePathname();
  const { isSignedIn } = useAuth();

  const isPublicPage = PUBLIC_PAGES.includes(pathname);
  const showSidebar = isSignedIn && !isPublicPage;

  return (
    <footer className={cn(
      'border-t border-border bg-background',
      showSidebar && 'md:ml-56'
    )}>
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          {/* Left - Brand + copyright */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Minty Design Co</span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline">Built by Anton Yanovich</span>
          </div>

          {/* Right - Links */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/about" className="hover:text-foreground transition-colors">
              About
            </Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
