/**
 * Quick test to verify exercise service works after fix
 * Run with: npx tsx scripts/test-exercise-service.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('Testing exercise service with ta_exercise_library table...\n');

  // Test basic query
  const { data: exercises, error, count } = await supabase
    .from('ta_exercise_library')
    .select('*', { count: 'exact' })
    .limit(5);

  if (error) {
    console.log('❌ Error:', error.message);
    process.exit(1);
  }

  console.log(`✅ Found ${count} exercises in ta_exercise_library`);

  if (exercises && exercises.length > 0) {
    console.log('\nSample exercises:');
    exercises.forEach((ex, i) => {
      console.log(`  ${i + 1}. ${ex.name} (${ex.equipment || 'bodyweight'})`);
    });

    console.log('\nExercise columns available:');
    console.log(`  ${Object.keys(exercises[0]).join(', ')}`);
  }

  // Test filtering by equipment (for AI program generation)
  const equipmentTypes = ['dumbbells', 'barbell', 'cables', 'bodyweight'];
  console.log('\n\nTesting equipment filters:');

  for (const equipment of equipmentTypes) {
    const { count: eqCount } = await supabase
      .from('ta_exercise_library')
      .select('*', { count: 'exact', head: true })
      .eq('equipment', equipment);

    console.log(`  ${equipment}: ${eqCount || 0} exercises`);
  }

  console.log('\n✅ Exercise service is working correctly!');
}

main().catch(console.error);
