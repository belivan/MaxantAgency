export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen py-20 px-4 bg-background">
      <div className="container mx-auto max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>

        <div className="space-y-6 text-muted-foreground">
            <p className="text-sm">Last Updated: November 7, 2025</p>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold text-foreground">1. Acceptance of Terms</h2>
              <p>
                By accessing and using this website analysis service, you accept and agree to be bound
                by these Terms of Service. If you do not agree to these terms, please do not use our
                services.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold text-foreground">2. Description of Service</h2>
              <p>
                We provide AI-powered website analysis services that evaluate your website against industry
                competitors or your selected benchmark. Our service includes:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Comparison request form where you can submit your website for analysis</li>
                <li>Automated website analysis using artificial intelligence</li>
                <li>Competitive benchmarking (automatic industry-based or manual competitor selection)</li>
                <li>Comprehensive comparison reports delivered via email within 24 hours</li>
                <li>Detailed PDF reports with actionable recommendations</li>
                <li>Consultation scheduling via Calendly</li>
                <li>Email and social media outreach (for subscribed users)</li>
              </ul>
            </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">3. User Responsibilities</h2>
            <p>You agree to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide accurate and complete information</li>
              <li>Only submit websites you own or have permission to analyze</li>
              <li>Not use our service for any illegal or unauthorized purpose</li>
              <li>Not attempt to interfere with or disrupt our services</li>
              <li>Not reverse engineer or attempt to extract source code from our service</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">4. Intellectual Property</h2>
            <p>
              All content, features, and functionality of our service, including but not limited to
              text, graphics, logos, and software, are owned by us and are protected by copyright,
              trademark, and other intellectual property laws.
            </p>
            <p>
              The analysis reports we generate are provided to you for your business use. You may
              not resell, redistribute, or use our reports for commercial purposes without our
              explicit written permission.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">5. Accuracy of Analysis</h2>
            <p>
              While we strive to provide accurate and helpful website analysis, our AI-powered
              service provides recommendations based on general best practices and automated analysis.
              We do not guarantee:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Specific business results from implementing our recommendations</li>
              <li>Complete accuracy of all analysis findings</li>
              <li>That our analysis covers every possible website issue</li>
            </ul>
            <p>
              You should use our analysis as one input in your decision-making process and consult
              with qualified professionals as needed.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">6. Pricing and Payment</h2>
            <p>
              We offer both free analysis reports and paid consulting services. Pricing for paid
              services will be clearly communicated before you commit to any purchase. All fees are:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Fixed-price quotes provided upfront</li>
              <li>No long-term contracts required</li>
              <li>Subject to change with 30 days notice for existing clients</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">7. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, we shall not be liable for any indirect,
              incidental, special, consequential, or punitive damages, or any loss of profits or
              revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill,
              or other intangible losses resulting from:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Your use or inability to use our service</li>
              <li>Any unauthorized access to or use of your data</li>
              <li>Any errors or omissions in our analysis</li>
              <li>Implementation of our recommendations</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">8. Disclaimer of Warranties</h2>
            <p>
              Our service is provided "as is" and "as available" without warranties of any kind,
              either express or implied, including but not limited to implied warranties of
              merchantability, fitness for a particular purpose, or non-infringement.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">9. Third-Party Services</h2>
            <p>
              Our service integrates with third-party services (Calendly, AI providers, etc.). We
              are not responsible for the availability, accuracy, or reliability of these third-party
              services. Your use of third-party services is subject to their respective terms and
              conditions.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">10. Termination</h2>
            <p>
              We reserve the right to terminate or suspend your access to our service at any time,
              without prior notice, for any reason, including if you breach these Terms of Service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">11. Changes to Terms</h2>
            <p>
              We may modify these Terms of Service at any time. We will notify you of any material
              changes by posting the new terms on this page and updating the "Last Updated" date.
              Your continued use of our service after changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">12. Governing Law</h2>
            <p>
              These Terms of Service shall be governed by and construed in accordance with applicable
              laws, without regard to conflict of law provisions.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">13. Contact Information</h2>
            <p>
              If you have any questions about these Terms of Service, please contact us at:
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
