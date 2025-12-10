import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'DeepStack - AI-Powered Investment Research',
  description:
    'Research smarter with AI-powered analysis, emotional discipline tracking, and thesis validation. Build conviction, not just data.',
  keywords: [
    'investment research',
    'AI',
    'stock analysis',
    'emotional trading',
    'thesis tracking',
    'market research',
    'prediction markets',
  ],
  openGraph: {
    title: 'DeepStack - AI-Powered Investment Research',
    description:
      'Research smarter with AI-powered analysis, emotional discipline tracking, and thesis validation.',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DeepStack - AI-Powered Investment Research',
    description:
      'Research smarter with AI-powered analysis and emotional discipline frameworks.',
  },
};

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
