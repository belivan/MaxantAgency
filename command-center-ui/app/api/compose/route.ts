import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, strategy, generateVariants, verify } = body;

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'URL is required' },
        { status: 400 }
      );
    }

    // Forward request to email-composer API (port 3001)
    const emailComposerUrl = process.env.EMAIL_COMPOSER_URL || 'http://localhost:3001';
    const response = await fetch(`${emailComposerUrl}/api/compose`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url,
        strategy: strategy || 'compliment-sandwich',
        generateVariants: generateVariants !== undefined ? generateVariants : false,
        verify: verify !== undefined ? verify : false
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Email composition failed');
    }

    return NextResponse.json({
      success: true,
      ...data
    });
  } catch (error: any) {
    console.error('Compose API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to compose email' },
      { status: 500 }
    );
  }
}
