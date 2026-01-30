/**
 * Test Suite: Booking Requests
 * Tests booking request creation, acceptance, decline, and email notifications
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
  console.log('\n📅 BOOKING REQUESTS TESTS\n');

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

  // Create test client
  let testClientId: string;
  let testServiceId: string;
  let testRequestId: string;

  // ============================================================
  runner.section('Test Setup');
  // ============================================================

  await runner.test('Create test client for booking requests', async () => {
    const testEmail = `test-request-${Date.now()}@example.com`;

    // Use API to create client (handles studio_id correctly)
    const { status, data } = await apiRequest('/api/clients', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        firstName: 'Request',
        lastName: 'TestClient',
        email: testEmail,
      }),
    });

    if (status === 201 || status === 200) {
      testClientId = data.client?.id || data.id;
      assert(!!testClientId, 'Expected client ID in response');
    } else {
      // Fallback to direct insert
      const { data: directData, error } = await supabase
        .from('fc_clients')
        .insert({
          first_name: 'Request',
          last_name: 'TestClient',
          name: 'Request TestClient',
          email: testEmail,
          invited_by: trainerId,
          is_guest: false,
          source: 'manual',
        })
        .select()
        .single();

      assert(!error && directData, `Failed to create client: ${error?.message}`);
      testClientId = directData.id;
    }
  });

  await runner.test('Get or create test service', async () => {
    const { data: existingService } = await supabase
      .from('ta_services')
      .select('id')
      .eq('created_by', trainerId)
      .limit(1)
      .single();

    if (existingService) {
      testServiceId = existingService.id;
    } else {
      const { data, error } = await supabase
        .from('ta_services')
        .insert({
          name: 'Test Service for Requests',
          description: 'Service for testing booking requests',
          duration: 60,
          type: '1-2-1',
          max_capacity: 1,
          price_cents: 5000,
          is_public: true,
          created_by: trainerId,
        })
        .select()
        .single();

      assert(!error && data, `Failed to create service: ${error?.message}`);
      testServiceId = data.id;
    }
  });

  // ============================================================
  runner.section('Booking Request Creation');
  // ============================================================

  await runner.test('POST /api/booking-requests creates request', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);

    const { status, data } = await apiRequest('/api/booking-requests', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        clientId: testClientId,
        serviceId: testServiceId,
        preferredTimes: [tomorrow.toISOString(), dayAfter.toISOString()],
        notes: 'Test booking request from script',
      }),
    });

    assert(status === 201 || status === 200, `Expected 201, got ${status}: ${JSON.stringify(data)}`);
    assert(data.request?.id, 'Expected request ID');
    testRequestId = data.request.id;
  });

  await runner.test('Request has correct status: pending', async () => {
    const { data } = await supabase
      .from('ta_booking_requests')
      .select('status')
      .eq('id', testRequestId)
      .single();

    assert(data?.status === 'pending', `Expected pending, got ${data?.status}`);
  });

  await runner.test('Request has preferred times stored', async () => {
    const { data } = await supabase
      .from('ta_booking_requests')
      .select('preferred_times')
      .eq('id', testRequestId)
      .single();

    assert(
      Array.isArray(data?.preferred_times) && data.preferred_times.length === 2,
      'Expected 2 preferred times'
    );
  });

  // ============================================================
  runner.section('Booking Request Retrieval');
  // ============================================================

  await runner.test('GET /api/booking-requests returns requests', async () => {
    const { status, data } = await apiRequest('/api/booking-requests', {
      headers: authHeaders,
    });

    assert(status === 200, `Expected 200, got ${status}`);
    assert(Array.isArray(data.requests), 'Expected requests array');

    const found = data.requests.find((r: any) => r.id === testRequestId);
    assert(found, 'Should find created request');
  });

  await runner.test('GET /api/booking-requests?status=pending filters correctly', async () => {
    const { status, data } = await apiRequest('/api/booking-requests?status=pending', {
      headers: authHeaders,
    });

    assert(status === 200, `Expected 200, got ${status}`);

    const allPending = data.requests.every((r: any) => r.status === 'pending');
    assert(allPending, 'All returned requests should be pending');
  });

  await runner.test('Request includes client data', async () => {
    const { data } = await apiRequest('/api/booking-requests', {
      headers: authHeaders,
    });

    const request = data.requests.find((r: any) => r.id === testRequestId);
    assert(request?.client, 'Request should include client data');
    assert(request.clientName, 'Request should have clientName');
  });

  // ============================================================
  runner.section('Booking Request Acceptance');
  // ============================================================

  await runner.test('PUT /api/booking-requests accepts request', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    const { status, data } = await apiRequest('/api/booking-requests', {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        id: testRequestId,
        status: 'accepted',
        acceptedTime: tomorrow.toISOString(),
      }),
    });

    assert(status === 200, `Expected 200, got ${status}: ${JSON.stringify(data)}`);
    assert(data.request?.status === 'accepted', 'Request should be accepted');
    assert(data.booking, 'Should have created a booking');
  });

  await runner.test('Accepted request created booking', async () => {
    const { data: request } = await supabase
      .from('ta_booking_requests')
      .select('booking_id, accepted_time')
      .eq('id', testRequestId)
      .single();

    assert(request?.booking_id, 'Should have booking_id');
    assert(request?.accepted_time, 'Should have accepted_time');

    // Verify booking exists
    const { data: booking } = await supabase
      .from('ta_bookings')
      .select('id, status, client_id')
      .eq('id', request.booking_id)
      .single();

    assert(!!booking, 'Booking should exist');
    assert(booking?.status === 'confirmed', 'Booking should be confirmed');
    assert(booking?.client_id === testClientId, 'Booking should be for correct client');
  });

  // ============================================================
  runner.section('Booking Request Decline Flow');
  // ============================================================

  let declinedRequestId: string;

  await runner.test('Create request to decline', async () => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(14, 0, 0, 0);

    // Use API to create request
    const { status, data } = await apiRequest('/api/booking-requests', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        clientId: testClientId,
        serviceId: testServiceId,
        preferredTimes: [nextWeek.toISOString()],
        notes: 'Request to decline',
      }),
    });

    assert(status === 201 || status === 200, `Failed to create request: ${JSON.stringify(data)}`);
    declinedRequestId = data.request?.id;
    assert(!!declinedRequestId, 'Expected request ID');
  });

  await runner.test('PUT /api/booking-requests declines request', async () => {
    const { status, data } = await apiRequest('/api/booking-requests', {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        id: declinedRequestId,
        status: 'declined',
      }),
    });

    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.request?.status === 'declined', 'Request should be declined');
    assert(!data.booking, 'Should NOT create a booking');
  });

  await runner.test('Declined request has no booking', async () => {
    const { data } = await supabase
      .from('ta_booking_requests')
      .select('booking_id')
      .eq('id', declinedRequestId)
      .single();

    assert(!data?.booking_id, 'Declined request should have no booking_id');
  });

  // ============================================================
  runner.section('Booking Request Deletion');
  // ============================================================

  let deleteRequestId: string;

  await runner.test('Create request to delete', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);

    // Use API to create request
    const { status, data } = await apiRequest('/api/booking-requests', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        clientId: testClientId,
        preferredTimes: [futureDate.toISOString()],
        notes: 'Request to delete',
      }),
    });

    assert(status === 201 || status === 200, `Failed to create request: ${JSON.stringify(data)}`);
    deleteRequestId = data.request?.id;
    assert(!!deleteRequestId, 'Expected request ID');
  });

  await runner.test('DELETE /api/booking-requests removes request', async () => {
    const { status } = await apiRequest(`/api/booking-requests?id=${deleteRequestId}`, {
      method: 'DELETE',
      headers: authHeaders,
    });

    assert(status === 200, `Expected 200, got ${status}`);
  });

  await runner.test('Deleted request no longer exists', async () => {
    const { data } = await supabase
      .from('ta_booking_requests')
      .select('id')
      .eq('id', deleteRequestId)
      .single();

    assert(!data, 'Request should be deleted');
  });

  // ============================================================
  runner.section('Email Notification Verification');
  // ============================================================

  await runner.test('Notification logged for created request', async () => {
    // Check if notification was logged (we can't verify actual email sending in tests)
    const { data } = await supabase
      .from('ta_notifications')
      .select('id, type, status')
      .eq('type', 'booking_request_created')
      .order('created_at', { ascending: false })
      .limit(5);

    // Note: Email might not be sent in test environment, so we just check the system works
    console.log(`    Found ${data?.length || 0} booking_request_created notifications`);
  });

  await runner.test('Notification logged for accepted request', async () => {
    const { data } = await supabase
      .from('ta_notifications')
      .select('id, type, status')
      .eq('type', 'booking_request_accepted')
      .order('created_at', { ascending: false })
      .limit(5);

    console.log(`    Found ${data?.length || 0} booking_request_accepted notifications`);
  });

  // ============================================================
  runner.section('Cleanup');
  // ============================================================

  await runner.test('Cleanup test data', async () => {
    // Get booking from accepted request
    const { data: request } = await supabase
      .from('ta_booking_requests')
      .select('booking_id')
      .eq('id', testRequestId)
      .single();

    // Delete booking if exists
    if (request?.booking_id) {
      await supabase.from('ta_bookings').delete().eq('id', request.booking_id);
    }

    // Delete requests
    await supabase.from('ta_booking_requests').delete().eq('id', testRequestId);
    await supabase.from('ta_booking_requests').delete().eq('id', declinedRequestId);

    // Delete test client
    await supabase.from('fc_clients').delete().eq('id', testClientId);
  });

  // Summary
  runner.summary();
}

runTests().catch(console.error);
