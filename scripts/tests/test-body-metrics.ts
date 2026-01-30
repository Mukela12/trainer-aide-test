/**
 * Test Suite: Body Metrics API
 * Tests metrics recording, retrieval, progress tracking, and pagination
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
  console.log('\n📊 BODY METRICS API TESTS\n');

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

  // Test data
  let testClientId: string;
  let testMetricId: string;
  const createdMetricIds: string[] = [];

  // ============================================================
  runner.section('Test Setup');
  // ============================================================

  await runner.test('Create test client for metrics', async () => {
    const testEmail = `test-metrics-${Date.now()}@example.com`;

    // Use API to create client (handles studio_id correctly)
    const { status, data } = await apiRequest('/api/clients', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        firstName: 'Metrics',
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
          first_name: 'Metrics',
          last_name: 'TestClient',
          name: 'Metrics TestClient',
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

  // ============================================================
  runner.section('Metric Recording');
  // ============================================================

  await runner.test('POST /api/clients/[id]/metrics records metrics', async () => {
    const { status, data } = await apiRequest(`/api/clients/${testClientId}/metrics`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        weight_kg: 80.5,
        body_fat_percent: 22.3,
        chest_cm: 100,
        waist_cm: 85,
        notes: 'Initial measurement',
      }),
    });

    assert(status === 201 || status === 200, `Expected 201, got ${status}: ${JSON.stringify(data)}`);
    assert(data.metric?.id, 'Expected metric ID');
    testMetricId = data.metric.id;
    createdMetricIds.push(testMetricId);
  });

  await runner.test('Metric has correct values', async () => {
    const { data } = await supabase
      .from('ta_body_metrics')
      .select('weight_kg, body_fat_percent, chest_cm, waist_cm, recorded_by')
      .eq('id', testMetricId)
      .single();

    assert(data?.weight_kg === 80.5, `Expected weight 80.5, got ${data?.weight_kg}`);
    assert(data?.body_fat_percent === 22.3, `Expected body_fat 22.3, got ${data?.body_fat_percent}`);
    assert(data?.chest_cm === 100, 'Expected chest 100');
    assert(data?.waist_cm === 85, 'Expected waist 85');
    assert(data?.recorded_by === trainerId, 'Recorded by should be trainer');
  });

  await runner.test('POST /api/clients/[id]/metrics requires at least one metric', async () => {
    const { status, data } = await apiRequest(`/api/clients/${testClientId}/metrics`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        notes: 'Just notes, no metrics',
      }),
    });

    assert(status === 400, `Expected 400, got ${status}`);
    assert(data.error?.includes('metric'), 'Error should mention metrics');
  });

  await runner.test('POST /api/clients/[id]/metrics with custom recorded_at', async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 7);

    const { status, data } = await apiRequest(`/api/clients/${testClientId}/metrics`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        weight_kg: 81.0,
        recorded_at: pastDate.toISOString(),
      }),
    });

    assert(status === 201 || status === 200, `Expected 201, got ${status}`);
    createdMetricIds.push(data.metric.id);

    const recordedAt = new Date(data.metric.recorded_at);
    const expectedDate = pastDate.toISOString().split('T')[0];
    const actualDate = recordedAt.toISOString().split('T')[0];
    assert(actualDate === expectedDate, `Expected date ${expectedDate}, got ${actualDate}`);
  });

  // Create more metrics for pagination tests
  await runner.test('Create multiple metrics for pagination', async () => {
    for (let i = 0; i < 5; i++) {
      const recordedAt = new Date();
      recordedAt.setDate(recordedAt.getDate() - (i + 2));

      const { data, error } = await supabase
        .from('ta_body_metrics')
        .insert({
          client_id: testClientId,
          trainer_id: trainerId,
          recorded_by: trainerId,
          recorded_at: recordedAt.toISOString(),
          weight_kg: 79 + i * 0.5,
          body_fat_percent: 21 + i * 0.2,
        })
        .select()
        .single();

      assert(!error && data, `Failed to create metric: ${error?.message}`);
      createdMetricIds.push(data.id);
    }
  });

  // ============================================================
  runner.section('Metric Retrieval');
  // ============================================================

  await runner.test('GET /api/clients/[id]/metrics returns metrics', async () => {
    const { status, data } = await apiRequest(`/api/clients/${testClientId}/metrics`, {
      headers: authHeaders,
    });

    assert(status === 200, `Expected 200, got ${status}`);
    assert(Array.isArray(data.metrics), 'Expected metrics array');
    assert(data.metrics.length >= 7, `Should have at least 7 metrics, got ${data.metrics.length}`);
    assert(data.pagination, 'Should have pagination info');
  });

  await runner.test('Metrics ordered by recorded_at descending', async () => {
    const { data } = await apiRequest(`/api/clients/${testClientId}/metrics`, {
      headers: authHeaders,
    });

    const dates = data.metrics.map((m: any) => new Date(m.recorded_at).getTime());
    for (let i = 1; i < dates.length; i++) {
      assert(dates[i - 1] >= dates[i], 'Metrics should be ordered by date descending');
    }
  });

  await runner.test('GET /api/clients/[id]/metrics with limit', async () => {
    const { status, data } = await apiRequest(`/api/clients/${testClientId}/metrics?limit=3`, {
      headers: authHeaders,
    });

    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.metrics.length === 3, `Expected 3 metrics, got ${data.metrics.length}`);
    assert(data.pagination.hasMore === true, 'Should indicate more metrics available');
  });

  await runner.test('GET /api/clients/[id]/metrics with offset', async () => {
    const { status, data } = await apiRequest(
      `/api/clients/${testClientId}/metrics?limit=3&offset=3`,
      { headers: authHeaders }
    );

    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.metrics.length >= 1, 'Should have metrics after offset');
    assert(data.pagination.offset === 3, 'Offset should be 3');
  });

  await runner.test('GET /api/clients/[id]/metrics with date range', async () => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 5);
    const endDate = new Date();

    const { status, data } = await apiRequest(
      `/api/clients/${testClientId}/metrics?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`,
      { headers: authHeaders }
    );

    assert(status === 200, `Expected 200, got ${status}`);

    // All returned metrics should be within date range
    for (const metric of data.metrics) {
      const metricDate = new Date(metric.recorded_at);
      assert(
        metricDate >= startDate && metricDate <= endDate,
        'All metrics should be within date range'
      );
    }
  });

  await runner.test('GET /api/metrics/[id] returns single metric', async () => {
    const { status, data } = await apiRequest(`/api/metrics/${testMetricId}`, {
      headers: authHeaders,
    });

    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.metric?.id === testMetricId, 'Should return correct metric');
  });

  // ============================================================
  runner.section('Metric Updates');
  // ============================================================

  await runner.test('PATCH /api/metrics/[id] updates metric', async () => {
    const { status, data } = await apiRequest(`/api/metrics/${testMetricId}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({
        weight_kg: 79.8,
        notes: 'Updated measurement',
      }),
    });

    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.metric?.weight_kg === 79.8, 'Weight should be updated');
    assert(data.metric?.notes === 'Updated measurement', 'Notes should be updated');
  });

  await runner.test('Metric update persisted', async () => {
    const { data } = await supabase
      .from('ta_body_metrics')
      .select('weight_kg, notes')
      .eq('id', testMetricId)
      .single();

    assert(data?.weight_kg === 79.8, 'Weight should be persisted');
    assert(data?.notes === 'Updated measurement', 'Notes should be persisted');
  });

  // ============================================================
  runner.section('Client Progress');
  // ============================================================

  await runner.test('GET /api/clients/[id]/progress returns summary', async () => {
    const { status, data } = await apiRequest(`/api/clients/${testClientId}/progress`, {
      headers: authHeaders,
    });

    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.progress, 'Should have progress data');
    assert(data.progress.client_id === testClientId, 'Should be for correct client');
  });

  await runner.test('Progress includes latest measurements', async () => {
    const { data } = await apiRequest(`/api/clients/${testClientId}/progress`, {
      headers: authHeaders,
    });

    // Should have latest weight from our test data
    assert(data.progress.latest_weight !== null, 'Should have latest weight');
    assert(data.progress.last_measurement_date !== null, 'Should have last measurement date');
  });

  // Create a goal to test goal counts in progress
  await runner.test('Setup goal for progress test', async () => {
    await supabase.from('ta_client_goals').insert({
      client_id: testClientId,
      trainer_id: trainerId,
      goal_type: 'weight_loss',
      description: 'Test goal',
      status: 'active',
      priority: 1,
      start_date: new Date().toISOString().split('T')[0],
    });
  });

  await runner.test('Progress includes goal counts', async () => {
    const { data } = await apiRequest(`/api/clients/${testClientId}/progress`, {
      headers: authHeaders,
    });

    assert(typeof data.progress.active_goals === 'number', 'Should have active_goals count');
    assert(typeof data.progress.achieved_goals === 'number', 'Should have achieved_goals count');
    assert(data.progress.active_goals >= 1, 'Should have at least 1 active goal');
  });

  // ============================================================
  runner.section('Metric Deletion');
  // ============================================================

  await runner.test('DELETE /api/metrics/[id] removes metric', async () => {
    // Create a metric to delete
    const { data: deleteMetric } = await supabase
      .from('ta_body_metrics')
      .insert({
        client_id: testClientId,
        trainer_id: trainerId,
        recorded_by: trainerId,
        recorded_at: new Date().toISOString(),
        weight_kg: 78,
      })
      .select()
      .single();

    const { status } = await apiRequest(`/api/metrics/${deleteMetric?.id}`, {
      method: 'DELETE',
      headers: authHeaders,
    });

    assert(status === 200, `Expected 200, got ${status}`);

    // Verify deleted
    const { data } = await supabase
      .from('ta_body_metrics')
      .select('id')
      .eq('id', deleteMetric?.id)
      .single();

    assert(!data, 'Metric should be deleted');
  });

  // ============================================================
  runner.section('Error Handling');
  // ============================================================

  await runner.test('GET /api/metrics/[id] returns 404 for non-existent metric', async () => {
    // Use a valid UUID format that doesn't exist
    const { status } = await apiRequest('/api/metrics/00000000-0000-0000-0000-000000000000', {
      headers: authHeaders,
    });

    assert(status === 404, `Expected 404, got ${status}`);
  });

  // ============================================================
  runner.section('Full Measurement Record');
  // ============================================================

  await runner.test('Record complete body measurements', async () => {
    const { status, data } = await apiRequest(`/api/clients/${testClientId}/metrics`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        weight_kg: 78.5,
        body_fat_percent: 20.5,
        muscle_mass_kg: 35.2,
        chest_cm: 98,
        waist_cm: 82,
        hips_cm: 95,
        arm_left_cm: 32,
        arm_right_cm: 32.5,
        thigh_left_cm: 55,
        thigh_right_cm: 55.5,
        resting_heart_rate: 62,
        blood_pressure_systolic: 120,
        blood_pressure_diastolic: 80,
        notes: 'Complete measurement session',
      }),
    });

    assert(status === 201 || status === 200, `Expected 201, got ${status}`);
    createdMetricIds.push(data.metric.id);

    // Verify all fields stored
    const { data: metric } = await supabase
      .from('ta_body_metrics')
      .select('*')
      .eq('id', data.metric.id)
      .single();

    assert(metric?.muscle_mass_kg === 35.2, 'Muscle mass should be stored');
    assert(metric?.hips_cm === 95, 'Hips should be stored');
    assert(metric?.arm_left_cm === 32, 'Left arm should be stored');
    assert(metric?.resting_heart_rate === 62, 'Heart rate should be stored');
    assert(metric?.blood_pressure_systolic === 120, 'BP systolic should be stored');
    assert(metric?.blood_pressure_diastolic === 80, 'BP diastolic should be stored');
  });

  // ============================================================
  runner.section('Cleanup');
  // ============================================================

  await runner.test('Cleanup test data', async () => {
    // Delete goals for test client
    await supabase.from('ta_client_goals').delete().eq('client_id', testClientId);

    // Delete all metrics for test client
    await supabase.from('ta_body_metrics').delete().eq('client_id', testClientId);

    // Delete test client
    await supabase.from('fc_clients').delete().eq('id', testClientId);
  });

  // Summary
  runner.summary();
}

runTests().catch(console.error);
