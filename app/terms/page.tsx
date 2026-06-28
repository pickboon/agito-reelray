import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-12">
      <div className="max-w-2xl w-full">
        <h1 className="text-3xl font-bold text-foreground mb-8 text-center">
          Terms of Service
        </h1>

        <div className="bg-card border border-border rounded-lg p-8 space-y-6 text-sm text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-foreground font-semibold mb-2">1. Service Description</h2>
            <p>ReelRay is an AI-powered character consistency engine for short-form video production. We provide tools for generating and maintaining visual character consistency across video episodes.</p>
          </section>

          <section>
            <h2 className="text-foreground font-semibold mb-2">2. User Responsibilities</h2>
            <p>You agree to use the service only for lawful purposes. You are responsible for all content you upload and generate. You must not use the service to create content that infringes on third-party intellectual property or violates applicable laws.</p>
          </section>

          <section>
            <h2 className="text-foreground font-semibold mb-2">3. Intellectual Property</h2>
            <p>You retain ownership of content you upload. Generated content is licensed to you for commercial use under our service terms. We reserve all rights to the ReelRay platform, its technology, and underlying algorithms.</p>
          </section>

          <section>
            <h2 className="text-foreground font-semibold mb-2">4. Disclaimer</h2>
            <p>The service is provided &ldquo;as is&rdquo; without warranties of any kind. We do not guarantee uninterrupted availability or error-free operation. AI-generated content may not always meet expectations due to the nature of generative models.</p>
          </section>

          <section>
            <h2 className="text-foreground font-semibold mb-2">5. Governing Law</h2>
            <p>These terms are governed by the laws of the People&apos;s Republic of China. Any disputes shall be resolved through arbitration in Jinan, Shandong Province.</p>
          </section>

          <section>
            <h2 className="text-foreground font-semibold mb-2">6. Contact</h2>
            <p>For questions regarding these terms, contact us at <a href="mailto:contact@agitoai.com" className="text-brand-gold hover:underline">contact@agitoai.com</a>.</p>
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
