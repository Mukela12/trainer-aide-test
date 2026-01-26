import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { ROLE_DASHBOARDS, UserRole } from '@/lib/permissions'

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/auth/callback',
]

// Routes that are API routes (handle separately)
const API_ROUTES = ['/api/']

// Static assets and Next.js internals
const STATIC_PATHS = ['/_next', '/images', '/favicon.ico']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip static assets and internals
  if (STATIC_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // Skip API routes - they handle their own auth
  if (API_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Update session (refresh tokens if needed)
  const { user, response } = await updateSession(request)

  // Allow public routes
  if (PUBLIC_ROUTES.includes(pathname)) {
    // If user is authenticated and on login page, redirect to dashboard
    if (user && pathname === '/login') {
      // Get user role from profile (would need to fetch from DB)
      // For now, redirect to solo dashboard as default
      const redirectUrl = new URL('/solo', request.url)
      return NextResponse.redirect(redirectUrl)
    }
    return response
  }

  // Protected routes - require authentication
  if (!user) {
    // Redirect to login with return URL
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('returnTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // User is authenticated - let them through
  // Role-based route protection is handled at the page level
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
