import React from 'react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Maksant Agency
          </h1>
          <p className="text-xl text-gray-300">
            AI-Powered Lead Generation & Outreach Platform
          </p>
        </div>

        {/* Overview */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-6 text-blue-400">What is Maksant Agency?</h2>
          <p className="text-gray-300 text-lg leading-relaxed mb-4">
            Maksant Agency is a comprehensive lead generation platform that combines multiple AI agents
            to automate the entire process of finding, analyzing, and reaching out to potential clients.
            The system uses advanced AI models from OpenAI, Anthropic, and xAI to deliver intelligent,
            personalized outreach at scale.
          </p>
          <p className="text-gray-300 text-lg leading-relaxed">
            Built on a modular architecture, the platform consists of four integrated services that
            work together seamlessly: Prospect Generation, Website Analysis, Lead Management, and
            Email Composition.
          </p>
        </section>

        {/* The Process */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-blue-400">How It Works: The 4-Step Process</h2>

          <div className="space-y-6">
            {/* Step 1 */}
            <div className="bg-gray-800 rounded-lg p-6 border-l-4 border-green-500">
              <div className="flex items-start">
                <div className="flex-shrink-0 w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-xl font-bold mr-4">
                  1
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-semibold mb-3 text-green-400">Generate Prospects</h3>
                  <p className="text-gray-300 mb-2">
                    Define your Ideal Customer Profile (ICP) and let AI find matching companies.
                  </p>
                  <ul className="list-disc list-inside text-gray-400 space-y-1">
                    <li>AI-powered web search using Grok-4-fast model</li>
                    <li>URL verification ensures valid websites</li>
                    <li>Batch processing (5-50 prospects at once)</li>
                    <li>Saved to database with status tracking</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-gray-800 rounded-lg p-6 border-l-4 border-blue-500">
              <div className="flex items-start">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-xl font-bold mr-4">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-semibold mb-3 text-blue-400">Analyze Websites</h3>
                  <p className="text-gray-300 mb-2">
                    Deep AI analysis of each prospect's website using 8 specialized agents.
                  </p>
                  <ul className="list-disc list-inside text-gray-400 space-y-1">
                    <li>Automated browser testing with Playwright</li>
                    <li>Screenshot analysis using vision AI</li>
                    <li>Contact information extraction</li>
                    <li>Industry and competitor intelligence</li>
                    <li>SEO and design quality assessment</li>
                    <li>Lead grading (A-F) based on fit and opportunity</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-gray-800 rounded-lg p-6 border-l-4 border-purple-500">
              <div className="flex items-start">
                <div className="flex-shrink-0 w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-xl font-bold mr-4">
                  3
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-semibold mb-3 text-purple-400">Review & Filter Leads</h3>
                  <p className="text-gray-300 mb-2">
                    Browse analyzed leads with powerful filtering and sorting capabilities.
                  </p>
                  <ul className="list-disc list-inside text-gray-400 space-y-1">
                    <li>Filter by lead grade (A-F)</li>
                    <li>Filter by industry vertical</li>
                    <li>Filter by email availability</li>
                    <li>View detailed analysis for each lead</li>
                    <li>Select leads for outreach campaigns</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="bg-gray-800 rounded-lg p-6 border-l-4 border-orange-500">
              <div className="flex items-start">
                <div className="flex-shrink-0 w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-xl font-bold mr-4">
                  4
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-semibold mb-3 text-orange-400">Compose & Send Emails</h3>
                  <p className="text-gray-300 mb-2">
                    Generate hyper-personalized outreach emails using AI.
                  </p>
                  <ul className="list-disc list-inside text-gray-400 space-y-1">
                    <li>Multiple email strategies (compliment-sandwich, problem-first, etc.)</li>
                    <li>A/B variant generation for testing</li>
                    <li>Quality validation and scoring</li>
                    <li>Notion integration for tracking</li>
                    <li>Export to clipboard or CSV</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* AI Agents */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-blue-400">AI Agents & Modules</h2>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Prospect Generator */}
            <div className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors">
              <h3 className="text-xl font-semibold mb-3 text-green-400">🎯 Prospect Generator</h3>
              <p className="text-gray-400 mb-2">
                Uses Grok-4-fast with real-time web search to find companies matching your ICP.
              </p>
              <div className="text-sm text-gray-500">
                <strong>Models:</strong> Grok-4-fast (recommended), GPT-4o, Claude Sonnet
              </div>
            </div>

            {/* Website Crawler */}
            <div className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors">
              <h3 className="text-xl font-semibold mb-3 text-blue-400">🕷️ Website Crawler</h3>
              <p className="text-gray-400 mb-2">
                Discovers all pages and sections using Playwright browser automation.
              </p>
              <div className="text-sm text-gray-500">
                <strong>Tech:</strong> Playwright, DOM analysis, page hierarchy mapping
              </div>
            </div>

            {/* Industry Analysis */}
            <div className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors">
              <h3 className="text-xl font-semibold mb-3 text-purple-400">🏭 Industry Analyzer</h3>
              <p className="text-gray-400 mb-2">
                Detects company industry and provides industry-specific best practices.
              </p>
              <div className="text-sm text-gray-500">
                <strong>Models:</strong> GPT-4o, Claude Sonnet, GPT-4o-mini
              </div>
            </div>

            {/* SEO Audit */}
            <div className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors">
              <h3 className="text-xl font-semibold mb-3 text-yellow-400">📊 SEO Audit Agent</h3>
              <p className="text-gray-400 mb-2">
                Analyzes meta tags, headings, keywords, and technical SEO elements.
              </p>
              <div className="text-sm text-gray-500">
                <strong>Analysis:</strong> On-page SEO, sitemap, robots.txt, optimization tips
              </div>
            </div>

            {/* Visual Design */}
            <div className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors">
              <h3 className="text-xl font-semibold mb-3 text-pink-400">🎨 Visual Design Analyzer</h3>
              <p className="text-gray-400 mb-2">
                Captures screenshots and uses vision AI to assess UI/UX quality.
              </p>
              <div className="text-sm text-gray-500">
                <strong>Models:</strong> GPT-4o (vision), Claude Sonnet (vision)
              </div>
            </div>

            {/* Competitor Intel */}
            <div className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors">
              <h3 className="text-xl font-semibold mb-3 text-red-400">🔍 Competitor Intelligence</h3>
              <p className="text-gray-400 mb-2">
                Discovers competitor websites and analyzes market positioning.
              </p>
              <div className="text-sm text-gray-500">
                <strong>Insights:</strong> Positioning, messaging, market opportunities
              </div>
            </div>

            {/* Contact Extractor */}
            <div className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors">
              <h3 className="text-xl font-semibold mb-3 text-teal-400">📧 Contact Extractor</h3>
              <p className="text-gray-400 mb-2">
                Finds contact names, email addresses, and leadership information.
              </p>
              <div className="text-sm text-gray-500">
                <strong>Sources:</strong> About pages, Team pages, Contact forms, Leadership bios
              </div>
            </div>

            {/* Company Intel */}
            <div className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors">
              <h3 className="text-xl font-semibold mb-3 text-indigo-400">🏢 Company Intelligence</h3>
              <p className="text-gray-400 mb-2">
                Researches company background, size, and key business information.
              </p>
              <div className="text-sm text-gray-500">
                <strong>Data:</strong> Company size, location, services, portfolio
              </div>
            </div>

            {/* Social Finder */}
            <div className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors">
              <h3 className="text-xl font-semibold mb-3 text-cyan-400">📱 Social Media Finder</h3>
              <p className="text-gray-400 mb-2">
                Discovers and validates social media profiles across platforms.
              </p>
              <div className="text-sm text-gray-500">
                <strong>Platforms:</strong> LinkedIn, Twitter, Instagram, Facebook
              </div>
            </div>

            {/* Email Composer */}
            <div className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors">
              <h3 className="text-xl font-semibold mb-3 text-orange-400">✉️ Email Composer Agent</h3>
              <p className="text-gray-400 mb-2">
                Generates personalized emails using lead data and multiple strategies.
              </p>
              <div className="text-sm text-gray-500">
                <strong>Features:</strong> A/B testing, quality scoring, Notion sync
              </div>
            </div>
          </div>
        </section>

        {/* Tech Stack */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-blue-400">Tech Stack</h2>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Frontend */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 text-blue-300">Frontend</h3>
              <ul className="space-y-2 text-gray-400">
                <li>• Next.js 14</li>
                <li>• React 18</li>
                <li>• TypeScript</li>
                <li>• Tailwind CSS</li>
              </ul>
            </div>

            {/* Backend */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 text-green-300">Backend</h3>
              <ul className="space-y-2 text-gray-400">
                <li>• Node.js (ES Modules)</li>
                <li>• Express.js</li>
                <li>• Playwright</li>
                <li>• Supabase</li>
              </ul>
            </div>

            {/* AI Models */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 text-purple-300">AI Models</h3>
              <ul className="space-y-2 text-gray-400">
                <li>• OpenAI GPT-4o/5</li>
                <li>• Claude Sonnet 4.5</li>
                <li>• Grok-4 (xAI)</li>
                <li>• Vision AI</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Analysis Tiers */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-blue-400">Analysis Depth Tiers</h2>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-green-900 to-green-800 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-3">Tier 1: Basic</h3>
              <p className="text-gray-200 text-sm mb-4">Quick homepage analysis and contact extraction</p>
              <div className="text-sm text-gray-300">
                <strong>Time:</strong> ~30 seconds<br/>
                <strong>Cost:</strong> ~$0.02/lead
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-3">Tier 2: Comprehensive</h3>
              <p className="text-gray-200 text-sm mb-4">Page crawling, industry analysis, SEO audit</p>
              <div className="text-sm text-gray-300">
                <strong>Time:</strong> ~2 minutes<br/>
                <strong>Cost:</strong> ~$0.05/lead
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-900 to-purple-800 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-3">Tier 3: Deep</h3>
              <p className="text-gray-200 text-sm mb-4">Full analysis with competitor intel and visual design</p>
              <div className="text-sm text-gray-300">
                <strong>Time:</strong> ~5 minutes<br/>
                <strong>Cost:</strong> ~$0.13/lead
              </div>
            </div>
          </div>
        </section>

        {/* Platform Architecture */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-blue-400">Platform Architecture</h2>

          <div className="bg-gray-800 rounded-lg p-8">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold mb-4 text-blue-300">Services</h3>
                <ul className="space-y-2 text-gray-400">
                  <li><strong className="text-white">Command Center UI</strong> - Next.js dashboard (Port 3000)</li>
                  <li><strong className="text-white">Client Orchestrator</strong> - Prospect generator (Port 3010)</li>
                  <li><strong className="text-white">Website Audit Tool</strong> - Analyzer service (Port 3000)</li>
                  <li><strong className="text-white">Email Composer</strong> - Email generation (Port 3001)</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4 text-green-300">Database Tables</h3>
                <ul className="space-y-2 text-gray-400">
                  <li><strong className="text-white">prospects</strong> - Generated leads (pending → analyzed)</li>
                  <li><strong className="text-white">leads</strong> - Analyzed websites with grades A-F</li>
                  <li><strong className="text-white">composed_emails</strong> - Generated personalized emails</li>
                </ul>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-purple-300">Key Features</h3>
              <div className="grid md:grid-cols-2 gap-4 text-gray-400">
                <div>
                  <li className="mb-2">✓ Modular, independently deployable services</li>
                  <li className="mb-2">✓ Unified Supabase database</li>
                  <li className="mb-2">✓ API-first design pattern</li>
                  <li>✓ Real-time progress tracking</li>
                </div>
                <div>
                  <li className="mb-2">✓ Multi-AI model support</li>
                  <li className="mb-2">✓ Cost tracking and optimization</li>
                  <li className="mb-2">✓ Batch processing capabilities</li>
                  <li>✓ Notion integration</li>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="text-center text-gray-500 pt-8 border-t border-gray-800">
          <p>Built with AI • Powered by OpenAI, Anthropic & xAI</p>
          <p className="mt-2">
            <a href="/" className="text-blue-400 hover:text-blue-300 transition-colors">
              ← Back to Dashboard
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
