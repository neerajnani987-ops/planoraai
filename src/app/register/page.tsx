"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, ShieldCheck, UserCheck, Eye } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { useAuth } from "@/hooks/useAuth";
import { RegisterInputSchema } from "@/schemas/auth";
import { isFirebaseConfigured } from "@/lib/firebase";

export default function RegisterPage() {
  const router = useRouter();
  const { register, enterDemoMode, authError, authErrorCode, clearAuthError } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return; // Prevent duplicate submissions

    clearAuthError();
    setFieldErrors({});

    if (password !== confirmPassword) {
      setFieldErrors({ confirmPassword: "Passwords do not match." });
      return;
    }

    const validation = RegisterInputSchema.safeParse({ displayName, email, password });
    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        const path = issue.path[0];
        if (path) errors[String(path)] = issue.message;
      });
      setFieldErrors(errors);
      return;
    }

    setIsLoading(true);
    try {
      await register(email, password, displayName);
      router.push("/dashboard");
    } catch {
      // Auth error is captured in AuthContext
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoClick = () => {
    enterDemoMode();
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#faf9f5]">
      <Navbar />

      <main className="flex-1 max-w-md w-full mx-auto px-4 py-12 sm:py-16 flex items-center justify-center">
        <Card className="w-full border-slate-200/90 shadow-xl bg-white overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-slate-900 via-teal-800 to-teal-500" />
          <CardContent className="p-6 sm:p-8 space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200/80 text-teal-800 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                <span>Create Your Account</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Join Planora AI
              </h1>
              <p className="text-xs text-slate-500">
                Unlock persistent cloud event storage, custom AI models, and real-time budgeting.
              </p>
            </div>

            {/* Development / Placeholder Key Advisory */}
            {!isFirebaseConfigured && (
              <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-3.5 text-xs text-amber-900 leading-relaxed">
                <span className="font-bold block mb-1">Firebase Configuration Notice:</span>
                Your environment is currently using placeholder Firebase credentials. Real account creation requires setting a valid{" "}
                <code className="font-mono bg-amber-200/60 px-1 py-0.5 rounded text-[11px]">
                  NEXT_PUBLIC_FIREBASE_API_KEY
                </code>{" "}
                in <code className="font-mono bg-amber-200/60 px-1 py-0.5 rounded text-[11px]">.env.local</code>. You can explore all features using{" "}
                <strong>Public Demo Mode</strong> below.
              </div>
            )}

            {authError && (
              <Alert variant="danger" title={`Registration Error${authErrorCode ? ` (${authErrorCode})` : ""}`}>
                <p>{authError}</p>
              </Alert>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Full Name"
                type="text"
                required
                disabled={isLoading}
                placeholder="e.g. Taylor Morgan"
                value={displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value);
                  if (fieldErrors.displayName) setFieldErrors((prev) => ({ ...prev, displayName: "" }));
                }}
                error={fieldErrors.displayName}
              />

              <Input
                label="Email Address"
                type="email"
                required
                disabled={isLoading}
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: "" }));
                }}
                error={fieldErrors.email}
              />

              <Input
                label="Password"
                type="password"
                required
                disabled={isLoading}
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: "" }));
                }}
                error={fieldErrors.password}
              />

              <Input
                label="Confirm Password"
                type="password"
                required
                disabled={isLoading}
                placeholder="Repeat password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (fieldErrors.confirmPassword) setFieldErrors((prev) => ({ ...prev, confirmPassword: "" }));
                }}
                error={fieldErrors.confirmPassword}
              />

              <Button
                type="submit"
                variant="teal"
                size="lg"
                isLoading={isLoading}
                disabled={isLoading}
                className="w-full justify-center shadow-md shadow-teal-700/10"
                rightIcon={<UserCheck className="w-4 h-4" />}
              >
                Create Account
              </Button>
            </form>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-3 text-slate-400 font-semibold">Or</span>
              </div>
            </div>

            {/* Demo Button */}
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={handleDemoClick}
              disabled={isLoading}
              className="w-full justify-center text-xs font-semibold text-slate-700 border-slate-300 hover:bg-slate-50"
              leftIcon={<Eye className="w-4 h-4 text-teal-600" />}
            >
              Continue as Guest (Demo Mode)
            </Button>

            {/* Footer */}
            <div className="pt-2 text-center text-xs text-slate-600 space-y-2">
              <div>
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="font-bold text-teal-700 hover:text-teal-900 underline"
                >
                  Sign in here
                </Link>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 pt-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Protected by Firebase Authentication & Firestore</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
