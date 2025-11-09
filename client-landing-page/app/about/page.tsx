'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { BarChart3, Brain, Palette, TrendingUp, Target, Zap, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CTASection } from '@/components/cta-section'

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background dark:from-primary/10" />

        {/* Animated grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

        <div className="container relative z-10 px-4 py-20 mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center space-y-6"
          >
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight"
            >
              We Build Websites That
              <br />
              <span className="text-primary">Actually Convert</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed"
            >
              Data-driven design powered by AI. No guesswork, no fluff—just websites that turn visitors into customers.
            </motion.p>
          </motion.div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* Mission Statement */}
      <section className="py-20 bg-background">
        <div className="container px-4 mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center space-y-6"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary border border-primary/20">
              <Target className="w-4 h-4" />
              <span className="text-sm font-medium">Our Mission</span>
            </div>

            <p className="text-2xl md:text-3xl font-medium leading-relaxed text-foreground">
              Too many businesses are losing customers to poorly designed websites. We use the latest AI tools and professional design expertise to create websites that don't just look good—they{' '}
              <span className="text-primary font-bold">drive real business results</span>.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Our Approach */}
      <section className="py-20 bg-muted/30">
        <div className="container px-4 mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center space-y-4 mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
              Our Approach
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Three pillars that set us apart
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: BarChart3,
                title: 'Analysis-Driven Design',
                description: "We start with data, not assumptions. Every design decision is backed by comprehensive analysis of what works in your industry and what doesn't.",
                color: 'text-blue-500',
                bgColor: 'bg-blue-500/10',
              },
              {
                icon: Brain,
                title: 'AI-Powered Insights',
                description: 'We leverage cutting-edge AI to analyze thousands of data points across design, SEO, content, and user experience—focusing only on what matters for conversion.',
                color: 'text-purple-500',
                bgColor: 'bg-purple-500/10',
              },
              {
                icon: Palette,
                title: 'Professional Craftsmanship',
                description: 'AI gives us the insights, but human designers bring the vision to life. The result? Websites that are both data-optimized and beautifully crafted.',
                color: 'text-emerald-500',
                bgColor: 'bg-emerald-500/10',
              },
            ].map((approach, index) => {
              const Icon = approach.icon
              return (
                <motion.div
                  key={approach.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.2 }}
                  viewport={{ once: true }}
                >
                  <Card className="h-full border-2 hover:border-primary/50 transition-colors">
                    <CardContent className="pt-8 pb-6 space-y-4">
                      <div className={`w-14 h-14 rounded-xl ${approach.bgColor} flex items-center justify-center`}>
                        <Icon className={`w-7 h-7 ${approach.color}`} />
                      </div>

                      <h3 className="text-xl font-bold tracking-tight">
                        {approach.title}
                      </h3>

                      <p className="text-muted-foreground leading-relaxed">
                        {approach.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Why We're Different */}
      <section className="py-20 bg-background">
        <div className="container px-4 mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center space-y-4 mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
              Why We're Different
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              A new approach to web design
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {[
              {
                icon: BarChart3,
                title: 'Data Before Design',
                description: 'We analyze your competitors and industry leaders before touching a single pixel. No guesswork, just proven patterns.',
              },
              {
                icon: TrendingUp,
                title: 'Conversion-Focused',
                description: 'Pretty websites are nice. Websites that drive sales are better. We optimize for revenue, not just aesthetics.',
              },
              {
                icon: Zap,
                title: 'AI-Accelerated',
                description: 'Modern tools mean faster turnaround without sacrificing quality. Get your professional website in 2-4 weeks, not months.',
              },
              {
                icon: Target,
                title: 'Transparent Pricing',
                description: "Fixed rates, no surprises. Know exactly what you're getting and what it costs before we start.",
              },
            ].map((difference, index) => {
              const Icon = difference.icon
              return (
                <motion.div
                  key={difference.title}
                  initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card className="border-2 hover:shadow-lg transition-all">
                    <CardContent className="pt-6 pb-6 flex gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                          <Icon className="w-6 h-6" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-lg font-bold tracking-tight">
                          {difference.title}
                        </h3>
                        <p className="text-muted-foreground leading-relaxed">
                          {difference.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-muted/30">
        <div className="container px-4 mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center space-y-8"
          >
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
              Ready to Improve Your Website?
            </h2>

            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              See how your website stacks up against the competition with a free comprehensive analysis.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/">
                <Button size="xl" className="text-lg">
                  Request Free Analysis
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>

              <Link href="/reports">
                <Button variant="outline" size="xl" className="text-lg">
                  View Sample Reports
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Standard CTA Section */}
      <CTASection />
    </div>
  )
}
