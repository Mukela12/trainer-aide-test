'use client';

import { useMutation } from '@tanstack/react-query';

interface SendEmailInput {
  recipientEmail: string;
  recipientName: string;
  subject: string;
  message: string;
  clientId?: string;
}

async function sendEmailApi(input: SendEmailInput): Promise<void> {
  const res = await fetch('/api/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to send email');
  }
}

export function useSendEmail() {
  return useMutation({
    mutationFn: sendEmailApi,
  });
}
