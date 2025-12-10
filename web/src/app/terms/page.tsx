import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'Terms of Service | deepstack',
    description: 'deepstack Terms of Service and User Agreement',
};

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-background">
            <div className="container max-w-3xl mx-auto py-12 px-4">
                <Link href="/" className="text-primary hover:underline text-sm mb-8 inline-block">
                    &larr; Back to deepstack
                </Link>

                <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
                <p className="text-muted-foreground mb-8">Last updated: December 8, 2025</p>

                <div className="prose prose-invert max-w-none space-y-6">
                    <section>
                        <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            By accessing or using deepstack (&quot;the Service&quot;), you agree to be bound by these Terms of Service.
                            If you do not agree to these terms, please do not use the Service.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">2. Description of Service</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            deepstack is a financial research and analysis platform that provides AI-powered market insights,
                            portfolio tracking, and trading analysis tools. The Service is designed for <strong>informational
                            and educational purposes only</strong>.
                        </p>
                    </section>

                    <section className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                        <h2 className="text-xl font-semibold mb-3 text-destructive">3. NOT FINANCIAL ADVICE</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            <strong>IMPORTANT:</strong> deepstack does NOT provide financial, investment, legal, or tax advice.
                            All information, analysis, and insights provided through the Service are for informational purposes only
                            and should not be construed as a recommendation to buy, sell, or hold any security or investment.
                        </p>
                        <p className="text-muted-foreground leading-relaxed mt-3">
                            You should always consult with a qualified financial advisor, accountant, or legal professional
                            before making any investment decisions. Past performance is not indicative of future results.
                            Trading in financial markets involves substantial risk of loss.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">4. No Trade Execution</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            deepstack does NOT execute trades on your behalf. The Service provides analysis tools and
                            paper trading simulations only. Any actual trading must be done through your own brokerage
                            account at your own risk.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">5. User Responsibilities</h2>
                        <ul className="list-disc list-inside text-muted-foreground space-y-2">
                            <li>You are responsible for maintaining the confidentiality of your account credentials</li>
                            <li>You agree to use the Service only for lawful purposes</li>
                            <li>You will not attempt to reverse engineer, modify, or interfere with the Service</li>
                            <li>You acknowledge that all investment decisions are your own responsibility</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">6. Data Accuracy</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            While we strive to provide accurate market data and analysis, we cannot guarantee the accuracy,
                            completeness, or timeliness of any information. Market data may be delayed and should not be
                            relied upon for time-sensitive trading decisions.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">7. Limitation of Liability</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            TO THE MAXIMUM EXTENT PERMITTED BY LAW, DEEPSTACK AND ITS AFFILIATES SHALL NOT BE LIABLE FOR
                            ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED
                            TO LOSS OF PROFITS, DATA, OR OTHER INTANGIBLE LOSSES, RESULTING FROM YOUR USE OF THE SERVICE.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">8. Modifications to Service</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            We reserve the right to modify, suspend, or discontinue the Service at any time without notice.
                            We may also modify these Terms of Service at any time. Continued use of the Service constitutes
                            acceptance of any modifications.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">9. Intellectual Property</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            All content, features, and functionality of the Service are owned by deepstack and are protected
                            by copyright, trademark, and other intellectual property laws.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">10. Governing Law</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            These Terms shall be governed by and construed in accordance with the laws of the United States,
                            without regard to its conflict of law provisions.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">11. Contact</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            If you have any questions about these Terms, please contact us at{' '}
                            <a href="mailto:legal@deepstack.app" className="text-primary hover:underline">
                                legal@deepstack.app
                            </a>
                        </p>
                    </section>
                </div>

                <div className="mt-12 pt-8 border-t border-border">
                    <p className="text-sm text-muted-foreground">
                        By using deepstack, you acknowledge that you have read, understood, and agree to these Terms of Service.
                    </p>
                </div>
            </div>
        </div>
    );
}
