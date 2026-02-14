/**
 * Anthropic Claude Client
 *
 * Wrapper for Claude API with structured output and error handling
 */

import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client with 180-second timeout
// Large AI generation prompts (workout programs with 500+ exercises) need more time
// The SDK will retry on failures, so we set a single long timeout instead
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
  timeout: 180000, // 180 seconds (3 minutes) for complex generation tasks
  maxRetries: 1, // Reduce retries since we have a longer timeout
});

// Default model - Claude Sonnet 4.5 (latest and smartest)
export const DEFAULT_MODEL = 'claude-sonnet-4-5-20250929';

// Token costs - in USD per million tokens
const TOKEN_COSTS = {
  'claude-sonnet-4-5-20250929': {
    input: 3.0,  // Claude Sonnet 4.5
    output: 15.0,
  },
  'claude-sonnet-4-20241210': {
    input: 3.0,  // Claude Sonnet 4
    output: 15.0,
  },
  'claude-opus-4-20250514': {
    input: 15.0,  // Claude Opus 4
    output: 75.0,
  },
  'claude-3-5-sonnet-20241022': {
    input: 3.0,  // Claude 3.5 Sonnet
    output: 15.0,
  },
  'claude-3-5-sonnet-20240620': {
    input: 3.0,
    output: 15.0,
  },
  'claude-3-haiku-20240307': {
    input: 0.25,  // Claude 3 Haiku
    output: 1.25,
  },
};

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ClaudeResponse {
  content: string;
  stop_reason: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
  model: string;
}

export interface ClaudeError {
  message: string;
  type: string;
  code?: string;
}

/**
 * Call Claude API with system prompt and messages
 */
export async function callClaude(params: {
  systemPrompt: string;
  userPrompt: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<{ data: ClaudeResponse | null; error: ClaudeError | null }> {
  const {
    systemPrompt,
    userPrompt,
    model = DEFAULT_MODEL,
    maxTokens = 4096,
    temperature = 1.0,
  } = params;

  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    // Extract text content
    const content = response.content
      .filter((block) => block.type === 'text')
      .map((block: any) => block.text)
      .join('\n');

    const result: ClaudeResponse = {
      content,
      stop_reason: response.stop_reason,
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
      },
      model: response.model,
    };

    // Warning: Check if response was truncated due to max_tokens
    if (response.stop_reason === 'max_tokens') {
      console.warn('⚠️  WARNING: Response truncated due to max_tokens limit!');
      console.warn(`   Requested: ${maxTokens}, Used: ${result.usage.output_tokens}`);
      console.warn('   This may result in incomplete JSON. Consider increasing maxTokens.');
    }

    return { data: result, error: null };
  } catch (err: any) {
    console.error('❌ Claude API error:', err.message);

    const error: ClaudeError = {
      message: err.message || 'Unknown error',
      type: err.type || 'unknown',
      code: err.code,
    };

    return { data: null, error };
  }
}

/**
 * Call Claude with JSON response format
 * Automatically parses JSON from response
 */
export async function callClaudeJSON<T = any>(params: {
  systemPrompt: string;
  userPrompt: string;
  jsonSchema?: string;  // Optional: describe expected JSON structure
  model?: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<{ data: T | null; error: ClaudeError | null; raw?: ClaudeResponse }> {
  const { jsonSchema, ...claudeParams } = params;

  // Enhance system prompt to request JSON
  const enhancedSystemPrompt = `${claudeParams.systemPrompt}

IMPORTANT: You MUST respond with ONLY valid JSON. Do not include any text before or after the JSON object.
${jsonSchema ? `\nExpected JSON structure:\n${jsonSchema}` : ''}`;

  const { data, error } = await callClaude({
    ...claudeParams,
    systemPrompt: enhancedSystemPrompt,
  });

  if (error || !data) {
    return { data: null, error };
  }

  // Parse JSON from response
  try {
    // Remove markdown code blocks if present
    let jsonText = data.content.trim();

    // Remove ```json ... ``` wrapper if present
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    // If text doesn't start with { or [, try to extract JSON from it
    if (!jsonText.startsWith('{') && !jsonText.startsWith('[')) {
      // Try to find JSON object in the text
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }
    }

    const parsed = JSON.parse(jsonText) as T;

    return { data: parsed, error: null, raw: data };
  } catch (parseError: any) {
    console.error('❌ Failed to parse JSON response:', parseError.message);
    console.error('Stop reason:', data.stop_reason);
    console.error('Tokens used:', data.usage.output_tokens);

    const contentLength = data.content.length;
    console.error(`Response length: ${contentLength} characters`);
    console.error('First 1000 chars:', data.content.substring(0, 1000));
    console.error('Last 1000 chars:', data.content.substring(Math.max(0, contentLength - 1000)));

    // If truncated, provide specific guidance
    if (data.stop_reason === 'max_tokens') {
      console.error('');
      console.error('🔍 DIAGNOSIS: Response was truncated due to max_tokens limit');
      console.error('   This is why JSON parsing failed - the response is incomplete');
      console.error('   SOLUTION: Increase the maxTokens parameter in the API call');
    }

    return {
      data: null,
      error: {
        message: `Failed to parse JSON: ${parseError.message}`,
        type: 'json_parse_error',
      },
      raw: data,
    };
  }
}

/**
 * Call Claude with streaming response
 * Returns an async iterator for streaming tokens
 * Note: Respects the 50-second timeout configured on the Anthropic client
 */
export async function* callClaudeStream(params: {
  systemPrompt: string;
  userPrompt: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number; // Optional override for timeout
}): AsyncGenerator<string, void, unknown> {
  const {
    systemPrompt,
    userPrompt,
    model = DEFAULT_MODEL,
    maxTokens = 4096,
    temperature = 1.0,
    timeoutMs = 50000, // Default 50 seconds
  } = params;

  try {
    // Create AbortController for explicit timeout control
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const stream = await anthropic.messages.create({
        model,
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        stream: true,
      });

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          yield event.delta.text;
        }
      }
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.error(`❌ Claude streaming timeout after ${timeoutMs}ms`);
      throw new Error(`Claude API timeout after ${timeoutMs / 1000} seconds`);
    }
    console.error('❌ Claude streaming error:', err.message);
    throw err;
  }
}

/**
 * Estimate cost of Claude API call
 */
export function estimateCost(response: ClaudeResponse): number {
  const costs = TOKEN_COSTS[response.model as keyof typeof TOKEN_COSTS] || TOKEN_COSTS[DEFAULT_MODEL];

  const inputCost = (response.usage.input_tokens / 1_000_000) * costs.input;
  const outputCost = (response.usage.output_tokens / 1_000_000) * costs.output;

  return inputCost + outputCost;
}

/**
 * Count approximate tokens in text (rough estimate)
 * Claude uses ~4 characters per token on average
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Validate API key is configured
 */
export function validateAPIKey(): { valid: boolean; error?: string } {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey || apiKey === '') {
    return {
      valid: false,
      error: 'ANTHROPIC_API_KEY environment variable is not set',
    };
  }

  if (!apiKey.startsWith('sk-ant-api')) {
    return {
      valid: false,
      error: 'Invalid API key format. Should start with "sk-ant-api"',
    };
  }

  return { valid: true };
}

/**
 * Test connection to Claude API
 */
export async function testConnection(): Promise<{ success: boolean; error?: string }> {
  const validation = validateAPIKey();
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  try {
    const { data, error } = await callClaude({
      systemPrompt: 'You are a helpful assistant.',
      userPrompt: 'Say "API connection successful" and nothing else.',
      maxTokens: 50,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: false, error: 'No response from API' };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
