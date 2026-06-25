import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — VTryon",
  description: "How VTryon collects, uses, and protects your data including body measurement information.",
};

export default function PrivacyPolicyPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 py-12 prose prose-gray" lang="en">
      <h1>Privacy Policy</h1>
      <p className="text-sm text-gray-500">Last updated: June 2026</p>

      <p>
        VTryon (&quot;we&quot;, &quot;our&quot;, or &quot;the Platform&quot;) is committed to protecting your privacy. This policy
        explains how we collect, use, store, and share your personal data — including sensitive body
        measurement data — when you use our AI-powered virtual try-on platform.
      </p>

      <h2>1. Information We Collect</h2>

      <h3>1.1 Account Information</h3>
      <p>
        When you register, we collect your email address, name, and authentication credentials
        (managed via Supabase Auth). We do not store passwords directly.
      </p>

      <h3>1.2 Body Measurement Data</h3>
      <p>
        If you upload a full-body photo, our AI (MediaPipe Pose) extracts approximate body
        measurements: height, bust/chest, waist, hips, shoulder width, and inseam. We also
        derive your body type classification (e.g., hourglass, pear, rectangle).
      </p>
      <ul>
        <li>Your original photo is stored encrypted in Supabase Storage.</li>
        <li>Measurements are stored in our database to provide size recommendations.</li>
        <li>AI processing happens on secured GPU infrastructure (Modal.com) — photos are not retained after processing.</li>
      </ul>

      <h3>1.3 Shopping &amp; Order Data</h3>
      <p>
        We collect shipping addresses, order history, payment method selections, and cart activity
        to process and deliver your orders.
      </p>

      <h3>1.4 Style Preferences</h3>
      <p>
        If you complete the style quiz, we store your preferred styles, occasions, and colour
        palette to personalise product recommendations.
      </p>

      <h3>1.5 Usage Data</h3>
      <p>
        We collect anonymised analytics via PostHog: pages viewed, features used, and conversion
        events. We use Sentry for error tracking, which may include stack traces but no personal
        information.
      </p>

      <h2>2. How We Use Your Data</h2>
      <ul>
        <li><strong>Virtual try-on:</strong> Your photo and selected garment image are sent to our AI model to generate a try-on preview. Results are stored so you can view them again.</li>
        <li><strong>Size recommendations:</strong> Body measurements are compared against brand size charts to suggest your best fit.</li>
        <li><strong>AI styling advice:</strong> Claude (our AI stylist) uses your body type and style preferences — never your raw photo — to suggest outfits.</li>
        <li><strong>Order fulfilment:</strong> Shipping addresses and payment references are used to process and deliver orders.</li>
        <li><strong>Product improvement:</strong> Aggregated, anonymised measurement distributions help us improve size-chart accuracy.</li>
      </ul>

      <h2>3. Data Sharing</h2>
      <p>We share data only with the following parties, and only as necessary:</p>
      <ul>
        <li><strong>Supabase</strong> — authentication and file storage</li>
        <li><strong>Replicate / Modal.com</strong> — AI model inference (photos processed transiently)</li>
        <li><strong>Anthropic</strong> — AI styling via Claude (text only, no photos)</li>
        <li><strong>Stripe / eSewa / Khalti</strong> — payment processing</li>
        <li><strong>Resend</strong> — transactional email delivery</li>
        <li><strong>PostHog / Sentry</strong> — analytics and error monitoring (anonymised)</li>
      </ul>
      <p>We do not sell your personal data or body measurement data to any third party.</p>

      <h2>4. Data Retention</h2>
      <ul>
        <li><strong>Body photos:</strong> Retained until you delete your account or request deletion.</li>
        <li><strong>Measurements:</strong> Retained while your account is active. Deleted within 30 days of account deletion.</li>
        <li><strong>Try-on results:</strong> Stored for 1 year, then automatically purged.</li>
        <li><strong>Order data:</strong> Retained for 7 years for tax and legal compliance.</li>
      </ul>

      <h2>5. Your Rights</h2>
      <p>You can at any time:</p>
      <ul>
        <li><strong>Access</strong> your data by visiting your Profile page.</li>
        <li><strong>Delete</strong> your body profile and photo from the Profile settings.</li>
        <li><strong>Export</strong> your data by contacting support.</li>
        <li><strong>Delete your account</strong> entirely — email <a href="mailto:privacy@vtryon.com">privacy@vtryon.com</a>.</li>
      </ul>

      <h2>6. Security</h2>
      <ul>
        <li>All data in transit is encrypted via TLS 1.3.</li>
        <li>Photos are stored in private Supabase buckets with signed URLs (time-limited access).</li>
        <li>Database access is controlled via Row Level Security (RLS) policies.</li>
        <li>API endpoints are rate-limited and input is sanitised to prevent injection attacks.</li>
        <li>All API keys and secrets are managed via Doppler and rotated regularly.</li>
      </ul>

      <h2>7. Children</h2>
      <p>
        VTryon is not intended for users under 16. We do not knowingly collect personal data
        from children.
      </p>

      <h2>8. Changes to This Policy</h2>
      <p>
        We may update this policy from time to time. Material changes will be communicated via
        email or an in-app notification. Continued use of the platform after changes constitutes
        acceptance.
      </p>

      <h2>9. Contact</h2>
      <p>
        For questions about this policy or to exercise your data rights, contact us at{" "}
        <a href="mailto:privacy@vtryon.com">privacy@vtryon.com</a>.
      </p>
    </article>
  );
}
