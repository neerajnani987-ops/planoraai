import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, Firestore, connectFirestoreEmulator } from "firebase/firestore";

/**
 * Web configuration for Planora AI Firebase project.
 * Project ID: planora-ai-f3e0b
 */
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDummyKeyForDevelopmentAndTesting00",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "planora-ai-f3e0b.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || "planora-ai-f3e0b",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "planora-ai-f3e0b.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1234567890",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:1234567890:web:abcdef123456",
};

/**
 * Evaluates whether an API key is a genuine, potentially active key
 * rather than a placeholder, template string, or dummy development value.
 */
export function isRealFirebaseApiKey(key?: string | null): boolean {
  if (!key) return false;
  const trimmed = key.trim();
  if (trimmed.length < 20) return false;
  if (trimmed.includes("your_")) return false;
  if (trimmed.includes("placeholder")) return false;
  if (trimmed.includes("dummy") || trimmed.includes("Dummy")) return false;
  if (trimmed.includes("example")) return false;
  if (trimmed === "AIzaSyDummyKeyForDevelopmentAndTesting00") return false;
  return true;
}

// Check if real config or placeholder
export const isFirebaseConfigured = Boolean(
  (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true" ||
    isRealFirebaseApiKey(process.env.NEXT_PUBLIC_FIREBASE_API_KEY)) &&
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
  !process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID.includes("your_") &&
  !process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID.includes("placeholder")
);

export function getFirebaseConfigDiagnostics(): {
  isConfigured: boolean;
  projectId: string;
  authDomain: string;
  hasValidApiKey: boolean;
  isEmulator: boolean;
  statusMessage: string;
} {
  const isEmulator = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true";
  const hasValidApiKey = isRealFirebaseApiKey(process.env.NEXT_PUBLIC_FIREBASE_API_KEY);
  const projectId = firebaseConfig.projectId;
  const authDomain = firebaseConfig.authDomain;

  let statusMessage = "Firebase Authentication is fully configured.";
  if (isEmulator) {
    statusMessage = "Firebase Local Emulator is active (http://localhost:9099).";
  } else if (!hasValidApiKey) {
    statusMessage =
      "Firebase Web API key is not configured or using a development placeholder. Update NEXT_PUBLIC_FIREBASE_API_KEY in .env.local or Vercel.";
  }

  return {
    isConfigured: isFirebaseConfigured,
    projectId,
    authDomain,
    hasValidApiKey,
    isEmulator,
    statusMessage,
  };
}

// Singleton Firebase instances
export function getClientFirebaseApp(): FirebaseApp {
  if (getApps().length > 0) {
    return getApp();
  }
  return initializeApp(firebaseConfig);
}

export function getClientAuth(): Auth {
  const app = getClientFirebaseApp();
  const auth = getAuth(app);

  if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true") {
    try {
      connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
    } catch {
      // Ignore if already connected
    }
  }

  return auth;
}

export function getClientFirestore(): Firestore {
  const app = getClientFirebaseApp();
  const db = getFirestore(app);

  if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true") {
    try {
      connectFirestoreEmulator(db, "localhost", 8080);
    } catch {
      // Ignore if already connected
    }
  }

  return db;
}

// Export pre-initialized instances for direct usage
export const app: FirebaseApp = getClientFirebaseApp();
export const auth: Auth = getClientAuth();
export const db: Firestore = getClientFirestore();
