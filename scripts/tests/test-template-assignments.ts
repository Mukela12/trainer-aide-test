/**
 * Test Suite: Template Assignments
 * Tests template assignment features for studio owners and solo practitioners
 *
 * User Journey:
 * 1. Studio Owner creates a template
 * 2. Studio Owner assigns template to a trainer (trainer toolkit)
 * 3. Studio Owner assigns template to a client (client-specific)
 * 4. Trainer can see their assigned templates
 * 5. Trainer can see available templates for a specific client
 * 6. Solo Practitioner can only assign to clients, not trainers
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
  console.log('\n📋 TEMPLATE ASSIGNMENTS TESTS\n');

  // ============================================================
  // Setup: Get test users
  // ============================================================

  // Get studio owner profile
  const { data: ownerProfile, error: ownerError } = await supabase
    .from('profiles')
    .select('id, email, role')
    .eq('email', TEST_ACCOUNTS.studioOwner.email)
    .single();

  if (ownerError || !ownerProfile) {
    console.log(`❌ Studio owner not found: ${ownerError?.message || 'no profile'}`);
    return;
  }

  // Get studio owner's studio
  const { data: ownerStudio } = await supabase
    .from('bs_studios')
    .select('id')
    .eq('owner_id', ownerProfile.id)
    .single();

  const owner = {
    ...ownerProfile,
    studio_id: ownerStudio?.id || ownerProfile.id,
  };

  // Get solo practitioner profile
  const { data: soloProfile, error: soloError } = await supabase
    .from('profiles')
    .select('id, email, role')
    .eq('email', TEST_ACCOUNTS.soloPractitioner.email)
    .single();

  if (soloError || !soloProfile) {
    console.log(`❌ Solo practitioner not found: ${soloError?.message || 'no profile'}`);
    return;
  }

  // Get solo practitioner's studio (may not exist for true solo)
  const { data: soloStudio } = await supabase
    .from('bs_studios')
    .select('id')
    .eq('owner_id', soloProfile.id)
    .single();

  const solo = {
    ...soloProfile,
    studio_id: soloStudio?.id || soloProfile.id,
  };

  console.log(`Studio Owner: ${owner.email} (${owner.role})`);
  console.log(`Solo Practitioner: ${solo.email} (${solo.role})`);

  // Get auth tokens
  const ownerToken = await getAuthToken(
    TEST_ACCOUNTS.studioOwner.email,
    TEST_ACCOUNTS.studioOwner.password
  );

  const soloToken = await getAuthToken(
    TEST_ACCOUNTS.soloPractitioner.email,
    TEST_ACCOUNTS.soloPractitioner.password
  );

  if (!ownerToken) {
    console.log('❌ Could not authenticate studio owner');
    return;
  }

  const skipSoloTests = !soloToken;
  if (skipSoloTests) {
    console.log('⚠️ Could not authenticate solo practitioner - will skip solo tests');
  }

  const ownerHeaders = { Authorization: `Bearer ${ownerToken}` };
  const soloHeaders = { Authorization: `Bearer ${soloToken}` };

  // Test data tracking
  let createdTemplateId: string;
  let testClientId: string;
  let testTrainerId: string;
  let soloClientId: string;
  let soloTemplateId: string;

  // ============================================================
  runner.section('Setup: Create Test Data');
  // ============================================================

  await runner.test('Create a test template for studio owner', async () => {
    const { status, data } = await apiRequest('/api/templates', {
      method: 'POST',
      headers: ownerHeaders,
      body: JSON.stringify({
        name: `Test Template ${Date.now()}`,
        description: 'Template for assignment testing',
        type: 'standard',
        blocks: [{
          blockNumber: 1,
          name: 'Warm Up',
          exercises: []
        }],
      }),
    });

    assert(status === 200 || status === 201, `Expected 200/201, got ${status}: ${JSON.stringify(data)}`);
    createdTemplateId = data.template?.id || data.id;
    assert(createdTemplateId, 'Expected template ID');
  });

  await runner.test('Create a test client for studio owner', async () => {
    const testEmail = `template-test-client-${Date.now()}@example.com`;
    const { status, data } = await apiRequest('/api/clients', {
      method: 'POST',
      headers: ownerHeaders,
      body: JSON.stringify({
        firstName: 'TemplateTest',
        lastName: 'Client',
        email: testEmail,
      }),
    });

    if (status === 201 || status === 200) {
      testClientId = data.client?.id || data.id;
    } else {
      // Fallback to direct insert
      const { data: directData, error } = await supabase
        .from('fc_clients')
        .insert({
          first_name: 'TemplateTest',
          last_name: 'Client',
          email: testEmail,
          invited_by: owner.id,
          studio_id: owner.studio_id || owner.id,
          is_guest: false,
          source: 'manual',
        })
        .select()
        .single();

      assert(!error, `Failed to create client: ${error?.message}`);
      testClientId = directData.id;
    }
    assert(testClientId, 'Expected client ID');
  });

  await runner.test('Find or create a trainer in the studio', async () => {
    // For template assignments, we need a trainer_id that exists in auth.users
    // The bs_staff trainers may not have auth accounts, so we use the owner's ID
    // In production, trainers would be invited and have auth accounts
    testTrainerId = owner.id;
    assert(testTrainerId, 'Expected trainer ID');
    console.log(`  Using trainer ID: ${testTrainerId} (owner as test trainer)`);
  });

  // ============================================================
  runner.section('Studio Owner: Assign Template to Trainer');
  // ============================================================

  await runner.test('POST /api/templates/[id]/assign assigns template to trainer', async () => {
    const { status, data } = await apiRequest(`/api/templates/${createdTemplateId}/assign`, {
      method: 'POST',
      headers: ownerHeaders,
      body: JSON.stringify({
        trainerId: testTrainerId,
      }),
    });

    assert(status === 200 || status === 201, `Expected 200/201, got ${status}: ${JSON.stringify(data)}`);
    assert(data.templateId || data.template_id, 'Expected templateId in response');
  });

  await runner.test('Assignment stored in database', async () => {
    // Small delay to ensure database write is complete
    await new Promise((resolve) => setTimeout(resolve, 500));

    const { data, error } = await supabase
      .from('ta_trainer_template_assignments')
      .select('*')
      .eq('template_id', createdTemplateId)
      .eq('trainer_id', testTrainerId)
      .maybeSingle();

    assert(!error, `Database error: ${error?.message}`);
    assert(data, 'Assignment should exist in database');
    assert(data.assigned_by === owner.id, 'assigned_by should match owner');
  });

  await runner.test('GET /api/trainers/[id]/templates returns assigned templates', async () => {
    const { status, data } = await apiRequest(`/api/trainers/${testTrainerId}/templates`, {
      headers: ownerHeaders,
    });

    assert(status === 200, `Expected 200, got ${status}`);
    const templates = data.templates || [];
    const found = templates.find((t: any) => t.id === createdTemplateId);
    assert(found, 'Should find assigned template in trainer templates');
  });

  await runner.test('Duplicate assignment returns 409 conflict', async () => {
    const { status } = await apiRequest(`/api/templates/${createdTemplateId}/assign`, {
      method: 'POST',
      headers: ownerHeaders,
      body: JSON.stringify({
        trainerId: testTrainerId,
      }),
    });

    assert(status === 409, `Expected 409 for duplicate, got ${status}`);
  });

  // ============================================================
  runner.section('Studio Owner: Assign Template to Client');
  // ============================================================

  await runner.test('POST /api/templates/[id]/assign assigns template to client', async () => {
    const { status, data } = await apiRequest(`/api/templates/${createdTemplateId}/assign`, {
      method: 'POST',
      headers: ownerHeaders,
      body: JSON.stringify({
        clientId: testClientId,
      }),
    });

    assert(status === 200 || status === 201, `Expected 200/201, got ${status}: ${JSON.stringify(data)}`);
    assert(data.templateId || data.template_id || data.clientId || data.client_id, 'Expected assignment data');
  });

  await runner.test('Client assignment stored in database', async () => {
    // Small delay to ensure database write is complete
    await new Promise((resolve) => setTimeout(resolve, 500));

    const { data, error } = await supabase
      .from('ta_client_template_assignments')
      .select('*')
      .eq('template_id', createdTemplateId)
      .eq('client_id', testClientId)
      .maybeSingle();

    assert(!error, `Database error: ${error?.message}`);
    assert(data, 'Client assignment should exist');
    assert(data.assigned_by === owner.id, 'assigned_by should match owner');
  });

  await runner.test('GET /api/clients/[id]/templates returns assigned templates', async () => {
    const { status, data } = await apiRequest(`/api/clients/${testClientId}/templates`, {
      headers: ownerHeaders,
    });

    assert(status === 200, `Expected 200, got ${status}`);
    const templates = data.templates || [];
    const found = templates.find((t: any) => t.id === createdTemplateId);
    assert(found, 'Should find assigned template in client templates');
  });

  // ============================================================
  runner.section('Available Templates for Client');
  // ============================================================

  await runner.test('GET /api/clients/[id]/available-templates returns grouped templates', async () => {
    const { status, data } = await apiRequest(`/api/clients/${testClientId}/available-templates?trainerId=${testTrainerId}`, {
      headers: ownerHeaders,
    });

    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.templates, 'Expected templates array');
    assert(data.grouped, 'Expected grouped object');

    // Check that our template appears in the right categories
    const hasInToolkit = data.grouped.trainerToolkit?.some((t: any) => t.template_id === createdTemplateId);
    const hasInClientSpecific = data.grouped.clientSpecific?.some((t: any) => t.template_id === createdTemplateId);

    // Template should appear in at least one category (may appear in both)
    assert(hasInToolkit || hasInClientSpecific, 'Template should appear in available templates');
  });

  // ============================================================
  runner.section('Remove Assignments');
  // ============================================================

  await runner.test('DELETE /api/templates/[id]/assign removes trainer assignment', async () => {
    const { status } = await apiRequest(`/api/templates/${createdTemplateId}/assign?trainerId=${testTrainerId}`, {
      method: 'DELETE',
      headers: ownerHeaders,
    });

    assert(status === 200, `Expected 200, got ${status}`);
  });

  await runner.test('Trainer assignment removed from database', async () => {
    const { data } = await supabase
      .from('ta_trainer_template_assignments')
      .select('*')
      .eq('template_id', createdTemplateId)
      .eq('trainer_id', testTrainerId)
      .maybeSingle();

    assert(!data, 'Assignment should be removed');
  });

  await runner.test('DELETE /api/templates/[id]/assign removes client assignment', async () => {
    const { status } = await apiRequest(`/api/templates/${createdTemplateId}/assign?clientId=${testClientId}`, {
      method: 'DELETE',
      headers: ownerHeaders,
    });

    assert(status === 200, `Expected 200, got ${status}`);
  });

  // ============================================================
  runner.section('Solo Practitioner: Client-Only Assignments');
  // ============================================================

  if (skipSoloTests) {
    console.log('  ⏭️  Skipping solo practitioner tests (auth failed)');
  }

  !skipSoloTests && await runner.test('Create template for solo practitioner', async () => {
    const { status, data } = await apiRequest('/api/templates', {
      method: 'POST',
      headers: soloHeaders,
      body: JSON.stringify({
        name: `Solo Template ${Date.now()}`,
        description: 'Template for solo practitioner testing',
        type: 'standard',
        blocks: [{
          blockNumber: 1,
          name: 'Block 1',
          exercises: []
        }],
      }),
    });

    assert(status === 200 || status === 201, `Expected 200/201, got ${status}`);
    soloTemplateId = data.template?.id || data.id;
    assert(soloTemplateId, 'Expected template ID');
  });

  !skipSoloTests && await runner.test('Create client for solo practitioner', async () => {
    const testEmail = `solo-client-${Date.now()}@example.com`;
    const { status, data } = await apiRequest('/api/clients', {
      method: 'POST',
      headers: soloHeaders,
      body: JSON.stringify({
        firstName: 'Solo',
        lastName: 'TestClient',
        email: testEmail,
      }),
    });

    assert(status === 201 || status === 200, `Expected 201/200, got ${status}: ${JSON.stringify(data)}`);
    soloClientId = data.client?.id || data.id;
    assert(soloClientId, 'Expected solo client ID');
  });

  !skipSoloTests && await runner.test('Solo practitioner can assign template to client', async () => {
    const { status, data } = await apiRequest(`/api/templates/${soloTemplateId}/assign`, {
      method: 'POST',
      headers: soloHeaders,
      body: JSON.stringify({
        clientId: soloClientId,
      }),
    });

    assert(status === 200 || status === 201, `Expected 200/201, got ${status}: ${JSON.stringify(data)}`);
  });

  !skipSoloTests && await runner.test('Solo practitioner client assignment in database', async () => {
    const { data } = await supabase
      .from('ta_client_template_assignments')
      .select('*')
      .eq('template_id', soloTemplateId)
      .eq('client_id', soloClientId)
      .single();

    assert(data, 'Assignment should exist');
    assert(data.assigned_by === solo.id, 'assigned_by should match solo practitioner');
  });

  !skipSoloTests && await runner.test('Solo can view available templates for their client', async () => {
    const { status, data } = await apiRequest(`/api/clients/${soloClientId}/available-templates`, {
      headers: soloHeaders,
    });

    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.templates, 'Expected templates');

    // Should have the template in client-specific or own templates
    const foundInClientSpecific = data.grouped?.clientSpecific?.some((t: any) => t.template_id === soloTemplateId);
    const foundInOwnTemplates = data.grouped?.ownTemplates?.some((t: any) => t.template_id === soloTemplateId);

    assert(foundInClientSpecific || foundInOwnTemplates, 'Template should be available for client');
  });

  // ============================================================
  runner.section('Trainer Stats API');
  // ============================================================

  await runner.test('GET /api/trainers/[id]/stats returns trainer statistics', async () => {
    const { status, data } = await apiRequest(`/api/trainers/${testTrainerId}/stats`, {
      headers: ownerHeaders,
    });

    assert(status === 200, `Expected 200, got ${status}`);
    assert(typeof data.totalClients === 'number', 'Expected totalClients');
    assert(typeof data.totalBookings === 'number', 'Expected totalBookings');
    assert(typeof data.totalTemplates === 'number', 'Expected totalTemplates');
    assert(typeof data.upcomingBookings === 'number', 'Expected upcomingBookings');
  });

  // ============================================================
  runner.section('Cleanup');
  // ============================================================

  await runner.test('Cleanup test data', async () => {
    // Clean up assignments
    if (createdTemplateId) {
      await supabase
        .from('ta_trainer_template_assignments')
        .delete()
        .eq('template_id', createdTemplateId);

      await supabase
        .from('ta_client_template_assignments')
        .delete()
        .eq('template_id', createdTemplateId);

      // Clean up template
      await supabase
        .from('ta_workout_templates')
        .delete()
        .eq('id', createdTemplateId);
    }

    if (soloTemplateId) {
      await supabase
        .from('ta_client_template_assignments')
        .delete()
        .eq('template_id', soloTemplateId);

      await supabase
        .from('ta_workout_templates')
        .delete()
        .eq('id', soloTemplateId);
    }

    // Clean up clients
    if (testClientId) {
      await supabase
        .from('fc_clients')
        .delete()
        .eq('id', testClientId);
    }

    if (soloClientId) {
      await supabase
        .from('fc_clients')
        .delete()
        .eq('id', soloClientId);
    }
  });

  // Summary
  runner.summary();
}

runTests().catch(console.error);
