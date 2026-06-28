import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-12">
      <div className="max-w-2xl w-full">
        <h1 className="text-3xl font-bold text-foreground mb-8 text-center">
          Privacy Policy
        </h1>

        <div className="bg-card border border-border rounded-lg p-8 space-y-6 text-sm text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-foreground font-semibold mb-2">1. Information We Collect</h2>
            <p>We collect account information (name, email, GitHub profile) when you sign in. We also collect usage data including uploaded images, generated videos, and interaction logs to provide and improve the service.</p>
          </section>

          <section>
            <h2 className="text-foreground font-semibold mb-2">2. How We Use Your Information</h2>
            <p>Your information is used to operate the service, process payments, generate content, improve our AI models, and communicate with you about your account. We do not sell your personal data to third parties.</p>
          </section>

          <section>
            <h2 className="text-foreground font-semibold mb-2">3. Data Storage</h2>
            <p>Your data is stored securely on cloud infrastructure. Uploaded files and generated content are retained for the duration of your subscription. You may request deletion of your data at any time.</p>
          </section>

          <section>
            <h2 className="text-foreground font-semibold mb-2">4. Your Rights</h2>
            <p>You have the right to access, correct, or delete your personal data. You may export your generated content at any time. Account deletion can be requested by contacting us.</p>
          </section>

          <section>
            <h2 className="text-foreground font-semibold mb-2">5. Cookies</h2>
            <p>We use essential cookies for authentication and session management. No third-party tracking cookies are used.</p>
          </section>

          <section>
            <h2 className="text-foreground font-semibold mb-2">6. Contact</h2>
            <p>For privacy-related inquiries, contact us at <a href="mailto:contact@agitoai.com" className="text-brand-gold hover:underline">contact@agitoai.com</a>.</p>
          </section>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            &larr; Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
