import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import {
  getAuth,
  Auth,
  connectAuthEmulator,
  browserLocalPersistence,
  setPersistence,
} from "firebase/auth";
import { getFirestore, Firestore, connectFirestoreEmulator } from "firebase/firestore";

/**
 * Sanitizes and trims environment variable strings, stripping accidental outer quotes.
 */
function cleanEnv(val?: string | null): string {
  if (!val) return "";
  return val.trim().replace(/^["']|["']$/g, "");
}

/**
 * Evaluates whether a value is an unconfigured template string, placeholder, or dummy value.
 */
export function isPlaceholderValue(val?: string | null): boolean {
  if (!val) return true;
  const trimmed = cleanEnv(val);
  if (!trimmed) return true;
  const lower = trimmed.toLowerCase();
  return (
    lower.includes("your_") ||
    lower.includes("placeholder") ||
    lower.includes("dummy") ||
    lower.includes("example") ||
    lower.includes("changeme") ||
    lower.includes("<your") ||
    lower.includes("xxx") ||
    lower === "undefined" ||
    lower === "null" ||
    lower.includes("...")
  );
}

/**
 * Evaluates whether an API key is a genuine, potentially active Firebase Web API key
 * rather than a placeholder, template string, or dummy development value.
 */
export function isRealFirebaseApiKey(key?: string | null): boolean {
  if (!key) return false;
  const trimmed = cleanEnv(key);
  if (trimmed.length < 20) return false;
  if (isPlaceholderValue(trimmed)) return false;
  if (trimmed === "AIzaSyDummyKeyForDevelopmentAndTesting00") return false;
  return true;
}

const rawApiKey = cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_API_KEY);
const rawAuthDomain = cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN);
const rawProjectId = cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
const rawStorageBucket = cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
const rawMessagingSenderId = cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID);
const rawAppId = cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_APP_ID);

/**
 * Validates required variables before initializing Firebase on the client.
 * Strictly verifies variables needed by Planora AI: apiKey, projectId, authDomain.
 */
