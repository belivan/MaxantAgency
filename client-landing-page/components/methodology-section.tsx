'use client'

import { motion } from 'framer-motion'
import { Eye, Search, TrendingUp, Award, Sparkles } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const methodologySteps = [
  {
    icon: Eye,
    title: 'Visual Intelligence',
    description: 'We analyze your website across desktop and mobile to identify design inconsistencies, usability issues, and opportunities that are costing you conversions.',
    color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50',
  },
  {
    icon: Search,
    title: 'Technical Deep Dive',
    description: 'Comprehensive evaluation of SEO, content strategy, and performance—finding hidden issues that affect your rankings and visitor engagement.',
    color: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/50',
  },
  {
    icon: TrendingUp,
    title: 'Competitive Benchmarking',
    description: 'We compare your site against top performers in your industry, identifying specific gaps and opportunities your competitors are already leveraging.',
    color: 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/50',
  },
  {
    icon: Award,
    title: 'Impact-First Results',
    description: 'No overwhelming checklists. We rank every issue by actual business impact and give you clear priorities with visual proof of what needs fixing.',
    color: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/50',
  },
]

export function MethodologySection() {
  return (
    <section className="py-20 px-4 bg-gradient-to-b from-background to-accent/20">
      <div className="container mx-auto max-w-6xl">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-4 mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary border border-primary/20">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">Our Approach</span>
          </div>
          <h2 className="text-4xl font-bold">How We Analyze Your Website</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            We don't overwhelm you with 100+ issues. Our system identifies the 5-7 critical problems actually costing you customers.
          </p>
        </motion.div>

        {/* 4-Box Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {methodologySteps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
            >
              <Card className="h-full hover:shadow-lg transition-shadow border-2 hover:border-primary/20">
                <CardHeader>
                  <div className={`w-14 h-14 rounded-full ${step.color} flex items-center justify-center mb-4`}>
                    <step.icon className="w-7 h-7" />
                  </div>
                  <CardTitle className="text-2xl">{step.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base leading-relaxed">
                    {step.description}
                  </CardDescription>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Bottom Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="mt-16 pt-12 border-t"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center max-w-4xl mx-auto">
            <div>
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">Top 5-7</div>
              <div className="text-sm text-muted-foreground">Critical Issues</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">100%</div>
              <div className="text-sm text-muted-foreground">Free Analysis</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">Instant</div>
              <div className="text-sm text-muted-foreground">Results</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">Actionable</div>
              <div className="text-sm text-muted-foreground">Recommendations</div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
