'use client'

import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { useInView } from 'framer-motion'

interface Stat {
  value: number
  suffix: string
  label: string
  prefix?: string
}

const stats: Stat[] = [
  {
    value: 500,
    suffix: '+',
    label: 'Sites Analyzed'
  },
  {
    value: 38,
    suffix: '%',
    label: 'Avg. Improvement'
  },
  {
    value: 24,
    suffix: 'hr',
    label: 'Turnaround Time'
  },
  {
    prefix: '$',
    value: 0,
    suffix: '',
    label: 'Cost to You'
  }
]

function Counter({ value, suffix, prefix = '' }: { value: number; suffix: string; prefix?: string }) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, (latest) => Math.round(latest))
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })

  useEffect(() => {
    if (inView) {
      const controls = animate(count, value, {
        duration: 2,
        ease: 'easeOut'
      })
      return controls.stop
    }
  }, [inView, count, value])

  return (
    <div ref={ref} className="flex items-baseline justify-center">
      {prefix && <span className="text-3xl md:text-4xl lg:text-5xl font-bold">{prefix}</span>}
      <motion.span className="text-5xl md:text-6xl lg:text-7xl font-bold tabular-nums">
        {rounded}
      </motion.span>
      {suffix && <span className="text-3xl md:text-4xl lg:text-5xl font-bold">{suffix}</span>}
    </div>
  )
}

export function StatsSection() {
  return (
    <section className="py-24 bg-muted/30 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:40px_40px]" />
      
      <div className="container px-4 mx-auto max-w-7xl relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center space-y-4 mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            By the Numbers
          </h2>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Join hundreds of businesses that have improved their websites
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="text-center space-y-3"
            >
              <Counter 
                value={stat.value} 
                suffix={stat.suffix} 
                prefix={stat.prefix}
              />
              <p className="text-base md:text-lg text-muted-foreground font-medium">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
