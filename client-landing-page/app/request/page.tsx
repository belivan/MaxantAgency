'use client'

import { useState } from 'react'
import { ComparisonRequestHero } from '@/components/comparison-request/hero-section'
import { HowItWorks } from '@/components/comparison-request/how-it-works'
import { RequestForm } from '@/components/comparison-request/request-form'
import { SuccessMessage } from '@/components/comparison-request/success-message'

type PageState = 'form' | 'success'

export default function RequestAnalysisPage() {
  const [pageState, setPageState] = useState<PageState>('form')
  const [requestId, setRequestId] = useState<string>('')

  const handleSuccess = (id: string) => {
    setRequestId(id)
    setPageState('success')

    // Scroll to success message smoothly (keep user at form section)
    setTimeout(() => {
      document.getElementById('request-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 100)
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <ComparisonRequestHero />

      {/* How It Works (condensed version) */}
      <HowItWorks />

      {/* Request Form - Show when in form state */}
      {pageState === 'form' && (
        <RequestForm onSuccess={handleSuccess} />
      )}

      {/* Success Message - Show when request is submitted */}
      {pageState === 'success' && (
        <SuccessMessage requestId={requestId} />
      )}

      {/* Trust Signals */}
      <section className="py-12 bg-muted/30">
        <div className="container px-4 mx-auto max-w-3xl">
          <div className="grid md:grid-cols-3 gap-6 text-center">
            <div className="space-y-2">
              <div className="text-3xl">🔒</div>
              <p className="text-sm font-medium">Secure & Private</p>
              <p className="text-xs text-muted-foreground">Your data is never shared</p>
            </div>
            <div className="space-y-2">
              <div className="text-3xl">✉️</div>
              <p className="text-sm font-medium">24-Hour Delivery</p>
              <p className="text-xs text-muted-foreground">Report delivered to your inbox</p>
            </div>
            <div className="space-y-2">
              <div className="text-3xl">💬</div>
              <p className="text-sm font-medium">We're Here to Help</p>
              <p className="text-xs text-muted-foreground">Questions? Just ask!</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
