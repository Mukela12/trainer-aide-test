/**
 * Script to explore Supabase schema
 * Run with: npx tsx scripts/explore-schema.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://rzjiztpiiyxbgxngpdvc.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6aml6dHBpaXl4Ymd4bmdwZHZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODYzNTU0NiwiZXhwIjoyMDc0MjExNTQ2fQ.-OrZS1WGSvtp0s_XVaLlbbm0TfBmSzbxY9CLzU4SVNg'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function exploreSchema() {
  console.log('Exploring Supabase schema...\n')

  // Try querying known tables with detailed error info
  const tablesToCheck = [
    'profiles',
    'users',
    'bs_staff',
    'bs_studios',
    'fc_clients',
    'clients',
    'ta_workout_templates',
    'workout_templates',
    'templates',
    'ta_sessions',
    'sessions',
    'ta_exercise_library_original',
    'exercises',
    'role_permissions',
    'permissions',
    'team_invitations',
    'invitations',
    'instructors',
    'trainers',
    'studios',
    'bookings',
    'services',
  ]

  console.log('Checking tables...\n')

  const foundTables: string[] = []

  for (const tableName of tablesToCheck) {
    const { data, error, count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: false })
      .limit(1)

    if (!error) {
      foundTables.push(tableName)
      console.log(`✓ ${tableName}: ${count ?? 'unknown'} rows`)
      if (data && data[0]) {
        console.log(`  Columns: ${Object.keys(data[0]).join(', ')}`)
        // Print full sample for profiles and auth-related tables
        if (['profiles', 'bs_staff', 'fc_clients', 'ta_workout_templates', 'ta_sessions'].includes(tableName)) {
          console.log(`  Sample: ${JSON.stringify(data[0], null, 2)}`)
        }
      }
      console.log('')
    }
  }

  console.log('\n=== Found Tables ===')
  console.log(foundTables.join(', '))
}

exploreSchema().catch(console.error)
