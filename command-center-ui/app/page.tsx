'use client';

import React from 'react';
import { SignedIn, SignedOut, SignInButton, SignUpButton } from '@clerk/nextjs';
import Link from 'next/link';
import { Zap, Brain, Target, TrendingUp, Sparkles, Bot, Search, FileText, Mail, BarChart3, Shield, Rocket, ArrowRight } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-6 py-20">
        {/* Hero Section */}
        <div className="text-center mb-24">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/5 border border-primary/10 rounded-full mb-6">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Next-Generation Lead Generation</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 text-foreground">
            Maxant Agency
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
            Where <span className="text-primary font-semibold">15+ AI Agents</span> work in harmony to transform
            how you discover, analyze, and engage with potential clients.
          </p>

          {/* Auth CTAs */}
          <div className="flex gap-4 justify-center mb-12">
            <SignedOut>
              <SignUpButton mode="modal">
                <button className="px-8 py-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-semibold text-lg transition-all shadow-sm hover:shadow-md flex items-center gap-2">
                  Get Started Free
                  <ArrowRight className="w-5 h-5" />
                </button>
              </SignUpButton>
              <SignInButton mode="modal">
                <button className="px-8 py-4 bg-card hover:bg-accent border border-border rounded-lg font-semibold text-lg transition-all">
                  Sign In
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <Link href="/dashboard" className="px-8 py-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-semibold text-lg transition-all shadow-sm hover:shadow-md flex items-center gap-2">
                Go to Dashboard
                <ArrowRight className="w-5 h-5" />
              </Link>
            </SignedIn>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto mt-16">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">15+</div>
              <div className="text-sm text-muted-foreground">AI Agents</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">3</div>
              <div className="text-sm text-muted-foreground">Intelligence Engines</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">100%</div>
              <div className="text-sm text-muted-foreground">Automated Pipeline</div>
            </div>
          </div>
        </div>

        {/* The Journey */}
        <section className="mb-32">
          <div className="bg-muted/30 rounded-2xl p-12 border border-border">
            <h2 className="text-3xl font-semibold mb-6 flex items-center gap-3 text-foreground">
              <Rocket className="w-8 h-8 text-primary" />
              The Journey: From Experiment to Intelligence Engine
            </h2>
            <div className="space-y-4 text-base text-muted-foreground leading-relaxed">
              <p>
                What started as a <span className="text-foreground font-medium">simple experiment</span> in website content
                extraction has evolved into a <span className="text-foreground font-medium">sophisticated multi-agent intelligence system</span>.
              </p>
              <p>
                We didn't just build a tool—we built an <span className="text-foreground font-medium">ecosystem of AI agents</span> that
                collaborate, reason, and adapt. Each agent is a specialist, trained to excel at one critical task, from understanding
                your ideal customer profile to crafting the perfect outreach message.
              </p>
              <p>
                The result? A platform that doesn't just <span className="text-foreground font-medium">automate lead generation</span>—it
                <span className="text-foreground font-medium"> thinks strategically</span>, analyzes deeply, and
                <span className="text-foreground font-medium"> personalizes at scale</span>.
              </p>
            </div>
          </div>
        </section>

        {/* The Three Engines */}
        <section className="mb-32">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-semibold mb-4 text-foreground">The Intelligence Architecture</h2>
            <p className="text-lg text-muted-foreground">Three specialized engines, powered by 15+ AI agents working in concert</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Prospecting Engine */}
            <div className="bg-card rounded-xl p-8 border border-border hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-success/10 rounded-lg">
                  <Search className="w-7 h-7 text-success" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">Prospecting</h3>
              </div>

              <p className="text-muted-foreground mb-6 leading-relaxed">
                Where discovery meets intelligence. Our prospecting agents don't just find companies—they
                <span className="text-foreground font-medium"> understand</span> them.
              </p>

              <div className="space-y-3">
                <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
                  <div className="flex items-start gap-3">
                    <Bot className="w-4 h-4 text-success mt-1 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-foreground text-sm mb-1">ICP Understanding Agent</div>
                      <div className="text-xs text-muted-foreground leading-relaxed">
                        Translates your ideal customer profile into actionable search strategies
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
                  <div className="flex items-start gap-3">
                    <Bot className="w-4 h-4 text-success mt-1 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-foreground text-sm mb-1">Website Extraction Agent</div>
                      <div className="text-xs text-muted-foreground leading-relaxed">
                        Discovers and validates prospect websites with real-time web search
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
                  <div className="flex items-start gap-3">
                    <Bot className="w-4 h-4 text-success mt-1 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-foreground text-sm mb-1">Relevance Check Agent</div>
                      <div className="text-xs text-muted-foreground leading-relaxed">
                        Filters and validates prospects against your ICP criteria
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-border">
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Output:</span> High-quality prospects ready for deep analysis
                </div>
              </div>
            </div>

            {/* Analysis Engine */}
            <div className="bg-card rounded-xl p-8 border border-border hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Brain className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">Analysis</h3>
              </div>

              <p className="text-muted-foreground mb-6 leading-relaxed">
                The brain of the operation. <span className="text-foreground font-medium">9 specialized agents</span> dissect
                every aspect of a prospect's digital presence.
              </p>

              <div className="space-y-3">
                <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
                  <div className="flex items-start gap-3">
                    <Bot className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-foreground text-sm mb-1">Visual Analyzers (2)</div>
                      <div className="text-xs text-muted-foreground leading-relaxed">
                        Desktop & mobile design critique with GPT-4o Vision
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
                  <div className="flex items-start gap-3">
                    <Bot className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-foreground text-sm mb-1">SEO & Content (2)</div>
                      <div className="text-xs text-muted-foreground leading-relaxed">
                        Technical SEO and content quality analysis
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
                  <div className="flex items-start gap-3">
                    <Bot className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-foreground text-sm mb-1">Social & Accessibility (2)</div>
                      <div className="text-xs text-muted-foreground leading-relaxed">
                        Social media presence and WCAG compliance
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
                  <div className="flex items-start gap-3">
                    <Bot className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-foreground text-sm mb-1">Lead Priority Scorer</div>
                      <div className="text-xs text-muted-foreground leading-relaxed">
                        AI-driven qualification using 6-dimension framework
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
                  <div className="flex items-start gap-3">
                    <Bot className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-foreground text-sm mb-1">Report Synthesis (2)</div>
                      <div className="text-xs text-muted-foreground leading-relaxed">
                        Issue deduplication and executive insights generation
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-border">
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Output:</span> Comprehensive intelligence reports with actionable insights
                </div>
              </div>
            </div>

            {/* Outreach Engine */}
            <div className="bg-card rounded-xl p-8 border border-border hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-purple-500/10 rounded-lg">
                  <Mail className="w-7 h-7 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">Outreach</h3>
              </div>

              <p className="text-muted-foreground mb-6 leading-relaxed">
                Where analysis becomes action. Agents that craft
                <span className="text-foreground font-medium"> hyper-personalized messages</span> that resonate.
              </p>

              <div className="space-y-3">
                <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
                  <div className="flex items-start gap-3">
                    <Bot className="w-4 h-4 text-purple-600 mt-1 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-foreground text-sm mb-1">Email Generation Agent</div>
                      <div className="text-xs text-muted-foreground leading-relaxed">
                        Creates personalized emails using lead insights with 4+ proven strategies
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
                  <div className="flex items-start gap-3">
                    <Bot className="w-4 h-4 text-purple-600 mt-1 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-foreground text-sm mb-1">Social DM Agent</div>
                      <div className="text-xs text-muted-foreground leading-relaxed">
                        Platform-specific messages for LinkedIn, Twitter, and Instagram
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
                  <div className="flex items-start gap-3">
                    <Bot className="w-4 h-4 text-purple-600 mt-1 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-foreground text-sm mb-1">Quality Validation Agent</div>
                      <div className="text-xs text-muted-foreground leading-relaxed">
                        Scores message quality and ensures alignment with best practices
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-border">
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Output:</span> Ready-to-send personalized outreach at scale
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Technical Excellence */}
        <section className="mb-32">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-semibold mb-4 text-foreground">Built for Performance & Intelligence</h2>
            <p className="text-lg text-muted-foreground">Enterprise-grade infrastructure meets cutting-edge AI</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-card rounded-xl p-8 border border-border">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="w-7 h-7 text-primary" />
                <h3 className="text-xl font-semibold text-foreground">Supabase Integration</h3>
              </div>
              <p className="text-muted-foreground mb-4 leading-relaxed">
                Real-time PostgreSQL database with row-level security, ensuring your data is both
                fast and secure. Every prospect, analysis, and outreach message is tracked with full audit trails.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-success mt-1">✓</span>
                  <span>Real-time sync across all engines</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-success mt-1">✓</span>
                  <span>Full audit trails and history</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-success mt-1">✓</span>
                  <span>Enterprise-grade security</span>
                </li>
              </ul>
            </div>

            <div className="bg-card rounded-xl p-8 border border-border">
              <div className="flex items-center gap-3 mb-4">
                <BarChart3 className="w-7 h-7 text-success" />
                <h3 className="text-xl font-semibold text-foreground">Complete Tracking</h3>
              </div>
              <p className="text-muted-foreground mb-4 leading-relaxed">
                Every action, every analysis, every email is tracked. Monitor campaign performance,
                AI costs, success rates, and ROI in real-time.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-success mt-1">✓</span>
                  <span>Campaign performance metrics</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-success mt-1">✓</span>
                  <span>AI cost tracking per operation</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-success mt-1">✓</span>
                  <span>Lead conversion analytics</span>
                </li>
              </ul>
            </div>

            <div className="bg-card rounded-xl p-8 border border-border">
              <div className="flex items-center gap-3 mb-4">
                <Target className="w-7 h-7 text-purple-600" />
                <h3 className="text-xl font-semibold text-foreground">Project Management</h3>
              </div>
              <p className="text-muted-foreground mb-4 leading-relaxed">
                Organize your leads into projects. Each project maintains its own prospect pool,
                allowing you to run multiple campaigns with different ICPs simultaneously.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-success mt-1">✓</span>
                  <span>Multi-project isolation</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-success mt-1">✓</span>
                  <span>Smart deduplication (global + project-scoped)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-success mt-1">✓</span>
                  <span>Advanced filtering and sorting</span>
                </li>
              </ul>
            </div>

            <div className="bg-card rounded-xl p-8 border border-border">
              <div className="flex items-center gap-3 mb-4">
                <FileText className="w-7 h-7 text-primary" />
                <h3 className="text-xl font-semibold text-foreground">Rich Reports</h3>
              </div>
              <p className="text-muted-foreground mb-4 leading-relaxed">
                Generate comprehensive analysis reports in multiple formats (Markdown, HTML, PDF)
                with embedded screenshots and visual evidence.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-success mt-1">✓</span>
                  <span>Multi-format export (MD/HTML/PDF)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-success mt-1">✓</span>
                  <span>Screenshot embedding</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-success mt-1">✓</span>
                  <span>Actionable recommendations</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* What Sets Us Apart */}
        <section className="mb-32">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-semibold mb-4 text-foreground">What Sets Us Apart</h2>
            <p className="text-lg text-muted-foreground">This isn't another lead gen tool—it's an intelligence engine</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-primary/5 rounded-xl p-8 border border-primary/10">
              <div className="text-4xl mb-4">🧠</div>
              <h3 className="text-lg font-semibold mb-3 text-foreground">Multi-Agent Intelligence</h3>
              <p className="text-muted-foreground leading-relaxed">
                Not just one AI doing everything. <span className="text-foreground font-medium">15+ specialized agents</span> collaborate,
                each trained for specific tasks with different AI models, ensuring expert-level analysis at every step.
              </p>
            </div>

            <div className="bg-success/5 rounded-xl p-8 border border-success/10">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-lg font-semibold mb-3 text-foreground">Deep Understanding</h3>
              <p className="text-muted-foreground leading-relaxed">
                We don't just scrape websites. We <span className="text-foreground font-medium">understand</span> them—analyzing
                design, SEO, content strategy, competitor positioning, and business potential with human-level insight.
              </p>
            </div>

            <div className="bg-purple-500/5 rounded-xl p-8 border border-purple-500/10">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-lg font-semibold mb-3 text-foreground">Real-Time Evolution</h3>
              <p className="text-muted-foreground leading-relaxed">
                Built from the ground up to <span className="text-foreground font-medium">adapt and improve</span>. Every analysis
                makes the system smarter. Every campaign teaches it what resonates.
              </p>
            </div>

            <div className="bg-orange-500/5 rounded-xl p-8 border border-orange-500/10">
              <div className="text-4xl mb-4">🚀</div>
              <h3 className="text-lg font-semibold mb-3 text-foreground">End-to-End Automation</h3>
              <p className="text-muted-foreground leading-relaxed">
                From <span className="text-foreground font-medium">prospect discovery to sent email</span>, fully automated.
                You define the ICP, we handle everything else—including quality control and personalization.
              </p>
            </div>
          </div>
        </section>

        {/* Results Section */}
        <section className="mb-32">
          <div className="bg-muted/30 rounded-2xl p-12 border border-border text-center">
            <Zap className="w-12 h-12 text-primary mx-auto mb-6" />
            <h2 className="text-3xl font-semibold mb-6 text-foreground">The Result?</h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
              A lead generation system that doesn't just <span className="text-foreground font-medium">find companies</span>—it
              <span className="text-foreground font-medium"> understands their business</span>,
              <span className="text-foreground font-medium"> analyzes their opportunities</span>, and
              <span className="text-foreground font-medium"> crafts messages that convert</span>.
            </p>
            <div className="grid md:grid-cols-3 gap-8 max-w-3xl mx-auto">
              <div>
                <div className="text-4xl font-bold text-primary mb-2">10x</div>
                <div className="text-sm text-muted-foreground">Faster than manual prospecting</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-primary mb-2">95%</div>
                <div className="text-sm text-muted-foreground">Lead quality score</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-primary mb-2">$0.13</div>
                <div className="text-sm text-muted-foreground">Cost per deep analysis</div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/5 border border-primary/10 rounded-full mb-6">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Ready to scale your outreach?</span>
          </div>
          <h2 className="text-3xl font-semibold mb-6 text-foreground">Let the AI do the heavy lifting</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
            From simple experiment to sophisticated intelligence engine—now it's your turn to experience
            the power of multi-agent AI.
          </p>
          <div className="flex gap-4 justify-center">
            <SignedOut>
              <SignUpButton mode="modal">
                <button className="px-8 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-all shadow-sm hover:shadow-md flex items-center gap-2">
                  Get Started Free
                  <ArrowRight className="w-5 h-5" />
                </button>
              </SignUpButton>
              <SignInButton mode="modal">
                <button className="px-8 py-3 bg-card hover:bg-accent border border-border rounded-lg font-medium transition-all">
                  Sign In
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <Link href="/dashboard" className="px-8 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-all shadow-sm hover:shadow-md flex items-center gap-2">
                Go to Dashboard
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link href="/prospecting" className="px-8 py-3 bg-card hover:bg-accent border border-border rounded-lg font-medium transition-all">
                Start Prospecting
              </Link>
            </SignedIn>
          </div>
        </section>

        {/* Footer */}
        <div className="text-center text-muted-foreground pt-16 mt-16 border-t border-border">
          <p className="text-sm">
            Built with <span className="text-red-500">♥</span> using GPT-4o/5, Claude 3.5 Sonnet, and Grok-4-fast
          </p>
          <p className="text-xs mt-2 text-muted-foreground/70">
            Powered by Next.js, Supabase, and Playwright • 15+ Multi-Agent AI Architecture
          </p>
        </div>
      </div>
    </div>
  );
}
