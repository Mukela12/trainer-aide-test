'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils/cn';
import { Mail, User, Loader2, CheckCircle2 } from 'lucide-react';
import { useInviteTrainer } from '@/lib/hooks/use-invitations';

interface InviteTrainerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const ROLES = [
  { value: 'trainer', label: 'Trainer' },
  { value: 'instructor', label: 'Instructor' },
  { value: 'manager', label: 'Manager' },
];

export function InviteTrainerDialog({ open, onOpenChange, onSuccess }: InviteTrainerDialogProps) {
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'trainer',
    message: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const inviteTrainer = useInviteTrainer();
  const [isSuccess, setIsSuccess] = useState(false);

  const resetForm = () => {
    setFormData({
      email: '',
      firstName: '',
      lastName: '',
      role: 'trainer',
      message: '',
    });
    setErrors({});
    setIsSuccess(false);
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset form after dialog closes
    setTimeout(resetForm, 200);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setErrors({});

    try {
      await inviteTrainer.mutateAsync({
        email: formData.email.toLowerCase(),
        firstName: formData.firstName || null,
        lastName: formData.lastName || null,
        role: formData.role,
        message: formData.message || null,
      });

      setIsSuccess(true);
      onSuccess?.();

      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (error: unknown) {
      const err = error as Error & { status?: number };
      if (err.status === 409) {
        setErrors({ email: 'An invitation for this email already exists' });
      } else {
        setErrors({ submit: err.message || 'Failed to send invitation. Please try again.' });
      }
    }
  };

  if (isSuccess) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md dark:bg-gray-800 dark:border-gray-700">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Invitation Sent!
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              We&apos;ve sent an invitation email to {formData.email}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg dark:bg-gray-800 dark:border-gray-700">
        <DialogHeader>
          <DialogTitle className="dark:text-gray-100">Invite Team Member</DialogTitle>
          <DialogDescription className="dark:text-gray-400">
            Send an invitation to join your studio team
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Email */}
          <div>
            <Label htmlFor="email">Email Address *</Label>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="trainer@example.com"
                className={cn('pl-10', errors.email && 'border-red-500')}
              />
            </div>
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
          </div>

          {/* Name Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <div className="relative mt-1">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="John"
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="Smith"
                className="mt-1"
              />
            </div>
          </div>

          {/* Role */}
          <div>
            <Label>Role *</Label>
            <div className="flex gap-2 mt-2 flex-wrap">
              {ROLES.map((role) => (
                <Button
                  key={role.value}
                  type="button"
                  variant={formData.role === role.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFormData({ ...formData, role: role.value })}
                  className={cn(
                    formData.role === role.value
                      ? 'bg-wondrous-magenta hover:bg-wondrous-magenta-alt'
                      : 'dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
                  )}
                >
                  {role.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Message */}
          <div>
            <Label htmlFor="message">Personal Message (optional)</Label>
            <textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Add a personal note to your invitation..."
              rows={3}
              className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-wondrous-primary dark:bg-gray-700 dark:text-gray-100"
            />
          </div>

          {/* Error Message */}
          {errors.submit && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{errors.submit}</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-3 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={inviteTrainer.isPending}
            className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={inviteTrainer.isPending}
            className="bg-wondrous-magenta hover:bg-wondrous-magenta-alt"
          >
            {inviteTrainer.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              'Send Invitation'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
