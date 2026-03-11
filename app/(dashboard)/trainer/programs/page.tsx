/**
 * Trainer AI Programs Page — Redirects to Templates
 *
 * AI programs are now shown alongside manual templates on the unified
 * templates page. This redirect keeps old bookmarks/links working.
 */
import { redirect } from 'next/navigation';

export default function TrainerProgramsPage() {
  redirect('/trainer/templates');
}
