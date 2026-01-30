/**
 * Test Configuration
 * Shared config and utilities for all test scripts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

export const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';

// Service role client for database operations (bypasses RLS)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Separate anon client for auth operations (doesn't affect service role client)
const authClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Test accounts - PRESERVED FOR TESTING
// These accounts are used across all test suites. Do not modify without updating tests.
export const TEST_ACCOUNTS = {
  // Studio Owner - Primary account for studio management tests
  studioOwner: {
    email: 'jessekatungu@gmail.com',
    password: 'TestPassword123!',
  },
  // Solo Practitioners - For testing solo practitioner features
  soloPractitioners: [
    { email: 'ketosa1100@gamening.com', password: 'TestPassword123!' },
    { email: 'gepasip761@coswz.com', password: 'TestPassword123!' },
  ],
  // Legacy solo practitioner reference (for backward compatibility)
  soloPractitioner: {
    email: 'ketosa1100@gamening.com',
    password: 'TestPassword123!',
  },
  // Trainers - For testing trainer role features
  trainers: [
    { email: 'cefija1346@okexbit.com', password: 'TestPassword123!' },
    { email: 'wecayib389@1200b.com', password: 'TestPassword123!' },
  ],
  // Legacy trainer reference (for backward compatibility)
  trainer: {
    email: 'cefija1346@okexbit.com',
    password: 'TestPassword123!',
  },
  // Test clients - Used for booking and client management tests
  clients: [
    { email: 'codelibrary21@gmail.com' },
    { email: 'milanmayoba80@gmail.com' },
    { email: 'appbanturide@gmail.com' },
  ],
};

// Test result tracking
export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: string;
}

export class TestRunner {
  private results: TestResult[] = [];
  private currentSection = '';

  section(name: string) {
    this.currentSection = name;
    console.log(`\n${'='.repeat(60)}`);
    console.log(`  ${name}`);
    console.log('='.repeat(60));
  }

  async test(name: string, fn: () => Promise<void>) {
    const fullName = this.currentSection ? `${this.currentSection} > ${name}` : name;
    try {
      await fn();
      this.results.push({ name: fullName, passed: true });
      console.log(`  ✅ ${name}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.results.push({ name: fullName, passed: false, error: errorMsg });
      console.log(`  ❌ ${name}`);
      console.log(`     Error: ${errorMsg}`);
    }
  }

  summary() {
    const passed = this.results.filter((r) => r.passed).length;
    const failed = this.results.filter((r) => !r.passed).length;
    const total = this.results.length;

    console.log(`\n${'='.repeat(60)}`);
    console.log('  TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`  Total:  ${total}`);
    console.log(`  Passed: ${passed} ✅`);
    console.log(`  Failed: ${failed} ❌`);
    console.log('='.repeat(60));

    if (failed > 0) {
      console.log('\nFailed Tests:');
      for (const r of this.results.filter((r) => !r.passed)) {
        console.log(`  - ${r.name}: ${r.error}`);
      }
    }

    return { passed, failed, total };
  }
}

// Helper to make API requests
export async function apiRequest(
  path: string,
  options: RequestInit = {}
): Promise<{ status: number; data: any }> {
  const url = `${BASE_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  let data;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  return { status: response.status, data };
}

// Helper to assert conditions
export function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

// Helper to get auth token for a user
// Uses a separate auth client to avoid affecting the service role client's state
export async function getAuthToken(email: string, password: string): Promise<string | null> {
  const { data, error } = await authClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.session) {
    console.log(`Auth error for ${email}:`, error?.message);
    return null;
  }

  return data.session.access_token;
}

// Helper to get user profile
export async function getUserProfile(userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return data;
}
