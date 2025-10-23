'use client';

import React from 'react';
import { Zap, Brain, Target, TrendingUp, Sparkles, Bot, Search, FileText, Mail, BarChart3, Shield, Rocket } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 text-white">
      <div className="max-w-7xl mx-auto px-6 py-16">
        {/* Hero Section */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full mb-6">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-blue-300">Next-Generation Lead Generation</span>
          </div>
          <h1 className="text-6xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent pb-4 px-2">
            Maksant Agency
          </h1>
          <p className="text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Where <span className="text-blue-400 font-semibold">15+ AI Agents</span> work in harmony to transform 
            how you discover, analyze, and engage with potential clients.
          </p>
          
          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-3xl mx-auto mt-12">
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-400 mb-2">15+</div>
              <div className="text-sm text-gray-400">AI Agents</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-400 mb-2">3</div>
              <div className="text-sm text-gray-400">Intelligence Engines</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-pink-400 mb-2">100%</div>
              <div className="text-sm text-gray-400">Automated Pipeline</div>
            </div>
          </div>
        </div>

        {/* The Journey */}
        <section className="mb-24">
          <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-2xl p-12 border border-blue-500/20">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
              <Rocket className="w-8 h-8 text-blue-400" />
              The Journey: From Experiment to Intelligence Engine
            </h2>
            <div className="space-y-4 text-lg text-gray-300 leading-relaxed">
              <p>
                What started as a <span className="text-blue-400 font-semibold">simple experiment</span> in website content 
                extraction has evolved into a <span className="text-purple-400 font-semibold">sophisticated multi-agent intelligence system</span>.
              </p>
              <p>
                We didn't just build a tool—we built an <span className="text-pink-400 font-semibold">ecosystem of AI agents</span> that 
                collaborate, reason, and adapt. Each agent is a specialist, trained to excel at one critical task, from understanding 
                your ideal customer profile to crafting the perfect outreach message.
              </p>
              <p>
                The result? A platform that doesn't just <span className="text-blue-400">automate lead generation</span>—it 
                <span className="text-purple-400 font-semibold"> thinks strategically</span>, analyzes deeply, and 
                <span className="text-pink-400 font-semibold"> personalizes at scale</span>.
              </p>
            </div>
          </div>
        </section>

        {/* The Three Engines */}
        <section className="mb-24">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">The Intelligence Architecture</h2>
            <p className="text-xl text-gray-400">Three specialized engines, powered by 12+ AI agents working in concert</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Prospecting Engine */}
            <div className="bg-gradient-to-br from-green-900/30 to-green-800/20 rounded-xl p-8 border border-green-500/30 hover:border-green-400/50 transition-all">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-green-500/20 rounded-lg">
                  <Search className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-2xl font-bold text-green-400">Prospecting Engine</h3>
              </div>
              
              <p className="text-gray-300 mb-6">
                Where discovery meets intelligence. Our prospecting agents don't just find companies—they 
                <span className="text-green-400 font-semibold"> understand</span> them.
              </p>

              <div className="space-y-4">
                <div className="bg-slate-900/50 rounded-lg p-4 border border-green-500/20">
                  <div className="flex items-start gap-3">
                    <Bot className="w-5 h-5 text-green-400 mt-1 flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-green-300 mb-1">ICP Understanding Agent</div>
                      <div className="text-sm text-gray-400">
                        Translates your ideal customer profile into actionable search strategies using semantic understanding
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/50 rounded-lg p-4 border border-green-500/20">
                  <div className="flex items-start gap-3">
                    <Bot className="w-5 h-5 text-green-400 mt-1 flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-green-300 mb-1">Website Extraction Agent</div>
                      <div className="text-sm text-gray-400">
                        Discovers and validates prospect websites with real-time web search (Grok-4-fast powered)
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/50 rounded-lg p-4 border border-green-500/20">
                  <div className="flex items-start gap-3">
                    <Bot className="w-5 h-5 text-green-400 mt-1 flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-green-300 mb-1">Relevance Check Agent</div>
                      <div className="text-sm text-gray-400">
                        Filters and validates prospects against your ICP criteria, ensuring quality over quantity
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-green-500/20">
                <div className="text-sm text-gray-400">
                  <span className="font-semibold text-green-400">Output:</span> High-quality prospects ready for deep analysis
                </div>
              </div>
            </div>

            {/* Analysis Engine */}
            <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/20 rounded-xl p-8 border border-blue-500/30 hover:border-blue-400/50 transition-all">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-blue-500/20 rounded-lg">
                  <Brain className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="text-2xl font-bold text-blue-400">Analysis Engine</h3>
              </div>
              
              <p className="text-gray-300 mb-6">
                The brain of the operation. <span className="text-blue-400 font-semibold">9 specialized agents</span> dissect 
                every aspect of a prospect's digital presence with multi-model AI power.
              </p>

              <div className="space-y-4">
                <div className="bg-slate-900/50 rounded-lg p-4 border border-blue-500/20">
                  <div className="flex items-start gap-3">
                    <Bot className="w-5 h-5 text-blue-400 mt-1 flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-blue-300 mb-1">Desktop Visual Analyzer</div>
                      <div className="text-sm text-gray-400">
                        <span className="text-blue-300">GPT-4o Vision</span> • Analyzes desktop screenshots for layout, visual hierarchy, CTA placement, and branding
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/50 rounded-lg p-4 border border-blue-500/20">
                  <div className="flex items-start gap-3">
                    <Bot className="w-5 h-5 text-blue-400 mt-1 flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-blue-300 mb-1">Mobile Visual Analyzer</div>
                      <div className="text-sm text-gray-400">
                        <span className="text-blue-300">GPT-4o Vision</span> • Mobile-specific design critique including touch targets and responsive layout
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/50 rounded-lg p-4 border border-blue-500/20">
                  <div className="flex items-start gap-3">
                    <Bot className="w-5 h-5 text-blue-400 mt-1 flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-blue-300 mb-1">SEO Analyzer</div>
                      <div className="text-sm text-gray-400">
                        <span className="text-blue-300">Grok-4-fast</span> • Technical SEO audit covering meta tags, sitemap, robots.txt, and page structure
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/50 rounded-lg p-4 border border-blue-500/20">
                  <div className="flex items-start gap-3">
                    <Bot className="w-5 h-5 text-blue-400 mt-1 flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-blue-300 mb-1">Content Analyzer</div>
                      <div className="text-sm text-gray-400">
                        <span className="text-blue-300">Grok-4-fast</span> • Content quality, messaging effectiveness, CTAs, and readability analysis
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/50 rounded-lg p-4 border border-blue-500/20">
                  <div className="flex items-start gap-3">
                    <Bot className="w-5 h-5 text-blue-400 mt-1 flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-blue-300 mb-1">Social Media Analyzer</div>
                      <div className="text-sm text-gray-400">
                        <span className="text-blue-300">Grok-4-fast</span> • Social media presence, integration quality, and Open Graph optimization
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/50 rounded-lg p-4 border border-blue-500/20">
                  <div className="flex items-start gap-3">
                    <Bot className="w-5 h-5 text-blue-400 mt-1 flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-blue-300 mb-1">Accessibility Analyzer</div>
                      <div className="text-sm text-gray-400">
                        <span className="text-blue-300">Claude 3.5 Sonnet</span> • WCAG compliance, screen reader compatibility, and keyboard navigation
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/50 rounded-lg p-4 border border-blue-500/20">
                  <div className="flex items-start gap-3">
                    <Bot className="w-5 h-5 text-blue-400 mt-1 flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-blue-300 mb-1">Lead Priority Scorer</div>
                      <div className="text-sm text-gray-400">
                        <span className="text-blue-300">GPT-5</span> • AI-driven qualification using 6-dimension framework (Quality Gap, Budget, Urgency, Industry Fit, Company Size, Engagement)
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/50 rounded-lg p-4 border border-blue-500/20">
                  <div className="flex items-start gap-3">
                    <Bot className="w-5 h-5 text-blue-400 mt-1 flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-blue-300 mb-1">Issue Deduplication Agent</div>
                      <div className="text-sm text-gray-400">
                        <span className="text-blue-300">GPT-5</span> • Consolidates redundant findings from all analyzers, reducing report redundancy by 50-70%
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/50 rounded-lg p-4 border border-blue-500/20">
                  <div className="flex items-start gap-3">
                    <Bot className="w-5 h-5 text-blue-400 mt-1 flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-blue-300 mb-1">Executive Insights Generator</div>
                      <div className="text-sm text-gray-400">
                        <span className="text-blue-300">GPT-5</span> • Creates 500-word executive summaries with 3-5 critical findings and 30/60/90 roadmaps for decision-makers
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-blue-500/20">
                <div className="text-sm text-gray-400 space-y-1">
                  <div><span className="font-semibold text-blue-400">Core Analyzers:</span> 7 agents (Desktop, Mobile, SEO, Content, Social, Accessibility, Lead Scoring)</div>
                  <div><span className="font-semibold text-blue-400">Report Synthesis:</span> 2 agents (Issue Deduplication, Executive Insights)</div>
                  <div><span className="font-semibold text-blue-400">Output:</span> Comprehensive intelligence reports with actionable insights and executive summaries</div>
                </div>
              </div>
            </div>

            {/* Outreach Engine */}
            <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/20 rounded-xl p-8 border border-purple-500/30 hover:border-purple-400/50 transition-all">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-purple-500/20 rounded-lg">
                  <Mail className="w-8 h-8 text-purple-400" />
                </div>
                <h3 className="text-2xl font-bold text-purple-400">Outreach Engine</h3>
              </div>
              
              <p className="text-gray-300 mb-6">
                Where analysis becomes action. Agents that craft 
                <span className="text-purple-400 font-semibold"> hyper-personalized messages</span> that resonate.
              </p>

              <div className="space-y-4">
                <div className="bg-slate-900/50 rounded-lg p-4 border border-purple-500/20">
                  <div className="flex items-start gap-3">
                    <Bot className="w-5 h-5 text-purple-400 mt-1 flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-purple-300 mb-1">Email Generation Agent</div>
                      <div className="text-sm text-gray-400">
                        Creates personalized emails using lead insights with 4+ proven strategies (Claude Sonnet 4.5)
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/50 rounded-lg p-4 border border-purple-500/20">
                  <div className="flex items-start gap-3">
                    <Bot className="w-5 h-5 text-purple-400 mt-1 flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-purple-300 mb-1">Social DM Agent</div>
                      <div className="text-sm text-gray-400">
                        Generates platform-specific messages for LinkedIn, Twitter, and Instagram outreach
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/50 rounded-lg p-4 border border-purple-500/20">
                  <div className="flex items-start gap-3">
                    <Bot className="w-5 h-5 text-purple-400 mt-1 flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-purple-300 mb-1">Quality Validation Agent</div>
                      <div className="text-sm text-gray-400">
                        Scores message quality and ensures alignment with best practices
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-purple-500/20">
                <div className="text-sm text-gray-400">
                  <span className="font-semibold text-purple-400">Output:</span> Ready-to-send personalized outreach at scale
                </div>
              </div>
            </div>
          </div>
        </section>


        {/* Technical Excellence */}
        <section className="mb-24">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Built for Performance & Intelligence</h2>
            <p className="text-xl text-gray-400">Enterprise-grade infrastructure meets cutting-edge AI</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-slate-900/50 rounded-xl p-8 border border-slate-700">
              <div className="flex items-center gap-3 mb-6">
                <Shield className="w-8 h-8 text-blue-400" />
                <h3 className="text-2xl font-bold">Supabase Integration</h3>
              </div>
              <p className="text-gray-300 mb-4">
                Real-time PostgreSQL database with row-level security, ensuring your data is both 
                fast and secure. Every prospect, analysis, and outreach message is tracked with full audit trails.
              </p>
              <ul className="space-y-2 text-gray-400">
                <li>✓ Real-time sync across all engines</li>
                <li>✓ Full audit trails and history</li>
                <li>✓ Enterprise-grade security</li>
                <li>✓ Automatic backups and replication</li>
              </ul>
            </div>

            <div className="bg-slate-900/50 rounded-xl p-8 border border-slate-700">
              <div className="flex items-center gap-3 mb-6">
                <BarChart3 className="w-8 h-8 text-green-400" />
                <h3 className="text-2xl font-bold">Complete Tracking</h3>
              </div>
              <p className="text-gray-300 mb-4">
                Every action, every analysis, every email is tracked. Monitor campaign performance, 
                AI costs, success rates, and ROI in real-time.
              </p>
              <ul className="space-y-2 text-gray-400">
                <li>✓ Campaign performance metrics</li>
                <li>✓ AI cost tracking per operation</li>
                <li>✓ Lead conversion analytics</li>
                <li>✓ A/B test result tracking</li>
              </ul>
            </div>

            <div className="bg-slate-900/50 rounded-xl p-8 border border-slate-700">
              <div className="flex items-center gap-3 mb-6">
                <Target className="w-8 h-8 text-purple-400" />
                <h3 className="text-2xl font-bold">Project Management</h3>
              </div>
              <p className="text-gray-300 mb-4">
                Organize your leads into projects. Each project maintains its own prospect pool, 
                allowing you to run multiple campaigns with different ICPs simultaneously.
              </p>
              <ul className="space-y-2 text-gray-400">
                <li>✓ Multi-project isolation</li>
                <li>✓ Smart deduplication (global + project-scoped)</li>
                <li>✓ Bulk operations with safety confirmations</li>
                <li>✓ Advanced filtering and sorting</li>
              </ul>
            </div>

            <div className="bg-slate-900/50 rounded-xl p-8 border border-slate-700">
              <div className="flex items-center gap-3 mb-6">
                <FileText className="w-8 h-8 text-pink-400" />
                <h3 className="text-2xl font-bold">Rich Reports</h3>
              </div>
              <p className="text-gray-300 mb-4">
                Generate comprehensive analysis reports in multiple formats (Markdown, HTML, PDF) 
                with embedded screenshots and visual evidence.
              </p>
              <ul className="space-y-2 text-gray-400">
                <li>✓ Multi-format export (MD/HTML/PDF)</li>
                <li>✓ Screenshot embedding</li>
                <li>✓ Visual design analysis with annotations</li>
                <li>✓ Actionable recommendations</li>
              </ul>
            </div>
          </div>
        </section>

        {/* What Sets Us Apart */}
        <section className="mb-24">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">What Sets Us Apart</h2>
            <p className="text-xl text-gray-400">This isn't another lead gen tool—it's an intelligence engine</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 rounded-xl p-8 border border-blue-500/30">
              <div className="text-3xl mb-4">🧠</div>
              <h3 className="text-xl font-bold mb-3">Multi-Agent Intelligence</h3>
              <p className="text-gray-300">
                Not just one AI doing everything. <span className="text-blue-400 font-semibold">15+ specialized agents</span> collaborate, 
                each trained for specific tasks with different AI models (GPT-4o/5, Claude 3.5, Grok-4), ensuring expert-level analysis at every step.
              </p>
            </div>

            <div className="bg-gradient-to-br from-green-900/20 to-blue-900/20 rounded-xl p-8 border border-green-500/30">
              <div className="text-3xl mb-4">🎯</div>
              <h3 className="text-xl font-bold mb-3">Deep Understanding</h3>
              <p className="text-gray-300">
                We don't just scrape websites. We <span className="text-green-400 font-semibold">understand</span> them—analyzing 
                design, SEO, content strategy, competitor positioning, and business potential with human-level insight.
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 rounded-xl p-8 border border-purple-500/30">
              <div className="text-3xl mb-4">⚡</div>
              <h3 className="text-xl font-bold mb-3">Real-Time Evolution</h3>
              <p className="text-gray-300">
                Built from the ground up to <span className="text-purple-400 font-semibold">adapt and improve</span>. Every analysis 
                makes the system smarter. Every campaign teaches it what resonates.
              </p>
            </div>

            <div className="bg-gradient-to-br from-pink-900/20 to-orange-900/20 rounded-xl p-8 border border-pink-500/30">
              <div className="text-3xl mb-4">🚀</div>
              <h3 className="text-xl font-bold mb-3">End-to-End Automation</h3>
              <p className="text-gray-300">
                From <span className="text-pink-400 font-semibold">prospect discovery to sent email</span>, fully automated. 
                You define the ICP, we handle everything else—including quality control and personalization.
              </p>
            </div>
          </div>
        </section>

        {/* Results Section */}
        <section className="mb-24">
          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-2xl p-12 border border-blue-500/30 text-center">
            <Zap className="w-16 h-16 text-yellow-400 mx-auto mb-6" />
            <h2 className="text-4xl font-bold mb-6">The Result?</h2>
            <p className="text-2xl text-gray-300 mb-8 max-w-4xl mx-auto leading-relaxed">
              A lead generation system that doesn't just <span className="text-blue-400 font-semibold">find companies</span>—it 
              <span className="text-purple-400 font-semibold"> understands their business</span>, 
              <span className="text-pink-400 font-semibold"> analyzes their opportunities</span>, and 
              <span className="text-green-400 font-semibold"> crafts messages that convert</span>.
            </p>
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div>
                <div className="text-5xl font-bold text-blue-400 mb-2">10x</div>
                <div className="text-gray-400">Faster than manual prospecting</div>
              </div>
              <div>
                <div className="text-5xl font-bold text-purple-400 mb-2">95%</div>
                <div className="text-gray-400">Lead quality score</div>
              </div>
              <div>
                <div className="text-5xl font-bold text-pink-400 mb-2">$0.13</div>
                <div className="text-gray-400">Cost per deep analysis</div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-full mb-6">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-blue-300">Ready to scale your outreach?</span>
          </div>
          <h2 className="text-4xl font-bold mb-6">Let the AI do the heavy lifting</h2>
          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            From simple experiment to sophisticated intelligence engine—now it's your turn to experience 
            the power of multi-agent AI.
          </p>
          <div className="flex gap-4 justify-center">
            <a
              href="/"
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-lg font-semibold transition-all transform hover:scale-105"
            >
              Go to Dashboard
            </a>
            <a
              href="/prospecting"
              className="px-8 py-4 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg font-semibold transition-all"
            >
              Start Prospecting
            </a>
          </div>
        </section>

        {/* Footer */}
        <div className="text-center text-gray-500 pt-16 mt-16 border-t border-slate-800">
          <p className="text-sm">
            Built with <span className="text-red-400">♥</span> using GPT-4o/5, Claude 3.5 Sonnet, and Grok-4-fast
          </p>
          <p className="text-xs mt-2 text-gray-600">
            Powered by Next.js, Supabase, and Playwright • 15+ Multi-Agent AI Architecture
          </p>
        </div>
      </div>
    </div>
  );
}

