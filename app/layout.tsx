import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bundled.design Storage - S3 File Manager",
  description: "Your All In One AI Subscription - Modern S3 file management with CloudFront integration, metadata viewing, and advanced upload features.",
  keywords: ["S3", "file manager", "cloud storage", "AWS", "CloudFront", "bundled.design", "AI subscription"],
  authors: [{ name: "Bundled.design" }],
  creator: "Bundled.design",
  publisher: "Bundled.design",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://storage.bundled.design',
    title: 'Bundled.design Storage - S3 File Manager',
    description: 'Your All In One AI Subscription - Modern S3 file management with CloudFront integration, metadata viewing, and advanced upload features.',
    siteName: 'Bundled.design Storage',
    images: [
      {
        url: '/opengraph-image.png',
        width: 1200,
        height: 630,
        alt: 'Bundled.design Storage - S3 File Manager',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bundled.design Storage - S3 File Manager',
    description: 'Your All In One AI Subscription - Modern S3 file management with CloudFront integration.',
    images: ['/twitter-image.png'],
    creator: '@bundleddesign',
  },
  icons: {
    icon: [
      { url: '/icon.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/icon.png',
  },
  manifest: '/manifest.json',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
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
        {children}
      </body>
    </html>
  );
}
