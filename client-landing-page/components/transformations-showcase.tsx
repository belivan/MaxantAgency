'use client'

import { motion } from 'framer-motion'
import { ArrowRight, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface Transformation {
  id: string
  industry: string
  title: string
  metrics: string[]
  description: string
  color: string
}

const transformations: Transformation[] = [
  {
    id: '1',
    industry: 'Restaurant',
    title: 'From Cluttered to Converting',
    metrics: ['+127% online orders', 'Mobile-optimized menu'],
    description: 'Streamlined navigation and added clear call-to-actions for takeout orders.',
    color: 'from-orange-500 to-red-500'
  },
  {
    id: '2',
    industry: 'E-commerce',
    title: 'Shopping Cart Rescue',
    metrics: ['+89% checkout completion', 'Trust signals added'],
    description: 'Removed friction points and added security badges at checkout.',
    color: 'from-blue-500 to-indigo-500'
  },
  {
    id: '3',
    industry: 'Professional Services',
    title: 'Authority Positioning',
    metrics: ['+203% consultation bookings', 'Clear CTA redesign'],
    description: 'Repositioned value proposition and simplified booking process.',
    color: 'from-purple-500 to-pink-500'
  },
  {
    id: '4',
    industry: 'Local Business',
    title: 'Mobile-First Makeover',
    metrics: ['+156% mobile conversions', 'Tap-to-call implemented'],
    description: 'Optimized for mobile users with one-tap contact and simplified forms.',
    color: 'from-teal-500 to-emerald-500'
  }
]

export function TransformationsShowcase() {
  return (
    <section id="transformations" className="py-24 bg-muted/30">
      <div className="container px-4 mx-auto max-w-7xl">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center space-y-4 mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary border border-primary/20">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm font-medium">Proven Results</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            Real Transformations.
            <br />
            <span className="text-primary">Real Results.</span>
          </h2>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            See how businesses like yours improved their websites with our AI-powered analysis
          </p>
        </motion.div>

        {/* Transformations Grid */}
        <div className="grid md:grid-cols-2 gap-8">
          {transformations.map((transformation, index) => (
            <motion.div
              key={transformation.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <Card className="group hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/50 overflow-hidden h-full">
                <CardContent className="p-0">
                  {/* Before/After Preview */}
                  <div className="grid grid-cols-2 gap-0 relative">
                    {/* Before */}
                    <div className="relative aspect-[4/3] bg-gradient-to-br from-gray-400 to-gray-600 dark:from-gray-700 dark:to-gray-900 flex items-center justify-center">
                      <div className="absolute inset-0 bg-black/20" />
                      <div className="relative z-10 text-white">
                        <div className="text-center space-y-2 p-4">
                          <div className="text-red-400 text-3xl">❌</div>
                          <div className="text-sm font-bold uppercase tracking-wider">Before</div>
                          <div className="text-xs opacity-75">Low conversion</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* After */}
                    <div className={`relative aspect-[4/3] bg-gradient-to-br ${transformation.color} flex items-center justify-center`}>
                      <div className="absolute inset-0 bg-black/10" />
                      <div className="relative z-10 text-white">
                        <div className="text-center space-y-2 p-4">
                          <div className="text-3xl">✅</div>
                          <div className="text-sm font-bold uppercase tracking-wider">After</div>
                          <div className="text-xs opacity-90">Optimized</div>
                        </div>
                      </div>
                    </div>

                    {/* Arrow indicator */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                      <div className="bg-white dark:bg-gray-900 rounded-full p-3 shadow-lg border-2 border-primary">
                        <ArrowRight className="w-5 h-5 text-primary" />
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6 space-y-4">
                    {/* Industry Badge */}
                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                      {transformation.industry}
                    </div>

                    {/* Title */}
                    <h3 className="text-2xl font-bold">{transformation.title}</h3>

                    {/* Description */}
                    <p className="text-muted-foreground">{transformation.description}</p>

                    {/* Metrics */}
                    <div className="flex flex-wrap gap-3 pt-2">
                      {transformation.metrics.map((metric, idx) => (
                        <div
                          key={idx}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/5 border border-primary/20"
                        >
                          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                          <span className="text-sm font-semibold text-foreground">{metric}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Note about placeholders */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <p className="text-sm text-muted-foreground italic">
            Visual examples shown above. Your actual report will include specific recommendations for your website.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
