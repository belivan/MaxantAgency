'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, FileSearch, Image, Lightbulb, FileCheck } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'

interface LoadingStep {
  id: number
  label: string
  icon: any
  duration: number
}

const steps: LoadingStep[] = [
  { id: 1, label: 'Retrieving your analysis', icon: FileSearch, duration: 2000 },
  { id: 2, label: 'Compiling screenshots', icon: Image, duration: 2000 },
  { id: 3, label: 'Generating insights', icon: Lightbulb, duration: 2500 },
  { id: 4, label: 'Finalizing report', icon: FileCheck, duration: 1500 },
]

interface LoadingSequenceProps {
  onComplete: () => void
}

export function LoadingSequence({ onComplete }: LoadingSequenceProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (currentStep >= steps.length) {
      // All steps complete, wait a moment then trigger completion
      const timeout = setTimeout(() => {
        onComplete()
      }, 500)
      return () => clearTimeout(timeout)
    }

    const step = steps[currentStep]
    const startTime = Date.now()

    // Update progress smoothly
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const stepProgress = Math.min((elapsed / step.duration) * 100, 100)
      const overallProgress = ((currentStep + stepProgress / 100) / steps.length) * 100
      setProgress(overallProgress)
    }, 50)

    // Move to next step after duration
    const stepTimeout = setTimeout(() => {
      setCompletedSteps(prev => [...prev, step.id])
      setCurrentStep(prev => prev + 1)
    }, step.duration)

    return () => {
      clearInterval(progressInterval)
      clearTimeout(stepTimeout)
    }
  }, [currentStep, onComplete])

  return (
    <section className="py-20 px-4">
      <div className="container mx-auto max-w-2xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="shadow-xl border-2 border-primary/20">
            <CardContent className="p-8 space-y-8">
              {/* Header */}
              <div className="text-center space-y-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center"
                >
                  <Lightbulb className="w-8 h-8 text-primary" />
                </motion.div>
                <h2 className="text-2xl font-semibold">Preparing Your Report</h2>
                <p className="text-muted-foreground">
                  This will just take a moment...
                </p>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-right text-muted-foreground">
                  {Math.round(progress)}%
                </p>
              </div>

              {/* Steps */}
              <div className="space-y-4">
                {steps.map((step, index) => {
                  const isCompleted = completedSteps.includes(step.id)
                  const isCurrent = currentStep === index
                  const isPending = currentStep < index

                  return (
                    <motion.div
                      key={step.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`flex items-center gap-4 p-4 rounded-lg border transition-all ${
                        isCurrent
                          ? 'bg-primary/5 border-primary/30 shadow-sm'
                          : isCompleted
                          ? 'bg-accent border-border'
                          : 'bg-card border-border opacity-50'
                      }`}
                    >
                      <div className="flex-shrink-0">
                        <AnimatePresence mode="wait">
                          {isCompleted ? (
                            <motion.div
                              key="check"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              exit={{ scale: 0 }}
                              className="text-green-600 dark:text-green-400"
                            >
                              <CheckCircle2 className="w-6 h-6" />
                            </motion.div>
                          ) : (
                            <motion.div
                              key="icon"
                              className={isCurrent ? 'text-primary' : 'text-muted-foreground'}
                            >
                              <step.icon
                                className={`w-6 h-6 ${isCurrent ? 'animate-pulse-glow' : ''}`}
                              />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <div className="flex-1">
                        <p
                          className={`font-medium ${
                            isCompleted
                              ? 'text-muted-foreground line-through'
                              : isCurrent
                              ? 'text-foreground'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {step.label}
                          {isCurrent && (
                            <span className="ml-2 inline-flex gap-1">
                              <motion.span
                                animate={{ opacity: [0, 1, 0] }}
                                transition={{ duration: 1.5, repeat: Infinity, times: [0, 0.5, 1] }}
                              >
                                .
                              </motion.span>
                              <motion.span
                                animate={{ opacity: [0, 1, 0] }}
                                transition={{ duration: 1.5, repeat: Infinity, delay: 0.3, times: [0, 0.5, 1] }}
                              >
                                .
                              </motion.span>
                              <motion.span
                                animate={{ opacity: [0, 1, 0] }}
                                transition={{ duration: 1.5, repeat: Infinity, delay: 0.6, times: [0, 0.5, 1] }}
                              >
                                .
                              </motion.span>
                            </span>
                          )}
                        </p>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  )
}
