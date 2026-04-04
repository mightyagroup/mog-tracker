import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/lib/auth-context'

export const metadata: Metadata = {
  title: 'MOG Tracker — Mighty Oak Group',
  description: 'Federal and commercial bid tracking for Mighty Oak Group',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-[#111827] text-white">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
