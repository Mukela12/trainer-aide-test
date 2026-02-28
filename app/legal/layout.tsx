import Link from 'next/link';
import Image from 'next/image';

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <div className="relative w-48 h-12">
              <Image
                src="/images/all-wondrous-logo.svg"
                alt="AllWondrous"
                fill
                className="object-contain"
              />
            </div>
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link href="/legal/terms" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200">
              Terms
            </Link>
            <Link href="/legal/privacy" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200">
              Privacy
            </Link>
            <Link href="/legal/cookies" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200">
              Cookies
            </Link>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8 lg:py-12">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 py-6">
        <p className="text-center text-xs text-gray-500 dark:text-gray-400">
          &copy; 2026 A Journey Ltd t/a AllWondrous. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
