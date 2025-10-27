import '@/app/globals.css';
import type { Metadata } from 'next';
import { Navbar } from '@/components/shared';
import { TaskProgressProvider } from '@/lib/contexts/task-progress-context';
import { FloatingTaskIndicator } from '@/components/shared/floating-task-indicator';

export const metadata: Metadata = {
  title: 'Maxant Command Center',
  description: 'Unified dashboard for prospecting, analysis, and outreach.'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
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
  );
}

