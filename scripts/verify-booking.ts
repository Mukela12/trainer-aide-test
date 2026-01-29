import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verifyBooking() {
  const bookingId = process.argv[2] || 'c849299d-02cf-4301-b511-ef98ec4f8c36';

  console.log('=== Verifying Booking ===\n');

  // Get booking
  const { data: booking, error } = await supabase
    .from('ta_bookings')
    .select(`
      *,
      ta_services(name, price_cents),
      fc_clients(id, email, first_name, last_name, is_guest, source, invited_by)
    `)
    .eq('id', bookingId)
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Booking ID:', booking.id);
  console.log('Status:', booking.status);
  console.log('Scheduled At:', booking.scheduled_at);
  console.log('Duration:', booking.duration, 'minutes');
  console.log('Trainer ID:', booking.trainer_id);
  console.log('Hold Expiry:', booking.hold_expiry);
  console.log('Notes:', booking.notes);

  console.log('\nService:', (booking.ta_services as any)?.name);
  console.log('Price:', '£' + ((booking.ta_services as any)?.price_cents || 0) / 100);

  const client = booking.fc_clients as any;
  console.log('\nClient:');
  console.log('  ID:', client?.id);
  console.log('  Email:', client?.email);
  console.log('  Name:', client?.first_name, client?.last_name);
  console.log('  Is Guest:', client?.is_guest);
  console.log('  Source:', client?.source);
  console.log('  Invited By:', client?.invited_by);

  // Check if notifications were created
  console.log('\n=== Notifications ===\n');
  const { data: notifications } = await supabase
    .from('ta_notifications')
    .select('*')
    .eq('booking_id', bookingId);

  console.log('Notifications created:', notifications?.length || 0);
  for (const n of notifications || []) {
    console.log(`- Type: ${n.type}, Status: ${n.status}, Scheduled: ${n.scheduled_for}`);
  }
}

verifyBooking();
