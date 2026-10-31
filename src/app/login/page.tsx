"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight, Eye, ShieldCheck, KeyRound, CheckCircle2 } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/hooks/useAuth";
import { LoginInputSchema, ResetPasswordInputSchema } from "@/schemas/auth";
import { isFirebaseConfigured } from "@/lib/firebase";

export default function LoginPage() {
  const router = useRouter();
  const { login, resetPassword, enterDemoMode, authError, clearAuthError } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Password reset modal state
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [isResetLoading, setIsResetLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return; // Prevent duplicate submissions

    clearAuthError();
    setFieldErrors({});

    const validation = LoginInputSchema.safeParse({ email, password });
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
      await login(email, password);
      router.push("/dashboard");
    } catch {
      // Auth error message is set in AuthContext
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isResetLoading) return;

    setResetError(null);
    setResetSuccess(null);

    const validation = ResetPasswordInputSchema.safeParse({ email: resetEmail });
    if (!validation.success) {
      setResetError(validation.error.issues[0]?.message || "Please enter a valid email address.");
      return;
    }

    setIsResetLoading(true);
    try {
      await resetPassword(resetEmail);
      setResetSuccess(
        "If an account with that email exists, password reset instructions have been sent to your inbox."
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to send password reset email.";
      setResetError(msg);
    } finally {
      setIsResetLoading(false);
    }
  };

  const openResetModal = () => {
    setResetEmail(email || "");
    setResetError(null);
    setResetSuccess(null);
    setIsResetModalOpen(true);
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
                <span>Planora AI Workspace</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Welcome Back
              </h1>
              <p className="text-xs text-slate-500">
                Sign in to manage your events, budgets, and AI blueprints.
              </p>
            </div>

            {/* Development / Placeholder Key Advisory */}
            {!isFirebaseConfigured && (
              <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-3.5 text-xs text-amber-900 leading-relaxed">
                <span className="font-bold block mb-1">Firebase Configuration Notice:</span>
                Your environment is currently using placeholder Firebase credentials. Real sign-in requires setting a valid{" "}
                <code className="font-mono bg-amber-200/60 px-1 py-0.5 rounded text-[11px]">
                  NEXT_PUBLIC_FIREBASE_API_KEY
                </code>{" "}
                in <code className="font-mono bg-amber-200/60 px-1 py-0.5 rounded text-[11px]">.env.local</code>. You can also explore all features using{" "}
                <strong>Public Demo Mode</strong> below.
              </div>
            )}

            {authError && (
              <Alert variant="danger" title="Authentication Error">
                {authError}
              </Alert>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
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

              <div className="space-y-1">
                <Input
                  label="Password"
                  type="password"
                  required
                  disabled={isLoading}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: "" }));
                  }}
                  error={fieldErrors.password}
                />
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={openResetModal}
                    className="text-xs font-semibold text-teal-700 hover:text-teal-900 hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                variant="teal"
                size="lg"
                isLoading={isLoading}
                disabled={isLoading}
                className="w-full justify-center shadow-md shadow-teal-700/10"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Sign In
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

            {/* Demo Mode Button */}
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={handleDemoClick}
              disabled={isLoading}
              className="w-full justify-center text-xs font-semibold text-slate-700 border-slate-300 hover:bg-slate-50"
              leftIcon={<Eye className="w-4 h-4 text-teal-600" />}
            >
              Explore Public Demo Mode
            </Button>

            {/* Footer Links */}
            <div className="pt-2 text-center text-xs text-slate-600 space-y-2">
              <div>
                Don&apos;t have an account yet?{" "}
                <Link
                  href="/register"
                  className="font-bold text-teal-700 hover:text-teal-900 underline"
                >
                  Create one now
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

      {/* Forgot Password Modal */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        title="Reset Password"
        description="Enter your registered account email and we will send you a secure link to reset your password."
      >
        <form onSubmit={handleResetSubmit} className="space-y-4 pt-2">
          {resetSuccess && (
            <Alert variant="success" title="Link Dispatched">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{resetSuccess}</span>
              </div>
            </Alert>
          )}

          {resetError && (
            <Alert variant="danger" title="Reset Error">
              {resetError}
            </Alert>
          )}

          {!resetSuccess && (
            <>
              <Input
                label="Registered Email Address"
                type="email"
                required
                disabled={isResetLoading}
                placeholder="you@example.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
              />

              <div className="flex items-center justify-end gap-3 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isResetLoading}
                  onClick={() => setIsResetModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="teal"
                  size="sm"
                  isLoading={isResetLoading}
                  disabled={isResetLoading}
                  leftIcon={<KeyRound className="w-3.5 h-3.5" />}
                >
                  Send Reset Link
                </Button>
              </div>
            </>
          )}

          {resetSuccess && (
            <div className="flex justify-end pt-3">
              <Button
                type="button"
                variant="teal"
                size="sm"
                onClick={() => setIsResetModalOpen(false)}
              >
                Done
              </Button>
            </div>
          )}
        </form>
      </Modal>

      <Footer />
    </div>
  );
}
