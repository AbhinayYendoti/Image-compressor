import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import ErrorBoundary from '@/components/ErrorBoundary';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Image Compressor - Secure & Fast Online Image Compression',
  description: 'Compress your images online with our secure, fast, and privacy-focused image compressor. Support for JPG, PNG, GIF, WebP, and SVG formats. Mobile-optimized with batch processing.',
  keywords: 'image compressor, online compression, JPG, PNG, WebP, image optimization, mobile-friendly',
  authors: [{ name: 'Image Compressor Team' }],
  robots: 'index, follow',
  openGraph: {
    title: 'Image Compressor - Secure & Fast Online Image Compression',
    description: 'Compress your images online with our secure, fast, and privacy-focused image compressor.',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Image Compressor - Secure & Fast Online Image Compression',
    description: 'Compress your images online with our secure, fast, and privacy-focused image compressor.',
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <head>
        <meta name="theme-color" content="#0ea5e9" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Image Compressor" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={`${inter.className} h-full bg-gray-50 antialiased`}>
        <ErrorBoundary>
          <div id="root" className="h-full">
            {children}
          </div>
        </ErrorBoundary>
      </body>
    </html>
  );
}
