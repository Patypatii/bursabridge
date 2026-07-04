import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { MessageCircle, Phone } from "lucide-react";
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
  title: "BursaBridge AI",
  description:
    "Your bridge to NG-CDF bursary information. Get accurate information, track your application, and receive reminders from any phone.",
};

function Logo() {
  return (
    <span className="flex items-center gap-2">
      <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
        <path
          d="M2 24 Q16 8 30 24"
          fill="none"
          stroke="#15803d"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <line x1="8" y1="20" x2="8" y2="26" stroke="#15803d" strokeWidth="2.5" />
        <line x1="16" y1="16" x2="16" y2="26" stroke="#15803d" strokeWidth="2.5" />
        <line x1="24" y1="20" x2="24" y2="26" stroke="#15803d" strokeWidth="2.5" />
      </svg>
      <span className="text-xl font-bold tracking-tight">
        <span className="text-gray-900">Bursa</span>
        <span className="text-green-700">Bridge</span>
      </span>
    </span>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <header className="bg-white border-b border-gray-200">
          <div className="mx-auto max-w-7xl px-6 py-3 flex items-center justify-between">
            <Link href="/">
              <Logo />
            </Link>
            <nav className="flex items-center gap-2 text-sm font-medium">
              <Link
                href="/"
                className="flex items-center gap-2 px-4 py-2 rounded-full text-gray-700 hover:bg-green-50 hover:text-green-800"
              >
                <MessageCircle size={16} /> Web Chat
              </Link>
              <Link
                href="/ussd"
                className="flex items-center gap-2 px-4 py-2 rounded-full text-gray-700 hover:bg-green-50 hover:text-green-800"
              >
                <Phone size={16} /> USSD *123#
              </Link>
            </nav>
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
