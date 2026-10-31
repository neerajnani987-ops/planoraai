import { describe, it, expect } from "vitest";
import { EventInputSchema, RawAiPlanSchema } from "@/schemas/event";

describe("Event Input Schema Validation", () => {
  const validPayload = {
    eventName: "Lucas's 10th Birthday Adventure",
    eventType: "birthday",
    eventDate: "2027-05-15",
    location: "Austin, TX",
    guestCount: 25,
    totalBudget: 2500,
    currency: "USD",
    theme: "Space Odyssey",
    userPreferences: "Outdoor laser tag and astronaut cupcakes",
    specialRequirements: "Peanut allergy safety",
  };

  it("successfully parses valid event input", () => {
    const result = EventInputSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.eventName).toBe("Lucas's 10th Birthday Adventure");
      expect(result.data.eventType).toBe("birthday");
      expect(result.data.guestCount).toBe(25);
    }
  });

  it("fails on invalid event types", () => {
    const invalidType = {
      ...validPayload,
      eventType: "festival_carnival_unsupported",
    };
    const result = EventInputSchema.safeParse(invalidType);
    expect(result.success).toBe(false);
  });

  it("fails on invalid dates", () => {
    const invalidDate = {
      ...validPayload,
      eventDate: "not-a-real-date",
    };
    const result = EventInputSchema.safeParse(invalidDate);
    expect(result.success).toBe(false);
    if (!result.success) {
      const errorStr = result.error.issues.map((i) => i.message).join(" ");
      expect(errorStr).toContain("A valid event date is required");
    }
  });

  it("fails on negative budgets", () => {
    const negativeBudget = {
      ...validPayload,
      totalBudget: -500,
    };
    const result = EventInputSchema.safeParse(negativeBudget);
    expect(result.success).toBe(false);
    if (!result.success) {
      const errorStr = result.error.issues.map((i) => i.message).join(" ");
      expect(errorStr).toContain("Budget must be a non-negative amount");
    }
  });

  it("fails on non-positive guest count", () => {
    const invalidGuests = {
      ...validPayload,
      guestCount: 0,
    };
    const result = EventInputSchema.safeParse(invalidGuests);
    expect(result.success).toBe(false);
  });

  it("validates RawAiPlanSchema strictly rejects missing required fields", () => {
    const invalidRawPlan = {
      title: "Sample Incomplete Plan",
      // missing tagline, visionSummary, themeAndDecor, etc.
    };
    const result = RawAiPlanSchema.safeParse(invalidRawPlan);
    expect(result.success).toBe(false);
  });
});
