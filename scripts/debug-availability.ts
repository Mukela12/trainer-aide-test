/**
 * Debug script to analyze availability data flow
 * Run with: npx tsx scripts/debug-availability.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debug() {
  console.log('\n=== AVAILABILITY DEBUG ===\n');

  // 1. Get sample availability records
  const { data: availability } = await supabase
    .from('ta_availability')
    .select('id, trainer_id, studio_id, block_type, day_of_week, start_hour, end_hour, recurrence')
    .eq('block_type', 'available')
    .limit(10);

  console.log('1. Sample ta_availability records (available blocks):');
  console.log(JSON.stringify(availability, null, 2));

  // 2. Get unique trainer_ids from availability
  const { data: trainerIds } = await supabase
    .from('ta_availability')
    .select('trainer_id')
    .eq('block_type', 'available');

  const uniqueTrainerIds = [...new Set((trainerIds || []).map(t => t.trainer_id))];
  console.log('\n2. Unique trainer_ids in ta_availability:', uniqueTrainerIds);

  // 3. Check if these trainer_ids exist in profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, first_name, last_name, role')
    .in('id', uniqueTrainerIds);

  console.log('\n3. Matching profiles for these trainer_ids:');
  console.log(JSON.stringify(profiles, null, 2));

  // 4. Check bs_staff for these IDs
  const { data: staff } = await supabase
    .from('bs_staff')
    .select('id, email, first_name, last_name, studio_id, staff_type')
    .in('id', uniqueTrainerIds);

  console.log('\n4. Matching bs_staff for these trainer_ids:');
  console.log(JSON.stringify(staff, null, 2));

  // 5. Get all bs_staff with staff_type trainer/owner/instructor
  const { data: allStaff } = await supabase
    .from('bs_staff')
    .select('id, email, first_name, last_name, studio_id, staff_type')
    .in('staff_type', ['trainer', 'owner', 'instructor'])
    .limit(10);

  console.log('\n5. Sample bs_staff (trainers/owners/instructors):');
  console.log(JSON.stringify(allStaff, null, 2));

  // 6. Get sample fc_clients
  const { data: clients } = await supabase
    .from('fc_clients')
    .select('id, email, studio_id, invited_by, is_guest')
    .limit(10);

  console.log('\n6. Sample fc_clients:');
  console.log(JSON.stringify(clients, null, 2));

  // 7. Get bs_studios
  const { data: studios } = await supabase
    .from('bs_studios')
    .select('id, name, owner_id')
    .limit(10);

  console.log('\n7. bs_studios:');
  console.log(JSON.stringify(studios, null, 2));

  // 8. Check if availability trainer_ids match studio owners
  if (studios && studios.length > 0) {
    const ownerIds = studios.map(s => s.owner_id);
    const matchingOwners = uniqueTrainerIds.filter(id => ownerIds.includes(id));
    console.log('\n8. Trainer IDs that match studio owners:', matchingOwners);
  }

  // 9. Get a specific client by email to trace the full flow
  console.log('\n9. Looking for a specific client to trace flow...');
  const { data: sampleClient } = await supabase
    .from('fc_clients')
    .select('*')
    .not('studio_id', 'is', null)
    .limit(1)
    .single();

  if (sampleClient) {
    console.log('Sample client with studio_id:', JSON.stringify(sampleClient, null, 2));

    // Check what trainers this client should see
    const { data: clientTrainers } = await supabase
      .from('bs_staff')
      .select('id, first_name, last_name, studio_id, staff_type')
      .eq('studio_id', sampleClient.studio_id)
      .in('staff_type', ['trainer', 'owner', 'instructor']);

    console.log('\nTrainers for this client\'s studio:', JSON.stringify(clientTrainers, null, 2));

    // Check availability for these trainers
    if (clientTrainers && clientTrainers.length > 0) {
      const trainerIdList = clientTrainers.map(t => t.id);
      const { data: trainerAvail } = await supabase
        .from('ta_availability')
        .select('*')
        .in('trainer_id', trainerIdList)
        .eq('block_type', 'available');

      console.log('\nAvailability for these trainers:', JSON.stringify(trainerAvail, null, 2));
    }
  }

  // 10. Summary of the issue
  console.log('\n=== SUMMARY ===');
  console.log('Total availability records:', (trainerIds || []).length);
  console.log('Unique trainer IDs in availability:', uniqueTrainerIds.length);
  console.log('bs_staff records matching availability trainer_ids:', (staff || []).length);
  console.log('\nPotential issues:');
  if ((staff || []).length < uniqueTrainerIds.length) {
    console.log('- Some trainer_ids in ta_availability do NOT exist in bs_staff');
    console.log('- This means clients looking up trainers from bs_staff won\'t find availability');
  }
}

debug().catch(console.error);
