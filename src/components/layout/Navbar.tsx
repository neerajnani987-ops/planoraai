"use client";

import React, { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sparkles,
  Plus,
  Menu,
  X,
  LayoutDashboard,
  Compass,
  LogOut,
  User as UserIcon,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

function useMounted(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mounted = useMounted();
  const { user, logout, isDemoMode } = useAuth();

  const navLinks = [
    { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: "Create Event", href: "/create", icon: <Plus className="w-4 h-4" /> },
    { label: "Templates", href: "/templates", icon: <Compass className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-slate-900 via-teal-900 to-teal-600 text-white shadow-md shadow-teal-900/10 group-hover:scale-105 transition-transform">
            <Sparkles className="h-5 w-5 text-amber-300" />
          </div>
          <div>
            <span className="text-lg font-black tracking-tight text-slate-900">
              Planora<span className="text-teal-600">AI</span>
            </span>
            <span className="hidden sm:block text-[10px] font-medium text-slate-500 uppercase tracking-widest -mt-1">
              Event Intelligence
            </span>
          </div>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-xl transition-colors",
                  isActive
                    ? "bg-slate-100 text-slate-900 font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                )}
              >
                {link.icon}
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Auth & CTA */}
        <div className="hidden sm:flex items-center gap-3">
          {!mounted ? (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm" className="text-slate-700">
                  Sign In
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="outline" size="sm" className="font-semibold">
                  Register
                </Button>
              </Link>
            </div>
          ) : user ? (
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200/70 text-xs font-semibold text-slate-800">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-600 text-white font-bold text-[10px]">
                  {(user.displayName || user.email || "U")[0]?.toUpperCase()}
                </div>
                <span className="max-w-[120px] truncate">
                  {user.displayName || user.email?.split("@")[0]}
                </span>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => logout()}
                className="text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                title="Sign Out"
                leftIcon={<LogOut className="w-3.5 h-3.5" />}
              >
                Sign Out
              </Button>
            </div>
          ) : isDemoMode ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
                <Eye className="w-3.5 h-3.5 text-amber-600" />
                <span>Demo Mode</span>
              </span>
              <Link href="/login">
                <Button variant="outline" size="sm">
                  Sign In
                </Button>
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm" className="text-slate-700">
                  Sign In
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="outline" size="sm" className="font-semibold">
                  Register
                </Button>
              </Link>
            </div>
          )}

          <Link href="/create">
            <Button
              variant="teal"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Plan Event
            </Button>
          </Link>
        </div>

        {/* Mobile menu toggle */}
        <div className="flex md:hidden">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl text-slate-600 hover:bg-slate-100"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white px-4 pt-2 pb-4 space-y-2">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium",
                  isActive
                    ? "bg-teal-50 text-teal-800 font-semibold"
                    : "text-slate-700 hover:bg-slate-50"
                )}
              >
                {link.icon}
                <span>{link.label}</span>
              </Link>
            );
          })}

          <div className="pt-3 border-t border-slate-100 space-y-2">
            {!mounted ? (
              <div className="grid grid-cols-2 gap-2">
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" size="sm" className="w-full">
                    Sign In
                  </Button>
                </Link>
                <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="teal" size="sm" className="w-full">
                    Register
                  </Button>
                </Link>
              </div>
            ) : user ? (
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                  <UserIcon className="w-4 h-4 text-slate-500" />
                  <span>{user.displayName || user.email}</span>
                </div>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="text-xs font-bold text-rose-600 hover:underline"
                >
                  Sign Out
                </button>
              </div>
            ) : isDemoMode ? (
              <div className="flex items-center justify-between py-1">
                <span className="text-xs font-semibold text-amber-800">Demo Mode Active</span>
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" size="sm">
                    Sign In
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" size="sm" className="w-full">
                    Sign In
                  </Button>
                </Link>
                <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="teal" size="sm" className="w-full">
                    Register
                  </Button>
                </Link>
              </div>
            )}

            <Link href="/create" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="teal" size="md" className="w-full mt-1">
                Plan Event with AI
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
