/**
 * AI Program Generation Worker
 *
 * POST /api/ai/generate-program/worker
 *
 * Background worker that performs the actual AI program generation.
 * This endpoint is called internally and can run beyond the 10s timeout.
 */

import { NextRequest, NextResponse } from 'next/server';
import { callClaudeJSON } from '@/lib/ai/anthropic-client';
import { generateWorkoutPrompt } from '@/lib/ai/prompts/workout-generator-prompt';
import { filterExercisesForClient } from '@/lib/ai/utils/exercise-filter';
import {
  createAIWorkouts,
  createAIWorkoutExercises,
  createAINutritionPlan,
  logAIGeneration,
  createProgramRevision,
  getProgramRevisions,
  getCompleteProgramData,
  updateAIProgram,
} from '@/lib/services/ai-program-service';
import { getClientProfileById } from '@/lib/services/client-profile-service';
import { extractWorkoutConstraints, GoalType, ExperienceLevel } from '@/lib/types/client-profile';
import type { GenerateProgramRequest, SessionType } from '@/lib/types/ai-program';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * Worker Request (includes program_id and generation params)
 */
interface WorkerRequest {
  program_id: string;
  client_profile_id?: string;
  trainer_id: string;
  total_weeks: number;
  sessions_per_week: number;
  session_duration_minutes: number;
  include_nutrition?: boolean;
  primary_goal?: string;
  experience_level?: string;
  available_equipment?: string[];
  injuries?: Array<{ body_part: string; restrictions: string[] }>;
  exercise_aversions?: string[];
}

/**
 * AI Response Structure
 */
interface AIGeneratedProgram {
  program_name: string;
  description: string;
  total_weeks: number;
  sessions_per_week: number;
  ai_rationale: string;
  movement_balance_summary: Record<string, number>;
  weekly_structure: Array<{
    week_number: number;
    workouts: Array<{
      day_number: number;
      workout_name: string;
      workout_focus: string;
      session_type: string;
      movement_patterns_covered: string[];
      planes_of_motion_covered: string[];
      ai_rationale: string;
      exercises: Array<{
        exercise_id: string;
        exercise_order: number;
        block_label?: string;
        sets: number;
        reps_target: string;
        target_rpe: number;
        tempo: string;
        rest_seconds: number;
        coaching_cues: string[];
        modifications?: string[];
      }>;
    }>;
  }>;
  error?: string;
  suggestions?: string[];
}

