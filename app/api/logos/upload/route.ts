import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { uploadBusinessLogo } from '@/lib/utils/cloudinary';

/**
 * POST /api/logos/upload
 * Upload a business logo to Cloudinary and save the URL to the user's profile
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { image } = body;

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Validate image format (should be base64 data URL)
    if (!image.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Invalid image format' }, { status: 400 });
    }

    // Upload to Cloudinary
    const result = await uploadBusinessLogo(image, user.id);

    // Update profile with new logo URL
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ business_logo_url: result.url })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating profile with logo:', updateError);
      return NextResponse.json({ error: 'Failed to save logo' }, { status: 500 });
    }

    return NextResponse.json({
      url: result.url,
      publicId: result.publicId,
    });
  } catch (error) {
    console.error('Logo upload error:', error);
    return NextResponse.json({ error: 'Failed to upload logo' }, { status: 500 });
  }
}

/**
 * DELETE /api/logos/upload
 * Remove the business logo from the user's profile
 */
export async function DELETE() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Clear logo URL from profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ business_logo_url: null })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error removing logo from profile:', updateError);
      return NextResponse.json({ error: 'Failed to remove logo' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logo delete error:', error);
    return NextResponse.json({ error: 'Failed to remove logo' }, { status: 500 });
  }
}
