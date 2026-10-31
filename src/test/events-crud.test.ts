import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as postEventRoute } from "@/app/api/events/route";
import {
  GET as getEventByIdRoute,
  PUT as putEventRoute,
  DELETE as deleteEventRoute,
} from "@/app/api/events/[id]/route";
import { ValidatedPlan } from "@/schemas/event";

// Hoisted mocks
const mockVerifyIdToken = vi.fn();
const mockFirestoreDocGet = vi.fn();
const mockFirestoreDocSet = vi.fn();
const mockFirestoreDocDelete = vi.fn();
const mockFirestoreQueryGet = vi.fn();
const mockRunTransaction = vi.fn();

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
          get: mockFirestoreQueryGet,
        })),
      })),
      doc: vi.fn(() => ({
        get: mockFirestoreDocGet,
        set: mockFirestoreDocSet,
        delete: mockFirestoreDocDelete,
      })),
    })),
    runTransaction: mockRunTransaction,
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

const samplePlan: ValidatedPlan = {
  id: "event-plan-101",
  input: {
    eventName: "Olivia & Ethan's Garden Wedding",
    eventType: "wedding",
    eventDate: "2027-08-15",
    location: "Botanical Gardens, Portland, OR",
    guestCount: 80,
    totalBudget: 18000,
    currency: "USD",
    theme: "Lush Wildflower & Glass Conservatory",
    userPreferences: "String quartet, vegan catering",
    specialRequirements: "Rain marquee required",
  },
  title: "Olivia & Ethan's Garden Wedding Blueprint",
  tagline: "Romantic botanical celebration",
  visionSummary: "An ethereal garden gathering under glass canopies.",
  feasibilityAssessment: "The budget aligns well with 80 guests.",
  themeAndDecor: {
    primaryColorPalette: ["#14532d", "#fef3c7"],
    aestheticStyle: "Botanical Garden",
    decorElements: ["Eucalyptus runners", "Fairy lights"],
    atmosphere: "Intimate and serene",
  },
  categoryBudgets: [
    { category: "Venue & Rentals", allocatedAmount: 7000, percentage: 38.9, notes: "Conservatory rental" },
  ],
  expenses: [
    {
      id: "exp-1",
      category: "Venue & Rentals",
      itemName: "Conservatory Space Fee",
      estimatedCost: 7000,
      priority: "must-have",
      isEstimated: true,
      rationale: "Full-day rental",
    },
  ],
  timeline: [
    { phaseName: "9 Months Out", timeWindow: "November", milestones: ["Lock venue"], keyDeadlines: ["Deposit"] },
  ],
  tasks: [
    { id: "task-1", title: "Sign conservatory contract", category: "Venue", priority: "high", timelineMarker: "Nov", completed: false, notes: "" },
  ],
  vendors: [
    { id: "ven-1", category: "Venue", serviceType: "Conservatory Director", recommendedBookingWindow: "9 months", estimatedCost: 7000, status: "researching", keyQuestionsToAsk: [], requiredSpecifications: [] },
  ],
  foodAndEntertainment: {
    cateringStyle: "Plated seasonal",
    menuConcepts: ["Heirloom salad"],
    entertainmentOptions: ["String duo"],
    dietaryInclusivityNotes: "Strict vegan",
  },
  guestManagement: {
    seatingLayout: "Round tables",
    invitationTimeline: "4 months",
    rsvpTrackingTips: "Online RSVP",
    accessibilityAccommodations: "Paved ramps",
  },
  costSavingIdeas: [
    { title: "Seasonal blooms", potentialSavings: "$600", implementationGuide: "Local flora", impactOnExperience: "low" },
  ],
  contingencies: [
    { riskFactor: "Rain", mitigationStrategy: "Indoor conservatory", backupPlan: "Move inside" },
  ],
  finalReadinessChecklist: ["Day-of phone tree verified"],
  createdAt: "2027-01-01T00:00:00.000Z",
  updatedAt: "2027-01-01T00:00:00.000Z",
  budgetSummary: {
    totalUserBudget: 18000,
    calculatedTotalExpenses: 7000,
    remainingBudget: 11000,
    isOverBudget: false,
    overBudgetAmount: 0,
    costPerGuest: 87.5,
    currency: "USD",
    verifiedTimestamp: "2027-01-01T00:00:00.000Z",
    disclaimer: "Advisory estimate only",
  },
};

