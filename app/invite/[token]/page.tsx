'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  CheckCircle2,
  XCircle,
  Building2,
  Mail,
  User,
  Loader2,
} from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

interface InvitationDetails {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  studioName: string;
  inviterName: string;
  message: string | null;
  expiresAt: Date;
  isExpired: boolean;
}

type PageState = 'loading' | 'valid' | 'expired' | 'invalid' | 'accepted' | 'accepting';

export default function InvitationPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [pageState, setPageState] = useState<PageState>('loading');
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  // Track actual Supabase auth state (not persisted store which can be stale)
  const [isActuallyAuthenticated, setIsActuallyAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const loadInvitation = async () => {
      const supabase = getSupabaseBrowserClient();

      // Check actual Supabase session (not persisted Zustand state)
      const { data: { session } } = await supabase.auth.getSession();
      setIsActuallyAuthenticated(!!session);

      // Fetch invitation by token
      const { data, error } = await supabase
        .from('ta_invitations')
        .select(`
          id,
          email,
          first_name,
          last_name,
          role,
          message,
          status,
          expires_at,
          studio_id,
          invited_by
        `)
        .eq('token', token)
        .single();

      if (error || !data) {
        setPageState('invalid');
        return;
      }

      // Check if already accepted
      if (data.status === 'accepted') {
        setPageState('accepted');
        return;
      }

      // Check if expired or revoked
      if (data.status !== 'pending' || new Date(data.expires_at) < new Date()) {
        setPageState('expired');
        return;
      }

      // Fetch studio name
      const { data: studio } = await supabase
        .from('bs_studios')
        .select('name')
        .eq('id', data.studio_id)
        .single();

      // Fetch inviter name
      const { data: inviter } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', data.invited_by)
        .single();

      setInvitation({
        id: data.id,
        email: data.email,
        firstName: data.first_name,
        lastName: data.last_name,
        role: data.role,
        studioName: studio?.name || 'Unknown Studio',
        inviterName: inviter ? `${inviter.first_name} ${inviter.last_name}` : 'Unknown',
        message: data.message,
        expiresAt: new Date(data.expires_at),
        isExpired: false,
      });
      setPageState('valid');
    };

    if (token) {
      loadInvitation();
    }
  }, [token]);

  const handleAccept = async () => {
    if (!invitation) return;

    // For unauthenticated users, validate password
    if (!isActuallyAuthenticated) {
      if (password.length < 8) {
        setError('Password must be at least 8 characters');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
    }

    setPageState('accepting');
    setError(null);

    try {
      const response = await fetch(`/api/invitations/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: isActuallyAuthenticated ? undefined : password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.requiresLogin) {
          // Existing user needs to sign in first
          const returnUrl = `/invite/${token}`;
          router.push(`/login?returnTo=${encodeURIComponent(returnUrl)}&email=${encodeURIComponent(invitation.email)}`);
          return;
        }
        throw new Error(data.error || 'Failed to accept invitation');
      }

      // Sign in the new user
      if (!isActuallyAuthenticated && password) {
        const supabase = getSupabaseBrowserClient();
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: invitation.email,
          password,
        });
        if (signInError) {
          console.error('Error signing in:', signInError);
        }
      }

      setPageState('accepted');

      // Redirect to dashboard
      setTimeout(() => {
        router.push(data.redirectUrl || '/trainer');
      }, 2000);
    } catch (err) {
      console.error('Error accepting invitation:', err);
      setError(err instanceof Error ? err.message : 'Failed to accept invitation');
      setPageState('valid');
    }
  };

  // Loading state
  if (pageState === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-wondrous-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Invalid invitation
  if (pageState === 'invalid') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="text-red-600 dark:text-red-400" size={32} />
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Invalid Invitation
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              This invitation link is not valid. Please contact the person who invited you.
            </p>
            <Link href="/">
              <Button>Go Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Expired invitation
  if (pageState === 'expired') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="text-yellow-600 dark:text-yellow-400" size={32} />
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Invitation Expired
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              This invitation has expired. Please ask for a new invitation.
            </p>
            <Link href="/">
              <Button>Go Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Already accepted
  if (pageState === 'accepted') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="text-green-600 dark:text-green-400" size={32} />
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Invitation Accepted!
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              You&apos;ve successfully joined the team. Redirecting to your dashboard...
            </p>
            <Link href="/trainer">
              <Button>Go to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Valid invitation - show accept form
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center pb-4">
          <div className="w-16 h-16 bg-wondrous-blue/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="text-wondrous-blue" size={32} />
          </div>
          <CardTitle className="text-2xl">You&apos;re Invited!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-400">
              <strong>{invitation?.inviterName}</strong> has invited you to join
            </p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1">
              {invitation?.studioName}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              as a <span className="capitalize font-medium">{invitation?.role}</span>
            </p>
          </div>

          {invitation?.message && (
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                &quot;{invitation.message}&quot;
              </p>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
              <Mail size={16} />
              <span>{invitation?.email}</span>
            </div>
            {(invitation?.firstName || invitation?.lastName) && (
              <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                <User size={16} />
                <span>
                  {invitation?.firstName} {invitation?.lastName}
                </span>
              </div>
            )}
          </div>

          {/* Password setup for new users */}
          {isActuallyAuthenticated === false && (
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="password">Create Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  required
                />
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <Button
            size="lg"
            className="w-full"
            onClick={handleAccept}
            disabled={pageState === 'accepting'}
          >
            {pageState === 'accepting' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {isActuallyAuthenticated ? 'Accepting...' : 'Creating Account...'}
              </>
            ) : isActuallyAuthenticated ? (
              'Accept Invitation'
            ) : (
              'Accept & Create Account'
            )}
          </Button>

          <p className="text-xs text-center text-gray-500">
            This invitation expires on{' '}
            {invitation?.expiresAt.toLocaleDateString()}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
