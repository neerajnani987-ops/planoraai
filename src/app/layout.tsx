import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Planora AI — Plan smarter. Celebrate better.",
  description:
    "GenAI-powered intelligent event planning assistant for weddings, birthdays, and community events with deterministic budgets, automated timelines, and vendor checklists.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#faf9f5] text-slate-900 selection:bg-teal-100 selection:text-teal-900">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