describe("Firestore Event CRUD & Ownership Enforcement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyIdToken.mockResolvedValue({
      uid: "user-alpha-123",
      email: "alpha@example.com",
    });
  });

  describe("Create Event (POST /api/events)", () => {
    it("successfully creates a new event document in Firestore for authenticated user", async () => {
      mockRunTransaction.mockImplementation(async (cb) => {
        return cb({
          get: vi.fn().mockResolvedValue({ exists: false }),
          set: mockFirestoreDocSet,
        });
      });

      const req = createRequest("/api/events", {
        method: "POST",
        token: "auth-token-alpha",
        body: { plan: samplePlan },
      });

      const res = await postEventRoute(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.data.userId).toBe("user-alpha-123");
      expect(json.data.plan.title).toBe(samplePlan.title);
      expect(json.data.totalBudget).toBe(18000);
      expect(json.data.calculatedTotalExpenses).toBe(7000);
    });

    it("returns 400 when plan object is missing from payload", async () => {
      const req = createRequest("/api/events", {
        method: "POST",
        token: "auth-token-alpha",
        body: { somethingElse: "invalid" },
      });

      const res = await postEventRoute(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toContain("Validation error");
    });
  });

  describe("Read Event (GET /api/events/[id])", () => {
    it("retrieves the saved event when the user is the legitimate owner", async () => {
      mockFirestoreDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          id: "event-plan-101",
          userId: "user-alpha-123",
          plan: samplePlan,
          title: samplePlan.title,
          eventType: samplePlan.input.eventType,
          eventDate: samplePlan.input.eventDate,
          location: samplePlan.input.location,
          guestCount: samplePlan.input.guestCount,
          totalBudget: samplePlan.budgetSummary.totalUserBudget,
          calculatedTotalExpenses: samplePlan.budgetSummary.calculatedTotalExpenses,
          createdAt: "2027-01-01T00:00:00.000Z",
          updatedAt: "2027-01-01T00:00:00.000Z",
        }),
      });

      const req = createRequest("/api/events/event-plan-101", {
        token: "auth-token-alpha",
      });

      const res = await getEventByIdRoute(req, {
        params: Promise.resolve({ id: "event-plan-101" }),
      });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.id).toBe("event-plan-101");
      expect(json.data.userId).toBe("user-alpha-123");
    });

    it("returns 404 when document does not exist", async () => {
      mockFirestoreDocGet.mockResolvedValueOnce({
        exists: false,
      });

      const req = createRequest("/api/events/nonexistent-id", {
        token: "auth-token-alpha",
      });

      const res = await getEventByIdRoute(req, {
        params: Promise.resolve({ id: "nonexistent-id" }),
      });
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.success).toBe(false);
      expect(json.error).toBe("Event not found");
    });

    it("strictly blocks cross-user access attempts with 403 Forbidden", async () => {
      mockFirestoreDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          id: "event-plan-101",
          userId: "user-beta-999", // Different owner!
          plan: samplePlan,
        }),
      });

      const req = createRequest("/api/events/event-plan-101", {
        token: "auth-token-alpha",
      });

      const res = await getEventByIdRoute(req, {
        params: Promise.resolve({ id: "event-plan-101" }),
      });
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.success).toBe(false);
      expect(json.error).toContain("do not have permission");
    });
  });

  describe("Update Event (PUT /api/events/[id])", () => {
    it("successfully updates event and recalculates budget for the owner", async () => {
      const updatedPlan: ValidatedPlan = {
        ...samplePlan,
        expenses: [
          ...samplePlan.expenses,
          {
            id: "exp-extra",
            category: "Florals",
            itemName: "Centerpieces",
            estimatedCost: 1500,
            priority: "must-have",
            isEstimated: true,
            rationale: "10 tables",
          },
        ],
      };

      mockRunTransaction.mockImplementation(async (cb) => {
        return cb({
          get: vi.fn().mockResolvedValue({
            exists: true,
            data: () => ({
              id: "event-plan-101",
              userId: "user-alpha-123",
              createdAt: "2027-01-01T00:00:00.000Z",
            }),
          }),
          set: mockFirestoreDocSet,
        });
      });

      const req = createRequest("/api/events/event-plan-101", {
        method: "PUT",
        token: "auth-token-alpha",
        body: { plan: updatedPlan },
      });

      const res = await putEventRoute(req, {
        params: Promise.resolve({ id: "event-plan-101" }),
      });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.calculatedTotalExpenses).toBe(8500);
      expect(json.data.plan.budgetSummary.calculatedTotalExpenses).toBe(8500);
    });

    it("rejects cross-user updates with 403 Forbidden", async () => {
      mockRunTransaction.mockImplementation(async (cb) => {
        return cb({
          get: vi.fn().mockResolvedValue({
            exists: true,
            data: () => ({
              id: "event-plan-101",
              userId: "victim-user-456", // Belongs to victim
            }),
          }),
          set: mockFirestoreDocSet,
        });
      });

      const req = createRequest("/api/events/event-plan-101", {
        method: "PUT",
        token: "attacker-token-alpha",
        body: { plan: samplePlan },
      });

      const res = await putEventRoute(req, {
        params: Promise.resolve({ id: "event-plan-101" }),
      });
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.success).toBe(false);
      expect(json.error).toContain("do not have permission");
    });
  });

  describe("Delete Event (DELETE /api/events/[id])", () => {
    it("deletes event document when requested by legitimate owner", async () => {
      mockRunTransaction.mockImplementation(async (cb) => {
        return cb({
          get: vi.fn().mockResolvedValue({
            exists: true,
            data: () => ({
              id: "event-plan-101",
              userId: "user-alpha-123",
            }),
          }),
          delete: mockFirestoreDocDelete,
        });
      });

      const req = createRequest("/api/events/event-plan-101", {
        method: "DELETE",
        token: "auth-token-alpha",
      });

      const res = await deleteEventRoute(req, {
        params: Promise.resolve({ id: "event-plan-101" }),
      });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.message).toContain("deleted successfully");
    });

    it("blocks cross-user deletion with 403 Forbidden", async () => {
      mockRunTransaction.mockImplementation(async (cb) => {
        return cb({
          get: vi.fn().mockResolvedValue({
            exists: true,
            data: () => ({
              id: "event-plan-101",
              userId: "another-owner-789",
            }),
          }),
          delete: mockFirestoreDocDelete,
        });
      });

      const req = createRequest("/api/events/event-plan-101", {
        method: "DELETE",
        token: "unauthorized-user-token",
      });

      const res = await deleteEventRoute(req, {
        params: Promise.resolve({ id: "event-plan-101" }),
      });
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.success).toBe(false);
    });
  });
});
