"use client";

import React from "react";
import Link from "next/link";
import { Lock, ArrowRight, ShieldCheck, Eye } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { LoadingState } from "@/components/ui/LoadingState";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

interface ProtectedRouteProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export function ProtectedRoute({
  children,
  title = "Authentication Required",
  description = "Sign in to access your saved event blueprints, budget trackers, and vendor contacts in Cloud Firestore.",
}: ProtectedRouteProps) {
  const { user, loading, isDemoMode, enterDemoMode } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#faf9f5]">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-8">
          <LoadingState
            title="Authenticating Session"
            description="Restoring your secure Firebase credentials and workspace state..."
          />
        </div>
        <Footer />
      </div>
    );
  }

  // Either authenticated user OR public demo mode is allowed to proceed
  if (user || isDemoMode) {
    return (
      <>
        {isDemoMode && !user && (
          <div className="bg-amber-500/10 border-b border-amber-300/60 px-4 py-2 text-center text-xs font-semibold text-amber-950 flex items-center justify-center gap-2">
            <Eye className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Public Demo Mode Active &mdash; Exploring with local sample events.
            </span>
            <Link
              href="/login"
              className="ml-2 underline font-bold text-teal-800 hover:text-teal-950 inline-flex items-center gap-0.5"
            >
              Sign in to save events to Cloud Firestore <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        )}
        {children}
      </>
    );
  }

  // Not authenticated & not demo mode: Render security gate
  return (
    <div className="min-h-screen flex flex-col bg-[#faf9f5]">
      <Navbar />

      <main className="flex-1 max-w-xl w-full mx-auto px-4 py-16 flex items-center justify-center">
        <Card className="w-full border-slate-200/90 shadow-xl bg-white overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-slate-900 via-teal-800 to-teal-500" />
          <CardContent className="p-8 text-center space-y-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 border border-teal-200/80 shadow-xs">
              <Lock className="w-7 h-7" />
            </div>

            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">{title}</h2>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">{description}</p>
            </div>

            <div className="space-y-3 pt-2">
              <Link href="/login" className="block w-full">
                <Button variant="teal" size="lg" className="w-full justify-center">
                  Sign In to Planora AI
                </Button>
              </Link>

              <Link href="/register" className="block w-full">
                <Button variant="outline" size="md" className="w-full justify-center">
                  Create New Account
                </Button>
              </Link>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-3 text-slate-400 font-semibold">Or Explore</span>
                </div>
              </div>

              <Button
                variant="secondary"
                size="md"
                onClick={enterDemoMode}
                className="w-full justify-center text-xs"
                leftIcon={<Eye className="w-4 h-4 text-slate-600" />}
              >
                Continue in Public Demo Mode
              </Button>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Secured with Firebase Authentication & Firestore Rules</span>
            </div>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
