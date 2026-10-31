import { describe, it, expect } from "vitest";
import {
  firebaseConfig,
  getClientFirebaseApp,
  getClientAuth,
  getClientFirestore,
  isRealFirebaseApiKey,
  isPlaceholderValue,
  validateFirebaseClientConfig,
  getFirebaseConfigDiagnostics,
  app,
  auth,
  db,
} from "@/lib/firebase";
import * as firebaseFromConfig from "@/firebase/config";

describe("Firebase Web Configuration & Client SDK Initialization", () => {
  it("uses the exact Firebase project ID 'planora-ai-f3e0b'", () => {
    expect(firebaseConfig.projectId).toBe("planora-ai-f3e0b");
  });

  it("configures authDomain and storageBucket for planora-ai-f3e0b", () => {
    expect(firebaseConfig.authDomain).toContain("planora-ai-f3e0b");
    expect(firebaseConfig.storageBucket).toContain("planora-ai-f3e0b");
  });

  it("exports valid FirebaseApp, Auth, and Firestore instances and getters", () => {
    expect(app).toBeDefined();
    expect(auth).toBeDefined();
    expect(db).toBeDefined();

    expect(getClientFirebaseApp()).toBe(app);
    expect(getClientAuth()).toBeDefined();
    expect(getClientFirestore()).toBeDefined();
  });

  it("re-exports identical configuration and instances from @/firebase/config", () => {
    expect(firebaseFromConfig.firebaseConfig.projectId).toBe("planora-ai-f3e0b");
    expect(firebaseFromConfig.app).toBe(app);
    expect(firebaseFromConfig.auth).toBeDefined();
    expect(firebaseFromConfig.db).toBeDefined();
    expect(firebaseFromConfig.validateFirebaseClientConfig).toBeDefined();
  });

  it("correctly distinguishes real vs placeholder API keys", () => {
    expect(isRealFirebaseApiKey("AIzaSyDummyKeyForDevelopmentAndTesting00")).toBe(false);
    expect(isRealFirebaseApiKey("your_firebase_api_key")).toBe(false);
    expect(isRealFirebaseApiKey("")).toBe(false);
    expect(isRealFirebaseApiKey(null)).toBe(false);
    expect(isRealFirebaseApiKey("undefined")).toBe(false);
    expect(isRealFirebaseApiKey("AIzaSyC0qG7k8v9w1X2Y3Z4A5B6C7D8E9F0G1H2")).toBe(true);
  });

  it("accurately detects placeholder strings across config fields", () => {
    expect(isPlaceholderValue("your_api_key")).toBe(true);
    expect(isPlaceholderValue("<your_key>")).toBe(true);
    expect(isPlaceholderValue("AIzaSyDummyKey000000000000")).toBe(true);
    expect(isPlaceholderValue("example_value")).toBe(true);
    expect(isPlaceholderValue("changeme")).toBe(true);
    expect(isPlaceholderValue("undefined")).toBe(true);
    expect(isPlaceholderValue("null")).toBe(true);
    expect(isPlaceholderValue("planora-ai-f3e0b")).toBe(false);
    expect(isPlaceholderValue("planora-ai-f3e0b.firebaseapp.com")).toBe(false);
  });

  it("validates client configuration without throwing unhandled exceptions", () => {
    const validation = validateFirebaseClientConfig();
    expect(typeof validation.isValid).toBe("boolean");
    expect(Array.isArray(validation.missingVariables)).toBe(true);
    expect(Array.isArray(validation.placeholderVariables)).toBe(true);
    expect(Array.isArray(validation.issues)).toBe(true);
  });

  it("provides informative diagnostics", () => {
    const diag = getFirebaseConfigDiagnostics();
    expect(diag.projectId).toBe("planora-ai-f3e0b");
    expect(diag.authDomain).toBe("planora-ai-f3e0b.firebaseapp.com");
    expect(typeof diag.statusMessage).toBe("string");
    expect(typeof diag.isConfigured).toBe("boolean");
  });
});

