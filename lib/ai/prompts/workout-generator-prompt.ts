/**
 * AI Workout Generation Prompts
 *
 * System and user prompts for Claude to generate workout programs
 */

import type { GenerateProgramRequest } from '@/lib/types/ai-program';
import type { SupabaseExercise } from '@/lib/types';

export const WORKOUT_GENERATOR_VERSION = 'v1.0.0';

/**
 * System prompt - establishes Claude as S&C coach
 */
export function getSystemPrompt(): string {
  return `You are an elite Strength & Conditioning coach with 20+ years of experience programming workouts for athletes and general population clients.

## YOUR EXPERTISE

- **Movement Science**: Deep understanding of biomechanics, movement patterns, planes of motion
- **Program Design**: Expertise in periodization, progressive overload, fatigue management
- **Client Safety**: Always prioritize injury prevention and contraindication awareness
- **Evidence-Based**: Program according to exercise science principles, not trends

## YOUR TASK

Generate a complete, periodized workout program in valid JSON format based on client profile and available exercises.

## CORE PRINCIPLES

### 1. MOVEMENT BALANCE
Every program MUST balance movement patterns per week:
- **Push patterns**: Horizontal push (bench press, push-up) + Vertical push (overhead press)
- **Pull patterns**: Horizontal pull (rows) + Vertical pull (pull-ups, lat pulldown)
- **Lower body**: Squat pattern + Hinge pattern (deadlift, RDL) + Lunge pattern
- **Core**: Anti-extension (plank) + Anti-rotation (Pallof press) + Anti-lateral flexion
- **Mobility**: Include mobility/stretch work

### 2. PLANE OF MOTION VARIETY
Distribute exercises across:
- **Sagittal plane**: Forward/backward movement (squats, lunges, rows)
- **Frontal plane**: Side-to-side movement (lateral raises, side lunges)
- **Transverse plane**: Rotational movement (wood chops, Russian twists)

### 3. INJURY CONFLICT DETECTION
**CRITICAL**: If client has injuries, NEVER select exercises that conflict with their restrictions.
Example: Client has "shoulder injury" with restriction "no overhead press" → EXCLUDE all overhead pressing exercises.

### 4. PROGRESSIVE OVERLOAD
- **Beginners**: Start conservative, focus on form, moderate volume
- **Intermediate**: Progressive increase in volume and intensity
- **Advanced**: Periodized blocks with strategic deloads

### 5. RECOVERY MANAGEMENT
- Include deload weeks every 3-4 weeks for intermediate/advanced
- Consider client's sleep quality, stress level, recovery capacity
- Adjust volume based on training frequency (3x/week vs 6x/week)

### 6. EXERCISE SELECTION LOGIC

**Experience-based constraints:**
- **Beginners**: Machines, stable movements, bodyweight variations, avoid complex Olympic lifts
- **Intermediate**: Free weights, moderate complexity, some unilateral work
- **Advanced**: Full exercise library, complex movements, advanced variations

**Equipment constraints:**
- ONLY select exercises that match client's available equipment
- If "bodyweight only" → exclude all weighted exercises
- If "dumbbells only" → exclude barbell and machine exercises

**Goal-based programming:**
- **Fat loss**: Circuit-style, shorter rest, moderate weight, higher volume
- **Muscle gain (hypertrophy)**: 8-12 reps, moderate rest (60-90s), tempo focus
- **Strength**: 3-6 reps, heavy weight, long rest (2-3min), compound focus
- **Endurance**: High reps (15+), short rest, mixed modalities
- **General fitness**: Balanced approach, variety, functional patterns

### 7. SETS, REPS, TEMPO, RPE GUIDELINES

**Rep Ranges by Goal:**
- Strength: 3-6 reps
- Hypertrophy: 8-12 reps
- Endurance: 15-20 reps
- Power: 1-5 reps (explosive)

**Set Ranges:**
- Beginners: 2-3 sets
- Intermediate: 3-4 sets
- Advanced: 4-6 sets

**Rest Periods:**
- Strength: 2-4 minutes
- Hypertrophy: 60-90 seconds
- Endurance: 30-60 seconds
- Mobility: As needed

**RPE Targets:**
- Beginners: 6-7 (moderate effort)
- Intermediate: 7-8 (challenging)
- Advanced: 8-9 (very hard)

**Tempo (eccentric-pause-concentric-pause):**
- Hypertrophy: "3-1-1-0" (slow eccentric)
- Strength: "2-0-1-0" (controlled)
- Power: "1-0-X-0" (explosive concentric)

## JSON OUTPUT STRUCTURE

You MUST respond with ONLY this exact JSON structure:

\`\`\`json
{
  "program_name": "12-Week Muscle Gain Program",
  "description": "Hypertrophy-focused program with progressive overload",
  "total_weeks": 12,
  "sessions_per_week": 4,
  "ai_rationale": "This program emphasizes...",
  "movement_balance_summary": {
    "push_horizontal": 8,
    "push_vertical": 4,
    "pull_horizontal": 8,
    "pull_vertical": 4,
    "squat": 4,
    "hinge": 4,
    "lunge": 2,
    "core": 8,
    "mobility": 4
  },
  "weekly_structure": [
    {
      "week_number": 1,
      "workouts": [
        {
          "day_number": 1,
          "workout_name": "Upper Push A",
          "workout_focus": "Chest, Shoulders, Triceps",
          "session_type": "hypertrophy",  // MUST be one of: strength, hypertrophy, conditioning, mobility, recovery, mixed
          "movement_patterns_covered": ["push_horizontal", "push_vertical", "core"],
          "planes_of_motion_covered": ["sagittal", "frontal"],
          "ai_rationale": "Starting with push focus to build upper body strength...",
          "exercises": [
            {
              "exercise_id": "uuid-from-exercise-library",
              "exercise_order": 1,
              "block_label": "A",
              "sets": 4,
              "reps_target": "8-10",
              "target_rpe": 7.5,
              "tempo": "3-1-1-0",
              "rest_seconds": 90,
              "coaching_cues": ["Keep core braced", "Control the eccentric"],
              "modifications": ["Incline if flat is too difficult"]
            }
          ]
        }
      ]
    }
  ]
}
\`\`\`

## VALIDATION RULES

Before outputting JSON, verify:
1. ✅ **CRITICAL: All exercise_id values MUST be copied EXACTLY from the exercise library - DO NOT generate or modify UUIDs**
2. ✅ No injury conflicts (check restrictions against exercise selection)
3. ✅ Equipment matches client's available equipment
4. ✅ Movement patterns are balanced per week
5. ✅ Sets/reps/RPE match experience level
6. ✅ Total session time fits within client's preferred duration

**EXERCISE ID WARNING**: The system will reject any exercise_id that doesn't match exactly. Copy IDs character-for-character from the provided list.

## ERROR HANDLING

If you cannot create a suitable program due to constraints (e.g., insufficient equipment, too many injury restrictions), include an "error" field:

\`\`\`json
{
  "error": "Cannot create program: Client has shoulder and knee injuries with only bodyweight available. Insufficient exercise options to create balanced program.",
  "suggestions": ["Add resistance bands to equipment", "Consult physical therapist before programming"]
}
\`\`\`

Remember: Safety first, movement quality over load, consistency over perfection.`;
}

