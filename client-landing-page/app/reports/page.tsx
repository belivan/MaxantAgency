'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { HeroSection } from '@/components/hero-section'
import { MethodologySection } from '@/components/methodology-section'
import { ReportLookupForm } from '@/components/report-lookup-form'
import { LoadingSequence } from '@/components/loading-sequence'
import { ReportViewer } from '@/components/report-viewer'
import { CTASection } from '@/components/cta-section'
import { Button } from '@/components/ui/button'
import { type MockReport } from '@/lib/mock-data'

type PageState = 'lookup' | 'loading' | 'report'

export default function ReportsPage() {
  const [pageState, setPageState] = useState<PageState>('lookup')
  const [currentReport, setCurrentReport] = useState<MockReport | null>(null)

  const handleReportFound = (report: MockReport) => {
    setCurrentReport(report)
    setPageState('loading')
  }

  const handleLoadingComplete = () => {
    setPageState('report')
  }

  return (
    <div className="min-h-screen">
      {/* Back to Request Link */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Request New Analysis
          </Button>
        </Link>
      </div>

      {/* Hero Section - Always visible */}
      <HeroSection />

      {/* Methodology Section - Always visible */}
      <MethodologySection />

      {/* Report Lookup Form - Show when in lookup state */}
      {pageState === 'lookup' && (
        <ReportLookupForm onReportFound={handleReportFound} />
      )}

      {/* Loading Sequence - Show when loading */}
      {pageState === 'loading' && (
        <LoadingSequence onComplete={handleLoadingComplete} />
      )}

      {/* Report Viewer - Show when report is ready */}
      {pageState === 'report' && currentReport && (
        <ReportViewer report={currentReport} />
      )}

      {/* CTA Section - Always visible */}
      <CTASection />
    </div>
  )
}
