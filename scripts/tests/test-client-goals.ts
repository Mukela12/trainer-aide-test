/**
 * Test Suite: Client Goals API
 * Tests goals creation, milestones, status updates, and progress tracking
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
  console.log('\n🎯 CLIENT GOALS API TESTS\n');

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
  let testGoalId: string;
  let testMilestoneId: string;

  // ============================================================
  runner.section('Test Setup');
  // ============================================================

  await runner.test('Create test client for goals', async () => {
    const testEmail = `test-goals-${Date.now()}@example.com`;

    // Use API to create client (handles studio_id correctly)
    const { status, data } = await apiRequest('/api/clients', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        firstName: 'Goals',
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
          first_name: 'Goals',
          last_name: 'TestClient',
          name: 'Goals TestClient',
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
  runner.section('Goal Creation');
  // ============================================================

  await runner.test('POST /api/clients/[id]/goals creates goal', async () => {
    const targetDate = new Date();
    targetDate.setMonth(targetDate.getMonth() + 3);

    const { status, data } = await apiRequest(`/api/clients/${testClientId}/goals`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        goal_type: 'weight_loss',
        description: 'Lose 10kg in 3 months',
        target_value: 10,
        target_unit: 'kg',
        current_value: 0,
        target_date: targetDate.toISOString().split('T')[0],
        priority: 1,
      }),
    });

    assert(status === 201 || status === 200, `Expected 201, got ${status}: ${JSON.stringify(data)}`);
    assert(data.goal?.id, 'Expected goal ID');
    testGoalId = data.goal.id;
  });

  await runner.test('Goal has correct initial status: active', async () => {
    const { data } = await supabase
      .from('ta_client_goals')
      .select('status, goal_type, target_value')
      .eq('id', testGoalId)
      .single();

    assert(data?.status === 'active', `Expected active, got ${data?.status}`);
    assert(data?.goal_type === 'weight_loss', 'Expected weight_loss type');
    assert(data?.target_value === 10, 'Expected target_value 10');
  });

  await runner.test('POST /api/clients/[id]/goals creates second goal', async () => {
    const { status, data } = await apiRequest(`/api/clients/${testClientId}/goals`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        goal_type: 'strength',
        description: 'Increase bench press to 100kg',
        target_value: 100,
        target_unit: 'kg',
        current_value: 60,
        priority: 2,
      }),
    });

    assert(status === 201 || status === 200, `Expected 201, got ${status}`);
    assert(data.goal?.id, 'Expected goal ID');
  });

  // ============================================================
  runner.section('Goal Retrieval');
  // ============================================================

  await runner.test('GET /api/clients/[id]/goals returns goals', async () => {
    const { status, data } = await apiRequest(`/api/clients/${testClientId}/goals`, {
      headers: authHeaders,
    });

    assert(status === 200, `Expected 200, got ${status}`);
    assert(Array.isArray(data.goals), 'Expected goals array');
    assert(data.goals.length >= 2, 'Should have at least 2 goals');
  });

  await runner.test('GET /api/clients/[id]/goals?status=active filters correctly', async () => {
    const { status, data } = await apiRequest(`/api/clients/${testClientId}/goals?status=active`, {
      headers: authHeaders,
    });

    assert(status === 200, `Expected 200, got ${status}`);
    const allActive = data.goals.every((g: any) => g.status === 'active');
    assert(allActive, 'All returned goals should be active');
  });

  await runner.test('GET /api/goals/[id] returns single goal', async () => {
    const { status, data } = await apiRequest(`/api/goals/${testGoalId}`, {
      headers: authHeaders,
    });

    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.goal?.id === testGoalId, 'Should return correct goal');
    assert(Array.isArray(data.goal?.milestones), 'Goal should include milestones array');
  });

  // ============================================================
  runner.section('Goal Updates');
  // ============================================================

  await runner.test('PATCH /api/goals/[id] updates current_value', async () => {
    const { status, data } = await apiRequest(`/api/goals/${testGoalId}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({
        current_value: 3,
      }),
    });

    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.goal?.current_value === 3, 'Current value should be updated');
  });

  await runner.test('PATCH /api/goals/[id] updates status to achieved', async () => {
    const { status, data } = await apiRequest(`/api/goals/${testGoalId}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({
        current_value: 10,
        status: 'achieved',
      }),
    });

    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.goal?.status === 'achieved', 'Status should be achieved');
    assert(data.goal?.current_value === 10, 'Current value should be 10');
  });

  await runner.test('Goal status is persisted', async () => {
    const { data } = await supabase
      .from('ta_client_goals')
      .select('status, current_value')
      .eq('id', testGoalId)
      .single();

    assert(data?.status === 'achieved', 'Status should be achieved');
    assert(data?.current_value === 10, 'Current value should be 10');
  });

  // Reset for milestone tests
  await runner.test('Reset goal status to active for milestone tests', async () => {
    const { error } = await supabase
      .from('ta_client_goals')
      .update({ status: 'active', current_value: 0 })
      .eq('id', testGoalId);

    assert(!error, `Failed to reset goal: ${error?.message}`);
  });

  // ============================================================
  runner.section('Milestone Management');
  // ============================================================

  await runner.test('POST /api/goals/[id]/milestones creates milestone', async () => {
    const milestoneDate = new Date();
    milestoneDate.setMonth(milestoneDate.getMonth() + 1);

    const { status, data } = await apiRequest(`/api/goals/${testGoalId}/milestones`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        title: 'Lose first 3kg',
        target_value: 3,
        target_date: milestoneDate.toISOString().split('T')[0],
        notes: 'First month goal',
      }),
    });

    assert(status === 201 || status === 200, `Expected 201, got ${status}: ${JSON.stringify(data)}`);
    assert(data.milestone?.id, 'Expected milestone ID');
    testMilestoneId = data.milestone.id;
  });

  await runner.test('Milestone has correct initial status: pending', async () => {
    const { data } = await supabase
      .from('ta_goal_milestones')
      .select('status, title, target_value')
      .eq('id', testMilestoneId)
      .single();

    assert(data?.status === 'pending', `Expected pending, got ${data?.status}`);
    assert(data?.title === 'Lose first 3kg', 'Expected correct title');
    assert(data?.target_value === 3, 'Expected target_value 3');
  });

  await runner.test('POST /api/goals/[id]/milestones creates second milestone', async () => {
    const milestoneDate = new Date();
    milestoneDate.setMonth(milestoneDate.getMonth() + 2);

    const { status, data } = await apiRequest(`/api/goals/${testGoalId}/milestones`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        title: 'Lose 6kg total',
        target_value: 6,
        target_date: milestoneDate.toISOString().split('T')[0],
      }),
    });

    assert(status === 201 || status === 200, `Expected 201, got ${status}`);
  });

  await runner.test('GET /api/goals/[id]/milestones returns milestones', async () => {
    const { status, data } = await apiRequest(`/api/goals/${testGoalId}/milestones`, {
      headers: authHeaders,
    });

    assert(status === 200, `Expected 200, got ${status}`);
    assert(Array.isArray(data.milestones), 'Expected milestones array');
    assert(data.milestones.length >= 2, 'Should have at least 2 milestones');
  });

  await runner.test('Goal includes milestones when fetched', async () => {
    const { status, data } = await apiRequest(`/api/goals/${testGoalId}`, {
      headers: authHeaders,
    });

    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.goal?.milestones?.length >= 2, 'Goal should have milestones');
  });

  await runner.test('PATCH /api/goals/[id]/milestones marks milestone achieved', async () => {
    const { status, data } = await apiRequest(`/api/goals/${testGoalId}/milestones`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({
        milestoneId: testMilestoneId,
        status: 'achieved',
        achieved_value: 3.2,
      }),
    });

    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.milestone?.status === 'achieved', 'Milestone should be achieved');
    assert(data.milestone?.achieved_at, 'Should have achieved_at timestamp');
  });

  await runner.test('DELETE /api/goals/[id]/milestones removes milestone', async () => {
    // Create a milestone to delete
    const { data: newMilestone } = await supabase
      .from('ta_goal_milestones')
      .insert({
        goal_id: testGoalId,
        title: 'Milestone to delete',
        status: 'pending',
      })
      .select()
      .single();

    const { status } = await apiRequest(
      `/api/goals/${testGoalId}/milestones?milestoneId=${newMilestone?.id}`,
      {
        method: 'DELETE',
        headers: authHeaders,
      }
    );

    assert(status === 200, `Expected 200, got ${status}`);

    // Verify deleted
    const { data } = await supabase
      .from('ta_goal_milestones')
      .select('id')
      .eq('id', newMilestone?.id)
      .single();

    assert(!data, 'Milestone should be deleted');
  });

  // ============================================================
  runner.section('Goal Deletion');
  // ============================================================

  await runner.test('DELETE /api/goals/[id] removes goal and milestones', async () => {
    // Create a goal to delete
    const { data: deleteGoal } = await supabase
      .from('ta_client_goals')
      .insert({
        client_id: testClientId,
        trainer_id: trainerId,
        goal_type: 'custom',
        description: 'Goal to delete',
        status: 'active',
        priority: 1,
        start_date: new Date().toISOString().split('T')[0],
      })
      .select()
      .single();

    // Add a milestone
    await supabase.from('ta_goal_milestones').insert({
      goal_id: deleteGoal?.id,
      title: 'Milestone on goal to delete',
      status: 'pending',
    });

    const { status } = await apiRequest(`/api/goals/${deleteGoal?.id}`, {
      method: 'DELETE',
      headers: authHeaders,
    });

    assert(status === 200, `Expected 200, got ${status}`);

    // Verify goal deleted
    const { data: goalCheck } = await supabase
      .from('ta_client_goals')
      .select('id')
      .eq('id', deleteGoal?.id)
      .single();

    assert(!goalCheck, 'Goal should be deleted');

    // Verify milestones deleted
    const { data: milestoneCheck } = await supabase
      .from('ta_goal_milestones')
      .select('id')
      .eq('goal_id', deleteGoal?.id);

    assert(!milestoneCheck?.length, 'Milestones should be deleted');
  });

  // ============================================================
  runner.section('Error Handling');
  // ============================================================

  await runner.test('POST /api/clients/[id]/goals requires goal_type', async () => {
    const { status, data } = await apiRequest(`/api/clients/${testClientId}/goals`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        description: 'Goal without type',
      }),
    });

    assert(status === 400, `Expected 400, got ${status}`);
    assert(data.error?.includes('goal_type'), 'Error should mention goal_type');
  });

  await runner.test('POST /api/clients/[id]/goals requires description', async () => {
    const { status, data } = await apiRequest(`/api/clients/${testClientId}/goals`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        goal_type: 'weight_loss',
      }),
    });

    assert(status === 400, `Expected 400, got ${status}`);
    assert(data.error?.includes('description'), 'Error should mention description');
  });

  await runner.test('GET /api/goals/[id] returns 404 for non-existent goal', async () => {
    // Use a valid UUID format that doesn't exist
    const { status } = await apiRequest('/api/goals/00000000-0000-0000-0000-000000000000', {
      headers: authHeaders,
    });

    assert(status === 404, `Expected 404, got ${status}`);
  });

  // ============================================================
  runner.section('Cleanup');
  // ============================================================

  await runner.test('Cleanup test data', async () => {
    // Delete all goals for test client (cascades to milestones)
    await supabase.from('ta_goal_milestones').delete().eq('goal_id', testGoalId);
    await supabase.from('ta_client_goals').delete().eq('client_id', testClientId);

    // Delete test client
    await supabase.from('fc_clients').delete().eq('id', testClientId);
  });

  // Summary
  runner.summary();
}

runTests().catch(console.error);
