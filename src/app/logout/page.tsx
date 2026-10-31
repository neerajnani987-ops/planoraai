"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ArrowRight, Sparkles } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { LoadingState } from "@/components/ui/LoadingState";
import { useAuth } from "@/hooks/useAuth";

export default function LogoutPage() {
  const { logout, user } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function performLogout() {
      try {
        await logout();
      } catch (err) {
        console.error("Logout error:", err);
      } finally {
        if (isMounted) {
          setIsLoggingOut(false);
        }
      }
    }

    performLogout();

    return () => {
      isMounted = false;
    };
  }, [logout]);

  return (
    <div className="min-h-screen flex flex-col bg-[#faf9f5]">
      <Navbar />

      <main className="flex-1 max-w-md w-full mx-auto px-4 py-16 flex items-center justify-center">
        <Card className="w-full border-slate-200/90 shadow-xl bg-white overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-slate-900 via-teal-800 to-teal-500" />
          <CardContent className="p-8 text-center space-y-6">
            {isLoggingOut || user ? (
              <LoadingState
                title="Signing Out"
                description="Securely ending your Firebase session and clearing credentials..."
              />
            ) : (
              <>
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 border border-teal-200/80 shadow-xs">
                  <CheckCircle2 className="w-7 h-7 text-teal-600" />
                </div>

                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200/80 text-teal-800 text-xs font-semibold">
                    <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                    <span>Session Ended</span>
                  </div>
                  <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                    You have been signed out
                  </h1>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Your event data is safely stored in Cloud Firestore. Sign back in anytime to continue planning.
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <Link href="/login" className="block w-full">
                    <Button
                      variant="teal"
                      size="lg"
                      className="w-full justify-center shadow-md shadow-teal-700/10"
                      rightIcon={<ArrowRight className="w-4 h-4" />}
                    >
                      Sign In Again
                    </Button>
                  </Link>

                  <Link href="/" className="block w-full">
                    <Button
                      variant="outline"
                      size="md"
                      className="w-full justify-center text-slate-700 border-slate-300 hover:bg-slate-50"
                    >
                      Return to Home
                    </Button>
                  </Link>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
