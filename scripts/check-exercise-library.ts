/**
 * Diagnostic script to check exercise library tables in both databases
 * Run with: npx tsx scripts/check-exercise-library.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Wondrous (main) database
const wondrousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const wondrousServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Trainer-aide (images) database
const trainerAideUrl = process.env.NEXT_PUBLIC_IMAGES_SUPABASE_URL!;
const trainerAideKey = process.env.NEXT_PUBLIC_IMAGES_SUPABASE_KEY!;

async function checkDatabase(name: string, url: string, key: string) {
  console.log(`\n========== Checking ${name} Database ==========`);
  console.log(`URL: ${url}`);

  const supabase = createClient(url, key);

  // Try to query ta_exercise_library_original
  console.log('\n1. Checking ta_exercise_library_original table:');
  const { data: exercises, error: exerciseError, count } = await supabase
    .from('ta_exercise_library_original')
    .select('*', { count: 'exact' })
    .limit(5);

  if (exerciseError) {
    console.log(`   ❌ Error: ${exerciseError.message}`);
    console.log(`   Code: ${exerciseError.code}`);
  } else {
    console.log(`   ✅ Table exists!`);
    console.log(`   Total rows: ${count}`);
    if (exercises && exercises.length > 0) {
      console.log(`   Sample exercise: ${exercises[0].name}`);
      console.log(`   Columns: ${Object.keys(exercises[0]).join(', ')}`);
    }
  }

  // Try to query ta_exercise_library (without _original)
  console.log('\n2. Checking ta_exercise_library table (without _original):');
  const { data: exercises2, error: exerciseError2, count: count2 } = await supabase
    .from('ta_exercise_library')
    .select('*', { count: 'exact' })
    .limit(5);

  if (exerciseError2) {
    console.log(`   ❌ Error: ${exerciseError2.message}`);
  } else {
    console.log(`   ✅ Table exists!`);
    console.log(`   Total rows: ${count2}`);
    if (exercises2 && exercises2.length > 0) {
      console.log(`   Sample exercise: ${exercises2[0].name}`);
    }
  }

  // List all tables that start with 'ta_'
  console.log('\n3. Listing tables starting with "ta_":');
  const { data: tables, error: tableError } = await supabase
    .rpc('get_tables_list')
    .select('*');

  if (tableError) {
    // RPC might not exist, try direct query
    console.log(`   (RPC not available, trying information_schema)`);
    const { data: schemaData, error: schemaError } = await supabase
      .from('information_schema.tables' as any)
      .select('table_name')
      .eq('table_schema', 'public')
      .like('table_name', 'ta_%');

    if (schemaError) {
      console.log(`   Could not list tables: ${schemaError.message}`);
    } else if (schemaData) {
      console.log(`   Found tables: ${schemaData.map((t: any) => t.table_name).join(', ')}`);
    }
  } else if (tables) {
    const taTables = tables.filter((t: any) => t.table_name?.startsWith('ta_'));
    console.log(`   Found: ${taTables.map((t: any) => t.table_name).join(', ')}`);
  }
}

async function main() {
  console.log('Exercise Library Diagnostic Script');
  console.log('==================================');

  // Check Wondrous database
  await checkDatabase('Wondrous (Main)', wondrousUrl, wondrousServiceKey);

  // Check Trainer-aide database
  await checkDatabase('Trainer-Aide (Images)', trainerAideUrl, trainerAideKey);

  console.log('\n\n========== Summary ==========');
  console.log('The exercise library should be in the database that shows data.');
  console.log('If it is in Trainer-Aide, we need to update the exercise service');
  console.log('to use the images database client instead of the main database.');
}

main().catch(console.error);
