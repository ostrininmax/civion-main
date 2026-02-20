import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AppProviders } from '../components/AppProviders';
import { AppShell } from '../components/AppShell';

const inter = Inter({ subsets: ['latin', 'cyrillic'], weight: ['400', '500', '600', '700'] });

export const metadata: Metadata = {
  title: 'Citizen Digital Services',
  description: 'Diia-inspired civic operating system MVP for Cyprus'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <body className={`${inter.className} app-shell`}>
        <AppProviders>
          <AppShell>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