// Configure maximum duration for this API route
// Vercel Pro: max 60s, Vercel Enterprise: max 300s
// Railway/other platforms: Configure via platform settings
export const maxDuration = 300; // 5 minutes
export const dynamic = 'force-dynamic'; // Disable static optimization

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let body!: WorkerRequest;  // Non-null assertion - will be assigned in try block

  let timeoutId: NodeJS.Timeout | null = null;

  try {
    body = await request.json();

    // Platform detection: Check if on Netlify (hard 60s limit) or Vercel (configurable)
    const isNetlify = process.env.NETLIFY === 'true' || process.env.CONTEXT !== undefined;

    // Worker timeout: Set to maximum safe value for each platform
    // Netlify Business: 60s hard limit - use 58s for safety buffer
    // Vercel Pro: 300s with maxDuration export
    const WORKER_TIMEOUT_MS = isNetlify ? 58000 : 300000;

    console.log(`🤖 Starting background generation for program ${body.program_id}...`);
    console.log(`   Program: ${body.total_weeks} weeks × ${body.sessions_per_week} sessions/week`);
    console.log(`⏱️  Timeout: ${Math.round(WORKER_TIMEOUT_MS / 1000)}s (platform: ${isNetlify ? 'Netlify' : 'Vercel'})`);

    // Warn if program duration may exceed platform capabilities
    if (isNetlify && body.total_weeks > 4) {
      console.warn(`⚠️  Warning: ${body.total_weeks}-week program may timeout on Netlify (60s limit). Recommended: ≤4 weeks on Netlify, or deploy to Vercel for longer programs.`);
    }

    // Create timeout promise that will reject if generation takes too long
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(async () => {
        console.error(`❌ Worker timeout after ${Math.round(WORKER_TIMEOUT_MS / 1000)}s`);

        // Update program status to failed before timeout kills the worker
        try {
          const timeoutMessage = isNetlify
            ? `This ${body.total_weeks}-week program exceeded Netlify's 60s timeout limit. Try a shorter program (1-3 weeks) or contact support about deploying to Vercel for longer programs.`
            : `The AI coach took a bit too long on this one. Try creating a shorter program or breaking it into smaller chunks.`;

          await updateAIProgram(body.program_id, {
            generation_status: 'failed',
            generation_error: timeoutMessage,
            progress_message: 'Taking longer than expected… please try again',
          });
        } catch (updateError) {
          console.error('Failed to update program status on timeout:', updateError);
        }

        reject(new Error(`Worker timeout after ${Math.round(WORKER_TIMEOUT_MS / 1000)} seconds`));
      }, WORKER_TIMEOUT_MS);
    });

    // Wrap the main generation logic to run with timeout
    const generationPromise = (async () => {
      // Build generation request
      let generationRequest: GenerateProgramRequest;

    if (body.client_profile_id) {
      const clientProfile = await getClientProfileById(body.client_profile_id);
      if (!clientProfile) {
        await updateAIProgram(body.program_id, {
          generation_status: 'failed',
          generation_error: 'Client profile not found',
        });
        return NextResponse.json({ error: 'Client profile not found' }, { status: 404 });
      }

      const constraints = extractWorkoutConstraints(clientProfile);

      // Fetch client goals from ta_client_goals table
      // These provide specific targets like "lose 10kg by March" that inform the program
      let clientGoals: GenerateProgramRequest['client_goals'] = [];
      try {
        const serviceClient = createServiceRoleClient();
        const { data: goalsData } = await serviceClient
          .from('ta_client_goals')
          .select('goal_type, description, target_value, target_unit, current_value, target_date, priority')
          .eq('client_id', body.client_profile_id)
          .eq('status', 'active')
          .order('priority', { ascending: true });

        if (goalsData && goalsData.length > 0) {
          clientGoals = goalsData.map((g: {
            goal_type: string;
            description: string;
            target_value: number | null;
            target_unit: string | null;
            current_value: number | null;
            target_date: string | null;
            priority: number;
          }) => ({
            goal_type: g.goal_type,
            description: g.description,
            target_value: g.target_value,
            target_unit: g.target_unit,
            current_value: g.current_value,
            target_date: g.target_date,
            priority: g.priority,
          }));
          console.log(`📋 Found ${clientGoals?.length || 0} active client goals to incorporate`);
        }
      } catch (goalsError) {
        console.warn('Could not fetch client goals (non-critical):', goalsError);
        // Continue without goals - they're optional enhancement
      }

      generationRequest = {
        client_profile_id: body.client_profile_id,
        trainer_id: body.trainer_id,
        total_weeks: body.total_weeks,
        sessions_per_week: body.sessions_per_week,
        session_duration_minutes: body.session_duration_minutes,
        primary_goal: constraints.primaryGoal,
        secondary_goals: constraints.secondaryGoals,
        experience_level: constraints.experienceLevel,
        available_equipment: constraints.availableEquipment,
        training_location: constraints.trainingLocation,
        injuries: constraints.injuries,
        physical_limitations: constraints.physicalLimitations,
        exercise_aversions: constraints.exerciseAversions,
        preferred_exercise_types: constraints.preferredExerciseTypes,
        preferred_movement_patterns: constraints.preferredMovementPatterns,
        client_goals: clientGoals && clientGoals.length > 0 ? clientGoals : undefined,
      };
    } else {
      generationRequest = {
        trainer_id: body.trainer_id,
        total_weeks: body.total_weeks,
        sessions_per_week: body.sessions_per_week,
        session_duration_minutes: body.session_duration_minutes,
        primary_goal: body.primary_goal as GoalType,
        experience_level: body.experience_level as ExperienceLevel,
        available_equipment: body.available_equipment || [],
        injuries: body.injuries,
        exercise_aversions: body.exercise_aversions,
        training_location: 'home',
      };
    }

    // Step 1: Filter exercises
    console.log('📋 Filtering exercises...');

    // Calculate total steps for progress tracking
    const totalStepsEstimate = 2 + (body.total_weeks * 2) + 3; // Filter + Prompts + (Before+After each week) + Validate + Save + Complete

    await updateAIProgram(body.program_id, {
      progress_message: `Submitting goals to the AI coach…`,
      current_step: 1,
      total_steps: totalStepsEstimate,
      progress_percentage: 5,
    });

    const { exercises: filteredExercises, stats } = await filterExercisesForClient(generationRequest);

    if (filteredExercises.length < body.sessions_per_week * 4) {
      await updateAIProgram(body.program_id, {
        generation_status: 'failed',
        generation_error: `Insufficient exercises: only ${filteredExercises.length} available (need at least ${body.sessions_per_week * 4})`,
      });
      return NextResponse.json({ error: 'Insufficient exercises' }, { status: 400 });
    }

    console.log(`✅ ${filteredExercises.length} exercises available`);

    await updateAIProgram(body.program_id, {
      progress_message: `Warm-up builder is stretching itself…`,
      current_step: 2,
      progress_percentage: 10,
    });

    // Step 2: Generate prompts
    console.log('📝 Generating prompts...');
    const { system: systemPrompt, user: userPrompt } = generateWorkoutPrompt(
      generationRequest,
      filteredExercises
    );

    // Step 3: Generate program in chunks to avoid token limits
    console.log('🧠 Generating program in chunks to avoid token limits...');

    const totalWeeks = body.total_weeks;

    // Dynamic chunk sizing based on program length for optimal performance:
    // - Small programs (1-3 weeks): Single chunk is faster despite longer processing time
    // - Medium programs (4-8 weeks): 2-week chunks balance speed and quality
    // - Large programs (9+ weeks): 2-week chunks to stay within token/timeout limits
    const CHUNK_SIZE = totalWeeks <= 3 ? totalWeeks : 2;
    const chunks = Math.ceil(totalWeeks / CHUNK_SIZE);

    console.log(`📊 Will generate ${chunks} chunks (${CHUNK_SIZE} week${CHUNK_SIZE > 1 ? 's' : ''} per chunk)`);

    // Wondrous Build Sequence - Creative progress messages for week generation
    const weekBuildMessages = [
      "AI coach is lacing up their metaphorical sneakers…",      // Pre-week prep
      "Spotting your goals from a mile away…",                    // Pre-week prep
      "Loading dumbbells of data…",                               // Pre-week prep
      "Checking form… AI style.",                                 // Pre-week prep
      "Week 1 workout blueprint loading…",                        // Week 1
      "Sculpting your first week like a masterpiece…",           // Week 1 complete
      "Week 2 tricep dips into the schedule…",                   // Week 2
      "Week 3 is flexing its muscles…",                          // Week 3
      "Resistance bands of logic wrapping around Week 4…",       // Week 4
      "Week 5 has entered the chat… with kettlebells.",          // Week 5
      "Week 6 lunges into position…",                            // Week 6
      "We're halfway there! Week 7 is finding its balance…",     // Week 7
      "Week 8 burpees past the competition…",                    // Week 8
      "Final reps loading… almost there!",                       // Final weeks
    ];

    // Helper function to get creative message for chunk generation
    const getChunkMessage = (chunkIndex: number, isComplete: boolean, startWeek: number, endWeek: number) => {
      if (isComplete) {
        // Completion messages - alternate between creative completions
        const completeMessages = [
          "Sculpting your first week like a masterpiece…",
          "Hydrating… metaphorically.",
          "Progress tracking engaged!",
          "Getting stronger already…",
          "Muscles are taking notes…",
        ];
        return completeMessages[chunkIndex % completeMessages.length];
      } else {
        // Start messages - use week-specific messages or cycle through them
        const messageIndex = Math.min(chunkIndex, weekBuildMessages.length - 1);
        return weekBuildMessages[messageIndex];
      }
    };

    let combinedProgram: AIGeneratedProgram | null = null;
    let totalTokensUsed = 0;

    for (let chunkIndex = 0; chunkIndex < chunks; chunkIndex++) {
      const startWeek = chunkIndex * CHUNK_SIZE + 1;
      const endWeek = Math.min((chunkIndex + 1) * CHUNK_SIZE, totalWeeks);
      const weeksInChunk = endWeek - startWeek + 1;

      console.log(`\n🔄 Generating chunk ${chunkIndex + 1}/${chunks}: Weeks ${startWeek}-${endWeek}...`);

      // Update progress: Starting chunk generation
      const currentStep = 2 + (chunkIndex * 2) + 1;
      const progressPercentage = Math.round(10 + ((chunkIndex / chunks) * 75)); // 10% to 85%

      await updateAIProgram(body.program_id, {
        progress_message: getChunkMessage(chunkIndex, false, startWeek, endWeek),
        current_step: currentStep,
        total_steps: totalStepsEstimate,
        progress_percentage: progressPercentage,
      });

      // Modify the user prompt to request specific weeks with progressive context
      // Use single value for single-week chunks to avoid AI generating duplicates
      const weeksSpec = startWeek === endWeek
        ? `${startWeek}` // Single week: "generate_weeks": 1
        : `[${startWeek}, ${endWeek}]`; // Range: "generate_weeks": [1, 3]

      let chunkUserPrompt = userPrompt.replace(
        `"total_weeks": ${totalWeeks}`,
        `"total_weeks": ${totalWeeks}, "generate_weeks": ${weeksSpec}`
      );

      // For chunks after the first, provide context from previous weeks to ensure progression
      if (chunkIndex > 0 && combinedProgram?.weekly_structure) {
        // Get the last 1-2 weeks as context (to show progression pattern)
        const contextWeeks = combinedProgram.weekly_structure.slice(-Math.min(2, combinedProgram.weekly_structure.length));
        const contextSummary = contextWeeks.map(week => ({
          week_number: week.week_number,
          workouts: week.workouts.map(w => ({
            workout_name: w.workout_name,
            workout_focus: w.workout_focus,
            exercise_count: w.exercises?.length || 0,
            sample_exercises: w.exercises?.slice(0, 3).map(ex => ex.exercise_id) || []
          }))
        }));

        chunkUserPrompt += `\n\nPREVIOUS WEEKS CONTEXT:
${JSON.stringify(contextSummary, null, 2)}

IMPORTANT: Generate weeks ${startWeek} through ${endWeek} as the NEXT progression phase after the weeks above.
- Progress from previous weeks (increase intensity, volume, or complexity)
- Vary exercises to avoid repetition - do NOT use the exact same exercises in the same order
- Maintain movement pattern balance but introduce variety
- Ensure clear progression from previous phase`;
      } else {
        chunkUserPrompt += `\n\nIMPORTANT: Generate weeks ${startWeek} through ${endWeek} of the ${totalWeeks}-week program as the FOUNDATION phase. Include ${body.sessions_per_week} sessions per week.`;
      }

      // Estimate tokens for this chunk
      const estimatedTokens = 5000 + (weeksInChunk * body.sessions_per_week * 6 * 180);

      // Platform-specific token limits to ensure completion within timeout
      // Netlify (60s): Lower token limit = faster generation
      // Vercel (300s): Higher token limit = more detailed programs
      const platformMaxTokens = isNetlify ? 6000 : 8192;
      const maxTokens = Math.min(platformMaxTokens, Math.max(4000, estimatedTokens));

      console.log(`   Token allocation: ${maxTokens} (estimated: ${estimatedTokens}, platform: ${isNetlify ? 'Netlify' : 'Vercel'})`);

      // Update progress before API call to give user feedback during long wait
      const apiProgressPercentage = Math.round(12 + ((chunkIndex / chunks) * 70)); // 12% to 82%
      const estimatedApiTime = isNetlify ? 45 : 90; // Netlify: shorter estimate, Vercel: longer OK
      await updateAIProgram(body.program_id, {
        progress_message: `Consulting the AI coach… this may take up to ${estimatedApiTime} seconds`,
        progress_percentage: apiProgressPercentage,
      });

      // Log API call start with timestamp for timeout debugging
      const apiCallStart = Date.now();
      const elapsedTotal = Math.round((apiCallStart - startTime) / 1000);
      const remainingTimeout = Math.max(0, Math.round(WORKER_TIMEOUT_MS / 1000) - elapsedTotal);
      console.log(`   ⏳ Starting Anthropic API call... (elapsed: ${elapsedTotal}s, timeout in: ${remainingTimeout}s)`);

      const { data: chunkProgram, error: chunkError, raw: chunkRaw } = await callClaudeJSON<AIGeneratedProgram>({
        systemPrompt,
        userPrompt: chunkUserPrompt,
        model: 'claude-sonnet-4-5-20250929',
        maxTokens,
        temperature: 0.7,
      });

      // Log API call completion with timing and token details
      const apiCallDuration = Math.round((Date.now() - apiCallStart) / 1000);
      if (chunkRaw) {
        console.log(`   ✅ Anthropic API completed (${apiCallDuration}s)`);
        console.log(`      Input tokens: ${chunkRaw.usage.input_tokens}`);
        console.log(`      Output tokens: ${chunkRaw.usage.output_tokens}`);
        console.log(`      Stop reason: ${chunkRaw.stop_reason}`);
      } else if (chunkError) {
        console.error(`   ❌ Anthropic API failed (${apiCallDuration}s): ${chunkError.message}`);
      }

      if (chunkError || !chunkProgram) {
        const errorMsg = chunkError?.message || 'Failed to generate chunk';
        await updateAIProgram(body.program_id, {
          generation_status: 'failed',
          generation_error: `Chunk ${chunkIndex + 1} failed: ${errorMsg}`,
        });
        return NextResponse.json({ error: errorMsg }, { status: 500 });
      }

      totalTokensUsed += (chunkRaw?.usage.output_tokens || 0);
      console.log(`   ✅ Chunk generated: ${chunkRaw?.usage.output_tokens || 0} tokens`);

      // Log what weeks this chunk returned
      const chunkWeeks = chunkProgram.weekly_structure?.map(w => w.week_number) || [];
      console.log(`   📋 Chunk returned ${chunkWeeks.length} weeks: [${chunkWeeks.join(', ')}]`);

      // Combine chunks
      if (!combinedProgram) {
        // First chunk - use as base
        combinedProgram = chunkProgram;
      } else {
        // Append workouts from this chunk to the combined program
        if (chunkProgram.weekly_structure) {
          combinedProgram.weekly_structure.push(...chunkProgram.weekly_structure);
        }
      }

      // Update progress: Chunk completed
      const completedStep = 2 + (chunkIndex * 2) + 2;
      const completedPercentage = Math.round(10 + (((chunkIndex + 1) / chunks) * 75)); // 10% to 85%

      await updateAIProgram(body.program_id, {
        progress_message: getChunkMessage(chunkIndex, true, startWeek, endWeek),
        current_step: completedStep,
        total_steps: totalStepsEstimate,
        progress_percentage: completedPercentage,
      });
    }

    if (!combinedProgram) {
      await updateAIProgram(body.program_id, {
        generation_status: 'failed',
        generation_error: 'No program data generated',
      });
      return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
    }

    console.log(`\n✅ All chunks combined: ${totalTokensUsed} total tokens`);

    const aiProgram = combinedProgram;
    const raw = { usage: { input_tokens: 0, output_tokens: totalTokensUsed }, model: 'claude-sonnet-4-5-20250929' };

    if (!aiProgram || aiProgram.error) {
      const errorMsg = aiProgram?.error || 'Unknown AI error';
      await updateAIProgram(body.program_id, {
        generation_status: 'failed',
        generation_error: errorMsg,
      });
      return NextResponse.json({ error: errorMsg }, { status: 500 });
    }

    console.log('✅ AI generation successful (chunked)');

    // Update progress: Validating
    await updateAIProgram(body.program_id, {
      progress_message: 'AI coach doing a post-workout stretch…',
      current_step: totalStepsEstimate - 2,
      progress_percentage: 87,
    });

    // Step 4: Validate and fix output (removes invalid exercise IDs)
    const validation = validateAndFixAIProgram(aiProgram, filteredExercises);

    if (!validation.valid) {
      await updateAIProgram(body.program_id, {
        generation_status: 'failed',
        generation_error: `Validation failed: ${validation.errors.join(', ')}`,
      });
      return NextResponse.json({ error: 'Validation failed' }, { status: 500 });
    }

    // Use the fixed program (with invalid exercises removed)
    const fixedProgram = validation.fixedProgram;

    if (validation.warnings.length > 0) {
      console.log(`⚠️  Validation passed with ${validation.warnings.length} warnings (invalid exercises removed)`);
    } else {
      console.log('✅ Validation passed');
    }

    // Step 5: Update program with AI data
    console.log('💾 Updating program...');
    await updateAIProgram(body.program_id, {
      description: fixedProgram.description,
      ai_rationale: fixedProgram.ai_rationale,
      movement_balance_summary: fixedProgram.movement_balance_summary,
      ai_model: raw?.model || 'claude-sonnet-4-5-20250929',
    });

    // Step 5.5: Deduplicate weeks (defensive against AI returning duplicates)
    const originalWeekCount = fixedProgram.weekly_structure.length;
    const uniqueWeeksMap = new Map();

    for (const week of fixedProgram.weekly_structure) {
      if (!uniqueWeeksMap.has(week.week_number)) {
        uniqueWeeksMap.set(week.week_number, week);
      }
    }

    fixedProgram.weekly_structure = Array.from(uniqueWeeksMap.values()).sort((a, b) => a.week_number - b.week_number);

    if (originalWeekCount !== fixedProgram.weekly_structure.length) {
      console.warn(`⚠️  Removed ${originalWeekCount - fixedProgram.weekly_structure.length} duplicate weeks`);
    }

    console.log(`📊 Final structure: ${fixedProgram.weekly_structure.length} unique weeks (${fixedProgram.weekly_structure.map(w => w.week_number).join(', ')})`);

    // Helper: Map AI-generated session types to valid database values
    const validSessionTypes: SessionType[] = ['strength', 'hypertrophy', 'conditioning', 'mobility', 'recovery', 'mixed'];
    const mapSessionType = (aiSessionType: string): SessionType => {
      const normalized = aiSessionType?.toLowerCase().trim() || '';

      // Direct match
      if (validSessionTypes.includes(normalized as SessionType)) {
        return normalized as SessionType;
      }

      // Map common variations
      const sessionTypeMap: Record<string, SessionType> = {
        'general_fitness': 'mixed',
        'general fitness': 'mixed',
        'full_body': 'mixed',
        'full body': 'mixed',
        'cardio': 'conditioning',
        'endurance': 'conditioning',
        'power': 'strength',
        'muscle_gain': 'hypertrophy',
        'muscle gain': 'hypertrophy',
        'fat_loss': 'conditioning',
        'fat loss': 'conditioning',
        'flexibility': 'mobility',
        'stretching': 'mobility',
        'rest': 'recovery',
        'deload': 'recovery',
      };

      if (sessionTypeMap[normalized]) {
        console.log(`⚠️  Mapped session_type "${aiSessionType}" → "${sessionTypeMap[normalized]}"`);
        return sessionTypeMap[normalized];
      }

      // Default fallback
      console.log(`⚠️  Unknown session_type "${aiSessionType}", defaulting to "mixed"`);
      return 'mixed';
    };

    // Step 6: Create workouts (using upsert for idempotent operation)
    const workoutsToCreate = fixedProgram.weekly_structure.flatMap((week) =>
      week.workouts.map((workout, index) => ({
        program_id: body.program_id,
        week_number: week.week_number,
        day_number: workout.day_number,
        session_order: index + 1,
        workout_name: workout.workout_name,
        workout_focus: workout.workout_focus,
        session_type: mapSessionType(workout.session_type),
        scheduled_date: null,
        planned_duration_minutes: body.session_duration_minutes,
        movement_patterns_covered: workout.movement_patterns_covered,
        planes_of_motion_covered: workout.planes_of_motion_covered,
        primary_muscle_groups: [],
        ai_rationale: workout.ai_rationale,
        exercise_selection_criteria: null,
        overall_rpe: null,
        trainer_notes: null,
        client_feedback: null,
      }))
    );

    // Log workout creation details
    const workoutsByWeek = workoutsToCreate.reduce((acc, w) => {
      acc[w.week_number] = (acc[w.week_number] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    console.log(`📝 Creating ${workoutsToCreate.length} workouts:`,
      Object.entries(workoutsByWeek).map(([week, count]) => `Week ${week}: ${count}`).join(', '));

    const { data: savedWorkouts, error: workoutsError } = await createAIWorkouts(workoutsToCreate);

    if (workoutsError || !savedWorkouts) {
      await updateAIProgram(body.program_id, {
        generation_status: 'failed',
        generation_error: `Failed to create workouts: ${workoutsError?.message}`,
      });
      return NextResponse.json({ error: 'Failed to save workouts' }, { status: 500 });
    }

    console.log(`✅ ${savedWorkouts.length} workouts saved`);

    // Update progress: Saving workouts
    await updateAIProgram(body.program_id, {
      progress_message: `Cross-checking movement patterns…`,
      current_step: totalStepsEstimate - 1,
      progress_percentage: 93,
    });

    // Step 7: Create exercises
    let totalExercises = 0;
    for (const week of fixedProgram.weekly_structure) {
      for (const workout of week.workouts) {
        const savedWorkout = savedWorkouts.find(
          (w) => w.week_number === week.week_number && w.day_number === workout.day_number
        );

        if (!savedWorkout) continue;

        const exercisesToCreate = workout.exercises.map((ex) => ({
          workout_id: savedWorkout.id,
          exercise_id: ex.exercise_id,
          exercise_order: typeof ex.exercise_order === 'number' ? Math.round(ex.exercise_order) : 1,
          block_label: ex.block_label || null,
          sets: typeof ex.sets === 'number' ? Math.round(ex.sets) : 3, // Default to 3 sets
          reps_min: null,
          reps_max: null,
          reps_target: ex.reps_target,
          target_load_kg: null,
          target_load_percentage: null,
          target_rpe: ex.target_rpe ? Math.round(ex.target_rpe) : null, // Round to integer for DB
          target_rir: null,
          tempo: ex.tempo,
          rest_seconds: ex.rest_seconds ? Math.round(ex.rest_seconds) : null, // Ensure integer
          target_duration_seconds: null,
          target_distance_meters: null,
          is_unilateral: false,
          is_bodyweight: false,
          is_timed: false,
          coaching_cues: ex.coaching_cues,
          common_mistakes: [],
          modifications: ex.modifications || [],
          actual_sets: null,
          actual_reps: null,
          actual_load_kg: null,
          actual_rpe: null,
          actual_duration_seconds: null,
          actual_distance_meters: null,
          performance_notes: null,
          skip_reason: null,
        }));

        const { data: savedExercises } = await createAIWorkoutExercises(exercisesToCreate);
        if (savedExercises) totalExercises += savedExercises.length;
      }
    }

    console.log(`✅ ${totalExercises} exercises created`);

    // Step 8: Nutrition plan (if requested)
    if (body.include_nutrition && body.client_profile_id) {
      await createAINutritionPlan({
        program_id: body.program_id,
        daily_calories: null,
        protein_grams: null,
        carbs_grams: null,
        fats_grams: null,
        fiber_grams: null,
        calculation_method: null,
        tdee_estimated: null,
        calorie_adjustment_percentage: null,
        meals_per_day: null,
        meal_timing_notes: null,
        pre_workout_nutrition: null,
        post_workout_nutrition: null,
        meal_templates: null,
        daily_water_liters: null,
        supplement_recommendations: [],
        dietary_restrictions: [],
        dietary_preferences: [],
        ai_rationale: 'Nutrition plan to be customized',
        generated_at: null,
        disclaimer: 'AI-generated - review with a nutritionist before implementation',
      });
    }

    // Step 9: Log generation
    await logAIGeneration({
      entity_id: body.program_id,
      entity_type: 'ai_program',
      status: 'completed',
      ai_model: raw?.model || 'claude-sonnet-4-5-20250929',
      generation_type: 'program',
      ai_provider: 'anthropic',
      prompt_version: 'v1.0.0',
      input_tokens: raw?.usage.input_tokens || 0,
      output_tokens: raw?.usage.output_tokens || 0,
      estimated_cost_usd: raw ? estimateCost(raw) : 0,
      latency_ms: Date.now() - startTime,
      retry_count: 0,
    });

    // Step 10: Create revision (only if it doesn't exist)
    const existingRevisions = await getProgramRevisions(body.program_id);
    if (existingRevisions.length === 0) {
      const { program, workouts, exercises } = await getCompleteProgramData(body.program_id);
      const { error: revisionError } = await createProgramRevision({
        program_id: body.program_id,
        revision_number: 1,
        program_snapshot: {
          program: program!,
          workouts: workouts || [],
          exercises: exercises || [],
        },
        change_description: 'Initial AI-generated program',
        created_by: body.trainer_id,
      });

      if (revisionError) {
        console.error('Error creating program revision:', revisionError);
        // Continue anyway - revision is not critical for program generation
      }
    }

    // Step 11: Mark as completed
    await updateAIProgram(body.program_id, {
      generation_status: 'completed',
      generation_error: null,
      progress_message: 'Boom! Your program is ready to crush goals.',
      current_step: totalStepsEstimate,
      progress_percentage: 100,
    });

      console.log(`✅ Generation complete! Time: ${Date.now() - startTime}ms`);

      return NextResponse.json({ success: true, program_id: body.program_id });
    })(); // Close generationPromise async function

    // Race between generation and timeout
    const result = await Promise.race([generationPromise, timeoutPromise]);

    // Clear timeout if generation completed successfully
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    return result;

  } catch (error: any) {
    // Clear timeout on error
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    console.error('❌ Worker error:', error);

    if (body?.program_id) {
      await updateAIProgram(body.program_id, {
        generation_status: 'failed',
        generation_error: error.message || 'Internal server error',
      });
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function validateAndFixAIProgram(
  program: AIGeneratedProgram,
  availableExercises: any[]
): { valid: boolean; errors: string[]; warnings: string[]; fixedProgram: AIGeneratedProgram } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!program.program_name) errors.push('Missing program_name');
  if (!program.total_weeks) errors.push('Missing total_weeks');
  if (!program.weekly_structure?.length) errors.push('Missing weekly_structure');

  // Create lookup maps
  const exerciseIds = new Set(availableExercises.map(ex => ex.id));
  const exercisesByName = new Map(availableExercises.map(ex => [ex.name.toLowerCase(), ex]));

  // Fix invalid exercise IDs by trying to match by name or removing
  for (const week of program.weekly_structure || []) {
    if (!week.workouts?.length) {
      errors.push(`Week ${week.week_number} has no workouts`);
      continue;
    }

    for (const workout of week.workouts) {
      if (!workout.exercises?.length) {
        errors.push(`Week ${week.week_number}, day ${workout.day_number} has no exercises`);
        continue;
      }

      // Filter out invalid exercises, trying to fix them first
      const validExercises = [];
      for (const exercise of workout.exercises) {
        if (exerciseIds.has(exercise.exercise_id)) {
          // Valid ID - keep it
          validExercises.push(exercise);
        } else {
          // Invalid ID - try to find a replacement by similar ID or skip
          warnings.push(`Removed invalid exercise_id: ${exercise.exercise_id}`);
          // Don't add to validExercises - we'll skip this one
        }
      }

      // Update the workout with only valid exercises
      workout.exercises = validExercises;

      // Check if workout still has exercises after filtering
      if (validExercises.length === 0) {
        errors.push(`Week ${week.week_number}, day ${workout.day_number} has no valid exercises after filtering`);
      } else if (validExercises.length < 3) {
        warnings.push(`Week ${week.week_number}, day ${workout.day_number} only has ${validExercises.length} exercises (may be incomplete)`);
      }
    }
  }

  // Log warnings
  if (warnings.length > 0) {
    console.log(`⚠️  Validation warnings (${warnings.length}):`);
    warnings.forEach(w => console.log(`   - ${w}`));
  }

  // Program is valid if no critical errors (some warnings are OK)
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    fixedProgram: program
  };
}

// Keep old function name as alias for compatibility
function validateAIProgram(
  program: AIGeneratedProgram,
  availableExercises: any[]
): { valid: boolean; errors: string[] } {
  const result = validateAndFixAIProgram(program, availableExercises);
  return { valid: result.valid, errors: result.errors };
}

function estimateCost(response: any): number {
  const costs = { input: 3.0, output: 15.0 };
  const inputCost = (response.usage.input_tokens / 1_000_000) * costs.input;
  const outputCost = (response.usage.output_tokens / 1_000_000) * costs.output;
  return inputCost + outputCost;
}
