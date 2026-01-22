import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Link from 'next/link';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Ad Scraper - Meta & TikTok Ad Library',
  description: 'Scrape and analyze high-performing ads from Meta and TikTok',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="min-h-screen flex flex-col">
          {/* Header */}
          <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
            <div className="container mx-auto px-4 h-14 flex items-center justify-between">
              <Link href="/" className="font-bold text-lg">
                Ad Scraper
              </Link>
              <nav className="flex items-center gap-6">
                <Link
                  href="/ads"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Library
                </Link>
                <Link
                  href="/scrape"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  New Scrape
                </Link>
                <Link
                  href="/jobs"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Jobs
                </Link>
              </nav>
            </div>
          </header>

          {/* Main content */}
          <main className="flex-1 container mx-auto px-4 py-8">{children}</main>

          {/* Footer */}
          <footer className="border-t py-4">
            <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
              StorePro Ops - Ad Scraper
            </div>
          </footer>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
