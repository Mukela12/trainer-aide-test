/**
 * Verification and Test Script for Trainer-Aide Database Integration
 * Run with: npx tsx scripts/verify-and-test.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Service role client (bypasses RLS)
const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

// Test credentials
const TEST_USERS = {
  trainer: { email: 'hb12@wondrous.store', password: 'newTest123???' },
  solo: { email: 'Mukelathegreat@gmail.com', password: 'TestPassword123!' },
  studioOwner: { email: 'Jessekatungu@gmail.com', password: 'TestPassword123!' },
};

const CLIENT_EMAILS = ['codelibrary21@gmail.com', 'milanmayoba80@gmail.com'];

interface TestResult {
  name: string;
  passed: boolean;
  details?: string;
  error?: string;
}

const results: TestResult[] = [];

function log(message: string) {
  console.log(message);
}

function logSuccess(message: string) {
  console.log(`✅ ${message}`);
}

function logError(message: string) {
  console.log(`❌ ${message}`);
}

function logInfo(message: string) {
  console.log(`ℹ️  ${message}`);
}

async function runTest(name: string, testFn: () => Promise<{ passed: boolean; details?: string }>) {
  try {
    const result = await testFn();
    results.push({ name, ...result });
    if (result.passed) {
      logSuccess(`${name}: ${result.details || 'Passed'}`);
    } else {
      logError(`${name}: ${result.details || 'Failed'}`);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    results.push({ name, passed: false, error: errorMsg });
    logError(`${name}: ${errorMsg}`);
  }
}

// ============================================================
// TABLE VERIFICATION TESTS
// ============================================================

async function verifyTablesExist() {
  log('\n' + '='.repeat(60));
  log('PHASE 1: VERIFY NEW TABLES EXIST');
  log('='.repeat(60) + '\n');

  const tablesToVerify = [
    'ta_services',
    'ta_bookings',
    'ta_availability',
    'ta_booking_requests',
  ];

  for (const table of tablesToVerify) {
    await runTest(`Table ${table} exists`, async () => {
      const { data, error } = await serviceClient
        .from(table)
        .select('*')
        .limit(1);

      if (error) {
        return { passed: false, details: error.message };
      }
      return { passed: true, details: `Table exists (${data?.length || 0} rows sampled)` };
    });
  }
}

// ============================================================
// AUTHENTICATION TESTS
// ============================================================

async function testAuthentication() {
  log('\n' + '='.repeat(60));
  log('PHASE 2: AUTHENTICATION TESTS');
  log('='.repeat(60) + '\n');

  for (const [userType, creds] of Object.entries(TEST_USERS)) {
    await runTest(`Login as ${userType} (${creds.email})`, async () => {
      const client = createClient(supabaseUrl, supabaseAnonKey);
      const { data, error } = await client.auth.signInWithPassword({
        email: creds.email,
        password: creds.password,
      });

      if (error) {
        return { passed: false, details: error.message };
      }
      return { passed: true, details: `User ID: ${data.user?.id?.substring(0, 8)}...` };
    });
  }
}

// ============================================================
// SERVICES CRUD TESTS
// ============================================================

async function testServicesCRUD() {
  log('\n' + '='.repeat(60));
  log('PHASE 3: SERVICES CRUD TESTS');
  log('='.repeat(60) + '\n');

  // Login as trainer
  const client = createClient(supabaseUrl, supabaseAnonKey);
  const { data: authData } = await client.auth.signInWithPassword({
    email: TEST_USERS.trainer.email,
    password: TEST_USERS.trainer.password,
  });

  if (!authData.user) {
    logError('Could not authenticate for services tests');
    return;
  }

  const userId = authData.user.id;
  let createdServiceId: string | null = null;

  // Create service (using service role to bypass RLS for testing)
  await runTest('Create service', async () => {
    const { data, error } = await serviceClient
      .from('ta_services')
      .insert({
        name: 'Test 60min Session',
        description: 'Test service created by verification script',
        duration: 60,
        type: '1-2-1',
        max_capacity: 1,
        credits_required: 2,
        color: '#12229D',
        is_active: true,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      return { passed: false, details: error.message };
    }
    createdServiceId = data.id;
    return { passed: true, details: `Created service ID: ${data.id.substring(0, 8)}...` };
  });

  // Read services
  await runTest('Read services', async () => {
    const { data, error } = await serviceClient
      .from('ta_services')
      .select('*')
      .eq('created_by', userId);

    if (error) {
      return { passed: false, details: error.message };
    }
    return { passed: true, details: `Found ${data?.length || 0} services` };
  });

  // Update service
  if (createdServiceId) {
    await runTest('Update service', async () => {
      const { data, error } = await serviceClient
        .from('ta_services')
        .update({ name: 'Updated Test Session', credits_required: 2.5 })
        .eq('id', createdServiceId)
        .select()
        .single();

      if (error) {
        return { passed: false, details: error.message };
      }
      return { passed: true, details: `Updated name to: ${data.name}` };
    });

    // Delete service (cleanup)
    await runTest('Delete service', async () => {
      const { error } = await serviceClient
        .from('ta_services')
        .delete()
        .eq('id', createdServiceId);

      if (error) {
        return { passed: false, details: error.message };
      }
      return { passed: true, details: 'Service deleted successfully' };
    });
  }
}

// ============================================================
// BOOKINGS CRUD TESTS
// ============================================================

async function testBookingsCRUD() {
  log('\n' + '='.repeat(60));
  log('PHASE 4: BOOKINGS CRUD TESTS');
  log('='.repeat(60) + '\n');

  // Login as trainer
  const client = createClient(supabaseUrl, supabaseAnonKey);
  const { data: authData } = await client.auth.signInWithPassword({
    email: TEST_USERS.trainer.email,
    password: TEST_USERS.trainer.password,
  });

  if (!authData.user) {
    logError('Could not authenticate for bookings tests');
    return;
  }

  const trainerId = authData.user.id;
  let createdBookingId: string | null = null;

  // Find a client to use
  const { data: clients } = await serviceClient
    .from('fc_clients')
    .select('id')
    .limit(1);

  const clientId = clients?.[0]?.id || null;

  // Create booking
  await runTest('Create booking', async () => {
    const scheduledAt = new Date();
    scheduledAt.setDate(scheduledAt.getDate() + 1); // Tomorrow
    scheduledAt.setHours(10, 0, 0, 0);

    const { data, error } = await serviceClient
      .from('ta_bookings')
      .insert({
        trainer_id: trainerId,
        client_id: clientId,
        scheduled_at: scheduledAt.toISOString(),
        duration: 60,
        status: 'confirmed',
        notes: 'Test booking from verification script',
      })
      .select()
      .single();

    if (error) {
      return { passed: false, details: error.message };
    }
    createdBookingId = data.id;
    return { passed: true, details: `Created booking ID: ${data.id.substring(0, 8)}...` };
  });

  // Read bookings
  await runTest('Read bookings', async () => {
    const { data, error } = await serviceClient
      .from('ta_bookings')
      .select('*, client:fc_clients(id, first_name, last_name)')
      .eq('trainer_id', trainerId);

    if (error) {
      return { passed: false, details: error.message };
    }
    return { passed: true, details: `Found ${data?.length || 0} bookings` };
  });

  // Update booking (check-in)
  if (createdBookingId) {
    await runTest('Update booking status (check-in)', async () => {
      const { data, error } = await serviceClient
        .from('ta_bookings')
        .update({ status: 'checked-in' })
        .eq('id', createdBookingId)
        .select()
        .single();

      if (error) {
        return { passed: false, details: error.message };
      }
      return { passed: true, details: `Status updated to: ${data.status}` };
    });

    // Delete booking (cleanup)
    await runTest('Delete booking', async () => {
      const { error } = await serviceClient
        .from('ta_bookings')
        .delete()
        .eq('id', createdBookingId);

      if (error) {
        return { passed: false, details: error.message };
      }
      return { passed: true, details: 'Booking deleted successfully' };
    });
  }
}

// ============================================================
// AVAILABILITY CRUD TESTS
// ============================================================

async function testAvailabilityCRUD() {
  log('\n' + '='.repeat(60));
  log('PHASE 5: AVAILABILITY CRUD TESTS');
  log('='.repeat(60) + '\n');

  // Login as trainer
  const client = createClient(supabaseUrl, supabaseAnonKey);
  const { data: authData } = await client.auth.signInWithPassword({
    email: TEST_USERS.trainer.email,
    password: TEST_USERS.trainer.password,
  });

  if (!authData.user) {
    logError('Could not authenticate for availability tests');
    return;
  }

  const trainerId = authData.user.id;
  let createdBlockId: string | null = null;

  // Create availability block
  await runTest('Create availability block', async () => {
    const { data, error } = await serviceClient
      .from('ta_availability')
      .insert({
        trainer_id: trainerId,
        block_type: 'available',
        recurrence: 'weekly',
        day_of_week: 1, // Monday
        start_hour: 9,
        start_minute: 0,
        end_hour: 17,
        end_minute: 0,
      })
      .select()
      .single();

    if (error) {
      return { passed: false, details: error.message };
    }
    createdBlockId = data.id;
    return { passed: true, details: `Created block ID: ${data.id.substring(0, 8)}...` };
  });

  // Read availability
  await runTest('Read availability', async () => {
    const { data, error } = await serviceClient
      .from('ta_availability')
      .select('*')
      .eq('trainer_id', trainerId);

    if (error) {
      return { passed: false, details: error.message };
    }
    return { passed: true, details: `Found ${data?.length || 0} availability blocks` };
  });

  // Delete availability block (cleanup)
  if (createdBlockId) {
    await runTest('Delete availability block', async () => {
      const { error } = await serviceClient
        .from('ta_availability')
        .delete()
        .eq('id', createdBlockId);

      if (error) {
        return { passed: false, details: error.message };
      }
      return { passed: true, details: 'Block deleted successfully' };
    });
  }
}

// ============================================================
// BOOKING REQUESTS CRUD TESTS
// ============================================================

async function testBookingRequestsCRUD() {
  log('\n' + '='.repeat(60));
  log('PHASE 6: BOOKING REQUESTS CRUD TESTS');
  log('='.repeat(60) + '\n');

  // Login as trainer
  const client = createClient(supabaseUrl, supabaseAnonKey);
  const { data: authData } = await client.auth.signInWithPassword({
    email: TEST_USERS.trainer.email,
    password: TEST_USERS.trainer.password,
  });

  if (!authData.user) {
    logError('Could not authenticate for booking requests tests');
    return;
  }

  const trainerId = authData.user.id;
  let createdRequestId: string | null = null;

  // Find a client
  const { data: clients } = await serviceClient
    .from('fc_clients')
    .select('id')
    .limit(1);

  const clientId = clients?.[0]?.id;

  if (!clientId) {
    logInfo('No clients found, skipping booking request tests');
    return;
  }

  // Create booking request
  await runTest('Create booking request', async () => {
    const preferredTime = new Date();
    preferredTime.setDate(preferredTime.getDate() + 2);
    preferredTime.setHours(14, 0, 0, 0);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 1);

    const { data, error } = await serviceClient
      .from('ta_booking_requests')
      .insert({
        trainer_id: trainerId,
        client_id: clientId,
        preferred_times: [preferredTime.toISOString()],
        status: 'pending',
        expires_at: expiresAt.toISOString(),
        notes: 'Test request from verification script',
      })
      .select()
      .single();

    if (error) {
      return { passed: false, details: error.message };
    }
    createdRequestId = data.id;
    return { passed: true, details: `Created request ID: ${data.id.substring(0, 8)}...` };
  });

  // Read booking requests
  await runTest('Read booking requests', async () => {
    const { data, error } = await serviceClient
      .from('ta_booking_requests')
      .select('*, client:fc_clients(id, first_name, last_name)')
      .eq('trainer_id', trainerId);

    if (error) {
      return { passed: false, details: error.message };
    }
    return { passed: true, details: `Found ${data?.length || 0} requests` };
  });

  // Update request (decline)
  if (createdRequestId) {
    await runTest('Update request status (decline)', async () => {
      const { data, error } = await serviceClient
        .from('ta_booking_requests')
        .update({ status: 'declined' })
        .eq('id', createdRequestId)
        .select()
        .single();

      if (error) {
        return { passed: false, details: error.message };
      }
      return { passed: true, details: `Status updated to: ${data.status}` };
    });

    // Delete request (cleanup)
    await runTest('Delete booking request', async () => {
      const { error } = await serviceClient
        .from('ta_booking_requests')
        .delete()
        .eq('id', createdRequestId);

      if (error) {
        return { passed: false, details: error.message };
      }
      return { passed: true, details: 'Request deleted successfully' };
    });
  }
}

// ============================================================
// API ENDPOINT TESTS
// ============================================================

async function testAPIEndpoints() {
  log('\n' + '='.repeat(60));
  log('PHASE 7: API ENDPOINT TESTS');
  log('='.repeat(60) + '\n');

  const baseUrl = 'http://localhost:3001';

  // Test if dev server is running
  await runTest('Dev server is running', async () => {
    try {
      const response = await fetch(`${baseUrl}/api/services`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      // Even 401 means the server is running
      return { passed: true, details: `Server responded with status ${response.status}` };
    } catch (error) {
      return { passed: false, details: 'Server not running. Start with: npm run dev' };
    }
  });
}

// ============================================================
// CLIENT CREATION TEST
// ============================================================

async function testClientCreation() {
  log('\n' + '='.repeat(60));
  log('PHASE 8: CLIENT CREATION TEST');
  log('='.repeat(60) + '\n');

  // Check which email is available
  for (const email of CLIENT_EMAILS) {
    await runTest(`Check if client exists: ${email}`, async () => {
      const { data, error } = await serviceClient
        .from('fc_clients')
        .select('id, email, first_name, last_name')
        .eq('email', email)
        .single();

      if (error && error.code === 'PGRST116') {
        return { passed: true, details: 'Email available for new client' };
      }
      if (data) {
        return { passed: true, details: `Client exists: ${data.first_name} ${data.last_name}` };
      }
      return { passed: false, details: error?.message || 'Unknown error' };
    });
  }
}

// ============================================================
// SUMMARY
// ============================================================

function printSummary() {
  log('\n' + '='.repeat(60));
  log('TEST SUMMARY');
  log('='.repeat(60) + '\n');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  log(`Total: ${total} | Passed: ${passed} | Failed: ${failed}`);
  log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%\n`);

  if (failed > 0) {
    log('Failed Tests:');
    results.filter(r => !r.passed).forEach(r => {
      log(`  - ${r.name}: ${r.error || r.details}`);
    });
  }
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  log('Trainer-Aide Database Integration Verification');
  log('=' .repeat(60));
  log(`Supabase URL: ${supabaseUrl}\n`);

  await verifyTablesExist();
  await testAuthentication();
  await testServicesCRUD();
  await testBookingsCRUD();
  await testAvailabilityCRUD();
  await testBookingRequestsCRUD();
  await testClientCreation();
  await testAPIEndpoints();

  printSummary();
}

main().catch(console.error);
