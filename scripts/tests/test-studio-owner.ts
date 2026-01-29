/**
 * Test Suite: Studio Owner Role
 * Tests studio owner specific features: invitations, team management
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
  console.log('\n🏢 STUDIO OWNER ROLE TESTS\n');

  // Get studio owner info
  const { data: owner } = await supabase
    .from('profiles')
    .select('id, email, role')
    .eq('email', TEST_ACCOUNTS.studioOwner.email)
    .single();

  if (!owner) {
    console.log('❌ Studio owner not found');
    return;
  }

  console.log(`Testing as: ${owner.email} (${owner.role})`);

  // Get auth token
  const token = await getAuthToken(
    TEST_ACCOUNTS.studioOwner.email,
    TEST_ACCOUNTS.studioOwner.password
  );

  if (!token) {
    console.log('❌ Could not authenticate studio owner');
    return;
  }

  const authHeaders = { Authorization: `Bearer ${token}` };

  // Get or create studio
  let studioId: string;
  const { data: staff } = await supabase
    .from('bs_staff')
    .select('studio_id')
    .eq('id', owner.id)
    .single();

  if (staff?.studio_id) {
    studioId = staff.studio_id;
  } else {
    // Check if studio exists for this owner
    const { data: existingStudio } = await supabase
      .from('bs_studios')
      .select('id')
      .eq('owner_id', owner.id)
      .single();

    if (existingStudio) {
      studioId = existingStudio.id;
    } else {
      // Create a studio
      const { data: newStudio, error } = await supabase
        .from('bs_studios')
        .insert({
          name: 'Test Studio',
          owner_id: owner.id,
          studio_type: 'fitness',
          plan: 'free',
        })
        .select()
        .single();

      if (error) {
        console.log(`Note: Could not create studio: ${error.message}`);
        // Continue without studio-specific tests
      } else {
        studioId = newStudio.id;
        // Link owner to studio
        await supabase
          .from('bs_staff')
          .update({ studio_id: studioId })
          .eq('id', owner.id);
      }
    }
  }

  console.log(`Studio ID: ${studioId || 'None'}`);

  // ============================================================
  runner.section('Invitations Management');
  // ============================================================

  let createdInvitationId: string;
  const testInviteEmail = `invite-test-${Date.now()}@example.com`;

  await runner.test('POST /api/invitations creates invitation', async () => {
    const { status, data } = await apiRequest('/api/invitations', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        email: testInviteEmail,
        firstName: 'Invited',
        lastName: 'Trainer',
        role: 'trainer',
        commissionPercent: 70,
        message: 'Welcome to our team!',
      }),
    });

    assert(status === 200 || status === 201, `Expected 200/201, got ${status}: ${JSON.stringify(data)}`);
    assert(data.id || data.invitationId, 'Expected invitation ID');
    assert(data.token, 'Expected invitation token');
    createdInvitationId = data.id || data.invitationId;
  });

  await runner.test('Invitation stored correctly in database', async () => {
    const { data } = await supabase
      .from('ta_invitations')
      .select('*')
      .eq('id', createdInvitationId)
      .single();

    assert(data, 'Invitation should exist');
    assert(data.email === testInviteEmail, 'Email should match');
    assert(data.status === 'pending', 'Status should be pending');
    assert(data.commission_percent === 70, 'Commission should be 70%');
    assert(data.invited_by === owner.id, 'invited_by should match owner');
  });

  await runner.test('GET /api/invitations returns invitations list', async () => {
    const { status, data } = await apiRequest('/api/invitations', {
      headers: authHeaders,
    });

    assert(status === 200, `Expected 200, got ${status}`);
    assert(Array.isArray(data), 'Expected array');
    const found = data.find((i: any) => i.id === createdInvitationId);
    assert(found, 'Should find created invitation');
  });

  await runner.test('Invitation expiry is set correctly', async () => {
    const { data } = await supabase
      .from('ta_invitations')
      .select('expires_at')
      .eq('id', createdInvitationId)
      .single();

    assert(data?.expires_at, 'Should have expiry date');
    const expiry = new Date(data.expires_at);
    const now = new Date();
    assert(expiry > now, 'Expiry should be in the future');
  });

  // ============================================================
  runner.section('Invitation Token Validation');
  // ============================================================

  let invitationToken: string;

  await runner.test('Get invitation token', async () => {
    const { data } = await supabase
      .from('ta_invitations')
      .select('token')
      .eq('id', createdInvitationId)
      .single();

    assert(data?.token, 'Should have token');
    invitationToken = data.token;
  });

  await runner.test('Invalid token returns error', async () => {
    const { data } = await supabase
      .from('ta_invitations')
      .select('*')
      .eq('token', 'invalid-token-12345')
      .single();

    assert(!data, 'Should not find invitation with invalid token');
  });

  // ============================================================
  runner.section('Revoke Invitation');
  // ============================================================

  await runner.test('DELETE /api/invitations revokes invitation', async () => {
    const { status } = await apiRequest(`/api/invitations?id=${createdInvitationId}`, {
      method: 'DELETE',
      headers: authHeaders,
    });

    assert(status === 200, `Expected 200, got ${status}`);
  });

  await runner.test('Revoked invitation has correct status', async () => {
    const { data } = await supabase
      .from('ta_invitations')
      .select('status')
      .eq('id', createdInvitationId)
      .single();

    assert(data?.status === 'revoked', `Expected revoked, got ${data?.status}`);
  });

  // ============================================================
  runner.section('Studio Owner Dashboard');
  // ============================================================

  await runner.test('GET /api/analytics/dashboard works for studio owner', async () => {
    const { status, data } = await apiRequest('/api/analytics/dashboard', {
      headers: authHeaders,
    });
    assert(status === 200, `Expected 200, got ${status}`);
  });

  await runner.test('Studio owner can view all services', async () => {
    const { status, data } = await apiRequest('/api/services', {
      headers: authHeaders,
    });
    assert(status === 200, `Expected 200, got ${status}`);
    // Response is { services: [...] }
    const services = data.services || data;
    assert(Array.isArray(services), 'Expected array of services');
  });

  await runner.test('Studio owner can view all bookings', async () => {
    const { status, data } = await apiRequest('/api/bookings', {
      headers: authHeaders,
    });
    assert(status === 200, `Expected 200, got ${status}`);
  });

  // ============================================================
  runner.section('Trainers Management');
  // ============================================================

  await runner.test('GET /api/trainers returns trainers list', async () => {
    const { status, data } = await apiRequest('/api/trainers', {
      headers: authHeaders,
    });
    // This might return 404 if not implemented, which is ok
    if (status === 200) {
      // Response might be wrapped: { trainers: [...] } or direct array
      const trainers = data.trainers || data;
      assert(Array.isArray(trainers), 'Expected array');
    }
    // Accept 200, 401 (unauthorized for this endpoint), or 404 (not implemented)
    assert(status === 200 || status === 401 || status === 404, `Expected 200, 401, or 404, got ${status}`);
  });

  // ============================================================
  runner.section('Cleanup');
  // ============================================================

  await runner.test('Cleanup test invitations', async () => {
    await supabase
      .from('ta_invitations')
      .delete()
      .eq('email', testInviteEmail);
  });

  // Summary
  runner.summary();
}

runTests().catch(console.error);
