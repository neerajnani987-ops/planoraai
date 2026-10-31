import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as getEventsRoute, POST as postEventRoute } from "@/app/api/events/route";
import { GET as getEventByIdRoute } from "@/app/api/events/[id]/route";

// Hoisted mock state
const mockVerifyIdToken = vi.fn();
const mockFirestoreGet = vi.fn();

vi.mock("firebase-admin/app", () => ({
  getApps: vi.fn(() => [{ name: "test-app" }]),
  getApp: vi.fn(() => ({ name: "test-app" })),
  initializeApp: vi.fn(() => ({ name: "test-app" })),
  cert: vi.fn(),
}));

vi.mock("firebase-admin/auth", () => ({
  getAuth: vi.fn(() => ({
    verifyIdToken: mockVerifyIdToken,
  })),
}));

vi.mock("firebase-admin/firestore", () => ({
  getFirestore: vi.fn(() => ({
    settings: vi.fn(),
    collection: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn(() => ({
          get: mockFirestoreGet,
        })),
      })),
      doc: vi.fn(() => ({
        get: mockFirestoreGet,
        set: vi.fn(),
        delete: vi.fn(),
      })),
    })),
    runTransaction: vi.fn(async (cb) => {
      return cb({
        get: mockFirestoreGet,
        set: vi.fn(),
        delete: vi.fn(),
      });
    }),
  })),
}));

function createRequest(
  url: string,
  options: { method?: string; token?: string; body?: unknown } = {}
): NextRequest {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (options.token) {
    headers["Authorization"] = `Bearer ${options.token}`;
  }

  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method: options.method || "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
}

describe("Authentication & Protected Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Unauthenticated Access Restrictions", () => {
    it("GET /api/events returns 401 when Authorization header is missing", async () => {
      const req = createRequest("/api/events");
      const res = await getEventsRoute(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.error).toContain("Missing or malformed Authorization header");
    });

    it("POST /api/events returns 401 when token is missing", async () => {
      const req = createRequest("/api/events", { method: "POST", body: {} });
      const res = await postEventRoute(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
    });

    it("GET /api/events/[id] returns 401 when token is invalid or expired", async () => {
      mockVerifyIdToken.mockRejectedValueOnce(new Error("Firebase ID token has expired"));

      const req = createRequest("/api/events/plan-123", { token: "expired-token" });
      const res = await getEventByIdRoute(req, { params: Promise.resolve({ id: "plan-123" }) });
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.error).toContain("session has expired");
    });
  });

  describe("Authenticated Access", () => {
    it("allows access and returns events list when token is valid", async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: "user-test-123",
        email: "user@example.com",
      });

      mockFirestoreGet.mockResolvedValueOnce({
        forEach: () => {
          // Empty list
        },
      });

      const req = createRequest("/api/events", { token: "valid-live-token" });
      const res = await getEventsRoute(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
    });
  });
});
