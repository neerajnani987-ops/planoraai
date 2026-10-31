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
  signOut,
  updateProfile,
  onAuthStateChanged,
} from "firebase/auth";
import { getClientAuth } from "@/lib/firebase";

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  isDemoMode: boolean;
  authError: string | null;
  clearAuthError: () => void;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string, displayName: string) => Promise<User>;
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
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<User> => {
    setAuthError(null);
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
      let friendlyMsg = "Failed to sign in. Please check your credentials.";
      if (err && typeof err === "object" && "code" in err) {
        const code = (err as { code: string }).code;
        if (code === "auth/user-not-found" || code === "auth/wrong-password" || code === "auth/invalid-credential") {
          friendlyMsg = "Invalid email or password. Please try again.";
        } else if (code === "auth/too-many-requests") {
          friendlyMsg = "Too many failed attempts. Please reset your password or try again later.";
        }
      }
      setAuthError(friendlyMsg);
      throw new Error(friendlyMsg);
    }
  }, []);

  const register = useCallback(
    async (email: string, password: string, displayName: string): Promise<User> => {
      setAuthError(null);
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
        let friendlyMsg = "Registration failed. Please try again.";
        if (err && typeof err === "object" && "code" in err) {
          const code = (err as { code: string }).code;
          if (code === "auth/email-already-in-use") {
            friendlyMsg = "An account with this email already exists. Please log in.";
          } else if (code === "auth/weak-password") {
            friendlyMsg = "Password is too weak. Please use at least 8 characters.";
          }
        }
        setAuthError(friendlyMsg);
        throw new Error(friendlyMsg);
      }
    },
    []
  );

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
      clearAuthError,
      login,
      register,
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
      clearAuthError,
      login,
      register,
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
