/**
 * Temporary script to pull Supabase schema
 * Run with: npx tsx scripts/pull-schema.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

console.log('Supabase URL:', supabaseUrl ? 'Found' : 'Missing');
console.log('Service Key:', supabaseServiceKey ? 'Found' : 'Missing');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface TableColumn {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
}

interface ForeignKey {
  table_name: string;
  column_name: string;
  foreign_table_name: string;
  foreign_column_name: string;
}

async function pullSchema() {
  console.log('Pulling schema from Supabase...\n');

  // Get all tables
  const { data: tables, error: tablesError } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .eq('table_type', 'BASE TABLE');

  if (tablesError) {
    // Try raw SQL instead
    const { data: tablesRaw, error: rawError } = await supabase.rpc('get_schema_info');

    if (rawError) {
      console.log('Using fallback method - querying tables directly...\n');
      await pullSchemaFallback();
      return;
    }
  }

  // Get columns for each table
  const { data: columns, error: columnsError } = await supabase
    .rpc('get_table_columns');

  if (columnsError) {
    console.log('Columns query failed, using fallback...');
    await pullSchemaFallback();
    return;
  }

  console.log('Schema pulled successfully!');
}

async function pullSchemaFallback() {
  console.log('Using fallback: Querying each known table...\n');

  const knownTables = [
    'profiles',
    'bs_studios',
    'bs_staff',
    'fc_clients',
    'ta_services',
    'ta_bookings',
    'ta_availability',
    'ta_booking_requests',
    'ta_stripe_accounts',
    'ta_payments',
    'ta_packages',
    'ta_client_packages',
    'ta_credit_usage',
    'ta_notifications',
    'ta_notification_preferences',
    'ta_invitations',
    'ta_body_metrics',
    'ta_client_goals',
    'ta_goal_milestones',
    'ta_sessions',
    'ta_workout_templates',
  ];

  let schemaDoc = '# Supabase Schema Documentation\n\n';
  schemaDoc += `Generated: ${new Date().toISOString()}\n\n`;

  for (const tableName of knownTables) {
    console.log(`Checking table: ${tableName}...`);

    // Try to select one row to get column info
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);

    if (error) {
      schemaDoc += `## ${tableName}\n`;
      schemaDoc += `**Status:** Could not access (${error.message})\n\n`;
      continue;
    }

    schemaDoc += `## ${tableName}\n`;
    schemaDoc += `**Status:** Accessible\n`;

    if (data && data.length > 0) {
      const columns = Object.keys(data[0]);
      schemaDoc += `**Columns:** ${columns.length}\n\n`;
      schemaDoc += '| Column | Sample Value Type |\n';
      schemaDoc += '|--------|------------------|\n';

      for (const col of columns) {
        const val = data[0][col];
        const type = val === null ? 'null' : typeof val;
        schemaDoc += `| ${col} | ${type} |\n`;
      }
    } else {
      schemaDoc += `**Columns:** (table empty, checking via error message)\n`;

      // Try invalid column to get column list from error
      const { error: colError } = await supabase
        .from(tableName)
        .select('___invalid___');

      if (colError?.message) {
        schemaDoc += `\nError hint: ${colError.message}\n`;
      }
    }

    schemaDoc += '\n';
  }

  // Save to file
  const outputPath = 'docs/schema-documentation.md';
  fs.mkdirSync('docs', { recursive: true });
  fs.writeFileSync(outputPath, schemaDoc);

  console.log(`\nSchema documentation saved to: ${outputPath}`);
}

// Alternative: Direct table inspection
async function inspectTables() {
  console.log('\n=== Direct Table Inspection ===\n');

  const tables = [
    { name: 'profiles', key: 'id' },
    { name: 'bs_studios', key: 'id' },
    { name: 'bs_staff', key: 'id' },
    { name: 'ta_services', key: 'id' },
    { name: 'ta_bookings', key: 'id' },
    { name: 'ta_availability', key: 'id' },
    { name: 'ta_booking_requests', key: 'id' },
    { name: 'fc_clients', key: 'id' },
    { name: 'ta_packages', key: 'id' },
    { name: 'ta_client_packages', key: 'id' },
    { name: 'ta_credit_usage', key: 'id' },
    { name: 'ta_payments', key: 'id' },
    { name: 'ta_stripe_accounts', key: 'id' },
    { name: 'ta_notifications', key: 'id' },
    { name: 'ta_notification_preferences', key: 'user_id' },
    { name: 'ta_invitations', key: 'id' },
    { name: 'ta_sessions', key: 'id' },
    { name: 'ta_workout_templates', key: 'id' },
    { name: 'ta_body_metrics', key: 'id' },
    { name: 'ta_client_goals', key: 'id' },
    { name: 'ta_goal_milestones', key: 'id' },
  ];

  let output = '# Trainer-Aide Database Schema\n\n';
  output += `Last Updated: ${new Date().toISOString()}\n\n`;
  output += '---\n\n';

  for (const table of tables) {
    const { data, error, count } = await supabase
      .from(table.name)
      .select('*', { count: 'exact' })
      .limit(1);

    output += `## ${table.name}\n\n`;

    if (error) {
      output += `> Error: ${error.message}\n\n`;
      continue;
    }

    output += `- **Row Count:** ${count ?? 'unknown'}\n`;

    if (data && data.length > 0) {
      const sample = data[0];
      const cols = Object.keys(sample);
      output += `- **Columns:** ${cols.length}\n\n`;
      output += '```\n';
      for (const col of cols) {
        const val = sample[col];
        const typeHint = val === null ? 'NULL' :
                        Array.isArray(val) ? 'ARRAY' :
                        typeof val === 'object' ? 'JSONB' :
                        typeof val;
        output += `  ${col}: ${typeHint}\n`;
      }
      output += '```\n\n';
    } else {
      output += '- **Columns:** (empty table)\n\n';
    }
  }

  fs.mkdirSync('docs', { recursive: true });
  fs.writeFileSync('docs/schema-documentation.md', output);
  console.log('Schema saved to docs/schema-documentation.md');
}

// Run both methods
async function main() {
  try {
    await inspectTables();
  } catch (err) {
    console.error('Error:', err);
  }
}

main();
