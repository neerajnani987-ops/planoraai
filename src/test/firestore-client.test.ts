import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  saveEventToFirestore,
  getUserEventsFromFirestore,
  getEventByIdFromFirestore,
  deleteEventFromFirestore,
  FirestoreClientError,
} from "@/lib/firestore";
import { ValidatedPlan } from "@/schemas/event";

// Mock firebase/firestore
const mockSetDoc = vi.fn();
const mockGetDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockDeleteDoc = vi.fn();
const mockDoc = vi.fn((_db: unknown, coll: unknown, id: unknown) => ({ path: `${coll}/${id}` }));
const mockCollection = vi.fn((_db: unknown, coll: unknown) => ({ path: coll }));
const mockQuery = vi.fn((coll: unknown) => coll);
const mockWhere = vi.fn(() => ({}));

vi.mock("firebase/firestore", () => ({
  getFirestore: vi.fn(() => ({})),
  connectFirestoreEmulator: vi.fn(),
  doc: (_db: unknown, coll: unknown, id: unknown) => mockDoc(_db, coll, id),
  collection: (_db: unknown, coll: unknown) => mockCollection(_db, coll),
  query: (coll: unknown) => mockQuery(coll),
  where: () => mockWhere(),
  setDoc: (docRef: unknown, data: unknown, options?: unknown) => mockSetDoc(docRef, data, options),
  getDoc: (docRef: unknown) => mockGetDoc(docRef),
  getDocs: (queryRef: unknown) => mockGetDocs(queryRef),
  deleteDoc: (docRef: unknown) => mockDeleteDoc(docRef),
}));

const mockSamplePlan: ValidatedPlan = {
  id: "plan-test-1",
  input: {
    eventName: "Birthday Gala",
    eventType: "birthday",
    eventDate: "2027-04-10",
    location: "Downtown Rooftop",
    guestCount: 50,
    totalBudget: 5000,
    currency: "USD",
    theme: "Gold & Midnight Blue",
    userPreferences: "Live jazz trio",
    specialRequirements: "Elevator access",
  },
  title: "Birthday Gala Blueprint",
  tagline: "Sophisticated rooftop celebration",
  visionSummary: "Intimate gathering under starlight.",
  feasibilityAssessment: "Well-calibrated budget.",
  themeAndDecor: {
    primaryColorPalette: ["#000", "#ffd700"],
    aestheticStyle: "Modern Elegance",
    decorElements: ["String lights"],
    atmosphere: "Chic",
  },
  categoryBudgets: [
    { category: "Venue", allocatedAmount: 2000, percentage: 40, notes: "Rooftop fee" },
  ],
  expenses: [
    {
      id: "exp-1",
      category: "Venue",
      itemName: "Rooftop rental",
      estimatedCost: 2000,
      priority: "must-have",
      isEstimated: true,
      rationale: "4 hours",
    },
  ],
  timeline: [],
  tasks: [],
  vendors: [],
  foodAndEntertainment: {
    cateringStyle: "Hors d'oeuvres",
    menuConcepts: [],
    entertainmentOptions: [],
    dietaryInclusivityNotes: "",
  },
  guestManagement: {
    seatingLayout: "Lounge",
    invitationTimeline: "6 weeks",
    rsvpTrackingTips: "",
    accessibilityAccommodations: "",
  },
  costSavingIdeas: [],
  contingencies: [],
  finalReadinessChecklist: [],
  createdAt: "2027-01-01T00:00:00.000Z",
  updatedAt: "2027-01-01T00:00:00.000Z",
  budgetSummary: {
    totalUserBudget: 5000,
    calculatedTotalExpenses: 2000,
    remainingBudget: 3000,
    isOverBudget: false,
    overBudgetAmount: 0,
    costPerGuest: 40,
    currency: "USD",
    verifiedTimestamp: "2027-01-01T00:00:00.000Z",
    disclaimer: "Advisory only",
  },
};

describe("Client-side Cloud Firestore Event Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("saveEventToFirestore", () => {
    it("successfully validates budget math and saves document with userId", async () => {
      mockSetDoc.mockResolvedValueOnce(undefined);

      const saved = await saveEventToFirestore("user-test-uid", mockSamplePlan);

      expect(saved.userId).toBe("user-test-uid");
      expect(saved.totalBudget).toBe(5000);
      expect(saved.calculatedTotalExpenses).toBe(2000);
      expect(mockSetDoc).toHaveBeenCalledTimes(1);
    });

    it("throws FirestoreClientError when userId is missing", async () => {
      await expect(saveEventToFirestore("", mockSamplePlan)).rejects.toThrow(FirestoreClientError);
    });
  });

  describe("getUserEventsFromFirestore", () => {
    it("queries events collection matching the userId", async () => {
      mockGetDocs.mockResolvedValueOnce({
        forEach: (callback: (doc: { id: string; data: () => unknown }) => void) => {
          callback({
            id: "plan-test-1",
            data: () => ({
              id: "plan-test-1",
              userId: "user-test-uid",
              plan: mockSamplePlan,
              title: mockSamplePlan.title,
              eventType: mockSamplePlan.input.eventType,
              eventDate: mockSamplePlan.input.eventDate,
              location: mockSamplePlan.input.location,
              guestCount: mockSamplePlan.input.guestCount,
              totalBudget: 5000,
              calculatedTotalExpenses: 2000,
              createdAt: "2027-01-01T00:00:00.000Z",
              updatedAt: "2027-01-01T00:00:00.000Z",
            }),
          });
        },
      });

      const events = await getUserEventsFromFirestore("user-test-uid");

      expect(events).toHaveLength(1);
      expect(events[0].id).toBe("plan-test-1");
      expect(events[0].userId).toBe("user-test-uid");
    });
  });

  describe("getEventByIdFromFirestore", () => {
    it("retrieves document and enforces ownership", async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          id: "plan-test-1",
          userId: "user-test-uid",
          plan: mockSamplePlan,
          title: mockSamplePlan.title,
          eventType: mockSamplePlan.input.eventType,
          eventDate: mockSamplePlan.input.eventDate,
          location: mockSamplePlan.input.location,
          guestCount: mockSamplePlan.input.guestCount,
          totalBudget: 5000,
          calculatedTotalExpenses: 2000,
          createdAt: "2027-01-01T00:00:00.000Z",
          updatedAt: "2027-01-01T00:00:00.000Z",
        }),
      });

      const doc = await getEventByIdFromFirestore("plan-test-1", "user-test-uid");
      expect(doc).not.toBeNull();
      expect(doc?.id).toBe("plan-test-1");
    });

    it("throws FirestoreClientError if user does not own document", async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          id: "plan-test-1",
          userId: "another-user-999",
        }),
      });

      await expect(
        getEventByIdFromFirestore("plan-test-1", "user-test-uid")
      ).rejects.toThrow(FirestoreClientError);
    });
  });

  describe("deleteEventFromFirestore", () => {
    it("deletes document when user is owner", async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          userId: "user-test-uid",
        }),
      });
      mockDeleteDoc.mockResolvedValueOnce(undefined);

      await deleteEventFromFirestore("plan-test-1", "user-test-uid");
      expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
    });

    it("prevents deletion if user is not owner", async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          userId: "victim-user-123",
        }),
      });

      await expect(
        deleteEventFromFirestore("plan-test-1", "attacker-user-456")
      ).rejects.toThrow(FirestoreClientError);
    });
  });
});
