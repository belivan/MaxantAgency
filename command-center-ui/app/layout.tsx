import '@/app/globals.css';
import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { Navbar } from '@/components/shared';
import { Providers } from '@/components/providers';

// Force dynamic rendering to avoid issues with client-side contexts during static generation
export const dynamic = 'force-dynamic';

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
          <Providers>
            <div className="bg-background min-h-screen">
              <Navbar />
              {/* Main content: pt-14 for mobile top bar, md:pt-0 + md:ml-56 for desktop sidebar */}
              <main className="pt-14 md:pt-0 md:ml-56">{children}</main>
            </div>
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
