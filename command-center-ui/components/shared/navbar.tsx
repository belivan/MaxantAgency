'use client';

/**
 * Navigation Component
 * Header: Always visible at top with logo, theme toggle, and user controls
 * Sidebar: Fixed left sidebar with navigation (when signed in, not on landing page)
 * Mobile: Header + slide-out menu
 */

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useConsole } from '@/lib/contexts/console-context';
import { useTaskProgress } from '@/lib/contexts/task-progress-context';
import {
  LayoutDashboard,
  FolderKanban,
  Search,
  ScanSearch,
  Users,
  Mail,
  FileText,
  BarChart3,
  Activity,
  Menu,
  X,
  Loader2
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton
} from '@clerk/nextjs';
import { QuotaStatus } from '@/components/shared/quota-status';

// Custom "M" Logo Icon
const MaxantLogo = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M3 20V4h3.5L12 13.5 17.5 4H21v16h-3V9.5L12 19 6 9.5V20H3z" />
  </svg>
);

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

// Standalone nav item (not in a group)
const DASHBOARD_ITEM: NavItem = {
  label: 'Dashboard',
  href: '/dashboard',
  icon: <LayoutDashboard className="w-5 h-5" />
};

// Navigation organized into logical groups
const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Research',
    items: [
      {
        label: 'Prospecting',
        href: '/prospecting',
        icon: <Search className="w-5 h-5" />
      },
      {
        label: 'Analysis',
        href: '/analysis',
        icon: <ScanSearch className="w-5 h-5" />
      },
    ]
  },
  {
    label: 'Sales',
    items: [
      {
        label: 'Leads',
        href: '/leads',
        icon: <Users className="w-5 h-5" />
      },
      {
        label: 'Outreach',
        href: '/outreach',
        icon: <Mail className="w-5 h-5" />
      },
    ]
  },
  {
    label: 'Manage',
    items: [
      {
        label: 'Projects',
        href: '/projects',
        icon: <FolderKanban className="w-5 h-5" />
      },
      {
        label: 'Reports',
        href: '/reports',
        icon: <FileText className="w-5 h-5" />
      },
    ]
  },
  {
    label: 'Monitor',
    items: [
      {
        label: 'Analytics',
        href: '/analytics',
        icon: <BarChart3 className="w-5 h-5" />
      },
      {
        label: 'Queue',
        href: '/queue',
        icon: <Activity className="w-5 h-5" />
      },
    ]
  }
];

// Pages that should not show sidebar (public/marketing pages)
const PUBLIC_PAGES = ['/', '/about', '/terms', '/privacy'];

