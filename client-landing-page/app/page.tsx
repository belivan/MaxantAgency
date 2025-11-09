'use client'

import { useState } from 'react'
import { ComparisonRequestHero } from '@/components/comparison-request/hero-section'
import { HowItWorks } from '@/components/comparison-request/how-it-works'
import { RequestForm } from '@/components/comparison-request/request-form'
import { SuccessMessage } from '@/components/comparison-request/success-message'
import { CTASection } from '@/components/cta-section'

type PageState = 'form' | 'success'

export default function Home() {
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
      {/* Hero Section - Always visible */}
      <ComparisonRequestHero />

      {/* How It Works - Always visible */}
      <HowItWorks />

      {/* Request Form - Show when in form state */}
      {pageState === 'form' && (
        <RequestForm onSuccess={handleSuccess} />
      )}

      {/* Success Message - Show when request is submitted */}
      {pageState === 'success' && (
        <SuccessMessage requestId={requestId} />
      )}

      {/* CTA Section - Always visible */}
      <CTASection />
    </div>
  )
}
