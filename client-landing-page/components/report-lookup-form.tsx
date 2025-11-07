'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { type MockReport } from '@/lib/mock-data'

interface ReportLookupFormProps {
  onReportFound: (report: MockReport) => void
}

export function ReportLookupForm({ onReportFound }: ReportLookupFormProps) {
  const [query, setQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState('')

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!query.trim()) {
      setError('Please enter your company name or email')
      return
    }

    setError('')
    setIsSearching(true)

    try {
      // Call the real API endpoint
      const response = await fetch('/api/lookup-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: query.trim() }),
      })

      const data = await response.json()

      if (response.ok && data.success && data.data) {
        // Report found - pass to parent
        onReportFound(data.data)
      } else {
        // Report not found or error
        setError(data.error || 'No report found. Please check your company name or email address.')
        setIsSearching(false)
      }
    } catch (error) {
      console.error('Error searching for report:', error)
      setError('An error occurred while searching. Please try again.')
      setIsSearching(false)
    }
  }

  return (
    <section id="report-lookup" className="py-20 px-4">
      <div className="container mx-auto max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Card className="shadow-lg border-2">
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Building2 className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-3xl">Find Your Report</CardTitle>
              <CardDescription className="text-base">
                Enter your company name or email to retrieve your personalized website analysis
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSearch} className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="e.g., Bella Vista Restaurant or hello@company.com"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value)
                      setError('')
                    }}
                    className="pl-10 h-12 text-base"
                    disabled={isSearching}
                  />
                </div>

                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-destructive"
                  >
                    {error}
                  </motion.p>
                )}

                <Button
                  type="submit"
                  size="lg"
                  className="w-full text-base"
                  disabled={isSearching}
                >
                  {isSearching ? (
                    <>
                      <span className="animate-pulse">Searching...</span>
                    </>
                  ) : (
                    'Show My Report'
                  )}
                </Button>
              </form>

              <div className="mt-6 pt-6 border-t">
                <p className="text-sm text-center text-muted-foreground">
                  Enter the company name or email address you provided when requesting your analysis.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  )
}
