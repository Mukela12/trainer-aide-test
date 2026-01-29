/**
 * Test Suite: Trainer/Studio Owner Role
 * Tests all trainer-specific features: services, availability, bookings, clients
 */

import {
  TestRunner,
  apiRequest,
  assert,
  supabase,
  TEST_ACCOUNTS,
  getAuthToken,
} from './test-config';

const runner = new TestRunner();

async function runTests() {
  console.log('\n👨‍🏫 TRAINER ROLE TESTS\n');

  // Get trainer info
  const { data: trainer } = await supabase
    .from('profiles')
    .select('id, email, role')
    .eq('email', TEST_ACCOUNTS.studioOwner.email)
    .single();

  if (!trainer) {
    console.log('❌ Test trainer not found');
    return;
  }

  const trainerId = trainer.id;
  console.log(`Testing as: ${trainer.email} (${trainer.role})`);

  // Get auth token
  const token = await getAuthToken(
    TEST_ACCOUNTS.studioOwner.email,
    TEST_ACCOUNTS.studioOwner.password
  );

  if (!token) {
    console.log('❌ Could not authenticate trainer');
    return;
  }

  const authHeaders = { Authorization: `Bearer ${token}` };

  // ============================================================
  runner.section('Services Management');
  // ============================================================

  await runner.test('GET /api/services returns trainer services', async () => {
    const { status, data } = await apiRequest('/api/services', {
      headers: authHeaders,
    });
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.services && Array.isArray(data.services), 'Expected services array');
    // Services might be empty for new trainers, so just check it's an array
  });

  let createdServiceId: string;

  await runner.test('POST /api/services creates new service', async () => {
    const { status, data } = await apiRequest('/api/services', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: 'Test Service',
        description: 'Created by test script',
        duration: 45,
        type: '1-2-1',
        maxCapacity: 1,
        priceCents: 4000,
        isPublic: true,
        isIntro: false,
      }),
    });

    assert(status === 200 || status === 201, `Expected 200/201, got ${status}: ${JSON.stringify(data)}`);
    // Response is { service: {...} } or the service directly
    const serviceId = data.service?.id || data.id;
    assert(serviceId, 'Expected service ID');
    createdServiceId = serviceId;
  });

  await runner.test('Service has correct created_by', async () => {
    const { data } = await supabase
      .from('ta_services')
      .select('created_by')
      .eq('id', createdServiceId)
      .single();

    assert(data?.created_by === trainerId, 'created_by should match trainer');
  });

  await runner.test('DELETE /api/services deletes service', async () => {
    const { status } = await apiRequest(`/api/services?id=${createdServiceId}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    assert(status === 200, `Expected 200, got ${status}`);
  });

  // ============================================================
  runner.section('Availability Management');
  // ============================================================

  await runner.test('GET /api/availability returns trainer availability', async () => {
    const { status, data } = await apiRequest('/api/availability', {
      headers: authHeaders,
    });
    assert(status === 200, `Expected 200, got ${status}`);
    // Response might be array or object with availability property
    const slots = Array.isArray(data) ? data : (data.availability || data.slots || []);
    assert(Array.isArray(slots), 'Expected array');
  });

  let createdAvailabilityId: string;

  await runner.test('POST /api/availability creates availability slot', async () => {
    const { status, data } = await apiRequest('/api/availability', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        dayOfWeek: 0, // Sunday
        startHour: 9,
        startMinute: 0,
        endHour: 12,
        endMinute: 0,
        blockType: 'available',
        recurrence: 'weekly',
      }),
    });

    assert(status === 200 || status === 201, `Expected 200/201, got ${status}: ${JSON.stringify(data)}`);
    // Response might be { availability: {...} } or the slot directly
    const slotId = data.availability?.id || data.slot?.id || data.id;
    assert(slotId, 'Expected availability ID');
    createdAvailabilityId = slotId;
  });

  await runner.test('DELETE /api/availability removes slot', async () => {
    const { status } = await apiRequest(`/api/availability?id=${createdAvailabilityId}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    assert(status === 200, `Expected 200, got ${status}`);
  });

  // ============================================================
  runner.section('Bookings Management');
  // ============================================================

  await runner.test('GET /api/bookings returns trainer bookings', async () => {
    const { status, data } = await apiRequest('/api/bookings', {
      headers: authHeaders,
    });
    assert(status === 200, `Expected 200, got ${status}`);
    // Response might be array or { bookings: [...] }
    const bookings = Array.isArray(data) ? data : (data.bookings || []);
    assert(Array.isArray(bookings), 'Expected bookings array');
  });

  // Create a test client and booking
  let testClientId: string;
  let testBookingId: string;

  await runner.test('Create test client for booking', async () => {
    // Use the API to create a client (which handles studio_id correctly)
    const testEmail = `test-booking-${Date.now()}@example.com`;
    const { status, data } = await apiRequest('/api/clients', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        firstName: 'Test',
        lastName: 'BookingClient',
        email: testEmail,
      }),
    });

    if (status === 201 || status === 200) {
      testClientId = data.client?.id || data.id;
      assert(testClientId, 'Expected client ID in response');
    } else {
      // If API fails, try direct insert with service role
      const { data: directData, error } = await supabase
        .from('fc_clients')
        .insert({
          first_name: 'Test',
          last_name: 'BookingClient',
          name: 'Test BookingClient',
          email: testEmail,
          invited_by: trainerId,
          is_guest: true,
          source: 'manual',
          studio_id: trainerId, // For solo practitioners
        })
        .select()
        .single();

      assert(!error && directData, `Failed to create client: ${error?.message}`);
      testClientId = directData.id;
    }
  });

  await runner.test('POST /api/bookings creates booking', async () => {
    const { data: service } = await supabase
      .from('ta_services')
      .select('id, duration')
      .eq('created_by', trainerId)
      .limit(1)
      .single();

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(11, 0, 0, 0);

    const { status, data } = await apiRequest('/api/bookings', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        clientId: testClientId,
        serviceId: service?.id,
        scheduledAt: tomorrow.toISOString(),
        duration: service?.duration || 60,
        notes: 'Test booking from script',
      }),
    });

    assert(status === 200 || status === 201, `Expected 200/201, got ${status}: ${JSON.stringify(data)}`);
    // Response is { booking: {...} }
    const bookingId = data.booking?.id || data.id || data.bookingId;
    assert(bookingId, 'Expected booking ID');
    testBookingId = bookingId;
  });

  await runner.test('GET /api/bookings/[id] returns specific booking', async () => {
    const { status, data } = await apiRequest(`/api/bookings/${testBookingId}`, {
      headers: authHeaders,
    });
    assert(status === 200, `Expected 200, got ${status}`);
    // Response might be { booking: {...} } or direct booking
    const bookingId = data.booking?.id || data.id;
    assert(bookingId === testBookingId, `Booking ID mismatch: ${bookingId} vs ${testBookingId}`);
  });

  await runner.test('PATCH /api/bookings/[id] updates booking status', async () => {
    const { status, data } = await apiRequest(`/api/bookings/${testBookingId}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({
        status: 'confirmed',
      }),
    });
    assert(status === 200, `Expected 200, got ${status}: ${JSON.stringify(data)}`);
  });

  await runner.test('POST /api/bookings/[id]/check-in checks in booking', async () => {
    const { status } = await apiRequest(`/api/bookings/${testBookingId}/check-in`, {
      method: 'POST',
      headers: authHeaders,
    });
    assert(status === 200, `Expected 200, got ${status}`);
  });

  await runner.test('POST /api/bookings/[id]/complete completes booking', async () => {
    const { status } = await apiRequest(`/api/bookings/${testBookingId}/complete`, {
      method: 'POST',
      headers: authHeaders,
    });
    assert(status === 200, `Expected 200, got ${status}`);
  });

  // ============================================================
  runner.section('Clients Management');
  // ============================================================

  await runner.test('GET /api/clients returns trainer clients', async () => {
    const { status, data } = await apiRequest('/api/clients', {
      headers: authHeaders,
    });
    assert(status === 200, `Expected 200, got ${status}`);
    // Response is { clients: [...] }
    const clients = data.clients || data;
    assert(Array.isArray(clients), 'Expected clients array');
  });

  await runner.test('GET /api/clients/[id]/credits returns client credits', async () => {
    const { status, data } = await apiRequest(`/api/clients/${testClientId}/credits`, {
      headers: authHeaders,
    });
    assert(status === 200, `Expected 200, got ${status}`);
    assert(typeof data.totalCredits === 'number', 'Expected totalCredits');
  });

  // ============================================================
  runner.section('Packages Management');
  // ============================================================

  let createdPackageId: string;

  await runner.test('POST /api/packages creates package', async () => {
    const { status, data } = await apiRequest('/api/packages', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: 'Test Package - 5 Sessions',
        description: 'Test package created by script',
        sessionCount: 5,
        priceCents: 20000,
        validityDays: 90,
        isPublic: true,
      }),
    });

    assert(status === 200 || status === 201, `Expected 200/201, got ${status}: ${JSON.stringify(data)}`);
    assert(data.id, 'Expected package ID');
    createdPackageId = data.id;
  });

  await runner.test('GET /api/packages returns trainer packages', async () => {
    const { status, data } = await apiRequest('/api/packages', {
      headers: authHeaders,
    });
    assert(status === 200, `Expected 200, got ${status}`);
    // Response is array directly
    const packages = Array.isArray(data) ? data : (data.packages || []);
    assert(Array.isArray(packages), 'Expected packages array');
    const found = packages.find((p: any) => p.id === createdPackageId);
    assert(found, 'Should find created package');
  });

  // ============================================================
  runner.section('Analytics Dashboard');
  // ============================================================

  await runner.test('GET /api/analytics/dashboard returns metrics', async () => {
    const { status, data } = await apiRequest('/api/analytics/dashboard', {
      headers: authHeaders,
    });
    assert(status === 200, `Expected 200, got ${status}`);
    // Check for expected metric fields
    assert(
      data.earningsThisWeek !== undefined ||
      data.sessionsThisWeek !== undefined ||
      data.activeClients !== undefined,
      'Expected dashboard metrics'
    );
  });

  // ============================================================
  runner.section('Cleanup');
  // ============================================================

  await runner.test('Cleanup test data', async () => {
    // Delete test booking
    await supabase.from('ta_bookings').delete().eq('id', testBookingId);
    // Delete test client
    await supabase.from('fc_clients').delete().eq('id', testClientId);
    // Delete test package
    await supabase.from('ta_packages').delete().eq('id', createdPackageId);
  });

  // Summary
  runner.summary();
}

runTests().catch(console.error);
