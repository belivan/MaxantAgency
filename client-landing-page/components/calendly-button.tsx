'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar } from 'lucide-react'
import { markCalendlyScheduled } from '@/lib/supabase-client'

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
    const handleCalendlyEvent = async (e: MessageEvent) => {
      if (e.data.event && e.data.event.indexOf('calendly') === 0) {
        console.log('Calendly event:', e.data.event)

        // Event scheduled
        if (e.data.event === 'calendly.event_scheduled') {
          console.log('Calendly event scheduled:', e.data.payload)

          // Update database if leadId provided
          if (leadId) {
            try {
              await markCalendlyScheduled(
                leadId,
                e.data.payload?.event?.uri || undefined,
                e.data.payload?.event?.start_time || undefined
              )
              console.log('✅ Calendly status updated in database')
            } catch (error) {
              console.error('❌ Failed to update Calendly status:', error)
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
