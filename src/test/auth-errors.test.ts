import { describe, it, expect } from "vitest";
import { formatFirebaseAuthError, extractFirebaseAuthErrorCode } from "@/lib/auth-errors";

describe("Firebase Auth Error Formatter & Sanitizer", () => {
  describe("extractFirebaseAuthErrorCode", () => {
    it("extracts code from standard FirebaseError object", () => {
      const err = { code: "auth/invalid-api-key", message: "API key not valid." };
      const result = extractFirebaseAuthErrorCode(err);
      expect(result.code).toBe("auth/invalid-api-key");
    });

    it("identifies 'API key not valid' from HTTP 400 Identity Toolkit responses", () => {
      const err = { message: "API key not valid. Please pass a valid API key." };
      const result = extractFirebaseAuthErrorCode(err);
      expect(result.code).toBe("auth/invalid-api-key");
    });

    it("identifies OPERATION_NOT_ALLOWED from Google Identity Toolkit message", () => {
      const err = { message: "OPERATION_NOT_ALLOWED : Password sign-in is disabled." };
      const result = extractFirebaseAuthErrorCode(err);
      expect(result.code).toBe("auth/operation-not-allowed");
    });

    it("identifies INVALID_LOGIN_CREDENTIALS from Identity Toolkit message", () => {
      const err = { message: "INVALID_LOGIN_CREDENTIALS" };
      const result = extractFirebaseAuthErrorCode(err);
      expect(result.code).toBe("auth/invalid-credential");
    });

    it("identifies TOO_MANY_ATTEMPTS_TRY_LATER", () => {
      const err = { message: "TOO_MANY_ATTEMPTS_TRY_LATER : Access to this account has been temporarily disabled." };
      const result = extractFirebaseAuthErrorCode(err);
      expect(result.code).toBe("auth/too-many-requests");
    });
  });

  describe("formatFirebaseAuthError", () => {
    it("formats auth/invalid-api-key with actionable configuration guidance", () => {
      const formatted = formatFirebaseAuthError({ code: "auth/invalid-api-key" });
      expect(formatted.code).toBe("auth/invalid-api-key");
      expect(formatted.userMessage).toContain("NEXT_PUBLIC_FIREBASE_API_KEY");
      expect(formatted.diagnostic).toContain("Identity Toolkit HTTP 400");
    });

    it("formats auth/operation-not-allowed advising email/password activation in Console", () => {
      const formatted = formatFirebaseAuthError({ code: "auth/operation-not-allowed" });
      expect(formatted.code).toBe("auth/operation-not-allowed");
      expect(formatted.userMessage).toContain("Email/Password");
      expect(formatted.userMessage).toContain("Firebase Console");
    });

    it("formats auth/unauthorized-domain advising domain configuration in Console", () => {
      const formatted = formatFirebaseAuthError({ code: "auth/unauthorized-domain" });
      expect(formatted.code).toBe("auth/unauthorized-domain");
      expect(formatted.userMessage).toContain("Authorized domains");
    });

    it("handles auth/user-not-found with informative guidance", () => {
      const formatted = formatFirebaseAuthError({ code: "auth/user-not-found" }, "login");
      expect(formatted.userMessage).toContain("No account found with this email");
      expect(formatted.diagnostic).toContain("auth/user-not-found");
    });

    it("handles auth/invalid-credential during login", () => {
      const formatted = formatFirebaseAuthError({ code: "auth/invalid-credential" }, "login");
      expect(formatted.userMessage).toContain("Invalid credentials");
      expect(formatted.diagnostic).toContain("auth/invalid-credential");
    });

    it("handles auth/wrong-password during login", () => {
      const formatted = formatFirebaseAuthError({ code: "auth/wrong-password" }, "login");
      expect(formatted.userMessage).toContain("Incorrect password");
      expect(formatted.diagnostic).toContain("auth/wrong-password");
    });

    it("formats auth/email-already-in-use during registration", () => {
      const formatted = formatFirebaseAuthError({ code: "auth/email-already-in-use" }, "register");
      expect(formatted.userMessage).toContain("already exists");
    });

    it("formats auth/weak-password", () => {
      const formatted = formatFirebaseAuthError({ code: "auth/weak-password" });
      expect(formatted.userMessage).toContain("at least 6 characters");
    });

    it("formats auth/too-many-requests", () => {
      const formatted = formatFirebaseAuthError({ code: "auth/too-many-requests" });
      expect(formatted.userMessage).toContain("temporarily disabled");
    });

    it("formats auth/network-request-failed", () => {
      const formatted = formatFirebaseAuthError({ code: "auth/network-request-failed" });
      expect(formatted.userMessage).toContain("Network connection error");
    });

    it("formats auth/user-disabled", () => {
      const formatted = formatFirebaseAuthError({ code: "auth/user-disabled" });
      expect(formatted.userMessage).toContain("account has been disabled");
    });

    it("provides safe generic response for password reset without disclosing existence", () => {
      const formatted = formatFirebaseAuthError({ code: "auth/user-not-found" }, "reset");
      expect(formatted.userMessage).toContain("If an account with that email exists");
    });
  });
});

