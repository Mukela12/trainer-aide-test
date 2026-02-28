export default function CookiePolicyPage() {
  return (
    <article className="prose prose-gray dark:prose-invert max-w-none">
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Version 1.0 &middot; Effective date: 26 February 2026</p>
      <h1>Cookie Policy</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        A Journey Ltd t/a AllWondrous &middot; Company No. 15963421<br />
        Suite 7034, 321-323 High Road, Romford, Essex, United Kingdom, RM6 6AX
      </p>

      <p>This Cookie Policy explains how A Journey Ltd t/a AllWondrous (&quot;AllWondrous&quot;, &quot;we&quot;, &quot;us&quot;, &quot;our&quot;) uses cookies and similar technologies on allwondrous.com and our web application. By using our website or platform, you consent to the use of cookies as described in this policy.</p>

      <h2>1. What Are Cookies?</h2>
      <p>Cookies are small text files that are placed on your device when you visit a website. They allow the website to recognise your device on subsequent visits, remember your preferences, and gather analytics information. Cookies may be &quot;session&quot; cookies (deleted when you close your browser) or &quot;persistent&quot; cookies (retained for a set period).</p>
      <p>Similar technologies include web beacons, local storage, and session storage — all referred to as &quot;cookies&quot; in this policy.</p>

      <h2>2. Cookies We Use</h2>
      <h3>2.1 Strictly Necessary Cookies</h3>
      <p>These cookies are essential for the platform to function and cannot be disabled. They enable:</p>
      <ul>
        <li>Authentication — keeping you logged in to your AllWondrous account.</li>
        <li>Session management — maintaining your session state across page loads.</li>
        <li>Security — protecting against CSRF attacks and unauthorised access.</li>
        <li>Payment processing — enabling Stripe&apos;s payment flows.</li>
      </ul>
      <p><em>Legal basis: These cookies are exempt from consent requirements as they are strictly necessary to provide a service you have requested.</em></p>

      <h3>2.2 Analytics Cookies (Google Analytics)</h3>
      <p>We use Google Analytics to understand how visitors interact with our website and platform. Google Analytics sets the following cookies:</p>
      <ul>
        <li><strong>_ga</strong> — Distinguishes unique users. Expires after 2 years.</li>
        <li><strong>_ga_[ID]</strong> — Persists session state. Expires after 2 years.</li>
        <li><strong>_gid</strong> — Distinguishes users. Expires after 24 hours.</li>
        <li><strong>_gat</strong> — Throttles request rate. Expires after 1 minute.</li>
      </ul>
      <p>Google Analytics data is pseudonymised. We have enabled IP anonymisation so that your full IP address is not stored by Google. Data collected includes pages visited, time on page, browser type, device type, and general geographic location.</p>
      <p><em>Legal basis: These cookies require your consent. You can withdraw consent at any time (see Section 4 below).</em></p>

      <h3>2.3 Functional Cookies</h3>
      <p>These cookies remember your preferences and improve your experience:</p>
      <ul>
        <li>Theme preferences (light/dark mode).</li>
        <li>Language and localisation settings.</li>
        <li>Dismissed notification banners and onboarding tooltips.</li>
        <li>Recently viewed records within the platform.</li>
      </ul>
      <p><em>Legal basis: These cookies are set on the basis of your consent or our legitimate interest in providing a functional user experience.</em></p>

      <h3>2.4 Third-Party Cookies</h3>
      <p>The following third parties may set cookies when you use AllWondrous:</p>
      <ul>
        <li><strong>Stripe:</strong> For payment processing security and fraud prevention. Stripe&apos;s cookie policy is available at stripe.com/privacy.</li>
      </ul>
      <p>We do not use advertising or remarketing cookies. We do not share cookie data with advertising networks.</p>

      <h2>3. Cookie Duration Summary</h2>
      <ul>
        <li><strong>Session cookies</strong> — Deleted when you close your browser.</li>
        <li><strong>Persistent cookies</strong> — Retained for between 1 minute and 2 years depending on the cookie.</li>
      </ul>

      <h2>4. Managing Your Cookie Preferences</h2>
      <p>When you first visit allwondrous.com, you will be presented with a cookie consent banner allowing you to accept or decline non-essential cookies. You can update your preferences at any time by clicking &quot;Cookie Settings&quot; in the footer of our website.</p>
      <p>You can also manage cookies through your browser settings. Most browsers allow you to:</p>
      <ul>
        <li>View and delete existing cookies.</li>
        <li>Block cookies from specific websites.</li>
        <li>Block third-party cookies.</li>
        <li>Clear all cookies when you close your browser.</li>
      </ul>
      <p>Please note that disabling strictly necessary cookies will prevent AllWondrous from functioning correctly. Disabling analytics cookies will not affect platform functionality.</p>

      <h2>5. Opt Out of Google Analytics</h2>
      <p>To opt out of Google Analytics tracking across all websites, you can install the Google Analytics Opt-out Browser Add-on, available at tools.google.com/dlpage/gaoptout.</p>

      <h2>6. Changes to This Policy</h2>
      <p>We may update this Cookie Policy from time to time to reflect changes in our use of cookies or applicable law. We will notify you of material changes via a notice on our website or in your dashboard.</p>

      <h2>7. Contact</h2>
      <p>
        A Journey Ltd t/a AllWondrous<br />
        Suite 7034, 321-323 High Road, Romford, Essex, United Kingdom, RM6 6AX<br />
        Email: legal@allwondrous.com
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-400">&copy; 2026 A Journey Ltd t/a AllWondrous. All rights reserved.</p>
    </article>
  );
}
