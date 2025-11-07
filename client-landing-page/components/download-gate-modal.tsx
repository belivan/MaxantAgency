'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Download, User, Mail, Phone, Building2, Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { CalendlyButton } from '@/components/calendly-button'

const STORAGE_KEY = 'lead-form-data'

interface DownloadGateModalProps {
  isOpen: boolean
  onClose: () => void
  companyName: string
  reportId: string
  onDownloadReady: (leadId?: string) => void
}

interface FormData {
  name: string
  email: string
  phone: string
  company: string
}

export function DownloadGateModal({
  isOpen,
  onClose,
  companyName,
  reportId,
  onDownloadReady,
}: DownloadGateModalProps) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    company: companyName || '',
  })
  const [errors, setErrors] = useState<Partial<FormData>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [leadId, setLeadId] = useState<string | undefined>(undefined)
  const [showCalendlyOption, setShowCalendlyOption] = useState(false)

  // Load saved form data from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        try {
          const savedData = JSON.parse(saved)
          setFormData(prev => ({
            ...prev,
            name: savedData.name || '',
            email: savedData.email || '',
            phone: savedData.phone || '',
            company: savedData.company || companyName || '',
          }))
        } catch (error) {
          console.error('Failed to load saved form data:', error)
        }
      }
    }
  }, [companyName])

  // Reset states when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      // Reset states when modal closes
      setIsSubmitting(false)
      setIsSuccess(false)
      setShowCalendlyOption(false)
      setErrors({})
    }
  }, [isOpen])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    // Clear error for this field when user types
    if (errors[name as keyof FormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      // Call API to save lead
      const response = await fetch('/api/capture-lead', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone || undefined,
          company: formData.company || undefined,
          reportId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to capture lead')
      }

      const data = await response.json()
      console.log('Lead captured successfully:', data)

      // Save form data to localStorage for future use
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          company: formData.company,
        }))
      }

      // Store leadId for Calendly integration
      setLeadId(data.leadId)

      // Mark report as requested (for email delivery tracking)
      if (data.leadId) {
        try {
          await fetch('/api/mark-report-requested', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ leadId: data.leadId })
          })
        } catch (error) {
          console.error('Failed to mark report as requested:', error)
          // Non-critical error, continue with success flow
        }
      }

      setIsSuccess(true)

      // After 1.5 seconds, show Calendly option
      setTimeout(() => {
        setShowCalendlyOption(true)
      }, 1500)
    } catch (error) {
      console.error('Error capturing lead:', error)
      setIsSubmitting(false)
      alert(error instanceof Error ? error.message : 'Failed to submit form. Please try again.')
    }
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isSubmitting) {
      onClose()
    }
  }

  const handleCalendlyScheduled = () => {
    console.log('✅ Consultation scheduled!')
    // Close modal after scheduling
    setTimeout(() => {
      onClose()
      // Reset form after modal closes
      setTimeout(() => {
        setFormData({ name: '', email: '', phone: '', company: companyName || '' })
        setIsSuccess(false)
        setShowCalendlyOption(false)
        setLeadId(undefined)
      }, 300)
    }, 500)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={handleBackdropClick}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="w-full max-w-md"
          >
            <Card className="relative p-6 shadow-2xl">
              {/* Close button */}
              {!isSubmitting && !isSuccess && (
                <button
                  onClick={onClose}
                  className="absolute right-4 top-4 p-1 rounded-full hover:bg-accent transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              )}

              {/* Success State */}
              {isSuccess ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-8 text-center space-y-4"
                >
                  <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-2xl font-bold">Thank You!</h3>

                  <p className="text-lg text-muted-foreground mb-2">
                    Your report request has been received!
                  </p>
                  <p className="text-sm text-muted-foreground mb-6">
                    We'll send the complete analysis to <strong>{formData.email}</strong> within 24 hours.
                  </p>

                  {showCalendlyOption && (
                    <>
                      <div className="border-t pt-6 mt-6">
                        <p className="text-sm text-muted-foreground mb-4">
                          Want to discuss your website's potential? Schedule a free consultation with our team.
                        </p>

                        <div className="flex flex-col gap-3">
                          {/* Primary: Schedule Consultation */}
                          <CalendlyButton
                            calendlyUrl={process.env.NEXT_PUBLIC_CALENDLY_URL || 'https://calendly.com/your-username/consultation'}
                            leadName={formData.name}
                            leadEmail={formData.email}
                            leadId={leadId}
                            variant="default"
                            size="lg"
                            buttonText="Schedule Free Consultation"
                            className="w-full"
                            onScheduled={handleCalendlyScheduled}
                          />

                          {/* Close button */}
                          <Button
                            variant="outline"
                            size="lg"
                            className="w-full"
                            onClick={onClose}
                          >
                            Close
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </motion.div>
              ) : (
                <>
                  {/* Header */}
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <Mail className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-2xl font-bold mb-2">
                      Request Your Full Report
                    </h3>
                    <p className="text-muted-foreground">
                      Enter your details and we'll email you the complete analysis within 24 hours
                    </p>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Name */}
                    <div className="space-y-2">
                      <label htmlFor="name" className="text-sm font-medium flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Full Name *
                      </label>
                      <Input
                        id="name"
                        name="name"
                        placeholder="John Doe"
                        value={formData.name}
                        onChange={handleInputChange}
                        disabled={isSubmitting}
                        className={errors.name ? 'border-destructive' : ''}
                      />
                      {errors.name && (
                        <p className="text-sm text-destructive">{errors.name}</p>
                      )}
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                      <label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Email Address *
                      </label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="john@company.com"
                        value={formData.email}
                        onChange={handleInputChange}
                        disabled={isSubmitting}
                        className={errors.email ? 'border-destructive' : ''}
                      />
                      {errors.email && (
                        <p className="text-sm text-destructive">{errors.email}</p>
                      )}
                    </div>

                    {/* Phone (Optional) */}
                    <div className="space-y-2">
                      <label htmlFor="phone" className="text-sm font-medium flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        Phone Number
                        <span className="text-xs text-muted-foreground">(optional)</span>
                      </label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        placeholder="(555) 123-4567"
                        value={formData.phone}
                        onChange={handleInputChange}
                        disabled={isSubmitting}
                      />
                    </div>

                    {/* Company (Pre-filled) */}
                    <div className="space-y-2">
                      <label htmlFor="company" className="text-sm font-medium flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        Company Name
                      </label>
                      <Input
                        id="company"
                        name="company"
                        placeholder="Your Company"
                        value={formData.company}
                        onChange={handleInputChange}
                        disabled={isSubmitting}
                      />
                    </div>

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      size="lg"
                      className="w-full text-base"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Mail className="mr-2 h-5 w-5" />
                          Request My Free Report
                        </>
                      )}
                    </Button>

                    {/* Privacy note */}
                    <p className="text-xs text-center text-muted-foreground">
                      We respect your privacy. Your information will only be used to email you the report
                      and provide relevant updates.
                    </p>
                  </form>
                </>
              )}
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
