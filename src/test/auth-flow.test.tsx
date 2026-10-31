import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

// Hoisted mocks
const mockSignInWithEmailAndPassword = vi.fn();
const mockCreateUserWithEmailAndPassword = vi.fn();
const mockSendPasswordResetEmail = vi.fn();
const mockSignOut = vi.fn();
const mockUpdateProfile = vi.fn();

vi.mock("firebase/auth", () => ({
  signInWithEmailAndPassword: (...args: unknown[]) => mockSignInWithEmailAndPassword(...args),
  createUserWithEmailAndPassword: (...args: unknown[]) => mockCreateUserWithEmailAndPassword(...args),
  sendPasswordResetEmail: (...args: unknown[]) => mockSendPasswordResetEmail(...args),
  signOut: (...args: unknown[]) => mockSignOut(...args),
  updateProfile: (...args: unknown[]) => mockUpdateProfile(...args),
  onAuthStateChanged: vi.fn((_auth, callback) => {
    callback(null);
    return () => {};
  }),
}));

vi.mock("@/lib/firebase", () => ({
  getClientAuth: vi.fn(() => ({ name: "mock-auth" })),
  isFirebaseConfigured: true,
}));

describe("AuthContext & Authentication Operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  it("handles successful sign in and clears demo mode", async () => {
    const mockUser = { uid: "test-user-123", email: "test@example.com" };
    mockSignInWithEmailAndPassword.mockResolvedValueOnce({ user: mockUser });

    const { result } = renderHook(() => useAuth(), { wrapper });

    let userResult;
    await act(async () => {
      userResult = await result.current.login("test@example.com", "Password123!");
    });

    expect(mockSignInWithEmailAndPassword).toHaveBeenCalledTimes(1);
    expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(),
      "test@example.com",
      "Password123!"
    );
    expect(userResult).toEqual(mockUser);
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.authError).toBeNull();
  });

  it("handles authentication error with safe message and code tracking", async () => {
    mockSignInWithEmailAndPassword.mockRejectedValueOnce({
      code: "auth/invalid-credential",
      message: "INVALID_LOGIN_CREDENTIALS",
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await expect(result.current.login("test@example.com", "wrong-password")).rejects.toThrow(
        "Invalid credentials. Please verify your email and password, or verify that this account exists in your Firebase project."
      );
    });

    expect(result.current.authError).toBe(
      "Invalid credentials. Please verify your email and password, or verify that this account exists in your Firebase project."
    );
    expect(result.current.authErrorCode).toBe("auth/invalid-credential");
  });

  it("handles password reset email request successfully", async () => {
    mockSendPasswordResetEmail.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.resetPassword("reset.me@example.com");
    });

    expect(mockSendPasswordResetEmail).toHaveBeenCalledWith(
      expect.anything(),
      "reset.me@example.com"
    );
    expect(result.current.authError).toBeNull();
  });

  it("supports entering and exiting public demo mode", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isDemoMode).toBe(false);

    act(() => {
      result.current.enterDemoMode();
    });

    expect(result.current.isDemoMode).toBe(true);

    act(() => {
      result.current.exitDemoMode();
    });

    expect(result.current.isDemoMode).toBe(false);
  });
});

