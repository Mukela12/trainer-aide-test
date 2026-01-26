/**
 * Script to check studio owner data
 * Run with: npx tsx scripts/check-studio-owner.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://rzjiztpiiyxbgxngpdvc.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6aml6dHBpaXl4Ymd4bmdwZHZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODYzNTU0NiwiZXhwIjoyMDc0MjExNTQ2fQ.-OrZS1WGSvtp0s_XVaLlbbm0TfBmSzbxY9CLzU4SVNg'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const userId = 'ed46cebf-094d-47fb-9530-c2783d41b68c'

async function checkStudioOwner() {
  console.log('Checking studio owner data for user:', userId)
  console.log('='.repeat(60))

  // 1. Check profiles table
  console.log('\n1. PROFILES TABLE:')
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (profileError) {
    console.log('  Error:', profileError.message)
  } else if (profile) {
    console.log('  Found profile:')
    console.log('  - Role:', profile.role)
    console.log('  - studio_id:', profile.studio_id || 'NOT SET')
    console.log('  - Full record:', JSON.stringify(profile, null, 2))
  } else {
    console.log('  No profile found in profiles table')
  }

  // 2. Check bs_staff table
  console.log('\n2. BS_STAFF TABLE:')
  const { data: staff, error: staffError } = await supabase
    .from('bs_staff')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (staffError) {
    console.log('  Error:', staffError.message)
  } else if (staff) {
    console.log('  Found staff record:')
    console.log('  - staff_type:', staff.staff_type)
    console.log('  - studio_id:', staff.studio_id || 'NOT SET')
    console.log('  - is_solo:', staff.is_solo)
    console.log('  - Full record:', JSON.stringify(staff, null, 2))
  } else {
    console.log('  No staff record found')
  }

  // 3. Check bs_studios table structure
  console.log('\n3. BS_STUDIOS TABLE STRUCTURE:')
  const { data: studioSample, error: studioError } = await supabase
    .from('bs_studios')
    .select('*')
    .limit(1)

  if (studioError) {
    console.log('  Error:', studioError.message)
  } else if (studioSample && studioSample[0]) {
    console.log('  Columns:', Object.keys(studioSample[0]).join(', '))
  } else {
    console.log('  No studios found')
  }

  // 4. Check for studios owned by this user
  console.log('\n4. STUDIOS OWNED BY USER:')

  // Try owner_id
  const { data: studiosByOwner } = await supabase
    .from('bs_studios')
    .select('id, name, owner_id, user_id')
    .or(`owner_id.eq.${userId},user_id.eq.${userId}`)

  if (studiosByOwner && studiosByOwner.length > 0) {
    console.log('  Found studios:', studiosByOwner)
  } else {
    console.log('  No studios found with owner_id or user_id =', userId)
  }

  // 5. Check fc_clients for any clients
  console.log('\n5. FC_CLIENTS TABLE (sample):')
  const { data: clients, error: clientsError } = await supabase
    .from('fc_clients')
    .select('id, first_name, last_name, email, studio_id, trainer_id, status')
    .limit(5)

  if (clientsError) {
    console.log('  Error:', clientsError.message)
  } else if (clients && clients.length > 0) {
    console.log('  Sample clients:')
    clients.forEach(c => {
      console.log(`    - ${c.first_name} ${c.last_name} (studio: ${c.studio_id}, trainer: ${c.trainer_id})`)
    })
  } else {
    console.log('  No clients found in fc_clients table')
  }

  console.log('\n' + '='.repeat(60))
  console.log('SUMMARY:')
  console.log('If studio_id is NOT SET, you need to either:')
  console.log('1. Update the profiles table to set studio_id for this user')
  console.log('2. Create a record in bs_studios with owner_id = this user')
  console.log('3. Create a record in bs_staff with studio_id set')
}

checkStudioOwner().catch(console.error)
