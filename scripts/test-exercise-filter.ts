/**
 * Test exercise filtering with the fixed table
 * Run with: npx tsx scripts/test-exercise-filter.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface Exercise {
  id: string;
  name: string;
  equipment: string | null;
  level: string;
  is_bodyweight: boolean;
  primary_muscles: string[];
}

async function main() {
  console.log('Testing exercise filtering with fixed table...\n');

  // Step 1: Get all exercises
  const { data: allExercises, count } = await supabase
    .from('ta_exercise_library')
    .select('id, name, equipment, level, is_bodyweight, primary_muscles', { count: 'exact' });

  console.log(`Total exercises: ${count}`);

  if (!allExercises || allExercises.length === 0) {
    console.error('❌ No exercises found!');
    process.exit(1);
  }

  // Step 2: Test equipment filtering logic (matches the actual filter function)
  const testEquipment = ['dumbbells', 'barbell', 'bench', 'cables'];
  console.log(`\nTest equipment: ${testEquipment.join(', ')}`);

  const normalizedEquipment = testEquipment.map(eq => eq.toLowerCase().trim());

  const filtered = (allExercises as Exercise[]).filter((ex) => {
    // Always include bodyweight exercises
    if (ex.is_bodyweight || !ex.equipment || ex.equipment.toLowerCase() === 'body only') {
      return true;
    }

    const exEquipment = ex.equipment.toLowerCase().trim();

    // Check if exercise equipment matches available equipment
    return normalizedEquipment.some((available) => {
      // Exact match
      if (exEquipment === available) return true;

      // Partial match (e.g., "dumbbell" matches "dumbbells")
      if (exEquipment.includes(available) || available.includes(exEquipment)) return true;

      // Handle "barbell" vs "bar"
      if (available === 'barbell' && (exEquipment.includes('bar') || exEquipment.includes('barbell'))) return true;
      if (available === 'bar' && exEquipment.includes('barbell')) return true;

      // Handle "dumbbell" vs "db"
      if (available.includes('dumbbell') && exEquipment.includes('dumbbell')) return true;

      return false;
    });
  });

  console.log(`\n✅ Filtered exercises: ${filtered.length}`);

  // Breakdown by equipment type
  const equipmentCounts: Record<string, number> = {};
  filtered.forEach((ex: Exercise) => {
    const eq = ex.equipment || 'body only';
    equipmentCounts[eq] = (equipmentCounts[eq] || 0) + 1;
  });

  console.log('\nEquipment breakdown:');
  Object.entries(equipmentCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([eq, count]) => {
      console.log(`  ${eq}: ${count}`);
    });

  // Step 3: Filter by experience level
  const expFiltered = filtered.filter((ex: Exercise) =>
    ['beginner', 'intermediate'].includes(ex.level)
  );

  console.log(`\nAfter experience filter (beginner/intermediate): ${expFiltered.length}`);

  // Sample exercises
  console.log('\nSample exercises available:');
  expFiltered.slice(0, 10).forEach((ex: Exercise) => {
    console.log(`  - ${ex.name} (${ex.equipment || 'body only'}, ${ex.level})`);
  });

  if (expFiltered.length >= 24) {
    console.log('\n✅ SUCCESS: Enough exercises for AI program generation!');
  } else {
    console.log('\n⚠️  WARNING: May not have enough exercises for full program');
  }
}

main().catch(console.error);
