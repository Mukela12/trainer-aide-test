import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkAccounts() {
  const emails = [
    'hb12@wondrous.store',
    'mukelathegreat@gmail.com',
    'jessekatungu@gmail.com',
  ];

  console.log('=== Checking Specific Accounts ===\n');

  for (const email of emails) {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    console.log(`\n--- ${email} ---`);
    if (error) {
      console.log('Not found or error:', error.message);
    } else if (profile) {
      console.log('ID:', profile.id);
      console.log('Role:', profile.role);
      console.log('Is Onboarded:', profile.is_onboarded);
      console.log('Onboarding Step:', profile.onboarding_step);
      console.log('Business Name:', profile.business_name);
      console.log('Business Slug:', profile.business_slug);
      console.log('First Name:', profile.first_name);
      console.log('Last Name:', profile.last_name);
    }
  }

  // Check who has services
  console.log('\n\n=== Services by Creator ===\n');
  const { data: services } = await supabase
    .from('ta_services')
    .select('id, name, created_by, is_public');

  if (services && services.length > 0) {
    const creatorIds = [...new Set(services.map(s => s.created_by))];

    for (const creatorId of creatorIds) {
      const { data: creator } = await supabase
        .from('profiles')
        .select('email, role')
        .eq('id', creatorId)
        .single();

      console.log(`Creator: ${creator?.email} (${creator?.role})`);
      const creatorServices = services.filter(s => s.created_by === creatorId);
      for (const s of creatorServices) {
        console.log(`  - ${s.name}`);
      }
    }
  }

  // Check availability owners
  console.log('\n=== Availability by Trainer ===\n');
  const { data: avail } = await supabase
    .from('ta_availability')
    .select('trainer_id, day_of_week, start_hour, end_hour');

  if (avail && avail.length > 0) {
    const trainerIds = [...new Set(avail.map(a => a.trainer_id))];

    for (const trainerId of trainerIds) {
      const { data: trainer } = await supabase
        .from('profiles')
        .select('email, role')
        .eq('id', trainerId)
        .single();

      console.log(`Trainer: ${trainer?.email}`);
      const trainerAvail = avail.filter(a => a.trainer_id === trainerId);
      for (const a of trainerAvail) {
        console.log(`  Day ${a.day_of_week}: ${a.start_hour}:00 - ${a.end_hour}:00`);
      }
    }
  }
}

checkAccounts();
