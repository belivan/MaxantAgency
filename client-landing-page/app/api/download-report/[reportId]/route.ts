import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { supabase, markDownloadComplete } from '@/lib/supabase-client'

// Legacy fallback: Map old report IDs to local file paths
// Used only if report not found in database or Supabase Storage unavailable
const LEGACY_REPORT_PATHS: Record<string, string> = {
  '1': 'local-backups/report-engine/reports/avenue-dental-arts-west-hartford-dentist/avenue-dental-arts-west-hartford-dentist-FULL.pdf',
  '2': 'local-backups/report-engine/reports/burnside-dental-care-p-c--FULL.pdf',
  '3': 'local-backups/report-engine/reports/center-for-dental-excellence/center-for-dental-excellence-FULL.pdf',
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const { reportId } = await params
    const leadId = request.nextUrl.searchParams.get('leadId')

    console.log('[Download] Report ID:', reportId)
    console.log('[Download] Lead ID:', leadId)

    if (!reportId) {
      return NextResponse.json(
        { error: 'Report ID is required' },
        { status: 400 }
      )
    }

    // STEP 1: Try to fetch report metadata from database
    console.log('[Download] Querying reports table...')
    const { data: reportRecord, error: dbError } = await supabase
      .from('reports')
      .select('id, storage_path, company_name, format')
      .eq('id', reportId)
      .single()

    let pdfBuffer: Buffer
    let filename: string

    // STEP 2: If found in database, fetch from VPS storage
    if (reportRecord && reportRecord.storage_path) {
      console.log('[Download] Report found in database:', reportRecord.company_name)
      console.log('[Download] Storage path:', reportRecord.storage_path)

      // Download from VPS storage (served via Caddy)
      const storageUrl = `https://api.mintydesign.xyz/storage/reports/${reportRecord.storage_path}`
      console.log('[Download] Fetching from:', storageUrl)

      const response = await fetch(storageUrl)

      if (!response.ok) {
        console.error('[Download] VPS Storage error:', response.status, response.statusText)
        console.error('[Download] Storage path:', reportRecord.storage_path)
        throw new Error(
          `Failed to download report from VPS storage: ${response.status} ${response.statusText}. ` +
          `The report may need to be regenerated. Storage path: ${reportRecord.storage_path}`
        )
      }

      // Convert response to Buffer
      const arrayBuffer = await response.arrayBuffer()
      pdfBuffer = Buffer.from(arrayBuffer)

      console.log('[Download] Downloaded from VPS storage, size:', pdfBuffer.length, 'bytes')

      // Generate clean filename
      filename = `${reportRecord.company_name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-analysis-report.pdf`
    }
    // STEP 3: Fallback to legacy hardcoded paths (for old reports not in database)
    else {
      console.log('[Download] Report not found in database, trying legacy paths...')

      if (!LEGACY_REPORT_PATHS[reportId]) {
        console.error('[Download] Report not found in database or legacy paths')
        return NextResponse.json(
          { error: 'Report not found' },
          { status: 404 }
        )
      }

      const relativePath = LEGACY_REPORT_PATHS[reportId]
      const absolutePath = path.resolve(process.cwd(), relativePath)

      console.log('[Download] Using legacy path:', absolutePath)

      if (!existsSync(absolutePath)) {
        console.error('[Download] PDF file not found at:', absolutePath)
        return NextResponse.json(
          { error: 'Report file not found', path: absolutePath },
          { status: 404 }
        )
      }

      pdfBuffer = await readFile(absolutePath)
      filename = `website-analysis-report-${reportId}.pdf`

      console.log('[Download] Read from legacy path, size:', pdfBuffer.length, 'bytes')
    }

    // STEP 4: Update download status in database if leadId is provided
    if (leadId) {
      try {
        await markDownloadComplete(leadId)
        console.log('[Download] Marked download complete for lead:', leadId)
      } catch (error) {
        console.error('[Download] Error updating download status:', error)
        // Don't fail the download if status update fails
      }
    }

    // STEP 5: Return PDF file with proper headers
    // Stream the PDF directly as bytes for maximum compatibility
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(pdfBuffer)
        controller.close()
      }
    })

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    console.error('[Download] Error in download-report API:', error)

    return NextResponse.json(
      {
        error: 'Failed to download report',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
