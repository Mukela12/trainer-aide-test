import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function createIntroService() {
  const trainerId = 'ed46cebf-094d-47fb-9530-c2783d41b68c';

  // Check if intro service exists
  const { data: existing } = await supabase
    .from('ta_services')
    .select('id')
    .eq('created_by', trainerId)
    .eq('is_intro_session', true)
    .single();

  if (existing) {
    console.log('Intro service already exists:', existing.id);
    return;
  }

  // Get studio_id from existing services
  const { data: service } = await supabase
    .from('ta_services')
    .select('studio_id')
    .eq('created_by', trainerId)
    .limit(1)
    .single();

  // Create free intro session
  const { data, error } = await supabase
    .from('ta_services')
    .insert({
      created_by: trainerId,
      studio_id: service?.studio_id,
      name: 'Free Intro Session',
      description: 'A free 30-minute introductory session to discuss your fitness goals.',
      duration: 30,
      type: '1-2-1',
      max_capacity: 1,
      price_cents: 0,
      is_public: true,
      is_active: true,
      is_intro_session: true,
    })
    .select()
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Created intro service:', data.id);
  console.log('Name:', data.name);
}

createIntroService();
