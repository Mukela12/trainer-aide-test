/**
 * SSE Stream for AI Program Generation Progress
 *
 * GET /api/ai-programs/[id]/stream
 *
 * Streams real-time progress updates for program generation.
 * More efficient than polling - server pushes updates to client.
 */

import { NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: programId } = await params;

  // Create a readable stream for SSE
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const supabase = createServiceRoleClient();
      let lastStatus = '';
      let lastMessage = '';
      let pollCount = 0;
      const maxPolls = 180; // 6 minutes max (2s intervals)

      const sendEvent = (data: object) => {
        const message = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      const checkProgress = async () => {
        try {
          pollCount++;

          // Fetch current program status
          const { data: program, error } = await supabase
            .from('ai_programs')
            .select('generation_status, generation_error, progress_message, progress_percentage, current_step, total_steps')
            .eq('id', programId)
            .single();

          if (error) {
            sendEvent({
              type: 'error',
              error: error.message,
            });
            controller.close();
            return;
          }

          if (!program) {
            sendEvent({
              type: 'error',
              error: 'Program not found',
            });
            controller.close();
            return;
          }

          // Only send update if something changed
          const currentMessage = `${program.generation_status}-${program.progress_message}-${program.progress_percentage}`;
          if (currentMessage !== lastMessage) {
            lastMessage = currentMessage;

            sendEvent({
              type: 'progress',
              status: program.generation_status,
              message: program.progress_message,
              percentage: program.progress_percentage || 0,
              currentStep: program.current_step || 0,
              totalSteps: program.total_steps || 0,
            });
          }

          // Check for completion or failure
          if (program.generation_status === 'completed') {
            sendEvent({
              type: 'completed',
              status: 'completed',
              message: program.progress_message || 'Program generated successfully!',
              percentage: 100,
            });
            controller.close();
            return;
          }

          if (program.generation_status === 'failed') {
            sendEvent({
              type: 'failed',
              status: 'failed',
              error: program.generation_error || 'Generation failed',
            });
            controller.close();
            return;
          }

          // Check for timeout
          if (pollCount >= maxPolls) {
            sendEvent({
              type: 'timeout',
              error: 'Stream timeout - generation may still be running in background',
            });
            controller.close();
            return;
          }

          // Schedule next check
          setTimeout(checkProgress, 2000);
        } catch (err) {
          sendEvent({
            type: 'error',
            error: err instanceof Error ? err.message : 'Unknown error',
          });
          controller.close();
        }
      };

      // Send initial connection message
      sendEvent({
        type: 'connected',
        message: 'Connected to progress stream',
        programId,
      });

      // Start checking progress
      checkProgress();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}
