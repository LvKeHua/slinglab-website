import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { Sidebar } from "@/components/layout/sidebar"
import { Providers } from "@/components/layout/providers"
import { StickyNotes } from "@/components/layout/sticky-notes"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Stone · Trading Journal",
  description: "Automated Trade Analytics & Portfolio Tracker",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="flex h-screen overflow-hidden antialiased">
        <Providers>
          <StickyNotes />
          <Sidebar />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="mx-auto max-w-7xl animate-fade-in">
              {children}
            </div>
          </main>
        </Providers>
      </body>
    </html>
  )
}
