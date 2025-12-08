import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'Privacy Policy | DeepStack',
    description: 'DeepStack Privacy Policy - How we collect, use, and protect your data',
};

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-background">
            <div className="container max-w-3xl mx-auto py-12 px-4">
                <Link href="/" className="text-primary hover:underline text-sm mb-8 inline-block">
                    &larr; Back to DeepStack
                </Link>

                <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
                <p className="text-muted-foreground mb-8">Last updated: December 8, 2025</p>

                <div className="prose prose-invert max-w-none space-y-6">
                    <section>
                        <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            DeepStack (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy.
                            This Privacy Policy explains how we collect, use, disclose, and safeguard your information
                            when you use our financial research platform.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">2. Information We Collect</h2>

                        <h3 className="text-lg font-medium mb-2 mt-4">2.1 Account Information</h3>
                        <ul className="list-disc list-inside text-muted-foreground space-y-1">
                            <li>Email address (for authentication)</li>
                            <li>Display name (optional)</li>
                            <li>Authentication tokens from third-party providers (Google, GitHub)</li>
                        </ul>

                        <h3 className="text-lg font-medium mb-2 mt-4">2.2 Usage Data</h3>
                        <ul className="list-disc list-inside text-muted-foreground space-y-1">
                            <li>Watchlists and symbol preferences</li>
                            <li>Paper trading journal entries</li>
                            <li>Thesis and analysis documents you create</li>
                            <li>Chat conversation history with AI</li>
                            <li>Price alert configurations</li>
                        </ul>

                        <h3 className="text-lg font-medium mb-2 mt-4">2.3 Technical Data</h3>
                        <ul className="list-disc list-inside text-muted-foreground space-y-1">
                            <li>IP address and approximate location</li>
                            <li>Browser type and version</li>
                            <li>Device information</li>
                            <li>Pages visited and features used</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">3. How We Use Your Information</h2>
                        <ul className="list-disc list-inside text-muted-foreground space-y-2">
                            <li><strong>Provide the Service:</strong> To deliver personalized market analysis and portfolio tracking</li>
                            <li><strong>Improve the Service:</strong> To understand usage patterns and enhance features</li>
                            <li><strong>Communication:</strong> To send service updates and respond to inquiries</li>
                            <li><strong>Security:</strong> To detect and prevent fraud or unauthorized access</li>
                            <li><strong>Legal Compliance:</strong> To comply with applicable laws and regulations</li>
                        </ul>
                    </section>

                    <section className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                        <h2 className="text-xl font-semibold mb-3">4. What We Do NOT Do</h2>
                        <ul className="list-disc list-inside text-muted-foreground space-y-2">
                            <li>We do NOT sell your personal information to third parties</li>
                            <li>We do NOT share your trading journal or thesis content with other users</li>
                            <li>We do NOT access your brokerage accounts or execute trades on your behalf</li>
                            <li>We do NOT store actual financial account credentials</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">5. Data Storage and Security</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Your data is stored securely using Supabase, which provides enterprise-grade security
                            including encryption at rest and in transit, row-level security policies, and regular
                            security audits. We implement appropriate technical and organizational measures to
                            protect your personal information.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">6. Third-Party Services</h2>
                        <p className="text-muted-foreground leading-relaxed mb-3">
                            We use the following third-party services that may collect data:
                        </p>
                        <ul className="list-disc list-inside text-muted-foreground space-y-1">
                            <li><strong>Supabase:</strong> Database and authentication</li>
                            <li><strong>Vercel:</strong> Hosting and analytics</li>
                            <li><strong>Alpaca:</strong> Market data provider (no personal data shared)</li>
                            <li><strong>Anthropic:</strong> AI processing (conversations may be processed)</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">7. Your Rights</h2>
                        <p className="text-muted-foreground leading-relaxed mb-3">
                            Depending on your location, you may have the following rights:
                        </p>
                        <ul className="list-disc list-inside text-muted-foreground space-y-1">
                            <li><strong>Access:</strong> Request a copy of your personal data</li>
                            <li><strong>Correction:</strong> Request correction of inaccurate data</li>
                            <li><strong>Deletion:</strong> Request deletion of your account and data</li>
                            <li><strong>Portability:</strong> Request your data in a machine-readable format</li>
                            <li><strong>Opt-out:</strong> Opt out of marketing communications</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">8. Data Retention</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            We retain your personal information for as long as your account is active or as needed
                            to provide services. You may request deletion of your account at any time, after which
                            we will delete your data within 30 days, except where retention is required by law.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">9. Cookies</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            We use essential cookies for authentication and session management. We may also use
                            analytics cookies to understand how the Service is used. You can control cookie
                            preferences through your browser settings.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">10. Children&apos;s Privacy</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            DeepStack is not intended for users under 18 years of age. We do not knowingly collect
                            personal information from children. If you believe we have collected data from a minor,
                            please contact us immediately.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">11. Changes to This Policy</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            We may update this Privacy Policy from time to time. We will notify you of any material
                            changes by posting the new policy on this page and updating the &quot;Last updated&quot; date.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">12. Contact Us</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            If you have questions about this Privacy Policy or wish to exercise your data rights,
                            please contact us at{' '}
                            <a href="mailto:privacy@deepstack.app" className="text-primary hover:underline">
                                privacy@deepstack.app
                            </a>
                        </p>
                    </section>
                </div>

                <div className="mt-12 pt-8 border-t border-border flex gap-4">
                    <Link href="/terms" className="text-sm text-primary hover:underline">
                        Terms of Service
                    </Link>
                </div>
            </div>
        </div>
    );
}
