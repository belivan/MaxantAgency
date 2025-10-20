import '@/app/globals.css';
import type { Metadata } from 'next';
import { Navbar } from '@/components/shared';

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
    <html lang="en" className="dark">
      <body>
        <div className="min-h-screen bg-background">
          <Navbar />
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}

