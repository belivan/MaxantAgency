'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar } from 'lucide-react'

// Extend Window interface for Calendly
declare global {
  interface Window {
    Calendly?: {
      initPopupWidget: (options: { url: string }) => void
    }
  }
}

interface CalendlyButtonProps {
  /**
   * Your Calendly scheduling URL
   * Example: "https://calendly.com/your-username/consultation"
   */
  calendlyUrl: string

  /**
   * Lead information to pre-fill Calendly form
   */
  leadName?: string
  leadEmail?: string

  /**
   * Lead ID from database (for tracking)
   */
  leadId?: string

  /**
   * Button variant
   */
  variant?: 'default' | 'outline' | 'ghost' | 'link' | 'secondary' | 'destructive'

  /**
   * Button size
   */
  size?: 'default' | 'sm' | 'lg' | 'icon'

  /**
   * Custom button text
   */
  buttonText?: string

  /**
   * Custom className
   */
  className?: string

  /**
   * Callback when event is scheduled
   */
  onScheduled?: (event: any) => void
}

export function CalendlyButton({
  calendlyUrl,
  leadName,
  leadEmail,
  leadId,
  variant = 'default',
  size = 'default',
  buttonText = 'Schedule Consultation',
  className = '',
  onScheduled
}: CalendlyButtonProps) {
  // Listen for Calendly events
  useEffect(() => {
    console.log('🎯 CalendlyButton mounted, leadId:', leadId || 'none (CTA section)')

    const handleCalendlyEvent = async (e: MessageEvent) => {
      // Log ALL messages to debug
      if (e.data.event) {
        console.log('📨 Message received:', e.data.event)
      }

      if (e.data.event && e.data.event.indexOf('calendly') === 0) {
        console.log('✅ Calendly event detected:', e.data.event)

        // Event scheduled
        if (e.data.event === 'calendly.event_scheduled') {
          console.log('Calendly event scheduled:', e.data.payload)

          // Update database if leadId provided
          if (leadId) {
            try {
              const response = await fetch('/api/update-calendly', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  leadId,
                  eventId: e.data.payload?.event?.uri || undefined,
                  scheduledAt: e.data.payload?.event?.start_time || undefined
                })
              })

              const result = await response.json()

              if (response.ok && result.success) {
                console.log('✅ Calendly status updated in database:', result.data)
              } else {
                console.error('❌ Failed to update Calendly status:', result.error || result.message)
              }
            } catch (error) {
              console.error('❌ Failed to update Calendly status:', error)
            }
          } else {
            // No leadId - this is a CTA booking, capture anonymously (Calendly doesn't provide personal data in popup widget)
            console.log('ℹ️  No leadId - capturing CTA booking anonymously (source: cta_section)')
            console.log('📦 Full Calendly payload:', JSON.stringify(e.data.payload, null, 2))

            try {
              const invitee = e.data.payload?.invitee
              const event = e.data.payload?.event

              console.log('👤 Invitee data:', invitee)
              console.log('📅 Event data:', event)

              // Build capture data (always include eventId and source, personal data is optional)
              const captureData: any = {
                eventId: event?.uri || undefined,
                scheduledAt: event?.start_time || undefined,
                source: 'cta_section' // Clearly labeled for analytics
              }

              // Include personal data if miraculously available (unlikely in popup widget due to Calendly privacy)
              if (invitee?.name) captureData.name = invitee.name
              if (invitee?.email) captureData.email = invitee.email

              console.log('📤 Sending CTA booking capture request:', {
                ...captureData,
                note: captureData.name && captureData.email ? 'Has personal data' : 'Anonymous - Calendly privacy feature'
              })

              const response = await fetch('/api/capture-calendly-booking', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(captureData)
              })

              const result = await response.json()

              console.log('📡 API Response:', result)

              if (response.ok && result.success) {
                if (result.isAnonymous) {
                  console.log('✅ CTA booking captured ANONYMOUSLY:', result.leadId)
                  console.log('   Source labeled as: cta_section')
                  console.log('   Event ID:', captureData.eventId)
                } else if (result.wasExisting) {
                  console.log('✅ CTA booking captured - EXISTING lead updated:', result.leadId)
                  console.log('   Email was already in database, Calendly info updated')
                } else {
                  console.log('✅ CTA booking captured - NEW lead created:', result.leadId)
                }
              } else {
                console.error('❌ Failed to capture CTA booking:', result.error || result.message)
                console.error('   Full error:', result)
              }
            } catch (error) {
              console.error('❌ Failed to capture CTA booking:', error)
            }
          }

          // Call custom callback
          if (onScheduled) {
            onScheduled(e.data.payload)
          }
        }
      }
    }

    window.addEventListener('message', handleCalendlyEvent)
    return () => window.removeEventListener('message', handleCalendlyEvent)
  }, [leadId, onScheduled])

  // Build Calendly URL with pre-filled data
  const buildCalendlyUrl = () => {
    const url = new URL(calendlyUrl)

    if (leadName) {
      url.searchParams.set('name', leadName)
    }

    if (leadEmail) {
      url.searchParams.set('email', leadEmail)
    }

    return url.toString()
  }

  const handleButtonClick = (e: React.MouseEvent) => {
    e.preventDefault()

    if (typeof window !== 'undefined' && window.Calendly) {
      window.Calendly.initPopupWidget({ url: buildCalendlyUrl() })
    } else {
      console.error('Calendly widget not loaded')
      alert('Calendly is still loading. Please try again in a moment.')
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleButtonClick}
    >
      <Calendar className="w-4 h-4 mr-2" />
      {buttonText}
    </Button>
  )
}
