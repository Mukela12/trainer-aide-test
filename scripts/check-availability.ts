import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkAvailability() {
  const trainerId = 'ed46cebf-094d-47fb-9530-c2783d41b68c';

  console.log('=== All Availability for Trainer ===\n');

  const { data, error } = await supabase
    .from('ta_availability')
    .select('*')
    .eq('trainer_id', trainerId);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Total records:', data?.length);
  console.log('\nRecords:');
  for (const a of data || []) {
    console.log(`- Day ${a.day_of_week}: ${a.start_hour}:${a.start_minute || 0} - ${a.end_hour}:${a.end_minute || 0}`);
    console.log(`  Block type: ${a.block_type}, Recurrence: ${a.recurrence}`);
  }

  // Check what the API query would return
  console.log('\n=== Testing API Query ===\n');

  const { data: apiData, error: apiError } = await supabase
    .from('ta_availability')
    .select('day_of_week, start_hour, start_minute, end_hour, end_minute')
    .eq('trainer_id', trainerId)
    .eq('block_type', 'available')
    .eq('recurrence', 'weekly');

  console.log('API query result:', apiData?.length, 'records');
  console.log('Error:', apiError);

  if (apiData) {
    for (const a of apiData) {
      console.log(`- Day ${a.day_of_week}: ${a.start_hour}:${a.start_minute || 0} - ${a.end_hour}:${a.end_minute || 0}`);
    }
  }
}

checkAvailability();
