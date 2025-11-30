export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen py-20 px-4 bg-background">
      <div className="container mx-auto max-w-3xl">
        <h1 className="text-4xl font-bold mb-8 text-foreground">Privacy Policy</h1>

        <div className="space-y-8 text-muted-foreground">
          <p className="text-sm">Last Updated: November 29, 2025</p>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">The Short Version</h2>
            <p>
              We collect what we need to provide the service. We don't sell your data.
              Your leads and analysis results belong to you. We use industry-standard
              security practices.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">1. Information We Collect</h2>

            <p className="font-medium text-foreground">Account Information</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Email address and name (via Clerk authentication)</li>
              <li>Billing information (if on a paid plan)</li>
            </ul>

            <p className="font-medium text-foreground mt-4">Usage Data</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Prospects and leads you add to the platform</li>
              <li>Website analysis results and reports</li>
              <li>Outreach messages generated for your campaigns</li>
              <li>Platform usage patterns and feature interactions</li>
            </ul>

            <p className="font-medium text-foreground mt-4">Technical Data</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>IP address, browser type, device information</li>
              <li>Cookies for authentication and preferences</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">2. How We Use Your Data</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide the prospecting, analysis, and outreach services</li>
              <li>Generate AI-powered website analysis and recommendations</li>
              <li>Create personalized outreach messages for your leads</li>
              <li>Process billing and manage your subscription</li>
              <li>Send service-related communications (usage alerts, updates)</li>
              <li>Improve the platform based on usage patterns</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">3. Third-Party Services</h2>
            <p>We use these services to operate the platform:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Clerk</strong> — Authentication and user management</li>
              <li><strong>Supabase</strong> — Database and file storage</li>
              <li><strong>Vercel</strong> — Hosting and deployment</li>
              <li><strong>OpenAI, Anthropic, xAI</strong> — AI analysis and generation</li>
              <li><strong>Stripe</strong> — Payment processing (if applicable)</li>
            </ul>
            <p className="mt-2">
              Each service has its own privacy policy. We only share data necessary
              for them to provide their services.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">4. Data Security</h2>
            <p>We protect your data using:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>HTTPS encryption for all data in transit</li>
              <li>Encrypted database storage via Supabase</li>
              <li>Secure authentication via Clerk</li>
              <li>Regular security reviews and updates</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">5. Data Ownership</h2>
            <p>
              <strong>Your data is yours.</strong> The prospects you add, analysis results,
              and generated outreach belong to you. You can export or delete your data
              at any time. We don't use your business data to train AI models or share
              it with other users.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">6. Your Rights</h2>
            <p>You can:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access and export your data</li>
              <li>Correct inaccurate information</li>
              <li>Delete your account and data</li>
              <li>Opt out of marketing emails</li>
            </ul>
            <p className="mt-2">
              To exercise these rights, email us or use the account settings in the app.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">7. Data Retention</h2>
            <p>
              We keep your data while your account is active. After account deletion,
              we remove your data within 30 days, except where legally required to retain it.
              Anonymized usage data may be kept for analytics.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">8. Cookies</h2>
            <p>
              We use essential cookies for authentication and preferences. We don't use
              third-party advertising cookies. You can control cookies via browser settings,
              but this may affect functionality.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">9. Children's Privacy</h2>
            <p>
              This service is for businesses and professionals. We don't knowingly
              collect data from anyone under 18.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">10. Changes to This Policy</h2>
            <p>
              We'll notify you of significant changes via email or in-app notification.
              Minor clarifications may be made without notice.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">11. Contact</h2>
            <p>
              Questions about your data or this policy?
            </p>
            <p className="font-medium text-foreground">
              <a href="mailto:anton.yanovich@hotmail.com" className="hover:underline text-primary">
                anton.yanovich@hotmail.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
