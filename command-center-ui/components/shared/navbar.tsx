'use client';

/**
 * Navigation Component
 * Desktop: Fixed sidebar on the left
 * Mobile: Top bar with hamburger menu
 */

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
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
  Menu
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
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
    label: 'Manage',
    items: [
      {
        label: 'Projects',
        href: '/projects',
        icon: <FolderKanban className="w-5 h-5" />
      },
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

export function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

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
      {/* Desktop Sidebar - Fixed, hidden on mobile */}
      <aside className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:left-0 md:w-56 md:border-r md:border-border md:bg-card z-50">
        {/* Logo */}
        <div className="flex items-center h-16 px-4 border-b border-border">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">M</span>
            </div>
            <span className="font-semibold text-sm">Minty Design</span>
            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded">
              BETA
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-4 px-2">
          <SignedIn>
            <NavigationContent />
          </SignedIn>
          <SignedOut>
            <div className="px-3 py-4 text-sm text-muted-foreground">
              Sign in to access navigation
            </div>
          </SignedOut>
        </div>

        {/* Bottom section - User & Theme */}
        <div className="border-t border-border p-3 space-y-3">
          <SignedOut>
            <div className="space-y-2">
              <SignInButton mode="modal">
                <Button variant="outline" className="w-full" size="sm">Sign In</Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button className="w-full" size="sm">Sign Up</Button>
              </SignUpButton>
            </div>
          </SignedOut>
          <SignedIn>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserButton afterSignOutUrl="/" />
                <QuotaStatus />
              </div>
              <ThemeToggle />
            </div>
          </SignedIn>
        </div>
      </aside>

      {/* Mobile Top Bar - Hidden on desktop */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 border-b border-border bg-card">
        <div className="flex items-center justify-between h-14 px-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">M</span>
            </div>
            <span className="font-semibold text-sm">Minty Design</span>
            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded">
              BETA
            </span>
          </Link>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <SignedOut>
              <SignInButton mode="modal">
                <Button variant="ghost" size="sm">Sign In</Button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <QuotaStatus />
              <UserButton afterSignOutUrl="/" />
              <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[280px] p-2" hideCloseButton>
                  <SheetTitle className="sr-only">Navigation</SheetTitle>
                  {/* Hamburger close button at top */}
                  <div className="flex justify-end mb-4">
                    <SheetClose asChild>
                      <Button variant="ghost" size="icon">
                        <Menu className="h-5 w-5" />
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
      </div>

    </>
  );
}

export default Navbar;
