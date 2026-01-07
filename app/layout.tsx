import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import LoadingOverlay from '@/components/LoadingOverlay'
import NotificationPopup from '@/components/NotificationPopup'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Daily Activity Team & Planning Poker',
  description: 'Team collaboration and planning tool',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <LoadingOverlay />
        <NotificationPopup />
        {children}
      </body>
    </html>
  )
}
