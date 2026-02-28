export default function CookiePolicyPage() {
  return (
    <div className="space-y-8">
      {/* Document Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 pb-8">
        <div className="flex items-center gap-3 mb-4">
          <span className="inline-flex items-center rounded-full bg-purple-100 dark:bg-purple-900/30 px-3 py-1 text-xs font-medium text-purple-700 dark:text-purple-300">
            Version 1.0
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Effective date: 26 February 2026
          </span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">
          Cookie Policy
        </h1>
        <div className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
          <p>A Journey Ltd t/a AllWondrous &middot; Company No. 15963421</p>
          <p>Suite 7034, 321-323 High Road, Romford, Essex, United Kingdom, RM6 6AX</p>
        </div>
      </div>

      {/* Introduction */}
      <section className="space-y-3">
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          This Cookie Policy explains how A Journey Ltd t/a AllWondrous (&quot;AllWondrous&quot;, &quot;we&quot;, &quot;us&quot;, &quot;our&quot;) uses cookies and similar technologies on allwondrous.com and our web application. By using our website or platform, you consent to the use of cookies as described in this policy.
        </p>
      </section>

      <hr className="border-gray-100 dark:border-gray-800" />

      {/* Section 1 */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-baseline gap-3">
          <span className="text-sm font-bold text-purple-600 dark:text-purple-400">01</span>
          What Are Cookies?
        </h2>
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          Cookies are small text files that are placed on your device when you visit a website. They allow the website to recognise your device on subsequent visits, remember your preferences, and gather analytics information. Cookies may be &quot;session&quot; cookies (deleted when you close your browser) or &quot;persistent&quot; cookies (retained for a set period).
        </p>
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          Similar technologies include web beacons, local storage, and session storage — all referred to as &quot;cookies&quot; in this policy.
        </p>
      </section>

      <hr className="border-gray-100 dark:border-gray-800" />

      {/* Section 2 */}
      <section className="space-y-5">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-baseline gap-3">
          <span className="text-sm font-bold text-purple-600 dark:text-purple-400">02</span>
          Cookies We Use
        </h2>

        <div className="space-y-4 pl-4 border-l-2 border-purple-200 dark:border-purple-800">
          {/* 2.1 */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">2.1 Strictly Necessary Cookies</h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              These cookies are essential for the platform to function and cannot be disabled. They enable:
            </p>
            <ul className="space-y-1.5 text-sm text-gray-700 dark:text-gray-300">
              <li className="flex gap-2 leading-relaxed">
                <span className="text-purple-500 mt-1 shrink-0">&bull;</span>
                Authentication — keeping you logged in to your AllWondrous account.
              </li>
              <li className="flex gap-2 leading-relaxed">
                <span className="text-purple-500 mt-1 shrink-0">&bull;</span>
                Session management — maintaining your session state across page loads.
              </li>
              <li className="flex gap-2 leading-relaxed">
                <span className="text-purple-500 mt-1 shrink-0">&bull;</span>
                Security — protecting against CSRF attacks and unauthorised access.
              </li>
              <li className="flex gap-2 leading-relaxed">
                <span className="text-purple-500 mt-1 shrink-0">&bull;</span>
                Payment processing — enabling Stripe&apos;s payment flows.
              </li>
            </ul>
            <p className="text-xs text-gray-500 dark:text-gray-400 italic leading-relaxed">
              Legal basis: These cookies are exempt from consent requirements as they are strictly necessary to provide a service you have requested.
            </p>
          </div>

          {/* 2.2 */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">2.2 Analytics Cookies (Google Analytics)</h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              We use Google Analytics to understand how visitors interact with our website and platform. Google Analytics sets the following cookies:
            </p>
            <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Cookie</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Purpose</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Expiry</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  <tr>
                    <td className="px-4 py-2.5 font-mono text-xs text-purple-600 dark:text-purple-400">_ga</td>
                    <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">Distinguishes unique users</td>
                    <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400">2 years</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 font-mono text-xs text-purple-600 dark:text-purple-400">_ga_[ID]</td>
                    <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">Persists session state</td>
                    <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400">2 years</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 font-mono text-xs text-purple-600 dark:text-purple-400">_gid</td>
                    <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">Distinguishes users</td>
                    <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400">24 hours</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 font-mono text-xs text-purple-600 dark:text-purple-400">_gat</td>
                    <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">Throttles request rate</td>
                    <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400">1 minute</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              Google Analytics data is pseudonymised. We have enabled IP anonymisation so that your full IP address is not stored by Google. Data collected includes pages visited, time on page, browser type, device type, and general geographic location.
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 italic leading-relaxed">
              Legal basis: These cookies require your consent. You can withdraw consent at any time (see Section 4 below).
            </p>
          </div>

          {/* 2.3 */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">2.3 Functional Cookies</h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              These cookies remember your preferences and improve your experience:
            </p>
            <ul className="space-y-1.5 text-sm text-gray-700 dark:text-gray-300">
              <li className="flex gap-2 leading-relaxed">
                <span className="text-purple-500 mt-1 shrink-0">&bull;</span>
                Theme preferences (light/dark mode).
              </li>
              <li className="flex gap-2 leading-relaxed">
                <span className="text-purple-500 mt-1 shrink-0">&bull;</span>
                Language and localisation settings.
              </li>
              <li className="flex gap-2 leading-relaxed">
                <span className="text-purple-500 mt-1 shrink-0">&bull;</span>
                Dismissed notification banners and onboarding tooltips.
              </li>
              <li className="flex gap-2 leading-relaxed">
                <span className="text-purple-500 mt-1 shrink-0">&bull;</span>
                Recently viewed records within the platform.
              </li>
            </ul>
            <p className="text-xs text-gray-500 dark:text-gray-400 italic leading-relaxed">
              Legal basis: These cookies are set on the basis of your consent or our legitimate interest in providing a functional user experience.
            </p>
          </div>

          {/* 2.4 */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">2.4 Third-Party Cookies</h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              The following third parties may set cookies when you use AllWondrous:
            </p>
            <ul className="space-y-1.5 text-sm text-gray-700 dark:text-gray-300">
              <li className="flex gap-2 leading-relaxed">
                <span className="text-purple-500 mt-1 shrink-0">&bull;</span>
                <span><strong className="text-gray-900 dark:text-gray-100">Stripe</strong> — For payment processing security and fraud prevention. Stripe&apos;s cookie policy is available at stripe.com/privacy.</span>
              </li>
            </ul>
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-sm text-green-800 dark:text-green-300 leading-relaxed">
              We do not use advertising or remarketing cookies. We do not share cookie data with advertising networks.
            </div>
          </div>
        </div>
      </section>

      <hr className="border-gray-100 dark:border-gray-800" />

      {/* Section 3 */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-baseline gap-3">
          <span className="text-sm font-bold text-purple-600 dark:text-purple-400">03</span>
          Cookie Duration Summary
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Session Cookies</p>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              Deleted when you close your browser.
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Persistent Cookies</p>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              Retained for between 1 minute and 2 years depending on the cookie.
            </p>
          </div>
        </div>
      </section>

      <hr className="border-gray-100 dark:border-gray-800" />

      {/* Section 4 */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-baseline gap-3">
          <span className="text-sm font-bold text-purple-600 dark:text-purple-400">04</span>
          Managing Your Cookie Preferences
        </h2>
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          When you first visit allwondrous.com, you will be presented with a cookie consent banner allowing you to accept or decline non-essential cookies. You can update your preferences at any time by clicking &quot;Cookie Settings&quot; in the footer of our website.
        </p>
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          You can also manage cookies through your browser settings. Most browsers allow you to:
        </p>
        <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
          <li className="flex gap-2 leading-relaxed">
            <span className="text-purple-500 mt-1 shrink-0">&bull;</span>
            View and delete existing cookies.
          </li>
          <li className="flex gap-2 leading-relaxed">
            <span className="text-purple-500 mt-1 shrink-0">&bull;</span>
            Block cookies from specific websites.
          </li>
          <li className="flex gap-2 leading-relaxed">
            <span className="text-purple-500 mt-1 shrink-0">&bull;</span>
            Block third-party cookies.
          </li>
          <li className="flex gap-2 leading-relaxed">
            <span className="text-purple-500 mt-1 shrink-0">&bull;</span>
            Clear all cookies when you close your browser.
          </li>
        </ul>
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-sm text-amber-800 dark:text-amber-300 leading-relaxed">
          Please note that disabling strictly necessary cookies will prevent AllWondrous from functioning correctly. Disabling analytics cookies will not affect platform functionality.
        </div>
      </section>

      <hr className="border-gray-100 dark:border-gray-800" />

      {/* Section 5 */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-baseline gap-3">
          <span className="text-sm font-bold text-purple-600 dark:text-purple-400">05</span>
          Opt Out of Google Analytics
        </h2>
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          To opt out of Google Analytics tracking across all websites, you can install the Google Analytics Opt-out Browser Add-on, available at tools.google.com/dlpage/gaoptout.
        </p>
      </section>

      <hr className="border-gray-100 dark:border-gray-800" />

      {/* Section 6 */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-baseline gap-3">
          <span className="text-sm font-bold text-purple-600 dark:text-purple-400">06</span>
          Changes to This Policy
        </h2>
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          We may update this Cookie Policy from time to time to reflect changes in our use of cookies or applicable law. We will notify you of material changes via a notice on our website or in your dashboard.
        </p>
      </section>

      <hr className="border-gray-100 dark:border-gray-800" />

      {/* Section 7 — Contact */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-baseline gap-3">
          <span className="text-sm font-bold text-purple-600 dark:text-purple-400">07</span>
          Contact
        </h2>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-5 text-sm text-gray-700 dark:text-gray-300 leading-relaxed space-y-1">
          <p className="font-semibold text-gray-900 dark:text-gray-100">A Journey Ltd t/a AllWondrous</p>
          <p>Suite 7034, 321-323 High Road, Romford, Essex, United Kingdom, RM6 6AX</p>
          <p>
            Email:{' '}
            <a href="mailto:legal@allwondrous.com" className="text-purple-600 dark:text-purple-400 underline hover:no-underline">legal@allwondrous.com</a>
          </p>
        </div>
      </section>

      {/* Footer */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
          &copy; 2026 A Journey Ltd t/a AllWondrous. All rights reserved.
        </p>
      </div>
    </div>
  );
}
