import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { imagesSupabase } from '@/lib/supabase/images-client';
import { getAIWorkoutsByProgram } from '@/lib/services/ai-program-service';

/**
 * GET /api/ai-programs/[id]/workouts
 * Fetch all workouts for an AI program with their exercises
 *
 * Note: Exercise data is split across two databases:
 * - ai_workout_exercises: Wondrous (main) database
 * - ta_exercise_library_original: Trainer-Aide (images) database
 * We fetch from both and combine the results.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch workouts for the program
    const workouts = await getAIWorkoutsByProgram(id);

    // Fetch exercises for each workout
    const workoutsWithExercises = await Promise.all(
      workouts.map(async (workout) => {
        // Step 1: Get workout exercises from Wondrous database
        const { data: exercises, error: exercisesError } = await supabaseServer
          .from('ai_workout_exercises')
          .select('*')
          .eq('workout_id', workout.id)
          .order('exercise_order', { ascending: true });

        if (exercisesError) {
          console.error(`Error fetching exercises for workout ${workout.id}:`, exercisesError);
          return { ...workout, exercises: [] };
        }

        if (!exercises || exercises.length === 0) {
          return { ...workout, exercises: [] };
        }

        // Step 2: Get unique exercise IDs
        const exerciseIds = [...new Set(exercises.map((ex: { exercise_id: string }) => ex.exercise_id))];

        // Step 3: Fetch exercise details from Trainer-Aide database
        const { data: exerciseDetails, error: detailsError } = await imagesSupabase
          .from('ta_exercise_library_original')
          .select('id, name, slug, image_folder')
          .in('id', exerciseIds);

        if (detailsError) {
          console.error('Error fetching exercise details:', detailsError);
        }

        // Create a lookup map for exercise details
        const exerciseLookup = new Map(
          (exerciseDetails || []).map((ex: { id: string; name: string; slug: string; image_folder: string }) => [ex.id, ex])
        );

        // Step 4: Combine exercise data with details
        const exercisesWithNames = exercises.map((ex: { exercise_id: string; [key: string]: unknown }) => {
          const details = exerciseLookup.get(ex.exercise_id) as { name?: string; slug?: string; image_folder?: string } | undefined;
          return {
            ...ex,
            exercise_name: details?.name || 'Unknown Exercise',
            exercise_slug: details?.slug || null,
            exercise_image_folder: details?.image_folder || null,
          };
        });

        return {
          ...workout,
          exercises: exercisesWithNames,
        };
      })
    );

    return NextResponse.json({ workouts: workoutsWithExercises });
  } catch (error) {
    console.error('Error fetching program workouts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workouts', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
