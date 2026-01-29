/**
 * Cleanup test data from database
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

async function cleanup() {
  console.log('Cleaning up test data...\n');

  // First, find test clients
  const { data: testClients } = await supabase
    .from('fc_clients')
    .select('id, email')
    .like('email', 'test-%@example.com');

  console.log('Test clients found:', testClients?.length || 0);

  // Delete bookings for test clients first (to satisfy FK constraint)
  if (testClients && testClients.length > 0) {
    const clientIds = testClients.map((c) => c.id);

    // Delete notifications for these bookings
    const { data: bookings } = await supabase
      .from('ta_bookings')
      .select('id')
      .in('client_id', clientIds);

    if (bookings && bookings.length > 0) {
      const bookingIds = bookings.map((b) => b.id);
      await supabase.from('ta_notifications').delete().in('booking_id', bookingIds);
    }

    // Delete bookings
    const { error: bookingError } = await supabase
      .from('ta_bookings')
      .delete()
      .in('client_id', clientIds);
    console.log('Deleted bookings for test clients:', bookingError ? bookingError.message : 'success');

    // Now delete clients
    const { error: clientError } = await supabase
      .from('fc_clients')
      .delete()
      .in('id', clientIds);
    console.log('Deleted test clients:', clientError ? clientError.message : 'success');
  }

  // Also delete bookings with test notes pattern
  const { data: testBookings } = await supabase
    .from('ta_bookings')
    .select('id, notes')
    .or('notes.ilike.%test-%,notes.ilike.%Test booking%');

  console.log('Test bookings by notes pattern:', testBookings?.length || 0);

  if (testBookings && testBookings.length > 0) {
    const bookingIds = testBookings.map((b) => b.id);
    await supabase.from('ta_notifications').delete().in('booking_id', bookingIds);
    const { error } = await supabase
      .from('ta_bookings')
      .delete()
      .in('id', bookingIds);
    console.log('Deleted test bookings:', error ? error.message : 'success');
  }

  // Check for any bookings in the next few days
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const { data: upcomingBookings } = await supabase
    .from('ta_bookings')
    .select('id, scheduled_at, status, notes')
    .gte('scheduled_at', tomorrow.toISOString())
    .order('scheduled_at');

  console.log('\nUpcoming bookings:');
  if (upcomingBookings && upcomingBookings.length > 0) {
    for (const booking of upcomingBookings) {
      console.log(`  - ${booking.scheduled_at} | ${booking.status} | ${booking.notes?.substring(0, 50)}`);
    }
  } else {
    console.log('  (none)');
  }
}

cleanup().catch(console.error);
