/**
 * Test script to directly query availability for a specific trainer
 * Run with: npx tsx scripts/test-availability-query.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function test() {
  console.log('\n=== AVAILABILITY QUERY TEST ===\n');

  // Smith Johnson's trainer ID
  const smithJohnsonId = '5fcdd224-48bc-405d-bc2e-cafff5674abc';

  // 1. Check if Smith Johnson has availability
  console.log('1. Checking availability for Smith Johnson (ID:', smithJohnsonId, ')');
  const { data: smithAvail, error: smithError } = await supabase
    .from('ta_availability')
    .select('*')
    .eq('trainer_id', smithJohnsonId)
    .eq('block_type', 'available');

  if (smithError) {
    console.log('Error:', smithError);
  } else {
    console.log('Found', smithAvail?.length || 0, 'availability records');
    console.log(JSON.stringify(smithAvail, null, 2));
  }

  // 2. Find any client that should see Smith Johnson
  console.log('\n2. Finding clients for Smith Johnson\'s studio');
  const { data: clients } = await supabase
    .from('fc_clients')
    .select('id, email, studio_id, invited_by')
    .or(`studio_id.eq.${smithJohnsonId},invited_by.eq.${smithJohnsonId}`);

  console.log('Clients:', JSON.stringify(clients, null, 2));

  // 3. Check the studio
  console.log('\n3. Checking studio');
  const { data: studio } = await supabase
    .from('bs_studios')
    .select('*')
    .eq('id', smithJohnsonId)
    .maybeSingle();

  console.log('Studio:', JSON.stringify(studio, null, 2));

  // 4. Check bs_staff
  console.log('\n4. Checking bs_staff for this studio');
  const { data: staff } = await supabase
    .from('bs_staff')
    .select('*')
    .or(`id.eq.${smithJohnsonId},studio_id.eq.${smithJohnsonId}`);

  console.log('Staff:', JSON.stringify(staff, null, 2));

  // 5. Test the full OR query that the API uses
  console.log('\n5. Testing full OR query');
  const trainerIds = [smithJohnsonId];
  const lookupIds = [smithJohnsonId];

  const trainerConditions = trainerIds.map(id => `trainer_id.eq.${id}`).join(',');
  const studioConditions = lookupIds.map(id => `studio_id.eq.${id}`).join(',');
  const orCondition = [trainerConditions, studioConditions].filter(Boolean).join(',');

  console.log('OR condition:', orCondition);

  const { data: fullQueryResult, error: fullQueryError } = await supabase
    .from('ta_availability')
    .select('*')
    .or(orCondition)
    .eq('block_type', 'available');

  if (fullQueryError) {
    console.log('Error:', fullQueryError);
  } else {
    console.log('Found', fullQueryResult?.length || 0, 'records');
    console.log(JSON.stringify(fullQueryResult, null, 2));
  }

  // 6. Check all availability to see day patterns
  console.log('\n6. Checking day_of_week distribution');
  const { data: allAvail } = await supabase
    .from('ta_availability')
    .select('trainer_id, day_of_week, start_hour, end_hour')
    .eq('trainer_id', smithJohnsonId)
    .eq('block_type', 'available');

  console.log('All availability for Smith Johnson:');
  console.log(JSON.stringify(allAvail, null, 2));

  // 7. Check a different trainer to compare
  console.log('\n7. Checking availability for trainer 68407593-d5d2-48c7-a307-2d36d95b3c3d (who has data)');
  const { data: otherAvail } = await supabase
    .from('ta_availability')
    .select('trainer_id, day_of_week, start_hour, end_hour')
    .eq('trainer_id', '68407593-d5d2-48c7-a307-2d36d95b3c3d')
    .eq('block_type', 'available');

  console.log('Availability:', JSON.stringify(otherAvail, null, 2));
}

test().catch(console.error);
