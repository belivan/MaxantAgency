'use client';

import React from 'react';
import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import { Brain, Search, FileText, Mail, ArrowRight, ArrowDown, Zap, Check, Target, Eye, Rocket, Clock, DollarSign, TrendingUp, Sparkles } from 'lucide-react';
import { ScreenshotCarousel } from '@/components/home/screenshot-carousel';

export default function LandingPage() {
  const { isSignedIn, isLoaded } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero with animated background */}
      <div className="relative overflow-hidden">
        {/* Large gradient background spanning full hero */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-purple-500/15 to-background" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />

        {/* Animated grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.2)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.2)_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />

        {/* Additional floating gradient orbs for depth */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-500/20 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary/15 rounded-full blur-[120px] animate-pulse [animation-delay:1s]" />

        <div className="relative max-w-4xl mx-auto px-6 pt-20 pb-16">
          {/* Brand + Badge */}
          <div className="flex flex-col items-center mb-8">
            <div className="text-sm font-medium text-muted-foreground tracking-widest uppercase mb-4">
              Minty Design Co
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-primary font-medium">AI-Powered Lead Generation</span>
            </div>
          </div>

          {/* Main headline with gradient */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-center mb-6">
            <span className="bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
              Find Clients.
            </span>
            <br />
            <span className="bg-gradient-to-r from-primary via-purple-500 to-primary bg-clip-text text-transparent">
              Close Deals.
            </span>
          </h1>

          <p className="text-xl text-muted-foreground text-center mb-8 max-w-2xl mx-auto leading-relaxed">
            AI discovers businesses, analyzes their websites, and writes personalized outreach—
            <span className="text-foreground font-medium"> you just hit send.</span>
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            {!isLoaded ? (
              <div className="px-8 py-4 bg-primary/50 text-primary-foreground rounded-xl font-medium animate-pulse">
                Loading...
              </div>
            ) : isSignedIn ? (
              <Link href="/dashboard" className="group px-8 py-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30">
                Go to Dashboard
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            ) : (
              <>
                <Link href="/sign-up" className="group px-8 py-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30">
                  Start Free Trial
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link href="/sign-in" className="px-8 py-4 bg-card hover:bg-accent border border-border rounded-xl font-semibold transition-all">
                  Sign In
                </Link>
              </>
            )}
          </div>

          {/* Stats Row - More prominent */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            <div className="text-center p-4 rounded-xl bg-card/50 border border-border/50 backdrop-blur-sm">
              <div className="text-3xl font-bold bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">17+</div>
              <div className="text-sm text-muted-foreground mt-1">AI Workers</div>
            </div>
            <div className="text-center p-4 rounded-xl bg-card/50 border border-border/50 backdrop-blur-sm">
              <div className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">$0.05</div>
              <div className="text-sm text-muted-foreground mt-1">Per Lead</div>
            </div>
            <div className="text-center p-4 rounded-xl bg-card/50 border border-border/50 backdrop-blur-sm">
              <div className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">2 min</div>
              <div className="text-sm text-muted-foreground mt-1">Per Analysis</div>
            </div>
            <div className="text-center p-4 rounded-xl bg-card/50 border border-border/50 backdrop-blur-sm">
              <div className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">100%</div>
              <div className="text-sm text-muted-foreground mt-1">Automated</div>
            </div>
          </div>
        </div>
      </div>

      {/* Screenshot Carousel - Right after hero */}
      <div className="py-16 bg-muted/30">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-10">
            <p className="text-xs font-medium text-primary uppercase tracking-widest mb-2">Product Tour</p>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">See It In Action</h2>
            <p className="text-muted-foreground">Everything you need to close more deals</p>
          </div>
          <div className="px-4 md:px-12">
            <ScreenshotCarousel />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-16">

        {/* Pipeline Flow - How It Works */}
        <div className="mb-20">
          <div className="text-center mb-10">
            <p className="text-xs font-medium text-primary uppercase tracking-widest mb-2">The Process</p>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">How It Works</h2>
            <p className="text-muted-foreground">Four simple steps, fully automatic</p>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-3">
            {/* Prospecting */}
            <div className="group w-full md:flex-1 md:max-w-[160px]">
              <div className="p-4 rounded-xl border border-green-500/30 bg-gradient-to-br from-green-500/10 to-green-500/5 hover:border-green-500/50 hover:shadow-lg hover:shadow-green-500/10 transition-all duration-300 text-center">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-3">
                  <Search className="w-5 h-5 text-green-500" />
                </div>
                <div className="font-semibold text-sm text-foreground">Prospect</div>
                <div className="text-xs text-muted-foreground mt-1">Find companies</div>
              </div>
            </div>

            {/* Arrow 1 */}
            <div className="hidden md:flex flex-shrink-0 w-8 items-center justify-center">
              <div className="w-full h-0.5 bg-gradient-to-r from-green-500/50 to-blue-500/50 relative">
                <ArrowRight className="w-4 h-4 text-blue-500/70 absolute -right-2 top-1/2 -translate-y-1/2" />
              </div>
            </div>
            <div className="flex md:hidden items-center justify-center">
              <ArrowDown className="w-5 h-5 text-blue-500/70" />
            </div>

            {/* Analysis */}
            <div className="group w-full md:flex-1 md:max-w-[160px]">
              <div className="p-4 rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-blue-500/5 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300 text-center">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-3">
                  <Brain className="w-5 h-5 text-blue-500" />
                </div>
                <div className="font-semibold text-sm text-foreground">Analyze</div>
                <div className="text-xs text-muted-foreground mt-1">Check their site</div>
              </div>
            </div>

            {/* Arrow 2 */}
            <div className="hidden md:flex flex-shrink-0 w-8 items-center justify-center">
              <div className="w-full h-0.5 bg-gradient-to-r from-blue-500/50 to-orange-500/50 relative">
                <ArrowRight className="w-4 h-4 text-orange-500/70 absolute -right-2 top-1/2 -translate-y-1/2" />
              </div>
            </div>
            <div className="flex md:hidden items-center justify-center">
              <ArrowDown className="w-5 h-5 text-orange-500/70" />
            </div>

            {/* Report */}
            <div className="group w-full md:flex-1 md:max-w-[160px]">
              <div className="p-4 rounded-xl border border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-orange-500/5 hover:border-orange-500/50 hover:shadow-lg hover:shadow-orange-500/10 transition-all duration-300 text-center">
                <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center mx-auto mb-3">
                  <FileText className="w-5 h-5 text-orange-500" />
                </div>
                <div className="font-semibold text-sm text-foreground">Report</div>
                <div className="text-xs text-muted-foreground mt-1">Create a report</div>
              </div>
            </div>

            {/* Arrow 3 */}
            <div className="hidden md:flex flex-shrink-0 w-8 items-center justify-center">
              <div className="w-full h-0.5 bg-gradient-to-r from-orange-500/50 to-purple-500/50 relative">
                <ArrowRight className="w-4 h-4 text-purple-500/70 absolute -right-2 top-1/2 -translate-y-1/2" />
              </div>
            </div>
            <div className="flex md:hidden items-center justify-center">
              <ArrowDown className="w-5 h-5 text-purple-500/70" />
            </div>

            {/* Outreach */}
            <div className="group w-full md:flex-1 md:max-w-[160px]">
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

        {/* Features Deep Dive - What You Get */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <p className="text-xs font-medium text-primary uppercase tracking-widest mb-2">Features</p>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Everything You Need</h2>
            <p className="text-muted-foreground">From discovery to outreach, fully automated</p>
          </div>

          <div className="space-y-6">
            {/* Feature 1 - Prospecting */}
            <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 md:p-8 hover:border-green-500/50 transition-all duration-300">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-green-500/10 to-transparent rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex flex-col md:flex-row gap-6">
                <div className="flex-shrink-0">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/25">
                    <Search className="w-7 h-7 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-foreground">Smart Prospecting</h3>
                    <span className="px-2 py-0.5 text-xs font-medium bg-green-500/10 text-green-500 rounded-full border border-green-500/20">3 AI Agents</span>
                  </div>
                  <p className="text-muted-foreground mb-4">AI scours Google Maps for businesses in your target industry and location. Automatically filters out competitors, chains, and poor fits.</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span>Location targeting</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span>Industry filtering</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span>Auto deduplication</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 2 - Analysis */}
            <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 md:p-8 hover:border-blue-500/50 transition-all duration-300">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex flex-col md:flex-row gap-6">
                <div className="flex-shrink-0">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                    <Eye className="w-7 h-7 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-foreground">Deep Website Analysis</h3>
                    <span className="px-2 py-0.5 text-xs font-medium bg-blue-500/10 text-blue-500 rounded-full border border-blue-500/20">6 Analyzers</span>
                  </div>
                  <p className="text-muted-foreground mb-4">Each website gets a comprehensive audit: design, SEO, mobile, accessibility, content, and social presence. Every issue comes with screenshot evidence.</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      <span>A-F letter grades</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      <span>Priority scoring</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      <span>Screenshot proof</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 3 - Reports */}
            <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 md:p-8 hover:border-orange-500/50 transition-all duration-300">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-orange-500/10 to-transparent rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex flex-col md:flex-row gap-6">
                <div className="flex-shrink-0">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/25">
                    <FileText className="w-7 h-7 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-foreground">Professional Reports</h3>
                    <span className="px-2 py-0.5 text-xs font-medium bg-orange-500/10 text-orange-500 rounded-full border border-orange-500/20">PDF Ready</span>
                  </div>
                  <p className="text-muted-foreground mb-4">AI writes executive summaries, actionable recommendations, and 30/60/90 day roadmaps. Attach to emails or send as a value-first opener.</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="w-4 h-4 text-orange-500 flex-shrink-0" />
                      <span>Executive summary</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="w-4 h-4 text-orange-500 flex-shrink-0" />
                      <span>Action roadmap</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="w-4 h-4 text-orange-500 flex-shrink-0" />
                      <span>Visual screenshots</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 4 - Outreach */}
            <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 md:p-8 hover:border-purple-500/50 transition-all duration-300">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-purple-500/10 to-transparent rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex flex-col md:flex-row gap-6">
                <div className="flex-shrink-0">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
                    <Mail className="w-7 h-7 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-foreground">Personalized Outreach</h3>
                    <span className="px-2 py-0.5 text-xs font-medium bg-purple-500/10 text-purple-500 rounded-full border border-purple-500/20">12 Variations</span>
                  </div>
                  <p className="text-muted-foreground mb-4">AI writes multiple email and social message variations based on each lead's specific issues. Pick the tone that fits your style, hit send.</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="w-4 h-4 text-purple-500 flex-shrink-0" />
                      <span>3 email strategies</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="w-4 h-4 text-purple-500 flex-shrink-0" />
                      <span>9 social variations</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="w-4 h-4 text-purple-500 flex-shrink-0" />
                      <span>Issue-specific hooks</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Why This Works - More Visual */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <p className="text-xs font-medium text-primary uppercase tracking-widest mb-2">The Advantage</p>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Why It Works</h2>
            <p className="text-muted-foreground">Built different from day one</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative p-6 rounded-2xl border border-border bg-card hover:border-primary/50 transition-all h-full">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-4">
                  <Target className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">Specialized AI Workers</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  17+ AI agents, each mastering one task. Like having a team of specialists instead of one generalist.
                </p>
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">17+</div>
                  <div className="text-xs text-muted-foreground">dedicated AI workers</div>
                </div>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-blue-500/5 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative p-6 rounded-2xl border border-border bg-card hover:border-blue-500/50 transition-all h-full">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/10 flex items-center justify-center mb-4">
                  <Eye className="w-6 h-6 text-blue-500" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">Visual Proof</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Every problem comes with screenshots. Show clients exactly what's wrong—no technical jargon needed.
                </p>
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">100%</div>
                  <div className="text-xs text-muted-foreground">issues with evidence</div>
                </div>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-green-500/5 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative p-6 rounded-2xl border border-border bg-card hover:border-green-500/50 transition-all h-full">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/20 to-green-500/10 flex items-center justify-center mb-4">
                  <Rocket className="w-6 h-6 text-green-500" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">End-to-End Automation</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  From finding businesses to writing emails—everything runs automatically. You just review and send.
                </p>
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="text-3xl font-bold bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">2 min</div>
                  <div className="text-xs text-muted-foreground">per complete analysis</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Our Story - Teaser */}
        <div className="mb-20">
          <Link href="/about" className="group block">
            <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 md:p-8 hover:border-primary/50 transition-all">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-purple-500/10 to-transparent rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex flex-col md:flex-row items-center gap-6">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
                    <span className="text-3xl">💡</span>
                  </div>
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-lg font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
                    The Story Behind This
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    It started with a designer friend spending 2+ hours per lead. There had to be a better way.
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <div className="flex items-center gap-2 text-primary font-medium">
                    <span className="hidden sm:inline">Read more</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* ROI Calculator / Value Prop */}
        <div className="mb-20">
          <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card via-card to-muted/50 p-5 md:p-12">
            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-primary/10 via-purple-500/5 to-transparent rounded-full blur-3xl" />
            <div className="relative">
              <div className="text-center mb-6 md:mb-10">
                <p className="text-xs font-medium text-primary uppercase tracking-widest mb-2">The Math</p>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-1">Your ROI Potential</h2>
                <p className="text-sm text-muted-foreground">Numbers that make sense</p>
              </div>

              {/* Stats - 2x2 grid on mobile, 4 cols on desktop */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 text-center">
                <div className="p-3 md:p-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-2">
                    <DollarSign className="w-5 h-5 md:w-6 md:h-6 text-green-500" />
                  </div>
                  <div className="text-2xl md:text-3xl font-bold text-foreground">$0.05</div>
                  <div className="text-xs md:text-sm text-muted-foreground">Per lead</div>
                </div>
                <div className="p-3 md:p-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-2">
                    <Clock className="w-5 h-5 md:w-6 md:h-6 text-blue-500" />
                  </div>
                  <div className="text-2xl md:text-3xl font-bold text-foreground">2 min</div>
                  <div className="text-xs md:text-sm text-muted-foreground">Per analysis</div>
                </div>
                <div className="p-3 md:p-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-orange-500/10 flex items-center justify-center mx-auto mb-2">
                    <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-orange-500" />
                  </div>
                  <div className="text-2xl md:text-3xl font-bold text-foreground">50x</div>
                  <div className="text-xs md:text-sm text-muted-foreground">Faster</div>
                </div>
                <div className="p-3 md:p-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-2">
                    <Zap className="w-5 h-5 md:w-6 md:h-6 text-purple-500" />
                  </div>
                  <div className="text-2xl md:text-3xl font-bold text-foreground">∞</div>
                  <div className="text-xs md:text-sm text-muted-foreground">Scalable</div>
                </div>
              </div>

              {/* ROI breakdown - compact on mobile */}
              <div className="mt-5 md:mt-8 p-4 md:p-6 rounded-2xl bg-muted/50 border border-border">
                <p className="text-xs md:text-sm text-muted-foreground text-center mb-4">
                  Close <span className="text-foreground font-semibold">1 client/month</span> from 100 leads:
                </p>

                {/* Horizontal layout on all screens, more compact */}
                <div className="flex items-center justify-center gap-2 md:gap-4 flex-wrap">
                  <div className="flex flex-col items-center px-3 py-2 md:p-4 rounded-xl bg-card border border-border">
                    <span className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider">Cost</span>
                    <span className="text-lg md:text-2xl font-bold text-foreground">$5</span>
                  </div>

                  <ArrowRight className="w-4 h-4 md:w-6 md:h-6 text-muted-foreground flex-shrink-0" />

                  <div className="flex flex-col items-center px-3 py-2 md:p-4 rounded-xl bg-card border border-border">
                    <span className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider">Revenue</span>
                    <span className="text-lg md:text-2xl font-bold text-foreground">$1k-5k+</span>
                  </div>

                  <span className="text-muted-foreground font-bold text-lg md:text-xl">=</span>

                  <div className="flex flex-col items-center px-3 py-2 md:p-4 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/10 border border-green-500/30">
                    <span className="text-[10px] md:text-xs text-green-500 uppercase tracking-wider">ROI</span>
                    <span className="text-xl md:text-3xl font-bold bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">20,000%+</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Final CTA - Full gradient background */}
        <div className="relative overflow-hidden rounded-3xl border border-border p-8 md:p-12 text-center">
          {/* Large gradient background spanning full block */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-purple-500/10 to-primary/15" />
          <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.2)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.2)_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-40" />

          <div className="relative">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Ready to Find Your Next Clients?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
              Stop searching manually. Let AI handle the prospecting, analysis, and outreach—you just close deals.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isSignedIn ? (
                <>
                  <Link href="/dashboard" className="group px-8 py-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/25">
                    Go to Dashboard
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <Link href="/prospecting" className="px-8 py-4 bg-card hover:bg-accent border border-border rounded-xl font-semibold transition-all">
                    Start Prospecting
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/sign-up" className="group px-8 py-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/25">
                    Start Free Trial
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <Link href="/sign-in" className="px-8 py-4 bg-card hover:bg-accent border border-border rounded-xl font-semibold transition-all">
                    Sign In
                  </Link>
                </>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-6">No credit card required • Start in 30 seconds</p>
          </div>
        </div>

      </div>
    </div>
  );
}
