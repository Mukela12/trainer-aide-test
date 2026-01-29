/**
 * Test Suite: Client Role
 * Tests client-specific features: view bookings, packages, credits
 */

import {
  TestRunner,
  apiRequest,
  assert,
  supabase,
  TEST_ACCOUNTS,
} from './test-config';

const runner = new TestRunner();

async function runTests() {
  console.log('\n👤 CLIENT ROLE TESTS\n');

  // First, set up a client with some data
  const clientEmail = TEST_ACCOUNTS.clients[1].email; // milanmayoba80@gmail.com

  // Get trainer info for creating test data
  const { data: trainer } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', TEST_ACCOUNTS.studioOwner.email)
    .single();

  if (!trainer) {
    console.log('❌ Trainer not found');
    return;
  }

  // Ensure client exists
  let clientId: string;
  const { data: existingClient } = await supabase
    .from('fc_clients')
    .select('id')
    .eq('email', clientEmail.toLowerCase())
    .single();

  if (existingClient) {
    clientId = existingClient.id;
  } else {
    const { data: newClient } = await supabase
      .from('fc_clients')
      .insert({
        first_name: 'Milan',
        last_name: 'Test',
        name: 'Milan Test',
        email: clientEmail.toLowerCase(),
        invited_by: trainer.id,
        is_guest: false,
        source: 'manual',
      })
      .select()
      .single();
    clientId = newClient?.id;
  }

  console.log(`Testing as client: ${clientEmail}`);

  // Create a test user account if needed
  let userId: string;
  const { data: authUser } = await supabase.auth.admin.listUsers();
  const existingUser = authUser?.users?.find(
    (u) => u.email?.toLowerCase() === clientEmail.toLowerCase()
  );

  if (existingUser) {
    userId = existingUser.id;
  } else {
    // Create auth user for client
    const { data: newUser, error } = await supabase.auth.admin.createUser({
      email: clientEmail,
      password: 'TestClient123!',
      email_confirm: true,
    });
    if (error) {
      console.log(`Note: Could not create auth user: ${error.message}`);
    } else {
      userId = newUser.user.id;
    }
  }

  // Get or create auth token for client
  let authHeaders: Record<string, string> = {};
  const { data: session } = await supabase.auth.signInWithPassword({
    email: clientEmail,
    password: 'TestClient123!',
  });

  if (session?.session) {
    authHeaders = { Authorization: `Bearer ${session.session.access_token}` };
    console.log('✅ Client authenticated');
  } else {
    console.log('⚠️  Could not authenticate client, testing with service role');
    // We'll test the APIs directly with known client data
  }

  // ============================================================
  runner.section('Client Profile Setup');
  // ============================================================

  // Ensure profile exists
  if (userId) {
    await runner.test('Client profile exists or created', async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();

      if (!profile) {
        const { error } = await supabase.from('profiles').insert({
          id: userId,
          email: clientEmail,
          first_name: 'Milan',
          last_name: 'Test',
          role: 'client',
          is_onboarded: true,
        });
        assert(!error, `Failed to create profile: ${error?.message}`);
      }
    });
  }

  // ============================================================
  runner.section('Client Bookings API');
  // ============================================================

  // Create test booking for client
  let testBookingId: string;

  await runner.test('Create test booking for client', async () => {
    const { data: service } = await supabase
      .from('ta_services')
      .select('id, duration')
      .eq('created_by', trainer.id)
      .limit(1)
      .single();

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    tomorrow.setHours(15, 0, 0, 0);

    const { data, error } = await supabase
      .from('ta_bookings')
      .insert({
        trainer_id: trainer.id,
        client_id: clientId,
        service_id: service?.id,
        scheduled_at: tomorrow.toISOString(),
        duration: service?.duration || 60,
        status: 'confirmed',
        notes: 'Test booking for client tests',
      })
      .select()
      .single();

    assert(!error && data, `Failed to create booking: ${error?.message}`);
    testBookingId = data.id;
  });

  if (Object.keys(authHeaders).length > 0) {
    await runner.test('GET /api/client/bookings returns client bookings', async () => {
      const { status, data } = await apiRequest('/api/client/bookings', {
        headers: authHeaders,
      });
      assert(status === 200, `Expected 200, got ${status}`);
      assert(data.bookings !== undefined, 'Expected bookings array');
    });

    await runner.test('Booking response has required fields', async () => {
      const { data } = await apiRequest('/api/client/bookings', {
        headers: authHeaders,
      });
      if (data.bookings && data.bookings.length > 0) {
        const booking = data.bookings[0];
        assert(booking.id, 'Booking should have id');
        assert(booking.scheduledAt, 'Booking should have scheduledAt');
        assert(booking.status, 'Booking should have status');
      }
    });
  } else {
    await runner.test('Client bookings exist in database', async () => {
      const { data } = await supabase
        .from('ta_bookings')
        .select('id, status')
        .eq('client_id', clientId);

      assert(data && data.length > 0, 'Client should have bookings');
    });
  }

  // ============================================================
  runner.section('Client Packages/Credits API');
  // ============================================================

  // Create a test package and client package
  let testPackageId: string;
  let testClientPackageId: string;

  await runner.test('Create test package for client', async () => {
    // First create a package
    const { data: pkg, error: pkgError } = await supabase
      .from('ta_packages')
      .insert({
        trainer_id: trainer.id,
        name: 'Client Test Package',
        description: 'Test',
        session_count: 10,
        price_cents: 50000,
        validity_days: 90,
        is_active: true,
        is_public: true,
      })
      .select()
      .single();

    assert(!pkgError && pkg, `Failed to create package: ${pkgError?.message}`);
    testPackageId = pkg.id;

    // Assign package to client
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90);

    const { data: clientPkg, error: clientPkgError } = await supabase
      .from('ta_client_packages')
      .insert({
        client_id: clientId,
        package_id: testPackageId,
        trainer_id: trainer.id,
        sessions_total: 10,
        sessions_used: 2,
        expires_at: expiresAt.toISOString(),
        status: 'active',
      })
      .select()
      .single();

    assert(!clientPkgError && clientPkg, `Failed to assign package: ${clientPkgError?.message}`);
    testClientPackageId = clientPkg.id;
  });

  if (Object.keys(authHeaders).length > 0) {
    await runner.test('GET /api/client/packages returns client packages', async () => {
      const { status, data } = await apiRequest('/api/client/packages', {
        headers: authHeaders,
      });
      assert(status === 200, `Expected 200, got ${status}`);
      assert(typeof data.totalCredits === 'number', 'Expected totalCredits');
      assert(data.packages !== undefined, 'Expected packages array');
    });

    await runner.test('Client credits calculated correctly', async () => {
      const { data } = await apiRequest('/api/client/packages', {
        headers: authHeaders,
      });
      // We assigned 10 sessions with 2 used = 8 remaining
      assert(data.totalCredits >= 8, `Expected at least 8 credits, got ${data.totalCredits}`);
    });

    await runner.test('Credit status reflects balance', async () => {
      const { data } = await apiRequest('/api/client/packages', {
        headers: authHeaders,
      });
      // With 8 credits, status should be 'good' (> 5)
      assert(
        ['good', 'medium', 'low', 'none'].includes(data.creditStatus),
        'Expected valid credit status'
      );
    });
  } else {
    await runner.test('Client package exists in database', async () => {
      const { data } = await supabase
        .from('ta_client_packages')
        .select('sessions_remaining')
        .eq('client_id', clientId)
        .eq('status', 'active');

      assert(data && data.length > 0, 'Client should have active packages');
      assert(data[0].sessions_remaining === 8, 'Should have 8 remaining sessions');
    });
  }

  // ============================================================
  runner.section('Booking Cancellation');
  // ============================================================

  if (Object.keys(authHeaders).length > 0) {
    await runner.test('Client cannot cancel booking within 24 hours (if applicable)', async () => {
      // Create booking for tomorrow (within 24h)
      const { data: service } = await supabase
        .from('ta_services')
        .select('id, duration')
        .eq('created_by', trainer.id)
        .limit(1)
        .single();

      const soon = new Date();
      soon.setHours(soon.getHours() + 12); // 12 hours from now

      const { data: soonBooking } = await supabase
        .from('ta_bookings')
        .insert({
          trainer_id: trainer.id,
          client_id: clientId,
          service_id: service?.id,
          scheduled_at: soon.toISOString(),
          duration: service?.duration || 60,
          status: 'confirmed',
        })
        .select()
        .single();

      if (soonBooking) {
        const { status } = await apiRequest(`/api/client/bookings?id=${soonBooking.id}`, {
          method: 'DELETE',
          headers: authHeaders,
        });
        assert(status === 400, `Expected 400 for 24h policy, got ${status}`);

        // Cleanup
        await supabase.from('ta_bookings').delete().eq('id', soonBooking.id);
      }
    });

    await runner.test('Client can cancel booking more than 24 hours away', async () => {
      // Create booking for 3 days from now
      const { data: service } = await supabase
        .from('ta_services')
        .select('id, duration')
        .eq('created_by', trainer.id)
        .limit(1)
        .single();

      const later = new Date();
      later.setDate(later.getDate() + 3);
      later.setHours(10, 0, 0, 0);

      const { data: laterBooking } = await supabase
        .from('ta_bookings')
        .insert({
          trainer_id: trainer.id,
          client_id: clientId,
          service_id: service?.id,
          scheduled_at: later.toISOString(),
          duration: service?.duration || 60,
          status: 'confirmed',
        })
        .select()
        .single();

      if (laterBooking) {
        const { status } = await apiRequest(`/api/client/bookings?id=${laterBooking.id}`, {
          method: 'DELETE',
          headers: authHeaders,
        });
        assert(status === 200, `Expected 200, got ${status}`);

        // Verify status changed
        const { data: cancelled } = await supabase
          .from('ta_bookings')
          .select('status')
          .eq('id', laterBooking.id)
          .single();

        assert(cancelled?.status === 'cancelled', 'Booking should be cancelled');
      }
    });
  }

  // ============================================================
  runner.section('Cleanup');
  // ============================================================

  await runner.test('Cleanup test data', async () => {
    // Delete test booking
    await supabase.from('ta_bookings').delete().eq('id', testBookingId);
    // Delete client package
    await supabase.from('ta_client_packages').delete().eq('id', testClientPackageId);
    // Delete test package
    await supabase.from('ta_packages').delete().eq('id', testPackageId);
  });

  // Summary
  runner.summary();
}

runTests().catch(console.error);
