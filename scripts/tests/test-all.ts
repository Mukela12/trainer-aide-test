/**
 * Master Test Runner
 * Runs all test suites sequentially and generates final report
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

const suites = [
  { name: 'Public Booking Flow', file: 'test-public-booking.ts' },
  { name: 'Trainer Role', file: 'test-trainer-role.ts' },
  { name: 'Client Role', file: 'test-client-role.ts' },
  { name: 'Studio Owner Role', file: 'test-studio-owner.ts' },
  { name: 'Notifications System', file: 'test-notifications.ts' },
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
