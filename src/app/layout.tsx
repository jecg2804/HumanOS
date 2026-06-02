import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'HumanOS - ICONSA',
  description: 'Portal interno de Recursos Humanos ICONSA',
  // FE-4: iOS standalone PWA. app/icon.png + app/apple-icon.png + app/favicon.ico are auto-linked by Next.
  appleWebApp: { capable: true, title: 'HumanOS', statusBarStyle: 'default' },
};

// FE-4: mobile rendering + theme color. (app/manifest.ts is auto-linked by Next.)
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // themeColor must be a real color value (meta theme-color), not a Tailwind token.
  // eslint-disable-next-line no-restricted-syntax
  themeColor: '#1B3A5C',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="antialiased min-h-screen bg-background text-foreground">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
