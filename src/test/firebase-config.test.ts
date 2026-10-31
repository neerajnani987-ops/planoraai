import { describe, it, expect } from "vitest";
import {
  firebaseConfig,
  getClientFirebaseApp,
  getClientAuth,
  getClientFirestore,
  isRealFirebaseApiKey,
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
    expect(getClientAuth()).toBe(auth);
    expect(getClientFirestore()).toBe(db);
  });

  it("re-exports identical configuration and instances from @/firebase/config", () => {
    expect(firebaseFromConfig.firebaseConfig.projectId).toBe("planora-ai-f3e0b");
    expect(firebaseFromConfig.app).toBe(app);
    expect(firebaseFromConfig.auth).toBe(auth);
    expect(firebaseFromConfig.db).toBe(db);
  });

  it("correctly distinguishes real vs placeholder API keys", () => {
    expect(isRealFirebaseApiKey("AIzaSyDummyKeyForDevelopmentAndTesting00")).toBe(false);
    expect(isRealFirebaseApiKey("your_firebase_api_key")).toBe(false);
    expect(isRealFirebaseApiKey("")).toBe(false);
    expect(isRealFirebaseApiKey(null)).toBe(false);
    expect(isRealFirebaseApiKey("AIzaSyB3ExampleRealKeyWithEnoughLength12345")).toBe(true);
  });

  it("provides informative diagnostics", () => {
    const diag = getFirebaseConfigDiagnostics();
    expect(diag.projectId).toBe("planora-ai-f3e0b");
    expect(diag.authDomain).toBe("planora-ai-f3e0b.firebaseapp.com");
    expect(typeof diag.statusMessage).toBe("string");
  });
});

