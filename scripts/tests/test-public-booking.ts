/**
 * Test Suite: Public Booking Flow
 * Tests the entire public booking experience for guests
 */

import {
  TestRunner,
  apiRequest,
  assert,
  supabase,
  BASE_URL,
} from './test-config';

const runner = new TestRunner();

async function runTests() {
  console.log('\n🌐 PUBLIC BOOKING FLOW TESTS\n');
  console.log(`Base URL: ${BASE_URL}`);

  // Get test trainer
  const { data: trainer } = await supabase
    .from('profiles')
    .select('id, business_slug, first_name, last_name')
    .eq('email', 'jessekatungu@gmail.com')
    .single();

  if (!trainer?.business_slug) {
    console.log('❌ Test trainer not set up. Run setup-test-trainer.ts first.');
    return;
  }

  const trainerId = trainer.id;
  const slug = trainer.business_slug;

  // ============================================================
  runner.section('Public Trainer Profile');
  // ============================================================

  await runner.test('GET /api/public/trainers/[slug] returns trainer info', async () => {
    const { status, data } = await apiRequest(`/api/public/trainers/${slug}`);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.id === trainerId, 'Trainer ID mismatch');
    assert(data.firstName === trainer.first_name, 'First name mismatch');
    assert(data.businessName !== null, 'Business name should be set');
  });

  await runner.test('GET /api/public/trainers/invalid-slug returns 404', async () => {
    const { status } = await apiRequest('/api/public/trainers/nonexistent-slug-12345');
    assert(status === 404, `Expected 404, got ${status}`);
  });

  // ============================================================
  runner.section('Public Services');
  // ============================================================

  let testServiceId: string;
  let freeServiceId: string;

  await runner.test('GET /api/public/services/[trainerId] returns services', async () => {
    const { status, data } = await apiRequest(`/api/public/services/${trainerId}`);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(Array.isArray(data), 'Expected array of services');
    assert(data.length > 0, 'Expected at least one service');

    // Find a paid service and a free service
    const paidService = data.find((s: any) => s.priceCents > 0);
    const freeService = data.find((s: any) => s.priceCents === 0 || s.isIntro);

    assert(paidService, 'Expected at least one paid service');
    testServiceId = paidService.id;

    if (freeService) {
      freeServiceId = freeService.id;
    }
  });

  await runner.test('Services have required fields', async () => {
    const { data } = await apiRequest(`/api/public/services/${trainerId}`);
    const service = data[0];
    assert(service.id, 'Service should have id');
    assert(service.name, 'Service should have name');
    assert(typeof service.duration === 'number', 'Service should have duration');
    assert(service.type, 'Service should have type');
  });

  // ============================================================
  runner.section('Public Availability');
  // ============================================================

  await runner.test('GET /api/public/availability/[trainerId] returns availability', async () => {
    const { status, data } = await apiRequest(`/api/public/availability/${trainerId}`);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.availability !== undefined, 'Expected availability array');
    assert(data.bookings !== undefined, 'Expected bookings array');
    assert(data.availability.length > 0, 'Expected at least one availability slot');
  });

  await runner.test('Availability slots have correct structure', async () => {
    const { data } = await apiRequest(`/api/public/availability/${trainerId}`);
    const slot = data.availability[0];
    assert(typeof slot.dayOfWeek === 'number', 'dayOfWeek should be number');
    assert(typeof slot.startHour === 'number', 'startHour should be number');
    assert(typeof slot.endHour === 'number', 'endHour should be number');
  });

  // ============================================================
  runner.section('Create Booking - Paid Service');
  // ============================================================

  const testEmail = `test-${Date.now()}@example.com`;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);

  let paidBookingId: string;

  await runner.test('POST /api/public/book creates paid booking with soft-hold', async () => {
    const { status, data } = await apiRequest('/api/public/book', {
      method: 'POST',
      body: JSON.stringify({
        trainerId,
        serviceId: testServiceId,
        scheduledAt: tomorrow.toISOString(),
        firstName: 'Test',
        lastName: 'Paid',
        email: testEmail,
        phone: '07123456789',
      }),
    });

    assert(status === 200, `Expected 200, got ${status}: ${JSON.stringify(data)}`);
    assert(data.bookingId, 'Expected bookingId');
    assert(data.status === 'soft-hold', 'Expected soft-hold status for paid booking');
    assert(data.requiresPayment === true, 'Expected requiresPayment=true');
    assert(data.priceCents > 0, 'Expected price > 0');

    paidBookingId = data.bookingId;
  });

  await runner.test('Paid booking creates guest client with invited_by', async () => {
    const { data: booking } = await supabase
      .from('ta_bookings')
      .select('client_id')
      .eq('id', paidBookingId)
      .single();

    const { data: client } = await supabase
      .from('fc_clients')
      .select('*')
      .eq('id', booking?.client_id)
      .single();

    assert(client, 'Client should exist');
    assert(client.is_guest === true, 'Client should be guest');
    assert(client.source === 'public_booking', 'Source should be public_booking');
    assert(client.invited_by === trainerId, 'invited_by should match trainer');
  });

  // ============================================================
  runner.section('Create Booking - Free Service');
  // ============================================================

  if (freeServiceId) {
    const freeTestEmail = `test-free-${Date.now()}@example.com`;
    tomorrow.setHours(14, 0, 0, 0);
    let freeBookingId: string;

    await runner.test('POST /api/public/book creates free booking as confirmed', async () => {
      const { status, data } = await apiRequest('/api/public/book', {
        method: 'POST',
        body: JSON.stringify({
          trainerId,
          serviceId: freeServiceId,
          scheduledAt: tomorrow.toISOString(),
          firstName: 'Test',
          lastName: 'Free',
          email: freeTestEmail,
          phone: '07987654321',
        }),
      });

      assert(status === 200, `Expected 200, got ${status}: ${JSON.stringify(data)}`);
      assert(data.status === 'confirmed', 'Expected confirmed status for free booking');
      assert(data.requiresPayment === false, 'Expected requiresPayment=false');

      freeBookingId = data.bookingId;
    });

    await runner.test('Free booking triggers notification creation', async () => {
      // Wait briefly for trigger
      await new Promise((r) => setTimeout(r, 500));

      const { data: notifications } = await supabase
        .from('ta_notifications')
        .select('*')
        .eq('booking_id', freeBookingId);

      assert(notifications && notifications.length > 0, 'Expected at least one notification');
      const reminder = notifications.find((n) => n.type === 'reminder_24h');
      assert(reminder, 'Expected 24h reminder notification');
    });
  }

  // ============================================================
  runner.section('Booking Validation');
  // ============================================================

  await runner.test('Booking fails with missing required fields', async () => {
    const { status } = await apiRequest('/api/public/book', {
      method: 'POST',
      body: JSON.stringify({
        trainerId,
        serviceId: testServiceId,
        // Missing scheduledAt, firstName, lastName, email
      }),
    });
    assert(status === 400, `Expected 400, got ${status}`);
  });

  await runner.test('Booking fails with invalid service ID', async () => {
    const { status } = await apiRequest('/api/public/book', {
      method: 'POST',
      body: JSON.stringify({
        trainerId,
        serviceId: '00000000-0000-0000-0000-000000000000',
        scheduledAt: tomorrow.toISOString(),
        firstName: 'Test',
        lastName: 'Invalid',
        email: 'invalid@test.com',
      }),
    });
    assert(status === 404, `Expected 404, got ${status}`);
  });

  // ============================================================
  runner.section('Existing Client Handling');
  // ============================================================

  await runner.test('Booking with existing email reuses client record', async () => {
    // Create another booking with same email - use a different day to avoid conflicts
    const dayAfterTomorrow = new Date();
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 3);
    dayAfterTomorrow.setHours(10, 0, 0, 0);

    const { status, data } = await apiRequest('/api/public/book', {
      method: 'POST',
      body: JSON.stringify({
        trainerId,
        serviceId: testServiceId,
        scheduledAt: dayAfterTomorrow.toISOString(),
        firstName: 'Test',
        lastName: 'Paid',
        email: testEmail,
        phone: '07123456789',
      }),
    });

    assert(status === 200, `Expected 200, got ${status}`);

    // Check client count - should still be 1 for this email
    const { data: clients } = await supabase
      .from('fc_clients')
      .select('id')
      .eq('email', testEmail.toLowerCase());

    assert(clients?.length === 1, 'Should reuse existing client');
  });

  // Cleanup test data
  console.log('\n🧹 Cleaning up test data...');
  await supabase.from('ta_bookings').delete().eq('notes', `ilike.%${testEmail}%`);
  await supabase.from('fc_clients').delete().eq('email', testEmail.toLowerCase());

  // Summary
  runner.summary();
}

runTests().catch(console.error);
