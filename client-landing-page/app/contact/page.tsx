'use client'

import { useState } from 'react'
import { Mail, Calendar, MessageSquare, Send, CheckCircle2, User, Building2, Phone } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CalendlyButton } from '@/components/calendly-button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    message: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Submit to database via API
      const response = await fetch('/api/capture-lead', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          company: formData.company,
          message: formData.message,
          // No reportId - this is a contact form submission
        }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        console.log('Contact form submitted successfully:', result.leadId)
        setIsSubmitted(true)

        // Reset form after 5 seconds
        setTimeout(() => {
          setIsSubmitted(false)
          setFormData({ name: '', email: '', phone: '', company: '', message: '' })
        }, 5000)
      } else {
        console.error('Failed to submit contact form:', result.error)
        alert('Failed to send message. Please try again.')
      }
    } catch (error) {
      console.error('Error submitting contact form:', error)
      alert('Failed to send message. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }
  return (
    <div className="min-h-screen py-20 px-4 bg-background">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Get in Touch</h1>
          <p className="text-xl text-muted-foreground">
            We'd love to hear from you. Choose the best way to reach us.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* Contact Form */}
          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Mail className="w-7 h-7 text-primary" />
              </div>
              <CardTitle className="text-2xl">Send Us a Message</CardTitle>
              <CardDescription className="text-base">
                Fill out the form and we'll get back to you within 24 hours
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isSubmitted ? (
                <div className="py-12 text-center space-y-4">
                  <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-2xl font-semibold">Message Sent!</h3>
                  <p className="text-muted-foreground">
                    Thank you for reaching out. We'll get back to you within 24 hours.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="name" className="text-sm font-medium flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Name *
                      </label>
                      <Input
                        id="name"
                        name="name"
                        placeholder="John Doe"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        disabled={isSubmitting}
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Email *
                      </label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="john@company.com"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="phone" className="text-sm font-medium flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        Phone
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

                    <div className="space-y-2">
                      <label htmlFor="company" className="text-sm font-medium flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        Company
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
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="message" className="text-sm font-medium flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Message *
                    </label>
                    <Textarea
                      id="message"
                      name="message"
                      placeholder="Tell us about your goals and what you'd like to improve..."
                      rows={4}
                      value={formData.message}
                      onChange={handleInputChange}
                      required
                      disabled={isSubmitting}
                    />
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full text-base"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="animate-pulse">Sending...</span>
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-5 w-5" />
                        Send Message
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    We typically respond within 24 hours
                  </p>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Schedule Call */}
          <Card className="shadow-lg hover:shadow-xl transition-shadow border-2 border-primary/20">
            <CardHeader>
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Calendar className="w-7 h-7 text-primary" />
              </div>
              <CardTitle className="text-2xl">Schedule a Call</CardTitle>
              <CardDescription className="text-base">
                Book a free 30-minute consultation to discuss your website
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CalendlyButton
                calendlyUrl={process.env.NEXT_PUBLIC_CALENDLY_URL || 'https://calendly.com/antony-yanovich/30min'}
                buttonText="Book Your Free Call"
                size="lg"
                className="w-full"
              />
              <p className="text-sm text-muted-foreground mt-4">
                Choose a time that works for your schedule. No obligation, no pressure.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Additional Info */}
        <Card className="shadow-lg">
          <CardHeader>
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <MessageSquare className="w-7 h-7 text-primary" />
            </div>
            <CardTitle className="text-2xl">About Our Services</CardTitle>
            <CardDescription className="text-base">
              We help businesses improve their online presence through AI-powered website analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg mb-2">What We Offer</h3>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Free AI-powered website analysis reports</li>
                <li>Detailed recommendations for design, SEO, and content improvements</li>
                <li>30-minute strategy consultations</li>
                <li>Fixed-price implementation quotes</li>
                <li>2-4 week turnaround times</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">Response Time</h3>
              <p className="text-muted-foreground">
                We typically respond to all inquiries within 24 hours during business days.
                For urgent matters, please mention "URGENT" in your email subject line.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">Business Hours</h3>
              <p className="text-muted-foreground">
                Monday - Friday: 9:00 AM - 6:00 PM EST
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Back to Home */}
        <div className="text-center mt-12">
          <a
            href="/"
            className="text-primary hover:underline font-medium"
          >
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  )
}
