import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function setupTestTrainer() {
  const email = 'jessekatungu@gmail.com';

  console.log(`Setting up trainer: ${email}\n`);

  // Update profile with onboarding data
  const { data, error } = await supabase
    .from('profiles')
    .update({
      is_onboarded: true,
      onboarding_step: 5,
      business_name: 'Jesse Fitness',
      business_slug: 'jesse-fitness',
      bio: 'Personal trainer specializing in strength and conditioning.',
      location: 'London, UK',
      years_experience: 5,
      specializations: ['Strength Training', 'Weight Loss', 'HIIT'],
    })
    .eq('email', email)
    .select()
    .single();

  if (error) {
    console.error('Error updating profile:', error);
    return;
  }

  console.log('Profile updated successfully!');
  console.log('Business Slug:', data.business_slug);
  console.log('Is Onboarded:', data.is_onboarded);

  // Verify services have prices
  const { data: services, error: servicesError } = await supabase
    .from('ta_services')
    .select('id, name, price_cents, is_public')
    .eq('created_by', data.id);

  console.log('\nServices:');
  for (const s of services || []) {
    console.log(`- ${s.name}: £${(s.price_cents || 0) / 100} (public: ${s.is_public})`);
  }

  // Update services with prices if needed
  const pricesToSet = [
    { name: '30min PT Session', price: 3500 },
    { name: '45min PT Session', price: 4500 },
    { name: '60min PT Session', price: 5500 },
    { name: '75min PT Session', price: 6500 },
    { name: '90min PT Session', price: 7500 },
  ];

  for (const p of pricesToSet) {
    await supabase
      .from('ta_services')
      .update({ price_cents: p.price, is_public: true, is_active: true })
      .eq('name', p.name)
      .eq('created_by', data.id);
  }

  console.log('\nPrices updated!');

  // Verify again
  const { data: updatedServices } = await supabase
    .from('ta_services')
    .select('name, price_cents, is_public')
    .eq('created_by', data.id);

  console.log('\nUpdated Services:');
  for (const s of updatedServices || []) {
    console.log(`- ${s.name}: £${(s.price_cents || 0) / 100}`);
  }

  console.log('\n✅ Test trainer ready!');
  console.log(`\nPublic booking page: http://localhost:3001/book/jesse-fitness`);
}

setupTestTrainer();
