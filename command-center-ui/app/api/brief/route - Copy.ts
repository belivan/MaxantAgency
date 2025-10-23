import { NextResponse } from 'next/server';
import { getDefaultBrief } from '@/lib/api/orchestrator';

export const dynamic = 'force-dynamic';

export async function GET() {
  const brief = await getDefaultBrief();
  if (!brief) {
    return NextResponse.json({ success: false, error: 'Brief not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true, brief });
}

