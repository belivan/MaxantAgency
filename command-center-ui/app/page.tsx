'use client';

import React from 'react';
import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import { Brain, Search, FileText, Mail, ArrowRight, Zap } from 'lucide-react';

export default function LandingPage() {
  const { isSignedIn, isLoaded } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
            Minty Design Co
          </h1>
          <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
            Find businesses that need your help, see exactly what's wrong with their websites,
            and get ready-to-send emails—all done automatically by AI.
          </p>

          {/* CTA */}
          <div className="flex gap-3 justify-center mb-10">
            {!isLoaded ? (
              <div className="px-6 py-3 bg-primary/50 text-primary-foreground rounded-lg font-medium animate-pulse">
                Loading...
              </div>
            ) : isSignedIn ? (
              <Link href="/dashboard" className="px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-all flex items-center gap-2">
                Go to Dashboard
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link href="/sign-up" className="px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-all flex items-center gap-2">
                  Get Started Free
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/sign-in" className="px-6 py-3 bg-card hover:bg-accent border border-border rounded-lg font-medium transition-all">
                  Sign In
                </Link>
              </>
            )}
          </div>

          {/* Stats Row */}
          <div className="flex justify-center gap-8 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">17+</div>
              <div className="text-muted-foreground">AI Workers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">~$0.05</div>
              <div className="text-muted-foreground">Per Business</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">2-3 min</div>
              <div className="text-muted-foreground">Per Website</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">100%</div>
              <div className="text-muted-foreground">Hands-Free</div>
            </div>
          </div>
        </div>

        {/* Pipeline Flow */}
        <div className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-xl font-semibold text-foreground">How It Works</h2>
            <p className="text-sm text-muted-foreground">Four simple steps, fully automatic</p>
          </div>

          <div className="flex items-center justify-center gap-3">
            {/* Prospecting */}
            <div className="group flex-1 max-w-[160px]">
              <div className="p-4 rounded-xl border border-green-500/30 bg-gradient-to-br from-green-500/10 to-green-500/5 hover:border-green-500/50 hover:shadow-lg hover:shadow-green-500/10 transition-all duration-300 text-center">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-3">
                  <Search className="w-5 h-5 text-green-500" />
                </div>
                <div className="font-semibold text-sm text-foreground">Prospect</div>
                <div className="text-xs text-muted-foreground mt-1">Find companies</div>
              </div>
            </div>

            {/* Arrow 1 */}
            <div className="flex-shrink-0 w-8 flex items-center justify-center">
              <div className="w-full h-0.5 bg-gradient-to-r from-green-500/50 to-blue-500/50 relative">
                <ArrowRight className="w-4 h-4 text-blue-500/70 absolute -right-2 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Analysis */}
            <div className="group flex-1 max-w-[160px]">
              <div className="p-4 rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-blue-500/5 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300 text-center">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-3">
                  <Brain className="w-5 h-5 text-blue-500" />
                </div>
                <div className="font-semibold text-sm text-foreground">Analyze</div>
                <div className="text-xs text-muted-foreground mt-1">Check their site</div>
              </div>
            </div>

            {/* Arrow 2 */}
            <div className="flex-shrink-0 w-8 flex items-center justify-center">
              <div className="w-full h-0.5 bg-gradient-to-r from-blue-500/50 to-orange-500/50 relative">
                <ArrowRight className="w-4 h-4 text-orange-500/70 absolute -right-2 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Report */}
            <div className="group flex-1 max-w-[160px]">
              <div className="p-4 rounded-xl border border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-orange-500/5 hover:border-orange-500/50 hover:shadow-lg hover:shadow-orange-500/10 transition-all duration-300 text-center">
                <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center mx-auto mb-3">
                  <FileText className="w-5 h-5 text-orange-500" />
                </div>
                <div className="font-semibold text-sm text-foreground">Report</div>
                <div className="text-xs text-muted-foreground mt-1">Create a report</div>
              </div>
            </div>

            {/* Arrow 3 */}
            <div className="flex-shrink-0 w-8 flex items-center justify-center">
              <div className="w-full h-0.5 bg-gradient-to-r from-orange-500/50 to-purple-500/50 relative">
                <ArrowRight className="w-4 h-4 text-purple-500/70 absolute -right-2 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Outreach */}
            <div className="group flex-1 max-w-[160px]">
              <div className="p-4 rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-purple-500/5 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300 text-center">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-3">
                  <Mail className="w-5 h-5 text-purple-500" />
                </div>
                <div className="font-semibold text-sm text-foreground">Outreach</div>
                <div className="text-xs text-muted-foreground mt-1">Write the email</div>
              </div>
            </div>
          </div>
        </div>

        {/* What You Get */}
        <div className="mb-16">
          <div className="grid md:grid-cols-2 gap-3">
            {/* Prospecting */}
            <div className="group p-5 rounded-xl border border-green-500/20 bg-gradient-to-br from-green-500/5 to-transparent hover:border-green-500/40 hover:shadow-lg hover:shadow-green-500/5 transition-all duration-300">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-green-500/10 group-hover:bg-green-500/20 transition-colors">
                  <Search className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Find Businesses</h3>
                  <p className="text-xs text-muted-foreground">Discover your ideal customers</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="w-1 h-1 rounded-full bg-green-500" />
                  Search Google Maps by location & industry
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="w-1 h-1 rounded-full bg-green-500" />
                  AI filters out bad fits automatically
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="w-1 h-1 rounded-full bg-green-500" />
                  No duplicates, ever
                </div>
              </div>
            </div>

            {/* Analysis */}
            <div className="group p-5 rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                  <Brain className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Analyze Websites</h3>
                  <p className="text-xs text-muted-foreground">Find what needs fixing</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="w-1 h-1 rounded-full bg-blue-500" />
                  Checks design, speed, content & more
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="w-1 h-1 rounded-full bg-blue-500" />
                  Gives letter grades (A-F) and priority
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="w-1 h-1 rounded-full bg-blue-500" />
                  Takes screenshots as proof
                </div>
              </div>
            </div>

            {/* Reports */}
            <div className="group p-5 rounded-xl border border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-transparent hover:border-orange-500/40 hover:shadow-lg hover:shadow-orange-500/5 transition-all duration-300">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-orange-500/10 group-hover:bg-orange-500/20 transition-colors">
                  <FileText className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Generate Reports</h3>
                  <p className="text-xs text-muted-foreground">Ready to send to clients</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="w-1 h-1 rounded-full bg-orange-500" />
                  AI writes the summary for you
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="w-1 h-1 rounded-full bg-orange-500" />
                  Step-by-step improvement plan
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="w-1 h-1 rounded-full bg-orange-500" />
                  PDF with screenshots included
                </div>
              </div>
            </div>

            {/* Outreach */}
            <div className="group p-5 rounded-xl border border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-500/5 transition-all duration-300">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
                  <Mail className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Write Messages</h3>
                  <p className="text-xs text-muted-foreground">Personalized for each lead</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="w-1 h-1 rounded-full bg-purple-500" />
                  Multiple email versions to pick from
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="w-1 h-1 rounded-full bg-purple-500" />
                  Social media messages too
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="w-1 h-1 rounded-full bg-purple-500" />
                  Based on their actual website issues
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Why This Works */}
        <div className="mb-16 p-6 rounded-xl bg-gradient-to-r from-primary/5 via-muted/30 to-purple-500/5 border border-border">
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Why It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="font-medium text-foreground mb-1">Specialized AI</div>
              <p className="text-muted-foreground">17+ AI workers, each focused on one job. Like having a team of experts working together.</p>
            </div>
            <div>
              <div className="font-medium text-foreground mb-1">Real Proof</div>
              <p className="text-muted-foreground">Every problem comes with screenshots. Show clients exactly what's wrong with their site.</p>
            </div>
            <div>
              <div className="font-medium text-foreground mb-1">Start to Finish</div>
              <p className="text-muted-foreground">From finding businesses to writing emails, everything happens automatically. You just review and send.</p>
            </div>
          </div>
        </div>

        {/* Final CTA */}
        <div className="text-center mb-12">
          <h2 className="text-2xl font-semibold mb-3 text-foreground">Ready to find your next clients?</h2>
          <p className="text-muted-foreground mb-6">
            Stop searching manually. Let AI find businesses, check their websites, and write your emails.
          </p>
          <div className="flex gap-3 justify-center">
            {isSignedIn ? (
              <>
                <Link href="/dashboard" className="px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-all flex items-center gap-2">
                  Go to Dashboard
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/prospecting" className="px-6 py-3 bg-card hover:bg-accent border border-border rounded-lg font-medium transition-all">
                  Start Prospecting
                </Link>
              </>
            ) : (
              <>
                <Link href="/sign-up" className="px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-all flex items-center gap-2">
                  Get Started Free
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/sign-in" className="px-6 py-3 bg-card hover:bg-accent border border-border rounded-lg font-medium transition-all">
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-muted-foreground pt-8 border-t border-border">
          <p className="text-sm">
            Built with Claude Code by Anton Yanovich
          </p>
          <p className="text-xs mt-1 text-muted-foreground/70">
            Next.js • Supabase • 17+ AI Workers
          </p>
        </div>
      </div>
    </div>
  );
}
