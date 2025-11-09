'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Download, TrendingUp, TrendingDown, AlertCircle, CheckCircle, Lock, Mail, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DownloadGateModal } from '@/components/download-gate-modal'
import { type MockReport, getGradeColor, getScoreColor } from '@/lib/mock-data'

interface ReportViewerProps {
  report: MockReport
}

export function ReportViewer({ report }: ReportViewerProps) {
  const [showDownloadModal, setShowDownloadModal] = useState(false)

  // Auto-scroll to report when component mounts
  useEffect(() => {
    const reportElement = document.getElementById('report-display')
    if (reportElement) {
      reportElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [report.id])

  const scrollToCTA = () => {
    document.getElementById('cta-section')?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleDownloadClick = () => {
    // Always show modal for lead capture
    setShowDownloadModal(true)
  }

  const handleDownloadReady = (leadId?: string) => {
    console.log('Triggering download for report:', report.id, 'leadId:', leadId)

    // Trigger PDF download by creating a link and clicking it
    const downloadUrl = `/api/download-report/${report.id}${leadId ? `?leadId=${leadId}` : ''}`

    // Create a temporary anchor element
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = `${report.company_name.replace(/\s+/g, '-').toLowerCase()}-analysis-report.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    console.log('Download initiated for:', report.company_name)
  }

  // Preview mode: show 5 issues (no lock), 3 quick wins (with lock)
  const previewIssues = report.top_issues.slice(0, 5)
  const hiddenIssuesCount = report.top_issues.length - 5
  const previewWins = report.quick_wins.slice(0, 3)
  const hiddenWinsCount = report.quick_wins.length - 3

  return (
    <section id="report-display" className="py-20 px-4 bg-accent/30 relative">
      {/* Sticky "Analyze Another Site" Button */}
      <div className="sticky top-20 z-40 flex justify-end mb-4">
        <div className="container mx-auto max-w-6xl px-4">
          <Link href="/request">
            <Button
              size="lg"
              className="shadow-lg hover:shadow-xl transition-all group ml-auto"
            >
              <Sparkles className="mr-2 h-5 w-5 group-hover:rotate-12 transition-transform" />
              Analyze Another Site
            </Button>
          </Link>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl space-y-12">
        {/* Header with Download CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-6"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary border border-primary/20">
            <span className="text-sm font-medium">📊 Preview Report</span>
          </div>
          <h2 className="text-4xl font-bold">Your Website Analysis</h2>
          <p className="text-xl text-muted-foreground">
            Here's what we found for{' '}
            <span className="text-primary font-semibold">{report.company_name}</span>
          </p>

          {/* Prominent Request Button */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <Button
              size="xl"
              onClick={handleDownloadClick}
              className="text-lg shadow-lg hover:shadow-xl transition-shadow"
            >
              <Mail className="mr-2 h-5 w-5" />
              Request Full Report (Free)
            </Button>
            <p className="text-sm text-muted-foreground mt-2">
              We'll email you the complete analysis within 24 hours
            </p>
          </motion.div>
        </motion.div>

        {/* Executive Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.6 }}
        >
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">Executive Summary</CardTitle>
              <CardDescription>Overview of your website's current state</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-base leading-relaxed">{report.executive_summary}</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Homepage Screenshots - Desktop & Mobile Side by Side */}
        {(report.screenshot_desktop_url || report.screenshot_mobile_url) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28, duration: 0.6 }}
          >
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl">Your Homepage</CardTitle>
                <CardDescription>How your website looks across devices</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Desktop Screenshot */}
                  {report.screenshot_desktop_url && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                        <div className="w-2 h-2 rounded-full bg-primary"></div>
                        Desktop View
                      </div>
                      <div className="relative rounded-lg overflow-hidden border border-border bg-muted h-[400px] md:h-[500px]">
                        <img
                          src={report.screenshot_desktop_url}
                          alt={`${report.company_name} desktop homepage`}
                          className="w-full h-full object-cover object-top"
                          loading="lazy"
                        />
                      </div>
                    </div>
                  )}

                  {/* Mobile Screenshot - Hidden on mobile devices */}
                  {report.screenshot_mobile_url && (
                    <div className="hidden md:block space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                        <div className="w-2 h-2 rounded-full bg-primary"></div>
                        Mobile View
                      </div>
                      <div className="relative rounded-lg overflow-hidden border border-border bg-muted h-[500px] max-w-[300px] mx-auto">
                        <img
                          src={report.screenshot_mobile_url}
                          alt={`${report.company_name} mobile homepage`}
                          className="w-full h-full object-cover object-top"
                          loading="lazy"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Top Priority Alert */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          <Card className="shadow-lg border-2 border-orange-500/30 bg-orange-50/50 dark:bg-orange-950/20">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold mb-2 text-orange-900 dark:text-orange-100">Top Priority Action</h3>
                  <p className="text-base text-orange-800 dark:text-orange-200 leading-relaxed">{report.top_priority}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Overall Grade Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.35, duration: 0.6 }}
        >
          <Card className="shadow-xl border-2 border-primary/20">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="flex-shrink-0">
                  <div
                    className={`w-32 h-32 rounded-full flex items-center justify-center text-6xl font-bold ${getGradeColor(
                      report.grade
                    )}`}
                  >
                    {report.grade}
                  </div>
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <h3 className="text-2xl font-bold">Overall Score: {report.overall_score}/100</h3>
                    <p className="text-muted-foreground">
                      {report.url}
                    </p>
                  </div>
                  <p className="text-lg">
                    {report.grade === 'A' || report.grade === 'B'
                      ? "Great job! Your website is performing well, but there's always room for improvement."
                      : report.grade === 'C'
                      ? "Your website has potential, but there are several areas that need attention to maximize conversions."
                      : "Your website needs significant improvements to compete effectively and convert visitors into customers."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Score Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          <h3 className="text-2xl font-semibold mb-6">Score Breakdown</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Design', score: report.design_score },
              { label: 'SEO', score: report.seo_score },
              { label: 'Content', score: report.content_score },
              { label: 'Social', score: report.social_score },
            ].map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + index * 0.1, duration: 0.4 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{item.label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end gap-2">
                      <span className={`text-4xl font-bold ${getScoreColor(item.score)}`}>
                        {item.score}
                      </span>
                      <span className="text-muted-foreground mb-1">/100</span>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-sm">
                      {item.score >= 70 ? (
                        <>
                          <TrendingUp className="w-4 h-4 text-green-600" />
                          <span className="text-green-600">Good</span>
                        </>
                      ) : (
                        <>
                          <TrendingDown className="w-4 h-4 text-orange-600" />
                          <span className="text-orange-600">Needs Work</span>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Top Issues - Preview Mode */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.6 }}
        >
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-destructive" />
                  </div>
                  <div>
                    <CardTitle>Top Issues Found</CardTitle>
                    <CardDescription>Top 5 critical problems identified</CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {previewIssues.map((issue, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + index * 0.1, duration: 0.4 }}
                    className="flex items-start gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/10"
                  >
                    <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{issue}</span>
                  </motion.li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Wins - Preview Mode */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75, duration: 0.6 }}
        >
          <Card className="shadow-lg bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <CardTitle className="text-green-900 dark:text-green-100">Quick Wins</CardTitle>
                    <CardDescription className="text-green-700 dark:text-green-300">
                      Preview showing 3 easy fixes with immediate impact
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {previewWins.map((win, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 + index * 0.1, duration: 0.4 }}
                    className="flex items-start gap-3 p-3 rounded-lg bg-white dark:bg-green-950/50 border border-green-200 dark:border-green-800"
                  >
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-green-900 dark:text-green-100">{win}</span>
                  </motion.li>
                ))}
              </ul>

              {/* Hidden Content Indicator */}
              {hiddenWinsCount > 0 && (
                <div className="relative mt-4">
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-green-50/90 dark:via-green-950/90 to-green-50 dark:to-green-950/20 z-10 rounded-lg" />
                  <div className="blur-sm opacity-50 space-y-3">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-white dark:bg-green-950/50 border border-green-200 dark:border-green-800">
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-green-900 dark:text-green-100">Additional quick win recommendations...</span>
                    </div>
                    {hiddenWinsCount > 1 && (
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-white dark:bg-green-950/50 border border-green-200 dark:border-green-800">
                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-green-900 dark:text-green-100">More actionable improvements...</span>
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center z-20">
                    <div className="bg-background/95 backdrop-blur-sm px-6 py-4 rounded-full border-2 border-green-500/30 shadow-lg">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-green-600 dark:text-green-400" />
                        <span className="font-semibold text-sm text-green-900 dark:text-green-100">
                          Request the full report for detailed action plan and prioritized roadmap
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Request Full Report CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.95, duration: 0.6 }}
          className="text-center space-y-6"
        >
          <Card className="p-8 shadow-xl border-2 border-primary/20">
            <Mail className="w-16 h-16 mx-auto mb-4 text-primary" />
            <h4 className="text-2xl font-bold mb-2">Ready for the Full Analysis?</h4>
            <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
              Request the complete report with detailed analysis, visual screenshots,
              competitive benchmarks, and a step-by-step action plan. Delivered to your inbox within 24 hours.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button size="xl" onClick={handleDownloadClick} className="text-lg">
                <Mail className="mr-2 h-5 w-5" />
                Request Full Report (Free)
              </Button>
              <Button size="xl" variant="outline" onClick={scrollToCTA} className="text-lg">
                Schedule a Consultation
              </Button>
            </div>

            <div className="mt-6 pt-6 border-t">
              <p className="text-sm text-muted-foreground">
                ✓ Complete analysis • ✓ Visual evidence • ✓ Action plan • ✓ 100% Free • ✓ Email delivery
              </p>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Download Gate Modal */}
      <DownloadGateModal
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        companyName={report.company_name}
        reportId={report.id}
        onDownloadReady={handleDownloadReady}
      />
    </section>
  )
}
