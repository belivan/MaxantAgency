import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { success: false, error: 'Supabase credentials not configured' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { id: projectId } = await params;

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Fetch prospects for this project via project_prospects junction table
    const { data: links, error: linksError } = await supabase
      .from('project_prospects')
      .select(`
        id,
        added_at,
        prospects (
          id,
          company_name,
          website,
          city,
          state,
          created_at
        )
      `)
      .eq('project_id', projectId)
      .order('added_at', { ascending: false });

    if (linksError) {
      console.error('Prospects fetch error:', linksError);
      return NextResponse.json(
        { success: false, error: linksError.message || 'Failed to fetch prospects' },
        { status: 500 }
      );
    }

    // Flatten the data structure
    const prospects = (links || []).map(link => ({
      ...link.prospects,
      added_to_project_at: link.added_at
    }));

    return NextResponse.json({
      success: true,
      data: prospects,
      count: prospects.length
    });

  } catch (error: any) {
    console.error('Prospects API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch prospects' },
      { status: 500 }
    );
  }
}
