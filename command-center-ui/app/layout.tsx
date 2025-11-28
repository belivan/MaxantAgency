import '@/app/globals.css';
import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { Navbar } from '@/components/shared';
import { TaskProgressProvider } from '@/lib/contexts/task-progress-context';
import { FloatingTaskIndicator } from '@/components/shared/floating-task-indicator';

export const metadata: Metadata = {
  title: 'Minty Design Co',
  description: 'Unified dashboard for prospecting, analysis, and outreach.'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <TaskProgressProvider>
            <div className="min-h-screen bg-background">
              <Navbar />
              <main>{children}</main>
              <FloatingTaskIndicator />
            </div>
          </TaskProgressProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
