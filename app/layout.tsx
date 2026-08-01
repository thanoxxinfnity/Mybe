import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthRedirectHandler } from '@/components/auth-redirect-handler';

export const metadata: Metadata = {
  title: 'X Protocol - AI 3D Model Generator',
  description: 'Generate stunning 3D models from text using X Protocol AI. Get 100 free credits on signup.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased bg-background text-foreground min-h-screen">
        <AuthRedirectHandler />
        {children}
      </body>
    </html>
  );
}
