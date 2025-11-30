export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen py-20 px-4 bg-background">
      <div className="container mx-auto max-w-3xl">
        <h1 className="text-4xl font-bold mb-8 text-foreground">Terms of Service</h1>

        <div className="space-y-8 text-muted-foreground">
          <p className="text-sm">Last Updated: November 29, 2025</p>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p>
              By creating an account and using Minty Design Co, you agree to these Terms of Service.
              If you don't agree, please don't use our platform.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">2. What We Provide</h2>
            <p>
              Minty Design Co is an AI-powered lead generation platform for web designers and agencies. Our service includes:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Automated prospecting to find businesses in your target market</li>
              <li>AI website analysis with design, SEO, and accessibility scoring</li>
              <li>Detailed reports with screenshots and actionable recommendations</li>
              <li>Personalized outreach generation (emails and social messages)</li>
              <li>Lead management dashboard and campaign tracking</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">3. Your Responsibilities</h2>
            <p>When using our platform, you agree to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide accurate account information</li>
              <li>Use the service for legitimate business outreach only</li>
              <li>Not spam or harass prospects</li>
              <li>Comply with applicable laws (CAN-SPAM, GDPR, etc.)</li>
              <li>Not attempt to reverse engineer or abuse the service</li>
              <li>Keep your account credentials secure</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">4. AI-Generated Content</h2>
            <p>
              Our platform uses AI to analyze websites and generate outreach messages. While we strive
              for accuracy and quality:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>AI analysis is based on automated assessment, not human review</li>
              <li>Generated outreach should be reviewed before sending</li>
              <li>We don't guarantee specific response rates or business outcomes</li>
              <li>You're responsible for the content you send to prospects</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">5. Subscription & Billing</h2>
            <p>
              We offer subscription plans with included usage quotas. Details:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Billing occurs monthly or annually based on your plan</li>
              <li>Usage beyond your quota may incur additional charges</li>
              <li>You can cancel anytime; access continues until period end</li>
              <li>Refunds are handled on a case-by-case basis</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">6. Data & Privacy</h2>
            <p>
              We take data seriously. Your prospect data, analysis results, and generated content
              belong to you. We won't sell your data or share it with third parties except as
              needed to provide the service. See our Privacy Policy for details.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">7. Intellectual Property</h2>
            <p>
              The platform, including its design, code, and AI models, is owned by Minty Design Co.
              You retain ownership of your content and data. Reports and analysis generated for
              your leads are yours to use for your business purposes.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">8. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, Minty Design Co is not liable for indirect,
              incidental, or consequential damages. Our total liability is limited to the amount
              you've paid us in the past 12 months.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">9. Service Availability</h2>
            <p>
              We aim for high uptime but don't guarantee uninterrupted service. We may perform
              maintenance, updates, or experience outages. We'll communicate significant changes
              in advance when possible.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">10. Account Termination</h2>
            <p>
              You can close your account anytime. We may suspend or terminate accounts that
              violate these terms. Upon termination, you can request export of your data.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">11. Changes to Terms</h2>
            <p>
              We may update these terms. We'll notify you of material changes via email or
              in-app notification. Continued use after changes means you accept the new terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">12. Contact</h2>
            <p>
              Questions about these terms? Reach out:
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
