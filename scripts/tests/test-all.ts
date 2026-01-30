/**
 * Master Test Runner
 * Runs all test suites sequentially and generates final report
 *
 * TEST ORDER RATIONALE:
 * =====================
 * The tests are ordered to follow a logical business flow while ensuring
 * each test suite is independent (cleans up its own data).
 *
 * 1. TRAINER ROLE - Foundation layer
 *    - Creates services, availability slots, clients, bookings
 *    - Tests core trainer features (CRUD operations)
 *    - This runs first to verify basic platform functionality
 *
 * 2. STUDIO OWNER ROLE - Management layer
 *    - Tests studio management, team management, invitations
 *    - Creates studio infrastructure
 *
 * 3. TEMPLATE ASSIGNMENTS - Feature layer
 *    - Tests template creation and assignment to trainers/clients
 *    - Depends on having trainers and clients in the system
 *
 * 4. BOOKING REQUESTS - Request/response flow
 *    - Tests booking request creation, acceptance, decline
 *    - Tests email notifications for booking requests
 *
 * 5. CREDIT CONSUMPTION - Billing flow
 *    - Tests credit deduction when completing bookings
 *    - Depends on having packages and booking completion working
 *
 * 6. CLIENT GOALS - Progress tracking
 *    - Tests goal creation, milestones, status updates
 *    - Client-facing feature for tracking fitness objectives
 *
 * 7. BODY METRICS - Measurement tracking
 *    - Tests metric recording, retrieval, progress summaries
 *    - Client-facing feature for tracking body measurements
 *
 * 8. PUBLIC BOOKING FLOW - User journey
 *    - Tests the public-facing booking process
 *    - Uses services and availability (created fresh or existing)
 *
 * 9. CLIENT ROLE - Client perspective
 *    - Tests client-facing features
 *    - Views bookings, profiles, credits
 *
 * 10. NOTIFICATIONS SYSTEM - Background processes
 *    - Tests notification triggers and processing
 *    - Runs last as it depends on bookings and other events
 */

import { execSync } from 'child_process';
import * as path from 'path';

interface SuiteResult {
  name: string;
  passed: number;
  failed: number;
  total: number;
  error?: string;
}

// Test suites in recommended execution order
const suites = [
  // 1. Core trainer functionality - foundation for everything
  { name: 'Trainer Role', file: 'test-trainer-role.ts', category: 'core' },

  // 2. Studio owner management features
  { name: 'Studio Owner Role', file: 'test-studio-owner.ts', category: 'management' },

  // 3. Template assignment system
  { name: 'Template Assignments', file: 'test-template-assignments.ts', category: 'features' },

  // 4. Booking requests - request/response flow with email notifications
  { name: 'Booking Requests', file: 'test-booking-requests.ts', category: 'features' },

  // 5. Credit consumption - billing flow
  { name: 'Credit Consumption', file: 'test-credit-consumption.ts', category: 'billing' },

  // 6. Client goals - progress tracking
  { name: 'Client Goals', file: 'test-client-goals.ts', category: 'progress' },

  // 7. Body metrics - measurement tracking
  { name: 'Body Metrics', file: 'test-body-metrics.ts', category: 'progress' },

  // 8. Public-facing booking flow
  { name: 'Public Booking Flow', file: 'test-public-booking.ts', category: 'user-journey' },

  // 9. Client-facing features
  { name: 'Client Role', file: 'test-client-role.ts', category: 'user-journey' },

  // 10. Background notification system
  { name: 'Notifications System', file: 'test-notifications.ts', category: 'background' },
];

// Run cleanup before each suite to avoid stale data conflicts
async function cleanupTestData() {
  try {
    const cleanupPath = path.join(__dirname, 'cleanup-test-data.ts');
    execSync(`npx tsx ${cleanupPath}`, {
      encoding: 'utf-8',
      timeout: 30000,
      stdio: 'pipe',
    });
  } catch (error) {
    // Ignore cleanup errors
  }
}

async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║           TRAINER-AIDE COMPREHENSIVE TEST SUITE            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\nStarted: ${new Date().toISOString()}\n`);

  const results: SuiteResult[] = [];

  for (const suite of suites) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`Running: ${suite.name}`);
    console.log('─'.repeat(60));

    // Clean up test data before each suite
    await cleanupTestData();

    try {
      const scriptPath = path.join(__dirname, suite.file);
      const output = execSync(`npx tsx ${scriptPath}`, {
        encoding: 'utf-8',
        timeout: 180000, // 3 minute timeout per suite
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      console.log(output);

      // Parse results from output
      const passedMatch = output.match(/Passed:\s+(\d+)/);
      const failedMatch = output.match(/Failed:\s+(\d+)/);
      const totalMatch = output.match(/Total:\s+(\d+)/);

      results.push({
        name: suite.name,
        passed: passedMatch ? parseInt(passedMatch[1]) : 0,
        failed: failedMatch ? parseInt(failedMatch[1]) : 0,
        total: totalMatch ? parseInt(totalMatch[1]) : 0,
      });
    } catch (err) {
      const error = err as { stdout?: string; stderr?: string; message?: string };
      console.log(error.stdout || '');
      console.error(error.stderr || error.message || 'Unknown error');

      results.push({
        name: suite.name,
        passed: 0,
        failed: 1,
        total: 1,
        error: error.message || 'Suite execution failed',
      });
    }
  }

  // Final Summary
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                     FINAL TEST REPORT                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\nCompleted: ${new Date().toISOString()}\n`);

  const totalPassed = results.reduce((sum, r) => sum + r.passed, 0);
  const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);
  const totalTests = results.reduce((sum, r) => sum + r.total, 0);

  console.log('┌────────────────────────────────┬────────┬────────┬────────┐');
  console.log('│ Test Suite                     │ Passed │ Failed │ Total  │');
  console.log('├────────────────────────────────┼────────┼────────┼────────┤');

  for (const result of results) {
    const name = result.name.padEnd(30);
    const passed = String(result.passed).padStart(6);
    const failed = String(result.failed).padStart(6);
    const total = String(result.total).padStart(6);
    const status = result.failed > 0 ? '❌' : '✅';
    console.log(`│ ${name} │ ${passed} │ ${failed} │ ${total} │ ${status}`);
  }

  console.log('├────────────────────────────────┼────────┼────────┼────────┤');
  const totalName = 'TOTAL'.padEnd(30);
  const totalPassedStr = String(totalPassed).padStart(6);
  const totalFailedStr = String(totalFailed).padStart(6);
  const totalTestsStr = String(totalTests).padStart(6);
  console.log(`│ ${totalName} │ ${totalPassedStr} │ ${totalFailedStr} │ ${totalTestsStr} │`);
  console.log('└────────────────────────────────┴────────┴────────┴────────┘');

  // Overall status
  console.log('\n');
  if (totalFailed === 0) {
    console.log('✅ ALL TESTS PASSED');
  } else {
    console.log(`❌ ${totalFailed} TEST(S) FAILED`);

    // Show failed suites
    console.log('\nFailed Suites:');
    for (const result of results.filter((r) => r.failed > 0)) {
      console.log(`  - ${result.name}: ${result.failed} failures`);
      if (result.error) {
        console.log(`    Error: ${result.error}`);
      }
    }
  }

  console.log('\n');

  // Return exit code
  process.exit(totalFailed > 0 ? 1 : 0);
}

runAllTests();
