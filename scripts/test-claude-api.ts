/**
 * Test Claude API Connection
 * Run with: npx tsx scripts/test-claude-api.ts
 */

import Anthropic from '@anthropic-ai/sdk';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function testBasicCall() {
  console.log('Testing Claude API...\n');

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.error('❌ ANTHROPIC_API_KEY is not set');
    process.exit(1);
  }

  console.log(`API Key: ${apiKey.substring(0, 15)}...${apiKey.substring(apiKey.length - 5)}`);
  console.log(`API Key length: ${apiKey.length} characters\n`);

  // Create client with longer timeout for testing
  const anthropic = new Anthropic({
    apiKey,
    timeout: 120000, // 2 minutes
  });

  console.log('1. Testing simple API call...');
  const startTime = Date.now();

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 100,
      messages: [
        {
          role: 'user',
          content: 'Say "Hello, API working!" and nothing else.',
        },
      ],
    });

    const latency = Date.now() - startTime;
    console.log(`   ✅ Success in ${latency}ms`);
    console.log(`   Response: ${response.content[0].type === 'text' ? response.content[0].text : 'N/A'}`);
    console.log(`   Input tokens: ${response.usage.input_tokens}`);
    console.log(`   Output tokens: ${response.usage.output_tokens}`);
    console.log(`   Model: ${response.model}`);
    console.log(`   Stop reason: ${response.stop_reason}`);
  } catch (error: any) {
    const latency = Date.now() - startTime;
    console.error(`   ❌ Failed after ${latency}ms`);
    console.error(`   Error: ${error.message}`);
    console.error(`   Type: ${error.type || error.name}`);
    console.error(`   Status: ${error.status || 'N/A'}`);

    if (error.message?.includes('timeout')) {
      console.error('\n   💡 TIP: The API is timing out. This could be:');
      console.error('      - Network issues');
      console.error('      - API key rate limiting');
      console.error('      - Anthropic service issues');
    }

    if (error.status === 401) {
      console.error('\n   💡 TIP: Invalid API key. Check your ANTHROPIC_API_KEY.');
    }

    process.exit(1);
  }

  // Test 2: Larger prompt
  console.log('\n2. Testing larger prompt (simulating workout generation)...');
  const startTime2 = Date.now();

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2000,
      temperature: 0.7,
      system: 'You are a fitness expert. Respond with valid JSON only.',
      messages: [
        {
          role: 'user',
          content: `Create a simple 1-week workout plan with 2 sessions. Return JSON with this structure:
{
  "program_name": "string",
  "total_weeks": 1,
  "weekly_structure": [{
    "week_number": 1,
    "workouts": [{
      "day_number": 1,
      "workout_name": "string",
      "exercises": [{ "name": "string", "sets": 3, "reps": "10-12" }]
    }]
  }]
}`,
        },
      ],
    });

    const latency = Date.now() - startTime2;
    console.log(`   ✅ Success in ${latency}ms`);
    console.log(`   Input tokens: ${response.usage.input_tokens}`);
    console.log(`   Output tokens: ${response.usage.output_tokens}`);
    console.log(`   Stop reason: ${response.stop_reason}`);

    // Try to parse JSON
    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    try {
      const json = JSON.parse(text.replace(/```json\n?/g, '').replace(/```\n?/g, ''));
      console.log(`   ✅ JSON parsed successfully`);
      console.log(`   Program name: ${json.program_name}`);
    } catch (parseError) {
      console.log(`   ⚠️ Could not parse JSON (may have markdown wrapper)`);
    }
  } catch (error: any) {
    const latency = Date.now() - startTime2;
    console.error(`   ❌ Failed after ${latency}ms`);
    console.error(`   Error: ${error.message}`);
    process.exit(1);
  }

  console.log('\n✅ All tests passed! Claude API is working correctly.');
}

testBasicCall().catch(console.error);
