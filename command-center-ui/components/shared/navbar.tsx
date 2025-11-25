'use client';

/**
 * Main Navigation Bar
 * Provides navigation between all 7 main tabs
 */

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
  BarChart3,
  Activity,
  Info
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton
} from '@clerk/nextjs';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: <LayoutDashboard className="w-5 h-5" />
  },
  {
    label: 'Projects',
    href: '/projects',
    icon: <FolderKanban className="w-5 h-5" />
  },
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
    label: 'Analytics',
    href: '/analytics',
    icon: <BarChart3 className="w-5 h-5" />
  },
  {
    label: 'Queue',
    href: '/queue',
    icon: <Activity className="w-5 h-5" />
  }
];

export function Navbar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className="sticky top-0 z-[100] border-b border-border bg-card pointer-events-auto">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">M</span>
              </div>
              <span className="font-semibold text-lg hidden sm:inline">
                Minty Design Co
              </span>
            </Link>
          </div>

          {/* Navigation Links - Only show when signed in */}
          <div className="flex items-center space-x-1">
            <SignedIn>
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    'hover:bg-accent hover:text-accent-foreground',
                    isActive(item.href)
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground'
                  )}
                >
                  <span className="hidden sm:inline">{item.icon}</span>
                  <span>{item.label}</span>
                  {item.badge && item.badge > 0 && (
                    <span className="bg-primary text-primary-foreground text-xs font-semibold px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
              ))}
            </SignedIn>

            {/* Auth Buttons */}
            <div className="ml-2 pl-2 border-l border-border flex items-center space-x-2">
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                    Sign In
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="px-3 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                    Sign Up
                  </button>
                </SignUpButton>
              </SignedOut>
              <SignedIn>
                <UserButton afterSignOutUrl="/" />
              </SignedIn>
            </div>

            {/* Theme Toggle */}
            <div className="ml-2 pl-2 border-l border-border">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