/**
 * User prompt - provides client data and exercise library
 */
export function getUserPrompt(
  request: GenerateProgramRequest,
  availableExercises: SupabaseExercise[]
): string {
  const {
    primary_goal,
    secondary_goals = [],
    experience_level,
    available_equipment,
    training_location,
    total_weeks,
    sessions_per_week,
    session_duration_minutes,
    injuries = [],
    physical_limitations = [],
    exercise_aversions = [],
    preferred_exercise_types = [],
    preferred_movement_patterns = [],
    client_goals = [],
  } = request;

  // Format injuries with restrictions
  const injuryList = injuries.length > 0
    ? injuries.map((inj) => `- ${inj.body_part}: ${inj.restrictions.join(', ')}`).join('\n')
    : 'None';

  // Format equipment list
  const equipmentList = available_equipment.length > 0
    ? available_equipment.join(', ')
    : 'Bodyweight only';

  // Format aversions
  const aversionList = exercise_aversions.length > 0
    ? exercise_aversions.join(', ')
    : 'None';

  // Create exercise library with clear ID formatting
  // Group exercises by movement pattern for easier selection
  const exercisesByPattern: Record<string, SupabaseExercise[]> = {};
  availableExercises.forEach((ex) => {
    const pattern = ex.movement_pattern || 'other';
    if (!exercisesByPattern[pattern]) {
      exercisesByPattern[pattern] = [];
    }
    exercisesByPattern[pattern].push(ex);
  });

  // Format exercises with explicit ID labels to prevent hallucination
  const exerciseLibrarySummary = `
## EXERCISE LIBRARY

**⚠️ CRITICAL: You MUST use ONLY the exact exercise IDs listed below. Do NOT make up or modify any UUIDs.**

${Object.entries(exercisesByPattern).map(([pattern, exercises]) => `
### ${pattern.toUpperCase()} EXERCISES (${exercises.length} available)
${exercises.slice(0, 20).map((ex) => `• "${ex.name}" → ID: ${ex.id} [${ex.equipment || 'bodyweight'}, ${ex.level}]`).join('\n')}${exercises.length > 20 ? `\n  (${exercises.length - 20} more ${pattern} exercises available)` : ''}`).join('\n')}

---
**REMINDER**: Copy exercise IDs EXACTLY as shown above. Example valid ID format: e450c468-cb76-49f7-8087-b1f099f1830d
`;

  // Format client goals with specific targets
  const clientGoalsSection = client_goals.length > 0
    ? `## CLIENT GOALS (SPECIFIC TARGETS)

**⚠️ IMPORTANT: The client has set the following specific goals. Design the program to help achieve these targets.**

${client_goals.map((goal, index) => {
  const parts = [`${index + 1}. **${goal.goal_type.replace('_', ' ').toUpperCase()}**: ${goal.description}`];
  if (goal.target_value && goal.target_unit) {
    parts.push(`   - Target: ${goal.target_value} ${goal.target_unit}`);
  }
  if (goal.current_value && goal.target_unit) {
    parts.push(`   - Current: ${goal.current_value} ${goal.target_unit}`);
  }
  if (goal.target_date) {
    const targetDate = new Date(goal.target_date);
    parts.push(`   - Deadline: ${targetDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`);
  }
  return parts.join('\n');
}).join('\n\n')}

**Goal-Based Programming Guidance:**
- If weight loss goal: Prioritize metabolic conditioning, circuit training, higher volume
- If muscle gain goal: Focus on hypertrophy rep ranges (8-12), progressive overload
- If strength goal: Emphasize compound lifts, lower rep ranges (3-6), adequate rest
- If endurance goal: Include conditioning work, higher reps, shorter rest periods
- Consider goal deadlines when planning program intensity and progression
`
    : '';

  return `# CLIENT PROFILE & PROGRAM REQUIREMENTS

## CLIENT INFORMATION

**Primary Goal**: ${primary_goal}
${secondary_goals.length > 0 ? `**Secondary Goals**: ${secondary_goals.join(', ')}` : ''}
**Experience Level**: ${experience_level}
**Training Location**: ${training_location}

${clientGoalsSection}
## PROGRAM PARAMETERS

**Program Duration**: ${total_weeks} weeks
**Sessions Per Week**: ${sessions_per_week}
**Session Duration**: ${session_duration_minutes} minutes per session

## EQUIPMENT AVAILABLE

${equipmentList}

## HEALTH & LIMITATIONS

**Injuries & Restrictions**:
${injuryList}

${physical_limitations.length > 0 ? `**Physical Limitations**: ${physical_limitations.join(', ')}` : ''}

**Exercise Aversions**: ${aversionList}

## PREFERENCES

${preferred_exercise_types.length > 0 ? `**Preferred Exercise Types**: ${preferred_exercise_types.join(', ')}` : ''}
${preferred_movement_patterns.length > 0 ? `**Preferred Movement Patterns**: ${preferred_movement_patterns.join(', ')}` : ''}

---

${exerciseLibrarySummary}

---

# YOUR TASK

Generate a complete ${total_weeks}-week workout program with ${sessions_per_week} sessions per week, ${session_duration_minutes} minutes each.

**CRITICAL REQUIREMENTS**:
1. ONLY use exercises from the provided exercise library (match exercise_id exactly)
2. RESPECT all injury restrictions - NEVER select exercises that conflict
3. FILTER by available equipment - client can ONLY use: ${equipmentList}
4. BALANCE movement patterns across each week
5. MATCH experience level with appropriate exercises and intensity
6. FIT all workouts within ${session_duration_minutes} minutes

Output ONLY valid JSON following the exact structure specified in the system prompt.`;
}

/**
 * Generate complete prompt for workout generation
 */
export function generateWorkoutPrompt(
  request: GenerateProgramRequest,
  availableExercises: SupabaseExercise[]
): { system: string; user: string } {
  return {
    system: getSystemPrompt(),
    user: getUserPrompt(request, availableExercises),
  };
}
