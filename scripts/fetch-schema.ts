/**
 * Temporary script to fetch database schema from Supabase
 * Run with: npx tsx scripts/fetch-schema.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'SET' : 'MISSING');
  console.error('- SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'SET' : 'MISSING');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fetchSchema() {
  console.log('Fetching database schema...\n');

  // Get all tables in public schema
  const { data: tables, error: tablesError } = await supabase
    .rpc('get_tables_info')
    .select('*');

  if (tablesError) {
    // Fallback: query information_schema directly
    console.log('Using information_schema query...\n');

    const { data: tableList, error: tableListError } = await supabase
      .from('information_schema.tables' as any)
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_type', 'BASE TABLE');

    if (tableListError) {
      // Try raw SQL approach
      console.log('Trying raw SQL approach...\n');

      // Query to get all table names
      const tablesQuery = `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `;

      const { data: rawTables, error: rawError } = await supabase.rpc('exec_sql', { query: tablesQuery });

      if (rawError) {
        console.log('Could not fetch tables via RPC. Trying direct table queries...\n');

        // List of tables we want to check
        const tablesToCheck = [
          'bs_staff',
          'bs_studios',
          'fc_clients',
          'ta_sessions',
          'ta_workout_templates',
          'ta_exercise_library',
          'profiles',
          'instructors'
        ];

        for (const tableName of tablesToCheck) {
          console.log(`\n${'='.repeat(60)}`);
          console.log(`TABLE: ${tableName}`);
          console.log('='.repeat(60));

          // Try to get one row to see the structure
          const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .limit(1);

          if (error) {
            console.log(`  Error: ${error.message}`);
          } else if (data && data.length > 0) {
            const columns = Object.keys(data[0]);
            console.log(`  Columns: ${columns.join(', ')}`);
            console.log(`\n  Sample data:`);
            console.log(JSON.stringify(data[0], null, 2));
          } else {
            // Table exists but is empty, try to get column info another way
            console.log('  Table exists but is empty');

            // Try inserting a dummy and catching the error to see columns
            const { error: insertError } = await supabase
              .from(tableName)
              .insert({} as any);

            if (insertError) {
              console.log(`  Insert error (shows required columns): ${insertError.message}`);
            }
          }
        }
        return;
      }

      console.log('Tables:', rawTables);
    } else {
      console.log('Tables found:', tableList);
    }
  } else {
    console.log('Tables:', tables);
  }
}

// Alternative: Get columns for specific tables
async function getTableColumns(tableName: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`TABLE: ${tableName}`);
  console.log('='.repeat(60));

  // Method 1: Try to select and see what columns exist
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .limit(1);

  if (error) {
    console.log(`  Error accessing table: ${error.message}`);
    return null;
  }

  if (data && data.length > 0) {
    const columns = Object.keys(data[0]);
    console.log(`\n  Columns (${columns.length}):`);
    columns.forEach(col => {
      const value = data[0][col];
      const type = value === null ? 'null' : typeof value;
      console.log(`    - ${col}: ${type} (sample: ${JSON.stringify(value)?.substring(0, 50)})`);
    });
    return columns;
  } else {
    console.log('  Table is empty, cannot determine columns from data');
    return [];
  }
}

async function main() {
  console.log('Database Schema Fetcher');
  console.log('=======================\n');
  console.log(`Supabase URL: ${supabaseUrl}\n`);

  // Tables relevant to our migrations
  const relevantTables = [
    'bs_staff',
    'bs_studios',
    'fc_clients',
    'ta_sessions',
    'ta_workout_templates',
    'ta_services',
    'ta_bookings',
    'ta_availability',
    'ta_booking_requests',
    'profiles',
    'instructors'
  ];

  const schemaInfo: Record<string, string[] | null> = {};

  for (const table of relevantTables) {
    schemaInfo[table] = await getTableColumns(table);
  }

  // Summary
  console.log('\n\n' + '='.repeat(60));
  console.log('SCHEMA SUMMARY');
  console.log('='.repeat(60));

  for (const [table, columns] of Object.entries(schemaInfo)) {
    if (columns && columns.length > 0) {
      console.log(`\n${table}:`);
      console.log(`  ${columns.join(', ')}`);
    } else if (columns !== null) {
      console.log(`\n${table}: (empty table)`);
    } else {
      console.log(`\n${table}: (not found or no access)`);
    }
  }
}

main().catch(console.error);
