export default function PrivacyPolicyPage() {
  return (
    <article className="prose prose-gray dark:prose-invert max-w-none">
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Version 1.0 &middot; Effective date: 26 February 2026</p>
      <h1>Privacy Policy</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        A Journey Ltd t/a AllWondrous &middot; Company No. 15963421<br />
        Suite 7034, 321-323 High Road, Romford, Essex, United Kingdom, RM6 6AX
      </p>

      <p>This Privacy Policy explains how A Journey Ltd t/a AllWondrous (&quot;AllWondrous&quot;, &quot;we&quot;, &quot;us&quot;, &quot;our&quot;) collects and processes personal data when you use our platform as a Studio owner, practitioner, or team member. It applies to allwondrous.com and all associated services.</p>
      <p>AllWondrous is the data controller in respect of personal data we process about Studios and their authorised users. We are a data processor in respect of client data that Studios process through our platform — in that case the Studio is the data controller.</p>

      <h2>1. What Data We Collect</h2>
      <h3>1.1 Account &amp; Business Data</h3>
      <ul>
        <li>Name, email address, phone number, job title.</li>
        <li>Business name, company number, registered address, VAT number.</li>
        <li>Professional qualifications and certifications (where provided).</li>
        <li>Profile photos and studio images.</li>
      </ul>
      <h3>1.2 Payment &amp; Financial Data</h3>
      <ul>
        <li>Bank account details for Stripe payouts (held by Stripe, not AllWondrous).</li>
        <li>Payment card details for platform fee billing (held by Stripe, not AllWondrous).</li>
        <li>Transaction records, invoices, and payout history.</li>
      </ul>
      <h3>1.3 Usage &amp; Technical Data</h3>
      <ul>
        <li>Log data: IP addresses, browser type, pages visited, session duration.</li>
        <li>Device information: operating system, device type, screen resolution.</li>
        <li>Cookies and analytics data (see our Cookie Policy).</li>
        <li>Feature usage patterns used to improve the platform.</li>
      </ul>
      <h3>1.4 Communications</h3>
      <ul>
        <li>Emails and messages you send to our support team.</li>
        <li>Survey responses and feedback you provide.</li>
      </ul>

      <h2>2. How We Use Your Data</h2>
      <p>We process your personal data for the following purposes:</p>
      <ul>
        <li>Providing and operating the AllWondrous platform under our contract with you.</li>
        <li>Processing payments and managing your subscription.</li>
        <li>Providing customer support.</li>
        <li>Sending service-related communications, including account notices, invoices, and platform updates.</li>
        <li>Improving and developing our platform through aggregated analytics.</li>
        <li>Complying with legal obligations, including financial record-keeping and fraud prevention.</li>
        <li>Marketing our services to you where you have opted in or where we have a legitimate interest.</li>
      </ul>

      <h2>3. Legal Basis for Processing</h2>
      <p>We rely on the following legal bases under UK GDPR:</p>
      <ul>
        <li><strong>Contract:</strong> Processing necessary to provide the platform services you have subscribed to.</li>
        <li><strong>Legal obligation:</strong> Processing required by law, including financial and tax obligations.</li>
        <li><strong>Legitimate interests:</strong> Improving the platform, fraud prevention, and direct marketing to existing customers where proportionate.</li>
        <li><strong>Consent:</strong> Where you have explicitly opted in, such as to receive marketing emails.</li>
      </ul>

      <h2>4. Data Sharing</h2>
      <p>We share personal data only where necessary:</p>
      <ul>
        <li><strong>Stripe:</strong> For payment processing and Stripe Connect functionality.</li>
        <li><strong>Google Analytics:</strong> For platform usage analytics. Data is pseudonymised.</li>
        <li><strong>Email and SMS providers:</strong> For transactional communications.</li>
        <li><strong>Hosting and infrastructure providers (Vercel, Supabase):</strong> For platform delivery and data storage.</li>
        <li><strong>Legal and regulatory authorities:</strong> Where required by law, court order, or regulatory obligation.</li>
      </ul>
      <p>We do not sell your personal data to third parties. We do not use your data for advertising purposes beyond our own platform marketing.</p>

      <h2>5. International Transfers</h2>
      <p>Some of our service providers may process data outside the UK or EEA. Where this occurs, we ensure appropriate safeguards are in place, including reliance on UK adequacy regulations, standard contractual clauses, or equivalent measures.</p>

      <h2>6. Data Retention</h2>
      <ul>
        <li><strong>Account data:</strong> Retained for the duration of your subscription plus 7 years for financial record-keeping.</li>
        <li><strong>Transaction records:</strong> Retained for 7 years in accordance with HMRC requirements.</li>
        <li><strong>Support communications:</strong> Retained for 3 years.</li>
        <li><strong>Analytics data:</strong> Retained in anonymised form indefinitely; identifiable log data retained for 12 months.</li>
      </ul>
      <p>When you close your account, we will make your data available for export for 30 days, after which it will be deleted from active systems. Backup copies may persist for up to 90 days.</p>

      <h2>7. Your Rights</h2>
      <p>Under UK GDPR you have the following rights:</p>
      <ul>
        <li><strong>Access:</strong> Request a copy of the personal data we hold about you.</li>
        <li><strong>Rectification:</strong> Ask us to correct inaccurate or incomplete data.</li>
        <li><strong>Erasure:</strong> Request deletion of your data where we no longer have a lawful basis to hold it.</li>
        <li><strong>Restriction:</strong> Ask us to restrict processing while a dispute is resolved.</li>
        <li><strong>Portability:</strong> Receive your data in a structured, machine-readable format.</li>
        <li><strong>Objection:</strong> Object to processing based on legitimate interests.</li>
        <li><strong>Withdraw consent:</strong> Where processing is based on consent, withdraw it at any time.</li>
      </ul>
      <p>To exercise any of these rights, email us at legal@allwondrous.com. We will respond within 30 days. You also have the right to lodge a complaint with the Information Commissioner&apos;s Office (ICO) at ico.org.uk.</p>

      <h2>8. Security</h2>
      <p>We implement appropriate technical and organisational measures to protect personal data, including:</p>
      <ul>
        <li>Encryption of data in transit (TLS) and at rest.</li>
        <li>Row-level security and access controls on our database.</li>
        <li>Restricted access to production systems on a need-to-know basis.</li>
        <li>Regular security reviews and penetration testing.</li>
      </ul>
      <p>No system can be guaranteed 100% secure. In the event of a data breach that is likely to result in a risk to your rights and freedoms, we will notify you and the ICO as required by law.</p>

      <h2>9. Studio Client Data — Data Processing</h2>
      <p>When Studios use AllWondrous to process data about their own clients, AllWondrous acts as a data processor on the Studio&apos;s behalf. In this capacity:</p>
      <ul>
        <li>We process client data only on the documented instructions of the Studio.</li>
        <li>We maintain appropriate technical and organisational security measures.</li>
        <li>We assist Studios in meeting their obligations under UK GDPR.</li>
        <li>We delete or return client data at the Studio&apos;s request, subject to legal retention obligations.</li>
      </ul>
      <p>A formal Data Processing Agreement is available to Studios and is incorporated into our Terms of Service.</p>

      <h2>10. Cookies</h2>
      <p>We use cookies and similar tracking technologies on allwondrous.com. Please see our <a href="/legal/cookies">Cookie Policy</a> for full details.</p>

      <h2>11. Changes to This Policy</h2>
      <p>We may update this Privacy Policy from time to time. We will notify you of material changes by email or via a notice in your dashboard. The effective date at the top of this document will be updated accordingly.</p>

      <h2>12. Contact</h2>
      <p>
        A Journey Ltd t/a AllWondrous<br />
        Suite 7034, 321-323 High Road, Romford, Essex, United Kingdom, RM6 6AX<br />
        Email: legal@allwondrous.com
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-400">&copy; 2026 A Journey Ltd t/a AllWondrous. All rights reserved.</p>
    </article>
  );
}
