import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { ThemeToggle } from '@/components/theme-toggle'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Your Website Analysis is Ready | Minty Design Co',
  description: 'View your comprehensive website analysis report and discover how to improve your online presence with Minty Design Co.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Calendly widget script - must load synchronously */}
        <link href="https://assets.calendly.com/assets/external/widget.css" rel="stylesheet" />
        <script src="https://assets.calendly.com/assets/external/widget.js" type="text/javascript"></script>
      </head>
      <body className={inter.className} suppressHydrationWarning>

        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <div className="relative min-h-screen" suppressHydrationWarning>
            {/* Theme toggle fixed in top right */}
            <div className="fixed top-4 right-4 z-50">
              <ThemeToggle />
            </div>

            {/* Main content */}
            <main>{children}</main>

            {/* Footer */}
            <footer className="border-t bg-card">
              <div className="container mx-auto px-4 py-8">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
                  <p>© 2025 Minty Design Co. All rights reserved.</p>
                  <div className="flex gap-6">
                    <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
                    <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
                    <a href="#" className="hover:text-foreground transition-colors">Contact</a>
                  </div>
                </div>
              </div>
            </footer>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