export function validateFirebaseClientConfig(): {
  isValid: boolean;
  isEmulator: boolean;
  missingVariables: string[];
  placeholderVariables: string[];
  issues: string[];
} {
  const isEmulator = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true";
  if (isEmulator) {
    return {
      isValid: true,
      isEmulator: true,
      missingVariables: [],
      placeholderVariables: [],
      issues: [],
    };
  }

  const missingVariables: string[] = [];
  const placeholderVariables: string[] = [];
  const issues: string[] = [];

  if (!rawApiKey) {
    missingVariables.push("NEXT_PUBLIC_FIREBASE_API_KEY");
  } else if (!isRealFirebaseApiKey(rawApiKey)) {
    placeholderVariables.push("NEXT_PUBLIC_FIREBASE_API_KEY");
    issues.push("NEXT_PUBLIC_FIREBASE_API_KEY is using a placeholder or development dummy string.");
  }

  if (!rawProjectId) {
    missingVariables.push("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  } else if (isPlaceholderValue(rawProjectId)) {
    placeholderVariables.push("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
    issues.push("NEXT_PUBLIC_FIREBASE_PROJECT_ID is using a placeholder string.");
  }

  if (rawAuthDomain && isPlaceholderValue(rawAuthDomain)) {
    placeholderVariables.push("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN");
    issues.push("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN is using a placeholder string.");
  }

  const isValid = missingVariables.length === 0 && placeholderVariables.length === 0;

  return {
    isValid,
    isEmulator: false,
    missingVariables,
    placeholderVariables,
    issues,
  };
}

/**
 * Evaluates whether Firebase is completely and correctly configured for client-side operations.
 */
export const isFirebaseConfigured: boolean = validateFirebaseClientConfig().isValid;

/**
 * Web configuration for Planora AI Firebase project.
 * Project ID: planora-ai-f3e0b
 * Never replaces missing production credentials with fake credentials.
 */
export const firebaseConfig = {
  apiKey:
    rawApiKey ||
    (process.env.NODE_ENV === "test" ? "AIzaSyDummyKeyForDevelopmentAndTesting00" : ""),
  authDomain:
    rawAuthDomain ||
    (rawProjectId ? `${rawProjectId}.firebaseapp.com` : "planora-ai-f3e0b.firebaseapp.com"),
  projectId: rawProjectId || "planora-ai-f3e0b",
  storageBucket:
    rawStorageBucket ||
    (rawProjectId ? `${rawProjectId}.firebasestorage.app` : "planora-ai-f3e0b.firebasestorage.app"),
  ...(rawMessagingSenderId && !isPlaceholderValue(rawMessagingSenderId)
    ? { messagingSenderId: rawMessagingSenderId }
    : {}),
  ...(rawAppId && !isPlaceholderValue(rawAppId) ? { appId: rawAppId } : {}),
};

export function getFirebaseConfigDiagnostics(): {
  isConfigured: boolean;
  projectId: string;
  authDomain: string;
  hasValidApiKey: boolean;
  isEmulator: boolean;
  missingVariables: string[];
  placeholderVariables: string[];
  statusMessage: string;
} {
  const validation = validateFirebaseClientConfig();
  const projectId = firebaseConfig.projectId;
  const authDomain = firebaseConfig.authDomain;

  let statusMessage = "Firebase Authentication is fully configured.";
  if (validation.isEmulator) {
    statusMessage = "Firebase Local Emulator is active (http://localhost:9099).";
  } else if (validation.missingVariables.length > 0) {
    statusMessage = `Firebase configuration incomplete: missing ${validation.missingVariables.join(", ")}.`;
  } else if (validation.placeholderVariables.length > 0) {
    statusMessage = `Firebase configuration incomplete: ${validation.placeholderVariables.join(", ")} is using a placeholder string. Set valid credentials in Vercel or .env.local.`;
  }

  return {
    isConfigured: validation.isValid,
    projectId,
    authDomain,
    hasValidApiKey: isRealFirebaseApiKey(firebaseConfig.apiKey),
    isEmulator: validation.isEmulator,
    missingVariables: validation.missingVariables,
    placeholderVariables: validation.placeholderVariables,
    statusMessage,
  };
}

let _clientApp: FirebaseApp | null = null;
let _clientAuth: Auth | null = null;
let _clientFirestore: Firestore | null = null;

// Singleton Firebase instances
export function getClientFirebaseApp(): FirebaseApp {
  if (_clientApp) return _clientApp;
  if (getApps().length > 0) {
    _clientApp = getApp();
    return _clientApp;
  }
  _clientApp = initializeApp(firebaseConfig);
  return _clientApp;
}

export function getClientAuth(): Auth {
  if (_clientAuth) return _clientAuth;
  const clientApp = getClientFirebaseApp();

  try {
    const authInstance = getAuth(clientApp);

    if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true") {
      try {
        connectAuthEmulator(authInstance, "http://localhost:9099", { disableWarnings: true });
      } catch {
        // Ignore if already connected
      }
    }

    if (typeof window !== "undefined") {
      try {
        setPersistence(authInstance, browserLocalPersistence).catch(() => {});
      } catch {
        // Ignore persistence setup errors in unsupported environments
      }
    }

    _clientAuth = authInstance;
    return authInstance;
  } catch (error) {
    if (!isFirebaseConfigured) {
      throw new Error(
        "Firebase Authentication cannot initialize: NEXT_PUBLIC_FIREBASE_API_KEY is missing or invalid in your environment."
      );
    }
    throw error;
  }
}

export function getClientFirestore(): Firestore {
  if (_clientFirestore) return _clientFirestore;
  const clientApp = getClientFirebaseApp();
  const dbInstance = getFirestore(clientApp);

  if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true") {
    try {
      connectFirestoreEmulator(dbInstance, "localhost", 8080);
    } catch {
      // Ignore if already connected
    }
  }

  _clientFirestore = dbInstance;
  return dbInstance;
}

// Export pre-initialized instances with safe delegation
export const app: FirebaseApp = getClientFirebaseApp();

export const auth: Auth = new Proxy({} as Auth, {
  get(_target, prop) {
    const realAuth = getClientAuth();
    const val = (realAuth as unknown as Record<string, unknown>)[prop as string];
    if (typeof val === "function") {
      return val.bind(realAuth);
    }
    return val;
  },
});

export const db: Firestore = new Proxy({} as Firestore, {
  get(_target, prop) {
    const realDb = getClientFirestore();
    const val = (realDb as unknown as Record<string, unknown>)[prop as string];
    if (typeof val === "function") {
      return val.bind(realDb);
    }
    return val;
  },
});
