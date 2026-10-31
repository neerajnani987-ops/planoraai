import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as planRoute } from "@/app/api/ai/plan/route";
import { POST as reviseRoute } from "@/app/api/ai/revise/route";
import { POST as optimizeRoute } from "@/app/api/ai/budget-optimize/route";
import { POST as rescheduleRoute } from "@/app/api/ai/reschedule/route";
import { NextRequest } from "next/server";

// Mock @google/genai
const mockGenerateContent = vi.fn();
vi.mock("@google/genai", () => {
  return {
    GoogleGenAI: class {
      public models = {
        generateContent: mockGenerateContent,
      };
      constructor(public options: { apiKey: string }) {}
    },
  };
});

function createMockRequest(url: string, body?: unknown): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": `127.0.0.${Math.floor(Math.random() * 200) + 1}`,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

describe("Next.js API Route Handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = "test-fake-key-for-routes";
    process.env.GEMINI_MODEL = "gemini-3.8-flash";
  });

  describe("POST /api/ai/plan", () => {
    it("returns 400 for invalid JSON body", async () => {
      const req = new NextRequest(new URL("/api/ai/plan", "http://localhost:3000"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid-json{",
      });

      const res = await planRoute(req);
      const json = await res.json();
      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toContain("Invalid JSON");
    });

    it("returns 400 for missing required event parameters", async () => {
      const req = createMockRequest("/api/ai/plan", {
        eventName: "Too Short",
        // missing eventType, date, location, guestCount, totalBudget
      });

      const res = await planRoute(req);
      const json = await res.json();
      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toContain("Validation error");
    });

    it("returns 400 for negative budget in request body", async () => {
      const req = createMockRequest("/api/ai/plan", {
        eventName: "Negative Budget Party",
        eventType: "birthday",
        eventDate: "2027-04-12",
        location: "Chicago, IL",
        guestCount: 30,
        totalBudget: -2000,
        currency: "USD",
      });

      const res = await planRoute(req);
      const json = await res.json();
      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toContain("Budget must be a non-negative amount");
    });

    it("returns 400 for invalid event type in request body", async () => {
      const req = createMockRequest("/api/ai/plan", {
        eventName: "Invalid Festival",
        eventType: "unsupported_event_type",
        eventDate: "2027-04-12",
        location: "Chicago, IL",
        guestCount: 30,
        totalBudget: 2000,
        currency: "USD",
      });

      const res = await planRoute(req);
      const json = await res.json();
      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toContain("Validation error");
    });

    it("returns 200 and generates plan with verified budget calculations for valid request", async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: () =>
          JSON.stringify({
            title: "Elena & Marcus's Wedding",
            tagline: "A Beautiful Beginning",
            visionSummary: "A romantic celebration with friends and family.",
            feasibilityAssessment: "Budget is well-suited for 100 guests.",
            themeAndDecor: {
              primaryColorPalette: ["#f43f5e", "#fb7185"],
              aestheticStyle: "Modern Romantic",
              decorElements: ["Floral arch"],
              atmosphere: "Warm and intimate",
            },
            categoryBudgets: [
              { category: "Catering", allocatedAmount: 8000, percentage: 53.3, notes: "Dinner" },
            ],
            expenses: [
              {
                id: "exp-1",
                category: "Catering",
                itemName: "Plated Dinner",
                estimatedCost: 8000,
                priority: "must-have",
                isEstimated: true,
                rationale: "$80 per guest",
              },
            ],
            timeline: [
              {
                phaseName: "6 Months Out",
                timeWindow: "Month 6",
                milestones: ["Book venue"],
                keyDeadlines: ["Deposit"],
              },
            ],
            tasks: [
              {
                id: "task-1",
                title: "Reserve venue",
                category: "Venue",
                priority: "high",
                timelineMarker: "Month 6",
                completed: false,
                notes: "Contact coordinator",
              },
            ],
            vendors: [
              {
                id: "ven-1",
                category: "Catering",
                serviceType: "Caterer",
                recommendedBookingWindow: "6 months",
                estimatedCost: 8000,
                status: "researching",
                keyQuestionsToAsk: ["Tasting schedule?"],
                requiredSpecifications: ["100 meals"],
              },
            ],
            foodAndEntertainment: {
              cateringStyle: "Plated",
              menuConcepts: ["Salmon"],
              entertainmentOptions: ["String quartet"],
              dietaryInclusivityNotes: "Gluten-free available",
            },
            guestManagement: {
              seatingLayout: "Round tables",
              invitationTimeline: "3 months prior",
              rsvpTrackingTips: "Digital RSVP",
              accessibilityAccommodations: "Ramp access",
            },
            costSavingIdeas: [
              {
                title: "Digital Invites",
                potentialSavings: "$500",
                implementationGuide: "Use email RSVP",
                impactOnExperience: "low",
              },
            ],
            contingencies: [
              {
                riskFactor: "Rain",
                mitigationStrategy: "Indoor backup",
                backupPlan: "Move to hall",
              },
            ],
            finalReadinessChecklist: ["Confirm caterer arrival time"],
          }),
      });

      const req = createMockRequest("/api/ai/plan", {
        eventName: "Elena & Marcus's Wedding",
        eventType: "wedding",
        eventDate: "2027-09-18",
        location: "Philadelphia, PA",
        guestCount: 100,
        totalBudget: 25000,
        currency: "USD",
      });

      const res = await planRoute(req);
      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.title).toBe("Elena & Marcus's Wedding");
      expect(json.data.budgetSummary.totalUserBudget).toBe(25000);
      expect(json.data.budgetSummary.calculatedTotalExpenses).toBe(8000);
      expect(json.data.budgetSummary.remainingBudget).toBe(17000);
      expect(json.data.budgetSummary.isOverBudget).toBe(false);
    });

    it("returns 503 when GEMINI_API_KEY is not configured", async () => {
      process.env.GEMINI_API_KEY = "";
      const req = createMockRequest("/api/ai/plan", {
        eventName: "Valid Name",
        eventType: "wedding",
        eventDate: "2027-09-18",
        location: "Philadelphia, PA",
        guestCount: 100,
        totalBudget: 25000,
        currency: "USD",
      });

      const res = await planRoute(req);
      const json = await res.json();
      expect(res.status).toBe(503);
      expect(json.success).toBe(false);
      expect(json.error).toContain("GEMINI_API_KEY is not configured");
    });

    it("returns 502 when Gemini returns an empty response", async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: () => "",
      });

      const req = createMockRequest("/api/ai/plan", {
        eventName: "Summer Festival",
        eventType: "community",
        eventDate: "2027-08-15",
        location: "Central Park",
        guestCount: 50,
        totalBudget: 5000,
        currency: "USD",
      });

      const res = await planRoute(req);
      const json = await res.json();
      expect(res.status).toBe(502);
      expect(json.success).toBe(false);
      expect(json.error).toContain("Gemini returned an empty response");
    });

    it("returns 502 when Gemini returns malformed non-JSON output", async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: () => "I am an AI and here is your plan in plain english without JSON formatting...",
      });

      const req = createMockRequest("/api/ai/plan", {
        eventName: "Summer Festival",
        eventType: "community",
        eventDate: "2027-08-15",
        location: "Central Park",
        guestCount: 50,
        totalBudget: 5000,
        currency: "USD",
      });

      const res = await planRoute(req);
      const json = await res.json();
      expect(res.status).toBe(502);
      expect(json.success).toBe(false);
      expect(json.error).toContain("AI model output could not be parsed as valid JSON");
    });

    it("returns 429 when Gemini returns quota/rate limit error", async () => {
      mockGenerateContent.mockRejectedValue(
        new Error("429 RESOURCE_EXHAUSTED: quota exceeded for model")
      );

      const req = createMockRequest("/api/ai/plan", {
        eventName: "Summer Festival",
        eventType: "community",
        eventDate: "2027-08-15",
        location: "Central Park",
        guestCount: 50,
        totalBudget: 5000,
        currency: "USD",
      });

      const res = await planRoute(req);
      const json = await res.json();
      expect(res.status).toBe(429);
      expect(json.success).toBe(false);
      expect(json.error).toContain("RESOURCE_EXHAUSTED");
    });

    it("returns 401 when Gemini rejects an invalid API key", async () => {
      mockGenerateContent.mockRejectedValueOnce(
        new Error("API key not valid. Please pass a valid API key.")
      );

      const req = createMockRequest("/api/ai/plan", {
        eventName: "Summer Festival",
        eventType: "community",
        eventDate: "2027-08-15",
        location: "Central Park",
        guestCount: 50,
        totalBudget: 5000,
        currency: "USD",
      });

      const res = await planRoute(req);
      const json = await res.json();
      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.error).toContain("API key not valid");
    });

    it("returns 504 when Gemini API times out", async () => {
      const abortErr = new Error("The operation was aborted");
      abortErr.name = "AbortError";
      mockGenerateContent.mockRejectedValueOnce(abortErr);

      const req = createMockRequest("/api/ai/plan", {
        eventName: "Summer Festival",
        eventType: "community",
        eventDate: "2027-08-15",
        location: "Central Park",
        guestCount: 50,
        totalBudget: 5000,
        currency: "USD",
      });

      const res = await planRoute(req);
      const json = await res.json();
      expect(res.status).toBe(504);
      expect(json.success).toBe(false);
      expect(json.error).toContain("timed out");
    });
  });

  describe("POST /api/ai/revise", () => {
    it("returns 400 when revision instruction is too short", async () => {
      const req = createMockRequest("/api/ai/revise", {
        currentPlan: {},
        revisionInstruction: "no",
      });

      const res = await reviseRoute(req);
      const json = await res.json();
      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toContain("Validation error");
    });
  });

  describe("POST /api/ai/budget-optimize", () => {
    it("returns 400 when targetReductionPercentage is out of range", async () => {
      const req = createMockRequest("/api/ai/budget-optimize", {
        currentPlan: {},
        targetReductionPercentage: 99, // Max is 50
      });

      const res = await optimizeRoute(req);
      const json = await res.json();
      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
    });
  });

  describe("POST /api/ai/reschedule", () => {
    it("returns 400 for an invalid new event date format", async () => {
      const req = createMockRequest("/api/ai/reschedule", {
        currentPlan: {},
        newEventDate: "invalid-date",
      });

      const res = await rescheduleRoute(req);
      const json = await res.json();
      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
    });
  });
});
