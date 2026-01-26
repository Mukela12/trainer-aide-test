/**
 * Test exercise service using images database
 * Run with: npx tsx scripts/test-exercise-service-final.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Use images database (Trainer-Aide) for complete exercise data
const supabaseUrl = process.env.NEXT_PUBLIC_IMAGES_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_IMAGES_SUPABASE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('Testing exercise service using images database (Trainer-Aide)...\n');
  console.log(`URL: ${supabaseUrl}\n`);

  // Step 1: Get all exercises
  const { data: exercises, error, count } = await supabase
    .from('ta_exercise_library_original')
    .select('*', { count: 'exact' })
    .limit(5);

  if (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }

  console.log(`Total exercises: ${count}`);

  if (exercises && exercises.length > 0) {
    console.log('\nSample exercise columns:');
    const cols = Object.keys(exercises[0]);
    console.log(`  ${cols.slice(0, 15).join(', ')}...`);

    // Check for required columns
    const requiredCols = ['is_bodyweight', 'movement_pattern', 'plane_of_motion', 'anatomical_category', 'exercise_type'];
    const missingCols = requiredCols.filter(c => !cols.includes(c));

    if (missingCols.length > 0) {
      console.log(`\n⚠️  Missing required columns: ${missingCols.join(', ')}`);
    } else {
      console.log('\n✅ All required columns present');
    }

    console.log('\nSample exercise:');
    const ex = exercises[0];
    console.log(`  Name: ${ex.name}`);
    console.log(`  Equipment: ${ex.equipment}`);
    console.log(`  Level: ${ex.level}`);
    console.log(`  Movement Pattern: ${ex.movement_pattern}`);
    console.log(`  Is Bodyweight: ${ex.is_bodyweight}`);
    console.log(`  Anatomical Category: ${ex.anatomical_category}`);
  }

  // Step 2: Test equipment filter
  console.log('\n\nEquipment counts:');
  const equipmentTypes = ['dumbbell', 'barbell', 'cable', 'body only', 'machine', 'kettlebells'];

  for (const eq of equipmentTypes) {
    const { count: eqCount } = await supabase
      .from('ta_exercise_library_original')
      .select('*', { count: 'exact', head: true })
      .eq('equipment', eq);

    console.log(`  ${eq}: ${eqCount || 0}`);
  }

  // Step 3: Test level filter
  console.log('\n\nLevel counts:');
  const levels = ['beginner', 'intermediate', 'advanced'];

  for (const level of levels) {
    const { count: levelCount } = await supabase
      .from('ta_exercise_library_original')
      .select('*', { count: 'exact', head: true })
      .eq('level', level);

    console.log(`  ${level}: ${levelCount || 0}`);
  }

  console.log('\n✅ Exercise service test complete!');
  console.log('The exercise filtering should now work for AI program generation.');
}

main().catch(console.error);
