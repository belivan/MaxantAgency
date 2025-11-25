'use client';

import React from 'react';
import { SignedIn, SignedOut, SignInButton, SignUpButton } from '@clerk/nextjs';
import Link from 'next/link';
import { Zap, Brain, Target, TrendingUp, Sparkles, Bot, Search, FileText, Mail, BarChart3, Shield, Rocket, ArrowRight, FileCode, Layers, Clock } from 'lucide-react';

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
            Minty Design Co
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
            Where <span className="text-primary font-semibold">17+ AI Agents</span> work in harmony across <span className="text-primary font-semibold">4 specialized engines</span> to transform
            how you discover, analyze, report, and engage with potential clients.
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
          <div className="grid grid-cols-4 gap-6 max-w-3xl mx-auto mt-16">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">17+</div>
              <div className="text-sm text-muted-foreground">AI Agents</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">4</div>
              <div className="text-sm text-muted-foreground">Specialized Engines</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">3.5m</div>
              <div className="text-sm text-muted-foreground">Report Generation</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">100%</div>
              <div className="text-sm text-muted-foreground">Automated Pipeline</div>
            </div>
          </div>
        </div>

        {/* The Journey */}
        <section className="mb-32">
          <div className="bg-gradient-to-br from-primary/5 via-muted/30 to-orange-500/5 rounded-2xl p-12 border border-border shadow-sm">
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
                Then we realized something crucial: <span className="text-foreground font-medium">raw analysis data isn't enough</span>.
                Agencies need <span className="text-foreground font-medium">client-ready reports</span> with executive summaries,
                strategic roadmaps, and professional presentation. So we built a <span className="text-foreground font-medium">dedicated Report Engine</span> with
                AI-powered synthesis that transforms technical findings into <span className="text-foreground font-medium">business intelligence</span>.
              </p>
              <p>
                The result? A platform that doesn't just <span className="text-foreground font-medium">automate lead generation</span>—it
                <span className="text-foreground font-medium"> thinks strategically</span>, analyzes deeply,
                <span className="text-foreground font-medium"> synthesizes intelligently</span>, and
                <span className="text-foreground font-medium"> personalizes at scale</span>.
              </p>
            </div>
          </div>
        </section>

        {/* The Four Engines */}
        <section className="mb-32">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-semibold mb-4 text-foreground">The Intelligence Architecture</h2>
            <p className="text-lg text-muted-foreground">Four specialized engines, powered by 17+ AI agents working in concert</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-8">
            {/* Prospecting Engine */}
            <div className="bg-gradient-to-br from-success/5 via-card to-card rounded-xl p-8 border border-success/20 hover:shadow-lg hover:border-success/30 transition-all">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-success/10 rounded-lg">
                  <Search className="w-7 h-7 text-success" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-foreground">Prospecting Engine</h3>
                </div>
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
            <div className="bg-gradient-to-br from-primary/5 via-card to-card rounded-xl p-8 border border-primary/20 hover:shadow-lg hover:border-primary/30 transition-all">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Brain className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-foreground">Analysis Engine</h3>
                </div>
              </div>

              <p className="text-muted-foreground mb-6 leading-relaxed">
                The brain of the operation. <span className="text-foreground font-medium">7 specialized agents</span> dissect
                every aspect of a prospect's digital presence with deep intelligence.
              </p>

              <div className="space-y-3">
                <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
                  <div className="flex items-start gap-3">
                    <Bot className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-foreground text-sm mb-1">Visual Analyzers (2)</div>
                      <div className="text-xs text-muted-foreground leading-relaxed">
                        Desktop & mobile design critique with AI vision analysis
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
                      <div className="font-medium text-foreground text-sm mb-1">AI Grader</div>
                      <div className="text-xs text-muted-foreground leading-relaxed">
                        Assigns A-F website grades and Hot/Warm/Cold lead priority scores
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-border">
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Output:</span> Structured analysis data with A-F grading and comprehensive insights
                </div>
              </div>
            </div>

            {/* Report Engine */}
            <div className="bg-gradient-to-br from-orange-500/5 via-card to-card rounded-xl p-8 border border-orange-500/20 hover:shadow-lg hover:border-orange-500/30 transition-all">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-orange-500/10 rounded-lg">
                  <FileCode className="w-7 h-7 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-foreground">Report Engine</h3>
                </div>
              </div>

              <p className="text-muted-foreground mb-6 leading-relaxed">
                Transforms raw analysis into <span className="text-foreground font-medium">client-ready intelligence</span>.
                AI-powered synthesis creates <span className="text-foreground font-medium">professional reports</span> that close deals.
              </p>

              <div className="space-y-3">
                <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
                  <div className="flex items-start gap-3">
                    <Bot className="w-4 h-4 text-orange-600 mt-1 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-foreground text-sm mb-1">Issue Deduplication Agent</div>
                      <div className="text-xs text-muted-foreground leading-relaxed">
                        Consolidates 40-70% of redundant findings using AI synthesis
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
                  <div className="flex items-start gap-3">
                    <Bot className="w-4 h-4 text-orange-600 mt-1 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-foreground text-sm mb-1">Executive Insights Generator</div>
                      <div className="text-xs text-muted-foreground leading-relaxed">
                        Creates business-friendly summaries with 30/60/90 day roadmaps
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
                  <div className="flex items-start gap-3">
                    <Bot className="w-4 h-4 text-orange-600 mt-1 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-foreground text-sm mb-1">Multi-Format Exporter</div>
                      <div className="text-xs text-muted-foreground leading-relaxed">
                        Generates HTML, Markdown, and PDF reports with screenshot evidence
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-border">
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Output:</span> Client-ready reports in 3.5 minutes
                </div>
              </div>
            </div>

            {/* Outreach Engine */}
            <div className="bg-gradient-to-br from-purple-500/5 via-card to-card rounded-xl p-8 border border-purple-500/20 hover:shadow-lg hover:border-purple-500/30 transition-all">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-purple-500/10 rounded-lg">
                  <Mail className="w-7 h-7 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-foreground">Outreach Engine</h3>
                </div>
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

          {/* Pipeline Orchestrator */}
          <div className="mt-12 bg-gradient-to-r from-primary/10 via-orange-500/10 to-purple-500/10 rounded-xl p-8 border border-primary/20">
            <div className="flex items-center gap-3 mb-4">
              <Layers className="w-8 h-8 text-primary" />
              <div>
                <h3 className="text-2xl font-semibold text-foreground">Pipeline Orchestrator</h3>
                <p className="text-sm text-muted-foreground">The Automation Brain</p>
              </div>
            </div>
            <p className="text-muted-foreground leading-relaxed mb-4">
              The conductor of the symphony. <span className="text-foreground font-medium">Coordinates all 4 engines</span> to execute
              multi-lead campaigns with precision timing, batch processing, and real-time progress tracking.
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-card/50 rounded-lg p-4 border border-border/50">
                <div className="text-sm font-medium text-foreground mb-1">Campaign Scheduling</div>
                <div className="text-xs text-muted-foreground">Automated workflows with custom timing</div>
              </div>
              <div className="bg-card/50 rounded-lg p-4 border border-border/50">
                <div className="text-sm font-medium text-foreground mb-1">Batch Processing</div>
                <div className="text-xs text-muted-foreground">Parallel execution across multiple leads</div>
              </div>
              <div className="bg-card/50 rounded-lg p-4 border border-border/50">
                <div className="text-sm font-medium text-foreground mb-1">Progress Tracking</div>
                <div className="text-xs text-muted-foreground">Real-time SSE updates and error handling</div>
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

            <div className="bg-gradient-to-br from-orange-500/5 to-card rounded-xl p-8 border border-orange-500/20">
              <div className="flex items-center gap-3 mb-4">
                <FileCode className="w-7 h-7 text-orange-600" />
                <h3 className="text-xl font-semibold text-foreground">AI-Powered Reports</h3>
              </div>
              <p className="text-muted-foreground mb-4 leading-relaxed">
                Dedicated Report Engine with AI synthesis that consolidates findings and generates
                executive summaries. Professional reports in MD/HTML/PDF with 30/60/90 roadmaps.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-success mt-1">✓</span>
                  <span>40-70% noise reduction via AI deduplication</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-success mt-1">✓</span>
                  <span>Executive insights with business impact</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-success mt-1">✓</span>
                  <span>Multi-format export with screenshot evidence</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-success mt-1">✓</span>
                  <span>Strategic 30/60/90 day roadmaps</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Report Intelligence */}
        <section className="mb-32">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-semibold mb-4 text-foreground">Report Intelligence</h2>
            <p className="text-lg text-muted-foreground">Professional reports that convert prospects into clients</p>
          </div>

          <div className="bg-gradient-to-br from-orange-500/10 via-primary/5 to-purple-500/10 rounded-2xl p-12 border border-orange-500/20">
            <div className="mb-8">
              <h3 className="text-2xl font-semibold mb-6 text-foreground">What's Included in Every Report</h3>
              <p className="text-muted-foreground leading-relaxed mb-8">
                Our AI-powered Report Engine generates comprehensive, client-ready reports that provide deep insights and strategic guidance.
                Each report contains 8 essential sections designed to demonstrate value and guide improvement.
              </p>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-card/50 rounded-lg p-6 border border-border/50">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">📊</div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Executive Summary</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        AI-generated business overview that speaks the client's language. Includes headline assessment,
                        key findings, and opportunity positioning without technical jargon.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-card/50 rounded-lg p-6 border border-border/50">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">🎯</div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Industry Benchmarking</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Competitive analysis showing how the website stacks up against industry leaders.
                        Identifies gaps and opportunities for differentiation.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-card/50 rounded-lg p-6 border border-border/50">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">⚡</div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Priority Action Plan</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Top 5-7 critical improvements ranked by impact and effort.
                        Clear, actionable recommendations with expected ROI for each fix.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-card/50 rounded-lg p-6 border border-border/50">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">📅</div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">30/60/90 Day Timeline</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Strategic roadmap breaking down improvements into manageable phases.
                        Helps clients understand the journey from quick wins to long-term optimization.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-card/50 rounded-lg p-6 border border-border/50">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">🔍</div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Complete Issues Analysis</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Comprehensive findings from all 6 AI analyzers: Design, SEO, Content, Social,
                        and Accessibility. Each issue linked to evidence and impact assessment.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-card/50 rounded-lg p-6 border border-border/50">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">⚙️</div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Technical Deep Dive</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Performance metrics, Core Web Vitals, tech stack analysis, and infrastructure
                        recommendations for developers and technical teams.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-card/50 rounded-lg p-6 border border-border/50">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">♿</div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">WCAG Compliance</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Detailed accessibility audit with WCAG 2.1 compliance breakdown.
                        Ensures websites are usable by all visitors and meet legal requirements.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-card/50 rounded-lg p-6 border border-border/50">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">📸</div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Screenshot Gallery</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Visual evidence with desktop and mobile screenshots. All findings linked
                        to specific visual elements for clear, undeniable proof of issues.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-xl p-6 border border-border">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-foreground">The Result</h4>
                <div className="text-sm text-muted-foreground">
                  <span className="text-foreground font-medium">Client-ready in 3.5 minutes</span>
                </div>
              </div>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Professional reports that demonstrate immediate value. Every finding backed by evidence,
                every recommendation tied to business impact, and every insight designed to close deals.
              </p>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-2xl font-bold text-primary mb-1">8</div>
                  <div className="text-xs text-muted-foreground">Comprehensive sections</div>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-2xl font-bold text-primary mb-1">100%</div>
                  <div className="text-xs text-muted-foreground">Evidence-backed findings</div>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-2xl font-bold text-primary mb-1">3</div>
                  <div className="text-xs text-muted-foreground">Export formats (HTML/MD/PDF)</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* What Sets Us Apart */}
        <section className="mb-32">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-semibold mb-4 text-foreground">What Sets Us Apart</h2>
            <p className="text-lg text-muted-foreground">This isn't another lead gen tool—it's an intelligence engine</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-primary/5 rounded-xl p-8 border border-primary/10 hover:shadow-md transition-shadow">
              <div className="text-4xl mb-4">🧠</div>
              <h3 className="text-lg font-semibold mb-3 text-foreground">Multi-Agent Intelligence</h3>
              <p className="text-muted-foreground leading-relaxed">
                Not just one AI doing everything. <span className="text-foreground font-medium">17+ specialized agents</span> collaborate across
                <span className="text-foreground font-medium"> 4 engines</span>, each trained for specific tasks with different AI models.
              </p>
            </div>

            <div className="bg-success/5 rounded-xl p-8 border border-success/10 hover:shadow-md transition-shadow">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-lg font-semibold mb-3 text-foreground">Deep Understanding</h3>
              <p className="text-muted-foreground leading-relaxed">
                We don't just scrape websites. We <span className="text-foreground font-medium">understand</span> them—analyzing
                design, SEO, content strategy, competitor positioning, and business potential with human-level insight.
              </p>
            </div>

            <div className="bg-orange-500/5 rounded-xl p-8 border border-orange-500/10 hover:shadow-md transition-shadow">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-lg font-semibold mb-3 text-foreground">Client-Ready Reports</h3>
              <p className="text-muted-foreground leading-relaxed">
                Dedicated Report Engine with <span className="text-foreground font-medium">AI synthesis</span> that transforms technical data into
                <span className="text-foreground font-medium"> professional presentations</span> with executive summaries and strategic roadmaps.
              </p>
            </div>

            <div className="bg-purple-500/5 rounded-xl p-8 border border-purple-500/10 hover:shadow-md transition-shadow">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-lg font-semibold mb-3 text-foreground">Real-Time Evolution</h3>
              <p className="text-muted-foreground leading-relaxed">
                Built from the ground up to <span className="text-foreground font-medium">adapt and improve</span>. Every analysis
                makes the system smarter. Every campaign teaches it what resonates.
              </p>
            </div>

            <div className="bg-orange-500/5 rounded-xl p-8 border border-orange-500/10 hover:shadow-md transition-shadow">
              <div className="text-4xl mb-4">🚀</div>
              <h3 className="text-lg font-semibold mb-3 text-foreground">End-to-End Automation</h3>
              <p className="text-muted-foreground leading-relaxed">
                From <span className="text-foreground font-medium">prospect discovery to professional report</span>, fully automated.
                You define the ICP, we handle discovery, analysis, synthesis, and personalized outreach.
              </p>
            </div>

            <div className="bg-primary/5 rounded-xl p-8 border border-primary/10 hover:shadow-md transition-shadow">
              <div className="text-4xl mb-4">💎</div>
              <h3 className="text-lg font-semibold mb-3 text-foreground">Microservices Architecture</h3>
              <p className="text-muted-foreground leading-relaxed">
                <span className="text-foreground font-medium">4 independent engines</span> that scale separately. Update reports without
                touching analysis. Run campaigns while prospects are discovered. True parallel intelligence.
              </p>
            </div>
          </div>
        </section>

        {/* Results Section */}
        <section className="mb-32">
          <div className="bg-gradient-to-br from-primary/10 via-muted/30 to-orange-500/10 rounded-2xl p-12 border border-primary/20 text-center shadow-sm">
            <Zap className="w-12 h-12 text-primary mx-auto mb-6" />
            <h2 className="text-3xl font-semibold mb-6 text-foreground">The Result?</h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
              A lead generation system that doesn't just <span className="text-foreground font-medium">find companies</span>—it
              <span className="text-foreground font-medium"> understands their business</span>,
              <span className="text-foreground font-medium"> analyzes their opportunities</span>,
              <span className="text-foreground font-medium"> generates professional reports</span>, and
              <span className="text-foreground font-medium"> crafts messages that convert</span>.
            </p>
            <div className="grid md:grid-cols-4 gap-6 max-w-4xl mx-auto">
              <div className="bg-card/50 rounded-xl p-6 border border-border">
                <div className="text-4xl font-bold text-primary mb-2">10x</div>
                <div className="text-sm text-muted-foreground">Faster than manual prospecting</div>
              </div>
              <div className="bg-card/50 rounded-xl p-6 border border-border">
                <div className="text-4xl font-bold text-primary mb-2">95%</div>
                <div className="text-sm text-muted-foreground">Lead quality score</div>
              </div>
              <div className="bg-card/50 rounded-xl p-6 border border-border">
                <div className="text-4xl font-bold text-orange-600 mb-2">3.5m</div>
                <div className="text-sm text-muted-foreground">Client-ready report generation</div>
              </div>
              <div className="bg-card/50 rounded-xl p-6 border border-border">
                <div className="text-4xl font-bold text-primary mb-2">~$0.10*</div>
                <div className="text-sm text-muted-foreground">Average cost per lead</div>
              </div>
            </div>
            <div className="mt-6 text-center">
              <p className="text-xs text-muted-foreground italic">
                *Subject to AI model selection and usage patterns
              </p>
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
            Built with <span className="text-red-500">♥</span> using Claude Code by Anton Yanovich
          </p>
          <p className="text-xs mt-2 text-muted-foreground/70">
            Powered by Next.js, Supabase, and Playwright • 17+ Multi-Agent AI Architecture across 4 Specialized Engines
          </p>
        </div>
      </div>
    </div>
  );
}
