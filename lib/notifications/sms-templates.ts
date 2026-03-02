// SMS message templates — keep under 160 chars for single-segment delivery

interface BookingSMSData {
  clientName: string;
  trainerName: string;
  serviceName: string;
  date: string;
  time: string;
}

interface RescheduleSMSData {
  clientName: string;
  serviceName: string;
  date: string;
  time: string;
}

export function getBookingConfirmationSMS(data: BookingSMSData): string {
  return `Hi ${data.clientName}, your ${data.serviceName} with ${data.trainerName} is confirmed for ${data.date} at ${data.time}.`;
}

export function getReminder24hSMS(data: BookingSMSData): string {
  return `Reminder: ${data.serviceName} with ${data.trainerName} tomorrow at ${data.time}.`;
}

export function getReminder2hSMS(data: BookingSMSData): string {
  return `Reminder: ${data.serviceName} with ${data.trainerName} in 2 hours at ${data.time}.`;
}

export function getRescheduleSMS(data: RescheduleSMSData): string {
  return `Your ${data.serviceName} has been rescheduled to ${data.date} at ${data.time}.`;
}
