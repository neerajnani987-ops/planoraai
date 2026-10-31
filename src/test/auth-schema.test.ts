import { describe, it, expect } from "vitest";
import {
  RegisterInputSchema,
  LoginInputSchema,
  UserProfileSchema,
} from "@/schemas/auth";

describe("Authentication & User Profile Zod Schemas", () => {
  describe("RegisterInputSchema", () => {
    it("successfully validates a correct registration payload", () => {
      const valid = {
        displayName: "Sarah Jenkins",
        email: "sarah.jenkins@example.com",
        password: "securePassword123",
      };

      const result = RegisterInputSchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.displayName).toBe("Sarah Jenkins");
        expect(result.data.email).toBe("sarah.jenkins@example.com");
      }
    });

    it("rejects an invalid email format", () => {
      const invalid = {
        displayName: "Sarah",
        email: "not-an-email-at-all",
        password: "securePassword123",
      };

      const result = RegisterInputSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain("valid email address");
      }
    });

    it("rejects passwords shorter than 6 characters", () => {
      const invalid = {
        displayName: "Sarah",
        email: "sarah@example.com",
        password: "12345",
      };

      const result = RegisterInputSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain("at least 6 characters");
      }
    });

    it("rejects empty or whitespace-only display name", () => {
      const invalid = {
        displayName: "   ",
        email: "sarah@example.com",
        password: "password123",
      };

      const result = RegisterInputSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("LoginInputSchema", () => {
    it("successfully validates a valid login payload", () => {
      const valid = {
        email: "user@example.com",
        password: "mySecretPassword",
      };

      const result = LoginInputSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("rejects empty password on login", () => {
      const invalid = {
        email: "user@example.com",
        password: "",
      };

      const result = LoginInputSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("UserProfileSchema", () => {
    it("validates user profile and applies default preferences", () => {
      const profile = {
        uid: "user-abc-123",
        email: "user@example.com",
        displayName: "Alex Rivera",
        createdAt: "2027-01-01T00:00:00.000Z",
        updatedAt: "2027-01-01T00:00:00.000Z",
      };

      const result = UserProfileSchema.safeParse(profile);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.preferences.defaultCurrency).toBe("USD");
        expect(result.data.preferences.emailNotifications).toBe(true);
      }
    });
  });
});