export function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { toggleConsole, errorCount, isOpen: consoleOpen } = useConsole();
  const { tasks, activeTasks } = useTaskProgress();

  const isPublicPage = PUBLIC_PAGES.includes(pathname);
  const hasActiveTasks = activeTasks.length > 0;

  const isActive = (href: string) => {
    return pathname.startsWith(href);
  };

  // Shared navigation content for both desktop sidebar and mobile sheet
  const NavigationContent = ({ isMobile = false }: { isMobile?: boolean }) => {
    const dashboardLink = (
      <Link
        href={DASHBOARD_ITEM.href}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
          'hover:bg-accent hover:text-accent-foreground',
          isActive(DASHBOARD_ITEM.href)
            ? 'bg-accent text-accent-foreground'
            : 'text-muted-foreground'
        )}
      >
        {DASHBOARD_ITEM.icon}
        <span>{DASHBOARD_ITEM.label}</span>
      </Link>
    );

    return (
      <nav className="flex flex-col flex-1">
        {/* Dashboard - standalone item */}
        <div className="mb-4">
          {isMobile ? (
            <SheetClose asChild>{dashboardLink}</SheetClose>
          ) : (
            dashboardLink
          )}
        </div>

        {/* Grouped navigation items */}
        {NAV_GROUPS.map((group, groupIndex) => (
          <div key={group.label} className={cn(groupIndex > 0 && 'mt-4')}>
          {/* Group label */}
          <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {group.label}
          </div>
          {/* Group items */}
          <div className="space-y-1">
            {group.items.map((item) => {
              const linkContent = (
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    'hover:bg-accent hover:text-accent-foreground',
                    isActive(item.href)
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground'
                  )}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {item.badge && item.badge > 0 && (
                    <span className="ml-auto bg-primary text-primary-foreground text-xs font-semibold px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );

              // Wrap with SheetClose on mobile to close menu on click
              if (isMobile) {
                return (
                  <SheetClose asChild key={item.href}>
                    {linkContent}
                  </SheetClose>
                );
              }
              return <div key={item.href}>{linkContent}</div>;
            })}
          </div>
        </div>
      ))}
    </nav>
    );
  };

  return (
    <>
      {/* Top Header - Always visible */}
      <header className="fixed top-0 left-0 right-0 z-50 h-14 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="flex items-center justify-between h-full px-4">
          {/* Logo - Always at far left */}
          <div className={cn(
            'flex items-center',
            !isPublicPage && 'md:w-56 md:flex-shrink-0' // Match sidebar width when in app
          )}>
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">M</span>
              </div>
              <span className="font-semibold text-sm hidden sm:inline">Minty Design</span>
              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded hidden sm:inline">
                BETA
              </span>
            </Link>
          </div>

          {/* Right side controls */}
          <div className="flex items-center gap-3">
            <SignedIn>
              <QuotaStatus />
            </SignedIn>
            <ThemeToggle />
            <SignedOut>
              <SignInButton mode="modal">
                <Button variant="ghost" size="sm">Sign In</Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button size="sm">Sign Up</Button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
              {/* Mobile menu trigger */}
              <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[280px] p-2" hideCloseButton>
                  <SheetTitle className="sr-only">Navigation</SheetTitle>
                  {/* Close button */}
                  <div className="flex justify-end mb-4">
                    <SheetClose asChild>
                      <Button variant="ghost" size="icon">
                        <X className="h-5 w-5" />
                        <span className="sr-only">Close menu</span>
                      </Button>
                    </SheetClose>
                  </div>
                  <NavigationContent isMobile={true} />
                </SheetContent>
              </Sheet>
            </SignedIn>
          </div>
        </div>
      </header>

      {/* Desktop Sidebar - Below header, only when signed in and not on public pages */}
      <SignedIn>
        {!isPublicPage && (
          <aside className="hidden md:flex md:flex-col md:fixed md:top-14 md:bottom-0 md:left-0 md:w-56 md:bg-card md:border-r md:border-border z-40">
            {/* Navigation */}
            <div className="flex-1 overflow-y-auto py-4 px-2">
              <NavigationContent />
            </div>

            {/* Console/Tasks Button - Bottom of sidebar */}
            <div className="border-t border-border p-3">
              <button
                onClick={toggleConsole}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                  'hover:bg-accent hover:text-accent-foreground',
                  consoleOpen
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground'
                )}
              >
                <div className="relative">
                  <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center transition-all',
                    hasActiveTasks
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}>
                    {hasActiveTasks ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <MaxantLogo className="w-4 h-4" />
                    )}
                  </div>
                  {/* Badge */}
                  {(tasks.length > 0 || errorCount > 0) && (
                    <span className={cn(
                      'absolute -top-1 -right-1 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center',
                      errorCount > 0 ? 'bg-red-500' : 'bg-primary'
                    )}>
                      {errorCount > 0 ? errorCount : tasks.length}
                    </span>
                  )}
                </div>
                <div className="flex-1 text-left">
                  <span>Tasks & Console</span>
                  {hasActiveTasks && (
                    <span className="text-xs text-muted-foreground block">
                      {activeTasks.length} running
                    </span>
                  )}
                </div>
              </button>
            </div>
          </aside>
        )}
      </SignedIn>
    </>
  );
}

export default Navbar;
