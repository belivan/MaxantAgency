'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { CheckCircle2, Mail, Calendar, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface SuccessMessageProps {
  requestId: string
}

export function SuccessMessage({ requestId }: SuccessMessageProps) {
  return (
    <section id="request-section" className="py-20 bg-background">
      <div className="container px-4 mx-auto max-w-3xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="border-2 border-primary/20 bg-primary/5">
            <CardContent className="pt-12 pb-10 text-center space-y-6">
              {/* Success icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="flex justify-center"
              >
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle2 className="w-12 h-12 text-primary" />
                </div>
              </motion.div>

              {/* Main message */}
              <div className="space-y-3">
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                  Request Submitted Successfully!
                </h2>
                <p className="text-lg text-muted-foreground max-w-lg mx-auto">
                  We've received your comparison request and will email you a comprehensive analysis within 24 hours.
                </p>
              </div>

              {/* Request ID */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-background/50 border border-border text-sm font-mono">
                <span className="text-muted-foreground">Request ID:</span>
                <span className="font-medium">{requestId.slice(0, 8).toUpperCase()}</span>
              </div>

              {/* What's next */}
              <div className="pt-6 space-y-4">
                <h3 className="text-lg font-semibold">What happens next?</h3>

                <div className="grid sm:grid-cols-2 gap-4 text-left">
                  <div className="flex gap-3 p-4 rounded-lg bg-background border border-border">
                    <Mail className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-sm mb-1">Check your inbox</div>
                      <div className="text-xs text-muted-foreground">
                        You'll receive your comparison report via email within 24 hours
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 p-4 rounded-lg bg-background border border-border">
                    <Calendar className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-sm mb-1">Book a call</div>
                      <div className="text-xs text-muted-foreground">
                        Schedule a free consultation to discuss your results
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-6">
                <Link href="/reports">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto">
                    View Existing Reports
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>

                <a
                  href={process.env.NEXT_PUBLIC_CALENDLY_URL || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button size="lg" className="w-full sm:w-auto">
                    <Calendar className="mr-2 h-4 w-4" />
                    Book a Call
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  )
}
