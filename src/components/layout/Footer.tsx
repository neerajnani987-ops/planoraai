import React from "react";
import Link from "next/link";
import { Sparkles, Shield } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-slate-200/80 bg-white/60 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white">
                <Sparkles className="h-4 w-4 text-teal-400" />
              </div>
              <span className="font-bold text-slate-900 text-lg">Planora AI</span>
            </div>
            <p className="text-sm text-slate-500 max-w-sm">
              Plan smarter. Celebrate better. Intelligent, deterministic event planning
              powered by Google Gemini and modern budget orchestration.
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-400 pt-2">
              <Shield className="w-3.5 h-3.5 text-teal-600" />
              <span>Deterministic budget verification & privacy first.</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-2 text-sm">
            <h4 className="font-semibold text-slate-900 text-xs uppercase tracking-wider">
              Navigation
            </h4>
            <ul className="space-y-1.5 text-slate-600">
              <li>
                <Link href="/" className="hover:text-teal-600 transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-teal-600 transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/create" className="hover:text-teal-600 transition-colors">
                  Create Event
                </Link>
              </li>
            </ul>
          </div>

          {/* Event Categories */}
          <div className="space-y-2 text-sm">
            <h4 className="font-semibold text-slate-900 text-xs uppercase tracking-wider">
              Event Types
            </h4>
            <ul className="space-y-1.5 text-slate-600">
              <li>Weddings & Receptions</li>
              <li>Milestone Birthdays</li>
              <li>Community & Festivals</li>
              <li>Corporate & Galas</li>
            </ul>
          </div>
        </div>

        {/* Disclaimer & Copyright */}
        <div className="pt-8 border-t border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} Planora AI. All rights reserved.</p>
          <p className="text-center sm:text-right text-[11px] text-slate-400 max-w-md">
            Advisory Note: AI-generated timelines and cost breakdowns are conceptual estimates. Always verify prices directly with licensed suppliers.
          </p>
        </div>
      </div>
    </footer>
  );
}
