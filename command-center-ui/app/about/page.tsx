'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Clock, Zap, X, Check, Sparkles } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-purple-500/5 to-background" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />

        <div className="relative max-w-3xl mx-auto px-6 pt-16 pb-8">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm mb-6">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-primary font-medium">Our Story</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-foreground leading-tight">
              From a Coffee Shop Conversation to 17 AI Workers
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 pb-20">

        {/* Chapter 1: The Problem */}
        <div className="mb-16">
          <p className="text-lg text-muted-foreground leading-relaxed mb-6">
            Last year, I grabbed coffee with my friend Marcus. He runs a small web design studio—just him and a part-time developer. Good clients, solid work, steady income.
          </p>
          <p className="text-lg text-muted-foreground leading-relaxed mb-6">
            But when I asked how business was going, he laughed and pulled out his laptop.
          </p>

          {/* Quote callout */}
          <div className="my-10 pl-6 border-l-4 border-primary">
            <p className="text-xl md:text-2xl font-medium text-foreground italic leading-relaxed">
              "See this spreadsheet? 847 rows. That's every restaurant, dentist, and law firm within 50 miles. I've been working through it for three months."
            </p>
          </div>

          <p className="text-lg text-muted-foreground leading-relaxed mb-6">
            His process: Pick a business. Google their website. Open it. Scroll through every page. Check if it's mobile-friendly. Look for SEO issues. Take screenshots. Write notes. Then craft a personalized email explaining exactly what he could fix and why it matters.
          </p>

          <p className="text-lg text-muted-foreground leading-relaxed mb-6">
            <span className="text-foreground font-semibold">Two hours. Per lead.</span>
          </p>

          <p className="text-lg text-muted-foreground leading-relaxed">
            And most of them never replied. The ones who did? Maybe 1 in 20 became clients. Which meant he needed to research 20 businesses just to <em>maybe</em> land one project.
          </p>
        </div>

        {/* The math - visual break */}
        <div className="grid grid-cols-3 gap-4 mb-16 p-6 rounded-2xl bg-muted/30 border border-border">
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold text-red-500">40+</div>
            <div className="text-sm text-muted-foreground mt-1">hours/week on research</div>
          </div>
          <div className="text-center border-x border-border">
            <div className="text-3xl md:text-4xl font-bold text-foreground">20</div>
            <div className="text-sm text-muted-foreground mt-1">leads to get 1 client</div>
          </div>
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold text-foreground">$0</div>
            <div className="text-sm text-muted-foreground mt-1">revenue from research</div>
          </div>
        </div>

        {/* Chapter 2: The Question */}
        <div className="mb-16">
          <p className="text-lg text-muted-foreground leading-relaxed mb-6">
            I watched him tab through browser windows, copying URLs into his spreadsheet, and something clicked.
          </p>
          <p className="text-lg text-muted-foreground leading-relaxed mb-6">
            Every single step he was doing—finding businesses, checking websites, spotting issues, writing emails—was <span className="text-foreground font-medium">pattern recognition</span>. The exact thing AI is built for.
          </p>

          {/* Quote callout */}
          <div className="my-10 pl-6 border-l-4 border-primary">
            <p className="text-xl md:text-2xl font-medium text-foreground italic leading-relaxed">
              "What if you didn't have to do any of this? What if you just told a system what kind of clients you want, and it handled everything else?"
            </p>
          </div>

          <p className="text-lg text-muted-foreground leading-relaxed">
            Marcus looked at me like I'd suggested magic. But I knew it was possible.
          </p>
        </div>

        {/* Chapter 3: Building It */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-foreground mb-6">Six Months Later</h2>

          <p className="text-lg text-muted-foreground leading-relaxed mb-6">
            I'd built the first version. It was rough—crashed constantly, missed obvious issues, wrote emails that sounded like a robot having a stroke. But the core worked.
          </p>
          <p className="text-lg text-muted-foreground leading-relaxed mb-6">
            Marcus was my first tester. He pointed at the screen: <em>"This says their mobile menu is broken. Is that real?"</em> We pulled up the site on his phone. The menu button did nothing.
          </p>
          <p className="text-lg text-muted-foreground leading-relaxed mb-6">
            <em>"And this screenshot—it actually captured the problem?"</em>
          </p>
          <p className="text-lg text-muted-foreground leading-relaxed mb-6">
            It had. The AI had found an issue in 90 seconds that would have taken him 15 minutes of clicking around to discover.
          </p>
          <p className="text-lg text-muted-foreground leading-relaxed">
            That's when I knew we had something.
          </p>
        </div>

        {/* The Transformation - Side by Side */}
        <div className="grid md:grid-cols-2 gap-6 mb-16">
          {/* The Old Way */}
          <div className="p-6 rounded-2xl border border-red-500/20 bg-card">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <Clock className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Before</h3>
            </div>
            <div className="space-y-2.5">
              {[
                'Hunt through Google Maps',
                'Check each website manually',
                'Take notes on issues',
                'Write custom emails',
                'Hope someone replies'
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <X className="w-4 h-4 text-red-500 flex-shrink-0 mt-1" />
                  <span className="text-sm text-muted-foreground">{step}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 pt-4 border-t border-red-500/20 text-sm">
              <span className="text-red-500 font-bold">2+ hours</span>
              <span className="text-muted-foreground"> per lead</span>
            </div>
          </div>

          {/* The New Way */}
          <div className="p-6 rounded-2xl border border-primary/20 bg-card">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-foreground">After</h3>
            </div>
            <div className="space-y-2.5">
              {[
                'Set your target criteria once',
                'AI finds matching businesses',
                'Auto-analyzes every website',
                'Generates personalized outreach',
                'You just review and send'
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-primary flex-shrink-0 mt-1" />
                  <span className="text-sm text-muted-foreground">{step}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 pt-4 border-t border-primary/20 text-sm">
              <span className="text-primary font-bold">~2 minutes</span>
              <span className="text-muted-foreground"> per lead</span>
            </div>
          </div>
        </div>

        {/* Chapter 4: What It Became */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-foreground mb-6">What It Became</h2>

          <p className="text-lg text-muted-foreground leading-relaxed mb-6">
            Today, Minty runs 17 specialized AI workers. Not one jack-of-all-trades model—seventeen focused agents, each doing one thing exceptionally well.
          </p>

          <p className="text-lg text-muted-foreground leading-relaxed mb-6">
            One finds businesses. One captures screenshots. One checks mobile responsiveness. One analyzes SEO. One scores accessibility. One writes subject lines. One crafts the email body. And so on.
          </p>

          <p className="text-lg text-muted-foreground leading-relaxed mb-6">
            The result? Analysis that used to take Marcus two hours now takes under two minutes. And the quality is <em>better</em>—because AI doesn't get tired at 4pm on a Friday, doesn't skip steps when it's hungry, doesn't miss issues because it's thinking about something else.
          </p>

          <p className="text-lg text-muted-foreground leading-relaxed">
            Every lead gets the same thorough, consistent review. Every email references real issues the AI actually found on that specific website. No templates. No guessing. Just data.
          </p>
        </div>

        {/* About Me - Clean and simple */}
        <div className="mb-16 p-8 rounded-2xl border border-border bg-muted/20">
          <h2 className="text-xl font-bold text-foreground mb-4">Who's Behind This</h2>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              I'm Anton. Engineer by training (Carnegie Mellon, MS), builder by obsession.
            </p>
            <p>
              I've spent the last few years deep in AI development, mostly building tools that automate the tedious stuff so people can focus on work that actually matters. When Marcus showed me his spreadsheet that day, I knew exactly what needed to exist.
            </p>
            <p>
              Minty Design Co is the result—a system that does the grunt work so designers, agencies, and freelancers can spend their time on what they're actually good at: creating great work for clients.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="relative overflow-hidden rounded-2xl border border-border p-8 md:p-10 text-center">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-purple-500/5 to-primary/10" />
          <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent" />

          <div className="relative">
            <h2 className="text-2xl md:text-3xl font-bold mb-3 text-foreground">
              Ready to get those hours back?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
              Marcus closed 3 new clients in his first month using Minty. Your future clients are out there too.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/sign-up"
                className="group px-8 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/25"
              >
                Start Free Trial
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/"
                className="px-8 py-3 bg-card hover:bg-accent border border-border rounded-xl font-semibold transition-all"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
