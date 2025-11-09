'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { type ComparisonRequestFormData } from '@/lib/types/comparison-request'

interface RequestFormProps {
  onSuccess: (requestId: string) => void
}

export function RequestForm({ onSuccess }: RequestFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<ComparisonRequestFormData>({
    website_url: '',
    company_name: '',
    email: '',
    industry: '',
    benchmark_preference: 'auto',
    competitor_url: '',
    phone_number: '',
    additional_notes: '',
  })

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setError(null) // Clear error when user types
  }

  const handleBenchmarkPreferenceChange = (preference: 'auto' | 'manual') => {
    setFormData((prev) => ({
      ...prev,
      benchmark_preference: preference,
      competitor_url: preference === 'auto' ? '' : prev.competitor_url,
    }))
  }

  const validateForm = (): string | null => {
    if (!formData.website_url.trim()) return 'Website URL is required'
    if (!formData.company_name.trim()) return 'Company name is required'
    if (!formData.email.trim()) return 'Email is required'

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      return 'Please enter a valid email address'
    }

    // URL validation (basic)
    const urlRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/
    if (!urlRegex.test(formData.website_url)) {
      return 'Please enter a valid website URL'
    }

    // If manual benchmark, competitor URL is required
    if (formData.benchmark_preference === 'manual' && !formData.competitor_url?.trim()) {
      return 'Competitor URL is required when selecting manual benchmark'
    }

    // Validate competitor URL if provided
    if (formData.competitor_url && !urlRegex.test(formData.competitor_url)) {
      return 'Please enter a valid competitor URL'
    }

    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate form
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/request-comparison', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit request')
      }

      // Success! Call the onSuccess callback
      onSuccess(data.request_id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit request. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section id="request-section" className="py-20 bg-background">
      <div className="container px-4 mx-auto max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <Card className="border-2">
            <CardHeader className="text-center space-y-2">
              <CardTitle className="text-3xl md:text-4xl font-bold tracking-tight">
                Request Your Comparison
              </CardTitle>
              <CardDescription className="text-lg">
                Fill out the form below and we'll email you a comprehensive analysis within 24 hours
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Website Information */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Your Website</h3>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="website_url" className="text-sm font-medium">
                      Website URL <span className="text-destructive">*</span>
                    </label>
                    <Input
                      id="website_url"
                      name="website_url"
                      type="text"
                      placeholder="https://yourwebsite.com"
                      value={formData.website_url}
                      onChange={handleInputChange}
                      required
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="company_name" className="text-sm font-medium">
                      Company Name <span className="text-destructive">*</span>
                    </label>
                    <Input
                      id="company_name"
                      name="company_name"
                      type="text"
                      placeholder="Your Company Name"
                      value={formData.company_name}
                      onChange={handleInputChange}
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                {/* Industry (Optional) */}
                <div className="space-y-2">
                  <label htmlFor="industry" className="text-sm font-medium">
                    Industry <span className="text-muted-foreground text-xs">(Optional)</span>
                  </label>
                  <Input
                    id="industry"
                    name="industry"
                    type="text"
                    placeholder="e.g., Restaurant, Fine Dining, E-commerce"
                    value={formData.industry}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-muted-foreground">
                    Helps us find better competitors. We can also determine this from your website.
                  </p>
                </div>

                {/* Benchmark Selection */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Benchmark Selection</h3>
                    <p className="text-sm text-muted-foreground">
                      Choose how you'd like to compare your website
                    </p>
                  </div>

                  {/* Radio toggle */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={() => handleBenchmarkPreferenceChange('auto')}
                      disabled={isSubmitting}
                      className={`flex-1 p-4 rounded-lg border-2 text-left transition-all ${
                        formData.benchmark_preference === 'auto'
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="font-semibold mb-1">Let us choose</div>
                      <div className="text-sm text-muted-foreground">
                        We'll select the best competitor based on your industry
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleBenchmarkPreferenceChange('manual')}
                      disabled={isSubmitting}
                      className={`flex-1 p-4 rounded-lg border-2 text-left transition-all ${
                        formData.benchmark_preference === 'manual'
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="font-semibold mb-1">I have a competitor in mind</div>
                      <div className="text-sm text-muted-foreground">
                        Compare against a specific competitor of your choice
                      </div>
                    </button>
                  </div>

                  {/* Conditional competitor URL input */}
                  {formData.benchmark_preference === 'manual' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-2"
                    >
                      <label htmlFor="competitor_url" className="text-sm font-medium">
                        Competitor Website URL <span className="text-destructive">*</span>
                      </label>
                      <Input
                        id="competitor_url"
                        name="competitor_url"
                        type="text"
                        placeholder="https://competitor-website.com"
                        value={formData.competitor_url}
                        onChange={handleInputChange}
                        required={formData.benchmark_preference === 'manual'}
                        disabled={isSubmitting}
                      />
                    </motion.div>
                  )}
                </div>

                {/* Contact Information */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium">
                      Email Address <span className="text-destructive">*</span>
                    </label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="your@email.com"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      disabled={isSubmitting}
                    />
                    <p className="text-xs text-muted-foreground">
                      We'll send your comparison report to this email
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="phone_number" className="text-sm font-medium">
                      Phone Number <span className="text-muted-foreground text-xs">(Optional)</span>
                    </label>
                    <Input
                      id="phone_number"
                      name="phone_number"
                      type="tel"
                      placeholder="+1 (555) 123-4567"
                      value={formData.phone_number}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="additional_notes" className="text-sm font-medium">
                      Additional Notes <span className="text-muted-foreground text-xs">(Optional)</span>
                    </label>
                    <Textarea
                      id="additional_notes"
                      name="additional_notes"
                      placeholder="Tell us anything else about your business or specific areas you'd like us to focus on..."
                      value={formData.additional_notes}
                      onChange={handleInputChange}
                      rows={4}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                {/* Error message */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm"
                  >
                    {error}
                  </motion.div>
                )}

                {/* Submit button */}
                <Button
                  type="submit"
                  size="xl"
                  className="w-full text-lg"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Request My Comparison (Free)'
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  By submitting this form, you agree to our{' '}
                  <Link href="/privacy" className="text-primary hover:underline">
                    Privacy Policy
                  </Link>{' '}
                  and{' '}
                  <Link href="/terms" className="text-primary hover:underline">
                    Terms of Service
                  </Link>
                  , and consent to receive email communication regarding your website analysis.
                </p>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  )
}
