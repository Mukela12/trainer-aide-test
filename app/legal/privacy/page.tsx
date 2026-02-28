export default function PrivacyPolicyPage() {
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
          Privacy Policy
        </h1>
        <div className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
          <p>A Journey Ltd t/a AllWondrous &middot; Company No. 15963421</p>
          <p>Suite 7034, 321-323 High Road, Romford, Essex, United Kingdom, RM6 6AX</p>
        </div>
      </div>

      {/* Introduction */}
      <section className="space-y-3">
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          This Privacy Policy explains how A Journey Ltd t/a AllWondrous (&quot;AllWondrous&quot;, &quot;we&quot;, &quot;us&quot;, &quot;our&quot;) collects and processes personal data when you use our platform as a Studio owner, practitioner, or team member. It applies to allwondrous.com and all associated services.
        </p>
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          AllWondrous is the data controller in respect of personal data we process about Studios and their authorised users. We are a data processor in respect of client data that Studios process through our platform — in that case the Studio is the data controller.
        </p>
      </section>

      <hr className="border-gray-100 dark:border-gray-800" />

      {/* Section 1 */}
      <section className="space-y-5">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-baseline gap-3">
          <span className="text-sm font-bold text-purple-600 dark:text-purple-400">01</span>
          What Data We Collect
        </h2>

        <div className="space-y-4 pl-4 border-l-2 border-purple-200 dark:border-purple-800">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">1.1 Account &amp; Business Data</h3>
            <ul className="space-y-1.5 text-sm text-gray-700 dark:text-gray-300">
              <li className="flex gap-2 leading-relaxed">
                <span className="text-purple-500 mt-1 shrink-0">&bull;</span>
                Name, email address, phone number, job title.
              </li>
              <li className="flex gap-2 leading-relaxed">
                <span className="text-purple-500 mt-1 shrink-0">&bull;</span>
                Business name, company number, registered address, VAT number.
              </li>
              <li className="flex gap-2 leading-relaxed">
                <span className="text-purple-500 mt-1 shrink-0">&bull;</span>
                Professional qualifications and certifications (where provided).
              </li>
              <li className="flex gap-2 leading-relaxed">
                <span className="text-purple-500 mt-1 shrink-0">&bull;</span>
                Profile photos and studio images.
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">1.2 Payment &amp; Financial Data</h3>
            <ul className="space-y-1.5 text-sm text-gray-700 dark:text-gray-300">
              <li className="flex gap-2 leading-relaxed">
                <span className="text-purple-500 mt-1 shrink-0">&bull;</span>
                Bank account details for Stripe payouts (held by Stripe, not AllWondrous).
              </li>
              <li className="flex gap-2 leading-relaxed">
                <span className="text-purple-500 mt-1 shrink-0">&bull;</span>
                Payment card details for platform fee billing (held by Stripe, not AllWondrous).
              </li>
              <li className="flex gap-2 leading-relaxed">
                <span className="text-purple-500 mt-1 shrink-0">&bull;</span>
                Transaction records, invoices, and payout history.
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">1.3 Usage &amp; Technical Data</h3>
            <ul className="space-y-1.5 text-sm text-gray-700 dark:text-gray-300">
              <li className="flex gap-2 leading-relaxed">
                <span className="text-purple-500 mt-1 shrink-0">&bull;</span>
                Log data: IP addresses, browser type, pages visited, session duration.
              </li>
              <li className="flex gap-2 leading-relaxed">
                <span className="text-purple-500 mt-1 shrink-0">&bull;</span>
                Device information: operating system, device type, screen resolution.
              </li>
              <li className="flex gap-2 leading-relaxed">
                <span className="text-purple-500 mt-1 shrink-0">&bull;</span>
                Cookies and analytics data (see our <a href="/legal/cookies" className="text-purple-600 dark:text-purple-400 underline hover:no-underline">Cookie Policy</a>).
              </li>
              <li className="flex gap-2 leading-relaxed">
                <span className="text-purple-500 mt-1 shrink-0">&bull;</span>
                Feature usage patterns used to improve the platform.
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">1.4 Communications</h3>
            <ul className="space-y-1.5 text-sm text-gray-700 dark:text-gray-300">
              <li className="flex gap-2 leading-relaxed">
                <span className="text-purple-500 mt-1 shrink-0">&bull;</span>
                Emails and messages you send to our support team.
              </li>
              <li className="flex gap-2 leading-relaxed">
                <span className="text-purple-500 mt-1 shrink-0">&bull;</span>
                Survey responses and feedback you provide.
              </li>
            </ul>
          </div>
        </div>
      </section>

      <hr className="border-gray-100 dark:border-gray-800" />

      {/* Section 2 */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-baseline gap-3">
          <span className="text-sm font-bold text-purple-600 dark:text-purple-400">02</span>
          How We Use Your Data
        </h2>
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          We process your personal data for the following purposes:
        </p>
        <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
          <li className="flex gap-2 leading-relaxed">
            <span className="text-purple-500 mt-1 shrink-0">&bull;</span>
            Providing and operating the AllWondrous platform under our contract with you.
          </li>
          <li className="flex gap-2 leading-relaxed">
            <span className="text-purple-500 mt-1 shrink-0">&bull;</span>
            Processing payments and managing your subscription.
          </li>
          <li className="flex gap-2 leading-relaxed">
            <span className="text-purple-500 mt-1 shrink-0">&bull;</span>
            Providing customer support.
          </li>
          <li className="flex gap-2 leading-relaxed">
            <span className="text-purple-500 mt-1 shrink-0">&bull;</span>
            Sending service-related communications, including account notices, invoices, and platform updates.
          </li>
          <li className="flex gap-2 leading-relaxed">
            <span className="text-purple-500 mt-1 shrink-0">&bull;</span>
            Improving and developing our platform through aggregated analytics.
          </li>
          <li className="flex gap-2 leading-relaxed">
            <span className="text-purple-500 mt-1 shrink-0">&bull;</span>
            Complying with legal obligations, including financial record-keeping and fraud prevention.
          </li>
          <li className="flex gap-2 leading-relaxed">
            <span className="text-purple-500 mt-1 shrink-0">&bull;</span>
            Marketing our services to you where you have opted in or where we have a legitimate interest.
          </li>
        </ul>
      </section>

      <hr className="border-gray-100 dark:border-gray-800" />

      {/* Section 3 */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-baseline gap-3">
          <span className="text-sm font-bold text-purple-600 dark:text-purple-400">03</span>
          Legal Basis for Processing
        </h2>
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          We rely on the following legal bases under UK GDPR:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Contract</p>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              Processing necessary to provide the platform services you have subscribed to.
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Legal Obligation</p>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              Processing required by law, including financial and tax obligations.
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Legitimate Interests</p>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              Improving the platform, fraud prevention, and direct marketing to existing customers where proportionate.
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Consent</p>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              Where you have explicitly opted in, such as to receive marketing emails.
            </p>
          </div>
        </div>
      </section>

      <hr className="border-gray-100 dark:border-gray-800" />

      {/* Section 4 */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-baseline gap-3">
          <span className="text-sm font-bold text-purple-600 dark:text-purple-400">04</span>
          Data Sharing
        </h2>
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          We share personal data only where necessary:
        </p>
        <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
          <li className="flex gap-2 leading-relaxed">
            <span className="text-purple-500 mt-1 shrink-0">&bull;</span>
            <span><strong className="text-gray-900 dark:text-gray-100">Stripe</strong> — For payment processing and Stripe Connect functionality.</span>
          </li>
          <li className="flex gap-2 leading-relaxed">
            <span className="text-purple-500 mt-1 shrink-0">&bull;</span>
            <span><strong className="text-gray-900 dark:text-gray-100">Google Analytics</strong> — For platform usage analytics. Data is pseudonymised.</span>
          </li>
          <li className="flex gap-2 leading-relaxed">
            <span className="text-purple-500 mt-1 shrink-0">&bull;</span>
            <span><strong className="text-gray-900 dark:text-gray-100">Email and SMS providers</strong> — For transactional communications.</span>
          </li>
          <li className="flex gap-2 leading-relaxed">
            <span className="text-purple-500 mt-1 shrink-0">&bull;</span>
            <span><strong className="text-gray-900 dark:text-gray-100">Hosting and infrastructure providers (Vercel, Supabase)</strong> — For platform delivery and data storage.</span>
          </li>
          <li className="flex gap-2 leading-relaxed">
            <span className="text-purple-500 mt-1 shrink-0">&bull;</span>
            <span><strong className="text-gray-900 dark:text-gray-100">Legal and regulatory authorities</strong> — Where required by law, court order, or regulatory obligation.</span>
          </li>
        </ul>
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-sm text-green-800 dark:text-green-300 leading-relaxed">
          We do not sell your personal data to third parties. We do not use your data for advertising purposes beyond our own platform marketing.
        </div>
      </section>

      <hr className="border-gray-100 dark:border-gray-800" />

      {/* Section 5 */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-baseline gap-3">
          <span className="text-sm font-bold text-purple-600 dark:text-purple-400">05</span>
          International Transfers
        </h2>
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          Some of our service providers may process data outside the UK or EEA. Where this occurs, we ensure appropriate safeguards are in place, including reliance on UK adequacy regulations, standard contractual clauses, or equivalent measures.
        </p>
      </section>

      <hr className="border-gray-100 dark:border-gray-800" />

      {/* Section 6 */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-baseline gap-3">
          <span className="text-sm font-bold text-purple-600 dark:text-purple-400">06</span>
          Data Retention
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Account Data</p>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              Retained for the duration of your subscription plus 7 years for financial record-keeping.
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Transaction Records</p>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              Retained for 7 years in accordance with HMRC requirements.
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Support Communications</p>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              Retained for 3 years.
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Analytics Data</p>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              Retained in anonymised form indefinitely; identifiable log data retained for 12 months.
            </p>
          </div>
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          When you close your account, we will make your data available for export for 30 days, after which it will be deleted from active systems. Backup copies may persist for up to 90 days.
        </p>
      </section>

      <hr className="border-gray-100 dark:border-gray-800" />

      {/* Section 7 */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-baseline gap-3">
          <span className="text-sm font-bold text-purple-600 dark:text-purple-400">07</span>
          Your Rights
        </h2>
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          Under UK GDPR you have the following rights:
        </p>
        <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
          <li className="flex gap-2 leading-relaxed">
            <span className="text-purple-500 mt-1 shrink-0">&bull;</span>
            <span><strong className="text-gray-900 dark:text-gray-100">Access</strong> — Request a copy of the personal data we hold about you.</span>
          </li>
          <li className="flex gap-2 leading-relaxed">
            <span className="text-purple-500 mt-1 shrink-0">&bull;</span>
            <span><strong className="text-gray-900 dark:text-gray-100">Rectification</strong> — Ask us to correct inaccurate or incomplete data.</span>
          </li>
          <li className="flex gap-2 leading-relaxed">
            <span className="text-purple-500 mt-1 shrink-0">&bull;</span>
            <span><strong className="text-gray-900 dark:text-gray-100">Erasure</strong> — Request deletion of your data where we no longer have a lawful basis to hold it.</span>
          </li>
          <li className="flex gap-2 leading-relaxed">
            <span className="text-purple-500 mt-1 shrink-0">&bull;</span>
            <span><strong className="text-gray-900 dark:text-gray-100">Restriction</strong> — Ask us to restrict processing while a dispute is resolved.</span>
          </li>
          <li className="flex gap-2 leading-relaxed">
            <span className="text-purple-500 mt-1 shrink-0">&bull;</span>
            <span><strong className="text-gray-900 dark:text-gray-100">Portability</strong> — Receive your data in a structured, machine-readable format.</span>
          </li>
          <li className="flex gap-2 leading-relaxed">
            <span className="text-purple-500 mt-1 shrink-0">&bull;</span>
            <span><strong className="text-gray-900 dark:text-gray-100">Objection</strong> — Object to processing based on legitimate interests.</span>
          </li>
          <li className="flex gap-2 leading-relaxed">
            <span className="text-purple-500 mt-1 shrink-0">&bull;</span>
            <span><strong className="text-gray-900 dark:text-gray-100">Withdraw Consent</strong> — Where processing is based on consent, withdraw it at any time.</span>
          </li>
        </ul>
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          To exercise any of these rights, email us at{' '}
          <a href="mailto:legal@allwondrous.com" className="text-purple-600 dark:text-purple-400 underline hover:no-underline">legal@allwondrous.com</a>.
          We will respond within 30 days. You also have the right to lodge a complaint with the Information Commissioner&apos;s Office (ICO) at ico.org.uk.
        </p>
      </section>

      <hr className="border-gray-100 dark:border-gray-800" />

      {/* Section 8 */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-baseline gap-3">
          <span className="text-sm font-bold text-purple-600 dark:text-purple-400">08</span>
          Security
        </h2>
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          We implement appropriate technical and organisational measures to protect personal data, including:
        </p>
        <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
          <li className="flex gap-2 leading-relaxed">
            <span className="text-purple-500 mt-1 shrink-0">&bull;</span>
            Encryption of data in transit (TLS) and at rest.
          </li>
          <li className="flex gap-2 leading-relaxed">
            <span className="text-purple-500 mt-1 shrink-0">&bull;</span>
            Row-level security and access controls on our database.
          </li>
          <li className="flex gap-2 leading-relaxed">
            <span className="text-purple-500 mt-1 shrink-0">&bull;</span>
            Restricted access to production systems on a need-to-know basis.
          </li>
          <li className="flex gap-2 leading-relaxed">
            <span className="text-purple-500 mt-1 shrink-0">&bull;</span>
            Regular security reviews and penetration testing.
          </li>
        </ul>
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          No system can be guaranteed 100% secure. In the event of a data breach that is likely to result in a risk to your rights and freedoms, we will notify you and the ICO as required by law.
        </p>
      </section>

      <hr className="border-gray-100 dark:border-gray-800" />

      {/* Section 9 */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-baseline gap-3">
          <span className="text-sm font-bold text-purple-600 dark:text-purple-400">09</span>
          Studio Client Data — Data Processing
        </h2>
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          When Studios use AllWondrous to process data about their own clients, AllWondrous acts as a data processor on the Studio&apos;s behalf. In this capacity:
        </p>
        <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
          <li className="flex gap-2 leading-relaxed">
            <span className="text-purple-500 mt-1 shrink-0">&bull;</span>
            We process client data only on the documented instructions of the Studio.
          </li>
          <li className="flex gap-2 leading-relaxed">
            <span className="text-purple-500 mt-1 shrink-0">&bull;</span>
            We maintain appropriate technical and organisational security measures.
          </li>
          <li className="flex gap-2 leading-relaxed">
            <span className="text-purple-500 mt-1 shrink-0">&bull;</span>
            We assist Studios in meeting their obligations under UK GDPR.
          </li>
          <li className="flex gap-2 leading-relaxed">
            <span className="text-purple-500 mt-1 shrink-0">&bull;</span>
            We delete or return client data at the Studio&apos;s request, subject to legal retention obligations.
          </li>
        </ul>
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          A formal Data Processing Agreement is available to Studios and is incorporated into our <a href="/legal/terms" className="text-purple-600 dark:text-purple-400 underline hover:no-underline">Terms of Service</a>.
        </p>
      </section>

      <hr className="border-gray-100 dark:border-gray-800" />

      {/* Section 10 */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-baseline gap-3">
          <span className="text-sm font-bold text-purple-600 dark:text-purple-400">10</span>
          Cookies
        </h2>
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          We use cookies and similar tracking technologies on allwondrous.com. Please see our{' '}
          <a href="/legal/cookies" className="text-purple-600 dark:text-purple-400 underline hover:no-underline">Cookie Policy</a>{' '}
          for full details.
        </p>
      </section>

      <hr className="border-gray-100 dark:border-gray-800" />

      {/* Section 11 */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-baseline gap-3">
          <span className="text-sm font-bold text-purple-600 dark:text-purple-400">11</span>
          Changes to This Policy
        </h2>
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          We may update this Privacy Policy from time to time. We will notify you of material changes by email or via a notice in your dashboard. The effective date at the top of this document will be updated accordingly.
        </p>
      </section>

      <hr className="border-gray-100 dark:border-gray-800" />

      {/* Section 12 — Contact */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-baseline gap-3">
          <span className="text-sm font-bold text-purple-600 dark:text-purple-400">12</span>
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
