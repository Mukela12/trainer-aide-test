import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkTrainers() {
  console.log('=== Checking Trainers ===\n');

  // Check profiles with business_slug
  const { data: trainers, error } = await supabase
    .from('profiles')
    .select('id, email, first_name, last_name, role, business_slug, is_onboarded')
    .not('business_slug', 'is', null);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Trainers with business_slug:\n');
  for (const t of trainers || []) {
    console.log(`- ${t.email}`);
    console.log(`  Slug: ${t.business_slug}`);
    console.log(`  Role: ${t.role}`);
    console.log(`  Onboarded: ${t.is_onboarded}`);
    console.log('');
  }

  // Check all roles
  console.log('\n=== All Users by Role ===\n');

  const { data: allUsers } = await supabase
    .from('profiles')
    .select('email, role, is_onboarded')
    .in('role', ['solo_practitioner', 'studio_owner', 'trainer']);

  for (const u of allUsers || []) {
    console.log(`- ${u.email} | ${u.role} | onboarded: ${u.is_onboarded}`);
  }

  // Check services
  console.log('\n=== Services ===\n');
  const { data: services } = await supabase
    .from('ta_services')
    .select('id, name, created_by, is_public, is_active');

  for (const s of services || []) {
    console.log(`- ${s.name} (public: ${s.is_public}, active: ${s.is_active})`);
  }

  // Check availability
  console.log('\n=== Availability ===\n');
  const { data: availability } = await supabase
    .from('ta_availability')
    .select('trainer_id, day_of_week, start_hour, end_hour, block_type')
    .eq('block_type', 'available');

  console.log(`Found ${availability?.length || 0} availability slots`);
}

checkTrainers();
