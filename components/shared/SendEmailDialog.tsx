'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/lib/hooks/use-toast';
import { useSendEmail } from '@/lib/hooks/use-email';
import { Send, Mail } from 'lucide-react';

interface SendEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipient: {
    id?: string;
    email: string;
    name: string;
  };
}

export function SendEmailDialog({ open, onOpenChange, recipient }: SendEmailDialogProps) {
  const { toast } = useToast();
  const sendEmail = useSendEmail();
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.subject.trim()) {
      toast({
        variant: 'destructive',
        title: 'Subject required',
        description: 'Please enter a subject for your email.',
      });
      return;
    }

    if (!formData.message.trim()) {
      toast({
        variant: 'destructive',
        title: 'Message required',
        description: 'Please enter a message for your email.',
      });
      return;
    }

    try {
      await sendEmail.mutateAsync({
        recipientEmail: recipient.email,
        recipientName: recipient.name,
        subject: formData.subject,
        message: formData.message,
        clientId: recipient.id,
      });

      toast({
        title: 'Email sent',
        description: `Your email has been sent to ${recipient.name}.`,
      });

      handleClose();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send email',
      });
    }
  };

  const handleClose = () => {
    setFormData({
      subject: '',
      message: '',
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-wondrous-magenta" />
            Send Email
          </DialogTitle>
          <DialogDescription>
            Send a branded email to {recipient.name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Recipient Info */}
          <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">To</div>
            <div className="font-medium text-gray-900 dark:text-gray-100">{recipient.name}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">{recipient.email}</div>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="emailSubject">Subject *</Label>
            <Input
              id="emailSubject"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="Enter email subject..."
              required
            />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="emailMessage">Message *</Label>
            <Textarea
              id="emailMessage"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Write your message here..."
              rows={6}
              required
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Your email will be sent with your studio&apos;s branding.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={sendEmail.isPending}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={sendEmail.isPending}
              className="gap-2 bg-wondrous-magenta hover:bg-wondrous-magenta-dark"
            >
              {sendEmail.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send size={16} />
                  Send Email
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
