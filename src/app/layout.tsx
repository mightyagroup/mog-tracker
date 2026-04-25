import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/lib/auth-context'

export const metadata: Metadata = {
  title: 'MOG Tracker — Mighty Oak Group',
  description: 'Federal and commercial bid tracking for Mighty Oak Group',
  // Explicit UTF-8 charset declaration to prevent mojibake (â characters)
  // when the browser interprets multi-byte UTF-8 chars (—, ✓, ○) as Latin-1.
  other: {
    'Content-Type': 'text/html; charset=utf-8',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
      </head>
      <body className="antialiased bg-[#111827] text-white">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
