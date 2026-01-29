import Stripe from 'stripe';

// Platform fee percentage
export const PLATFORM_FEE_PERCENT = 2.5;

// Initialize Stripe with server-side key
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
  typescript: true,
});

// Calculate platform fees
export function calculateFees(amountCents: number) {
  const platformFeeCents = Math.round(amountCents * PLATFORM_FEE_PERCENT / 100);
  const trainerAmountCents = amountCents - platformFeeCents;

  return {
    amountCents,
    platformFeeCents,
    trainerAmountCents,
  };
}

// Format amount for display
export function formatAmount(cents: number, currency: string = 'gbp') {
  const amount = cents / 100;
  const formatter = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency.toUpperCase(),
  });
  return formatter.format(amount);
}

// Get return URLs for Stripe
export function getStripeUrls(baseUrl: string) {
  return {
    connectRefresh: `${baseUrl}/settings/payments?setup=refresh`,
    connectReturn: `${baseUrl}/settings/payments?setup=complete`,
    checkoutSuccess: `${baseUrl}/book/{SLUG}/confirm/{BOOKING_ID}`,
    checkoutCancel: `${baseUrl}/book/{SLUG}/checkout?cancelled=true`,
  };
}
