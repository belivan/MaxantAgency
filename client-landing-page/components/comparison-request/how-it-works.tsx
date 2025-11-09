'use client'

import { motion } from 'framer-motion'
import { FileSearch, Scale, Mail } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

const steps = [
  {
    number: '01',
    icon: FileSearch,
    title: 'Submit Your Website',
    description: 'Tell us about your website and industry. Choose to compare against a specific competitor or let us select the best benchmark for you.',
  },
  {
    number: '02',
    icon: Scale,
    title: 'We Compare & Analyze',
    description: 'Our AI analyzes your website against top competitors in your industry. Design, SEO, content, performance—we cover it all.',
  },
  {
    number: '03',
    icon: Mail,
    title: 'Get Your Insights',
    description: 'Receive a comprehensive comparison report within 24 hours. See exactly where you stand and what you need to do to win.',
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 bg-muted/30">
      <div className="container px-4 mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center space-y-4 mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            How It Works
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Get actionable insights in three simple steps
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 md:gap-12">
          {steps.map((step, index) => {
            const Icon = step.icon
            return (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.2 }}
                viewport={{ once: true }}
              >
                <Card className="h-full border-2 hover:border-primary/50 transition-colors">
                  <CardContent className="pt-8 pb-6 text-center space-y-4">
                    {/* Step number */}
                    <div className="text-7xl font-bold text-primary/10 leading-none">
                      {step.number}
                    </div>

                    {/* Icon */}
                    <div className="flex justify-center -mt-2">
                      <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-primary/10 text-primary">
                        <Icon className="w-8 h-8" />
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-bold tracking-tight">
                      {step.title}
                    </h3>

                    {/* Description */}
                    <p className="text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
