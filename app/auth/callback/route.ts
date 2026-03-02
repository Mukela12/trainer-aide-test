import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get('code');
  const returnTo = searchParams.get('returnTo');

  // Check for error params (e.g. expired link)
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  if (error) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', errorDescription || error);
    return NextResponse.redirect(loginUrl);
  }

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing sessions.
            }
          },
        },
      }
    );

    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('error', exchangeError.message);
      return NextResponse.redirect(loginUrl);
    }

    // Check if this is a password recovery flow
    // Supabase sets the session type when exchanging a recovery code
    if (data.session) {
      // Check the user's aud claim or the recovery event
      // The session from a recovery code will be valid - redirect to reset password page
      const type = searchParams.get('type');
      if (type === 'recovery') {
        const resetUrl = new URL('/reset-password', request.url);
        return NextResponse.redirect(resetUrl);
      }
    }

    // Normal auth flow - redirect to returnTo or default dashboard
    const redirectTo = returnTo || '/solo';
    return NextResponse.redirect(new URL(redirectTo, request.url));
  }

  // No code provided - check for hash fragment recovery flow
  // (Supabase sometimes uses hash fragments for recovery tokens)
  // Redirect to login as fallback
  const loginUrl = new URL('/login', request.url);
  return NextResponse.redirect(loginUrl);
}
