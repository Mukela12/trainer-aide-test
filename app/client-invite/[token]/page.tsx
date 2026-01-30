'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

interface InvitationData {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  studioName: string | null;
  inviterName: string | null;
  message: string | null;
  expiresAt: string;
}

export default function ClientInvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid' | 'expired' | 'accepted' | 'error'>('loading');
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (token) {
      validateInvitation();
    }
  }, [token]);

  const validateInvitation = async () => {
    try {
      const response = await fetch(`/api/client-invitations/${token}`);
      const data = await response.json();

      if (!response.ok) {
        if (data.error === 'Invitation expired') {
          setStatus('expired');
        } else if (data.error === 'Invitation not found') {
          setStatus('invalid');
        } else {
          setStatus('error');
          setErrorMessage(data.error || 'Failed to validate invitation');
        }
        return;
      }

      setInvitation(data);
      setStatus('valid');
    } catch (error) {
      console.error('Error validating invitation:', error);
      setStatus('error');
      setErrorMessage('Failed to validate invitation. Please try again.');
    }
  };

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password.length < 8) {
      setErrorMessage('Password must be at least 8 characters');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const response = await fetch(`/api/client-invitations/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept invitation');
      }

      setStatus('accepted');

      // Redirect to client dashboard after a short delay
      setTimeout(() => {
        router.push('/client');
      }, 3000);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to accept invitation');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-wondrous-magenta mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Validating invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Invalid or expired state
  if (status === 'invalid' || status === 'expired' || status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {status === 'expired' ? 'Invitation Expired' : status === 'invalid' ? 'Invalid Invitation' : 'Error'}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
              {status === 'expired'
                ? 'This invitation has expired. Please contact your trainer for a new invitation.'
                : status === 'invalid'
                ? 'This invitation link is invalid or has already been used.'
                : errorMessage || 'Something went wrong. Please try again.'}
            </p>
            <Button
              variant="outline"
              onClick={() => router.push('/login')}
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Accepted state
  if (status === 'accepted') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Welcome!
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-center mb-2">
              Your account has been created successfully.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Redirecting to your dashboard...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Valid invitation - show signup form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-full bg-wondrous-blue-light mx-auto flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-wondrous-dark-blue" />
          </div>
          <CardTitle className="text-2xl">You are Invited!</CardTitle>
          <CardDescription>
            {invitation?.inviterName
              ? `${invitation.inviterName} has invited you to join ${invitation.studioName || 'their training platform'}`
              : 'You have been invited to join as a client'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invitation?.message && (
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border-l-4 border-wondrous-blue">
              <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                &quot;{invitation.message}&quot;
              </p>
            </div>
          )}

          <form onSubmit={handleAccept} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={invitation?.email || ''}
                disabled
                className="bg-gray-50 dark:bg-gray-800"
              />
            </div>

            {invitation?.firstName && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input
                    value={invitation.firstName}
                    disabled
                    className="bg-gray-50 dark:bg-gray-800"
                  />
                </div>
                {invitation?.lastName && (
                  <div className="space-y-2">
                    <Label>Last Name</Label>
                    <Input
                      value={invitation.lastName}
                      disabled
                      className="bg-gray-50 dark:bg-gray-800"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Create Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="Confirm your password"
                required
              />
            </div>

            {errorMessage && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                {errorMessage}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-wondrous-magenta hover:bg-wondrous-magenta-dark"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating Account...
                </>
              ) : (
                'Accept & Create Account'
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Already have an account?{' '}
            <a href="/login" className="text-wondrous-magenta hover:underline">
              Sign in
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
