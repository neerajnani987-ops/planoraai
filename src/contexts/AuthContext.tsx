"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useSyncExternalStore,
} from "react";
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
  onAuthStateChanged,
} from "firebase/auth";
import { getClientAuth, isFirebaseConfigured } from "@/lib/firebase";
import { formatFirebaseAuthError } from "@/lib/auth-errors";

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  isDemoMode: boolean;
  authError: string | null;
  authErrorCode: string | null;
  clearAuthError: () => void;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string, displayName: string) => Promise<User>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  enterDemoMode: () => void;
  exitDemoMode: () => void;
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_STORAGE_KEY = "planora_ai_public_demo_mode";

// External store subscription to synchronize localStorage state safely across SSR and hydration
const demoListeners = new Set<() => void>();
function notifyDemoListeners() {
  demoListeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // ignore
    }
  });
}

function subscribeDemoMode(callback: () => void) {
  demoListeners.add(callback);
  if (typeof window !== "undefined") {
    window.addEventListener("storage", callback);
  }
  return () => {
    demoListeners.delete(callback);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", callback);
    }
  };
}

function getDemoModeSnapshot(): boolean {
  try {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(DEMO_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function getDemoModeServerSnapshot(): boolean {
  return false;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authErrorCode, setAuthErrorCode] = useState<string | null>(null);

  // useSyncExternalStore guarantees identical server/client initial render (false)
  // and updates cleanly after hydration with zero hydration mismatch or cascading renders
  const isDemoMode = useSyncExternalStore(
    subscribeDemoMode,
    getDemoModeSnapshot,
    getDemoModeServerSnapshot
  );

  // Restore auth state on mount
  useEffect(() => {
    let unsubscribe = () => {};
    try {
      const auth = getClientAuth();
      unsubscribe = onAuthStateChanged(
        auth,
        (firebaseUser) => {
          setUser(firebaseUser);
          if (firebaseUser) {
            // When real user logs in, automatically exit demo mode
            try {
              localStorage.removeItem(DEMO_STORAGE_KEY);
              notifyDemoListeners();
            } catch {
              // ignore
            }
          }
          setLoading(false);
        },
        (error) => {
          console.warn("Auth state observer error:", error);
          setLoading(false);
        }
      );
    } catch (err) {
      console.warn("Could not initialize Firebase Auth observer:", err);
      queueMicrotask(() => {
        setLoading(false);
      });
    }

    return () => unsubscribe();
  }, []);

  const clearAuthError = useCallback(() => {
    setAuthError(null);
    setAuthErrorCode(null);
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<User> => {
    setAuthError(null);
    setAuthErrorCode(null);

    if (!isFirebaseConfigured) {
      const err = formatFirebaseAuthError(
        {
          code: "auth/invalid-api-key",
          message:
            "Firebase Authentication is not configured. Please set a valid NEXT_PUBLIC_FIREBASE_API_KEY from Firebase Console in your .env.local or Vercel environment variables.",
        },
        "login"
      );
      setAuthError(err.userMessage);
      setAuthErrorCode(err.code);
      throw new Error(err.userMessage);
    }

    try {
      const auth = getClientAuth();
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      setUser(cred.user);
      try {
        localStorage.removeItem(DEMO_STORAGE_KEY);
        notifyDemoListeners();
      } catch {
        // ignore
      }
      return cred.user;
    } catch (err: unknown) {
      const { code, userMessage, diagnostic } = formatFirebaseAuthError(err, "login");
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[Planora Auth] login failed [${code}]:`, diagnostic);
      }
      setAuthError(userMessage);
      setAuthErrorCode(code);
      throw new Error(userMessage);
    }
  }, []);

  const register = useCallback(
    async (email: string, password: string, displayName: string): Promise<User> => {
      setAuthError(null);
      setAuthErrorCode(null);

      if (!isFirebaseConfigured) {
        const err = formatFirebaseAuthError(
          {
            code: "auth/invalid-api-key",
            message:
              "Firebase Authentication is not configured. Please set a valid NEXT_PUBLIC_FIREBASE_API_KEY from Firebase Console in your .env.local or Vercel environment variables.",
          },
          "register"
        );
        setAuthError(err.userMessage);
        setAuthErrorCode(err.code);
        throw new Error(err.userMessage);
      }

      try {
        const auth = getClientAuth();
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(cred.user, { displayName: displayName.trim() });
        setUser({ ...cred.user, displayName: displayName.trim() } as User);
        try {
          localStorage.removeItem(DEMO_STORAGE_KEY);
          notifyDemoListeners();
        } catch {
          // ignore
        }
        return cred.user;
      } catch (err: unknown) {
        const { code, userMessage, diagnostic } = formatFirebaseAuthError(err, "register");
        if (process.env.NODE_ENV !== "production") {
          console.warn(`[Planora Auth] register failed [${code}]:`, diagnostic);
        }
        setAuthError(userMessage);
        setAuthErrorCode(code);
        throw new Error(userMessage);
      }
    },
    []
  );

  const resetPassword = useCallback(async (email: string): Promise<void> => {
    setAuthError(null);
    setAuthErrorCode(null);

    if (!isFirebaseConfigured) {
      const err = formatFirebaseAuthError(
        {
          code: "auth/invalid-api-key",
          message:
            "Firebase Authentication is not configured. Please set a valid NEXT_PUBLIC_FIREBASE_API_KEY from Firebase Console in your .env.local or Vercel environment variables.",
        },
        "reset"
      );
      setAuthError(err.userMessage);
      setAuthErrorCode(err.code);
      throw new Error(err.userMessage);
    }

    try {
      const auth = getClientAuth();
      await sendPasswordResetEmail(auth, email.trim());
    } catch (err: unknown) {
      const { code, userMessage, diagnostic } = formatFirebaseAuthError(err, "reset");
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[Planora Auth] password reset failed [${code}]:`, diagnostic);
      }
      setAuthError(userMessage);
      setAuthErrorCode(code);
      throw new Error(userMessage);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      const auth = getClientAuth();
      await signOut(auth);
      setUser(null);
      try {
        localStorage.removeItem(DEMO_STORAGE_KEY);
        notifyDemoListeners();
      } catch {
        // ignore
      }
    } catch (err) {
      console.error("Sign out error:", err);
    }
  }, []);

  const enterDemoMode = useCallback(() => {
    try {
      localStorage.setItem(DEMO_STORAGE_KEY, "true");
      notifyDemoListeners();
    } catch {
      // ignore
    }
  }, []);

  const exitDemoMode = useCallback(() => {
    try {
      localStorage.removeItem(DEMO_STORAGE_KEY);
      notifyDemoListeners();
    } catch {
      // ignore
    }
  }, []);

  const getIdToken = useCallback(async (): Promise<string | null> => {
    if (!user) return null;
    try {
      return await user.getIdToken();
    } catch (err) {
      console.warn("Could not retrieve ID token:", err);
      return null;
    }
  }, [user]);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      loading,
      isDemoMode,
      authError,
      authErrorCode,
      clearAuthError,
      login,
      register,
      resetPassword,
      logout,
      enterDemoMode,
      exitDemoMode,
      getIdToken,
    }),
    [
      user,
      loading,
      isDemoMode,
      authError,
      authErrorCode,
      clearAuthError,
      login,
      register,
      resetPassword,
      logout,
      enterDemoMode,
      exitDemoMode,
      getIdToken,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
