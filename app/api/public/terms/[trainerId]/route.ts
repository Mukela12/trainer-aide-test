import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ trainerId: string }> }
) {
  try {
    const { trainerId } = await params;
    const supabase = createServiceRoleClient();

    // Look up the studio owned by this trainer
    const { data: studio } = await supabase
      .from('bs_studios')
      .select('client_terms')
      .eq('owner_id', trainerId)
      .maybeSingle();

    if (!studio?.client_terms) {
      return NextResponse.json({ active: false });
    }

    const terms = studio.client_terms as { active: boolean; content: string; version: number };

    if (!terms.active || !terms.content) {
      return NextResponse.json({ active: false });
    }

    return NextResponse.json({
      active: true,
      content: terms.content,
      version: terms.version,
    });
  } catch (error) {
    console.error('Error fetching terms:', error);
    return NextResponse.json({ active: false });
  }
}
