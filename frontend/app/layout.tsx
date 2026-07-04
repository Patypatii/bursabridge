import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
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

const values = [
  ["🔒", "Secure & Private", "Data Protection Act, 2019"],
  ["👥", "Inclusive Access", "USSD, SMS & Web for everyone"],
  ["👁️", "Transparent", "Status tracking = accountability"],
  ["📱", "Local & Simple", "English na Kiswahili"],
  ["🛡️", "Your Data, Your Control", "Only what is necessary"],
  ["⭐", "Our Mission", "Equal access to public opportunities"],
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <header className="bg-white border-b border-gray-200">
          <div className="mx-auto max-w-6xl px-6 py-3 flex items-center justify-between">
            <Link href="/">
              <Logo />
            </Link>
            <nav className="flex items-center gap-2 text-sm font-medium">
              <Link
                href="/"
                className="px-4 py-2 rounded-full text-gray-700 hover:bg-green-50 hover:text-green-800"
              >
                💬 Web Chat
              </Link>
              <Link
                href="/ussd"
                className="px-4 py-2 rounded-full text-gray-700 hover:bg-green-50 hover:text-green-800"
              >
                ☎️ USSD *123#
              </Link>
            </nav>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="bg-white border-t border-gray-200 mt-8">
          <div className="mx-auto max-w-6xl px-6 py-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
            {values.map(([icon, title, sub]) => (
              <div key={title}>
                <div className="text-lg">{icon}</div>
                <div className="text-xs font-semibold text-gray-800">{title}</div>
                <div className="text-[10px] text-gray-500">{sub}</div>
              </div>
            ))}
          </div>
          <p className="pb-4 text-center text-[11px] text-gray-400">
            Part of the Mozilla Foundation × KamiLimu Democracy & AI Hackathon — July 4th, 2026
          </p>
        </footer>
      </body>
    </html>
  );
}
