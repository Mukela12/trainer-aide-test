import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { EmailOtpType } from '@supabase/supabase-js'

/**
 * Handles Supabase email confirmation links (password recovery, email verify, etc.)
 * Supabase emails link to /auth/confirm?token_hash=xxx&type=recovery
 * This route verifies the token and redirects to the appropriate page.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/'

  if (!token_hash || !type) {
    return NextResponse.redirect(new URL('/login?error=Invalid+reset+link', request.url))
  }

  // We need to collect cookies during verification, then apply them to the redirect response.
  // Use an intermediate array to capture cookie operations.
  const pendingCookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          pendingCookies.push(...cookiesToSet)
        },
      },
    }
  )

  const { error } = await supabase.auth.verifyOtp({ type, token_hash })

  if (error) {
    console.error('OTP verification error:', error.message)
    if (type === 'recovery') {
      return NextResponse.redirect(
        new URL('/forgot-password?error=expired', request.url)
      )
    }
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, request.url)
    )
  }

  // Determine redirect based on type
  let redirectPath = next
  if (type === 'recovery') {
    redirectPath = '/reset-password'
  } else if (type === 'signup' || type === 'email') {
    redirectPath = '/auth/callback'
  }

  const response = NextResponse.redirect(new URL(redirectPath, request.url))

  // Apply collected auth cookies to the redirect response
  for (const { name, value, options } of pendingCookies) {
    response.cookies.set(name, value, options as Record<string, string>)
  }

  return response
}
