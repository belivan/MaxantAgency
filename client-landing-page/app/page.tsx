import Link from 'next/link'
import { HomeHero } from '@/components/home-hero'
import { TransformationsShowcase } from '@/components/transformations-showcase'
import { HowItWorks } from '@/components/comparison-request/how-it-works'
import { BenefitsSection } from '@/components/benefits-section'
import { StatsSection } from '@/components/stats-section'
import { CTASection } from '@/components/cta-section'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <HomeHero />

      {/* Transformations Showcase - Before/After Results */}
      <TransformationsShowcase />

      {/* How It Works */}
      <HowItWorks />

      {/* Benefits Section - What You Get */}
      <BenefitsSection />

      {/* Stats Section - By the Numbers */}
      <StatsSection />

      {/* Final CTA Before Contact Form */}
      <section className="py-20 bg-gradient-to-br from-primary/5 via-background to-background">
        <div className="container px-4 mx-auto max-w-4xl text-center space-y-8">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            Your Competitors Are Already Optimizing.
            <br />
            <span className="text-primary">Are You?</span>
          </h2>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Stop guessing what's wrong with your website. Get data-driven insights in 24 hours.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Link href="/request">
              <Button size="xl" className="text-lg px-8 py-6 group">
                Get Your Free Analysis
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>

            <Link href="/reports">
              <Button size="xl" variant="outline" className="text-lg px-8 py-6">
                See Sample Report
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Contact/CTA Section */}
      <CTASection />
    </div>
  )
}
