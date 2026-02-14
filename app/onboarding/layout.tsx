'use client';

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Content — sub-layouts (solo/studio) render their own progress bars */}
      <div className="pt-8 pb-8 px-4">
        <div className="max-w-2xl mx-auto">{children}</div>
      </div>
    </div>
  );
}
