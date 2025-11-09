'use client'

import { motion } from 'framer-motion'
import { BarChart3, AlertTriangle, Zap, Map } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface Benefit {
  icon: React.ReactNode
  title: string
  description: string
  gradient: string
}

const benefits: Benefit[] = [
  {
    icon: <BarChart3 className="w-8 h-8" />,
    title: 'Competitive Benchmarking',
    description: 'See exactly how you stack up against industry leaders and top competitors in your market.',
    gradient: 'from-blue-500/10 to-indigo-500/10'
  },
  {
    icon: <AlertTriangle className="w-8 h-8" />,
    title: 'Critical Issues Identified',
    description: 'Conversion killers flagged by severity and business impact so you know what to fix first.',
    gradient: 'from-orange-500/10 to-red-500/10'
  },
  {
    icon: <Zap className="w-8 h-8" />,
    title: 'Quick Win Opportunities',
    description: 'Easy fixes for immediate improvements—no dev team or major redesign required.',
    gradient: 'from-yellow-500/10 to-orange-500/10'
  },
  {
    icon: <Map className="w-8 h-8" />,
    title: 'Strategic Roadmap',
    description: '30/60/90 day action plan prioritized by ROI to maximize your conversion improvements.',
    gradient: 'from-emerald-500/10 to-teal-500/10'
  }
]

export function BenefitsSection() {
  return (
    <section id="what-you-get" className="py-24 bg-background">
      <div className="container px-4 mx-auto max-w-7xl">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center space-y-4 mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            Not Just Data.
            <br />
            <span className="text-primary">Direction.</span>
          </h2>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Every analysis includes actionable insights designed to drive real business results
          </p>
        </motion.div>

        {/* Benefits Grid */}
        <div className="grid md:grid-cols-2 gap-8">
          {benefits.map((benefit, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <Card className="group hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/30 h-full">
                <CardContent className="p-8">
                  {/* Icon with gradient background */}
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${benefit.gradient} text-primary mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    {benefit.icon}
                  </div>

                  {/* Title */}
                  <h3 className="text-2xl font-bold mb-3">{benefit.title}</h3>

                  {/* Description */}
                  <p className="text-muted-foreground leading-relaxed">
                    {benefit.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
