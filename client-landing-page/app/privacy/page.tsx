export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen py-20 px-4 bg-background">
      <div className="container mx-auto max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>

        <div className="space-y-6 text-muted-foreground">
            <p className="text-sm">Last Updated: November 7, 2025</p>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold text-foreground">1. Information We Collect</h2>
              <p>
                When you use our website analysis service or request a comparison analysis, we collect information that you provide directly to us, including:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Company name and email address</li>
                <li>Your website URL for analysis</li>
                <li>Industry or business category (optional)</li>
                <li>Benchmark preference (automatic or manual competitor selection)</li>
                <li>Competitor website URL (optional, if you choose manual benchmark)</li>
                <li>Phone number (optional)</li>
                <li>Additional notes about your business or specific areas to focus on (optional)</li>
                <li>Messages and communications you send us</li>
                <li>Technical information such as IP address, browser type, and device information</li>
              </ul>
            </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">2. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Analyze your website and compare it to industry competitors or your selected benchmark</li>
              <li>Generate comprehensive comparison reports within 24 hours</li>
              <li>Email you the analysis results and recommendations</li>
              <li>Communicate with you about our services and your analysis request</li>
              <li>Schedule consultations via Calendly</li>
              <li>Improve our services and user experience</li>
              <li>Send you marketing communications (with your consent)</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">3. Data Storage and Security</h2>
            <p>
              Your information is stored securely using industry-standard encryption. We use Supabase
              (a PostgreSQL database service) to store your data. We implement appropriate technical
              and organizational measures to protect your personal information against unauthorized
              access, alteration, disclosure, or destruction.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">4. Third-Party Services</h2>
            <p>We use the following third-party services:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Calendly</strong> - For scheduling consultations</li>
              <li><strong>Supabase</strong> - For secure data storage</li>
              <li><strong>AI Services</strong> - For website analysis (OpenAI, Anthropic, xAI)</li>
            </ul>
            <p>
              These services have their own privacy policies governing the use of your information.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">5. Cookies and Tracking</h2>
            <p>
              We use cookies and similar tracking technologies to improve your experience on our
              website. You can control cookies through your browser settings.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">6. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access the personal information we hold about you</li>
              <li>Request correction of inaccurate information</li>
              <li>Request deletion of your personal information</li>
              <li>Opt-out of marketing communications</li>
              <li>Object to processing of your personal information</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">7. Data Retention</h2>
            <p>
              We retain your personal information for as long as necessary to provide our services
              and comply with legal obligations. You may request deletion of your data at any time
              by contacting us.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">8. Children's Privacy</h2>
            <p>
              Our services are not directed to individuals under the age of 18. We do not knowingly
              collect personal information from children.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes
              by posting the new Privacy Policy on this page and updating the "Last Updated" date.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">10. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy or our data practices, please
              contact us at:
            </p>
            <p className="font-medium text-foreground">
              <a href={`mailto:${process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'anton.yanovich@hotmail.com'}`} className="hover:underline">
                {process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'anton.yanovich@hotmail.com'}
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
