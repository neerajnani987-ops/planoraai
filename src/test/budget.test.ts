import { describe, it, expect } from "vitest";
import { validateAndRecalculateBudget, ESTIMATE_DISCLAIMER } from "@/server/budget";
import { EventInput, RawAiPlan } from "@/schemas/event";

describe("Budget Validation & Calculation Engine", () => {
  const sampleInput: EventInput = {
    eventName: "Sarah & Leo's Elegant Wedding",
    eventType: "wedding",
    eventDate: "2027-06-20",
    location: "Napa Valley, CA",
    guestCount: 100,
    totalBudget: 30000,
    currency: "USD",
    theme: "Vineyard Modern Rustic",
    userPreferences: "Outdoor ceremony, organic wine pairing",
    specialRequirements: "Vegetarian and gluten-free catering options",
  };

  const sampleRawPlan: RawAiPlan = {
    title: "Sarah & Leo's Vineyard Modern Rustic Wedding",
    tagline: "Intimate Wine Country Romance",
    visionSummary: "A breathtaking celebration nestled among Napa hills.",
    feasibilityAssessment: "The $30,000 budget is healthy for 100 guests in Napa Valley.",
    themeAndDecor: {
      primaryColorPalette: ["#1e3a8a", "#fef3c7", "#0d9488"],
      aestheticStyle: "Rustic Elegance",
      decorElements: ["Eucalyptus garlands", "Wine barrel accents"],
      atmosphere: "Warm, sophisticated, and celebratory",
    },
    categoryBudgets: [
      { category: "Venue & Catering", allocatedAmount: 18000, percentage: 60, notes: "Dinner and bar" },
      { category: "Photography", allocatedAmount: 4000, percentage: 13.3, notes: "8 hours coverage" },
    ],
    expenses: [
      {
        id: "exp-1",
        category: "Venue & Catering",
        itemName: "Plated Farm-to-Table Dinner",
        estimatedCost: 15000,
        priority: "must-have",
        isEstimated: true,
        rationale: "$150 per person inclusive",
      },
      {
        id: "exp-2",
        category: "Venue & Catering",
        itemName: "Local Wine & Beer Package",
        estimatedCost: 3000,
        priority: "must-have",
        isEstimated: true,
        rationale: "4-hour service",
      },
      {
        id: "exp-3",
        category: "Photography",
        itemName: "Fine Art Photo & Drone",
        estimatedCost: 4000,
        priority: "must-have",
        isEstimated: true,
        rationale: "Lead photographer and assistant",
      },
      {
        id: "exp-4",
        category: "Decor",
        itemName: "Floral Installations",
        estimatedCost: 5000,
        priority: "nice-to-have",
        isEstimated: true,
        rationale: "Arch florals and centerpieces",
      },
    ],
    timeline: [
      {
        phaseName: "9-12 Months Out",
        timeWindow: "Immediate",
        milestones: ["Book venue", "Lock photographer"],
        keyDeadlines: ["Finalize guest list"],
      },
    ],
    tasks: [
      {
        id: "task-1",
        title: "Sign catering contract",
        category: "Venue & Catering",
        priority: "high",
        timelineMarker: "10 months out",
        completed: false,
        notes: "Request tasting menu first",
      },
    ],
    vendors: [
      {
        id: "ven-1",
        category: "Photography",
        serviceType: "Wedding Photographer",
        recommendedBookingWindow: "9-11 months prior",
        estimatedCost: 4000,
        status: "researching",
        keyQuestionsToAsk: ["Do you provide raw files?"],
        requiredSpecifications: ["Full day coverage"],
      },
    ],
    foodAndEntertainment: {
      cateringStyle: "Plated 3-course dinner",
      menuConcepts: ["Heirloom tomato salad", "Braised short rib", "Lemon Meyer tart"],
      entertainmentOptions: ["Acoustic guitarist for ceremony", "Jazz trio for cocktail"],
      dietaryInclusivityNotes: "Full vegan and celiac protocols in place",
    },
    guestManagement: {
      seatingLayout: "Long wooden harvest tables",
      invitationTimeline: "Send save-the-dates 8 months out",
      rsvpTrackingTips: "Online QR code RSVP on digital website",
      accessibilityAccommodations: "Paved ADA walkways to ceremony lawn",
    },
    costSavingIdeas: [
      {
        title: "In-season greenery foliage",
        potentialSavings: "$800 - $1,200",
        implementationGuide: "Substitute exotic blooms with locally harvested olive and eucalyptus greens.",
        impactOnExperience: "low",
      },
    ],
    contingencies: [
      {
        riskFactor: "Rain or extreme heat",
        mitigationStrategy: "Reserve sailcloth tent backup by 30 days prior.",
        backupPlan: "Transition dinner indoors to barrel room.",
      },
    ],
    finalReadinessChecklist: ["Distribute day-of vendor timeline sheet"],
  };

  it("calculates exact totals, remaining budget, and cost per guest accurately", () => {
    const validated = validateAndRecalculateBudget(sampleRawPlan, sampleInput);

    // Sum: 15000 + 3000 + 4000 + 5000 = 27000
    expect(validated.budgetSummary.calculatedTotalExpenses).toBe(27000);
    expect(validated.budgetSummary.totalUserBudget).toBe(30000);
    expect(validated.budgetSummary.remainingBudget).toBe(3000);
    expect(validated.budgetSummary.isOverBudget).toBe(false);
    expect(validated.budgetSummary.overBudgetAmount).toBe(0);
    expect(validated.budgetSummary.costPerGuest).toBe(270); // 27000 / 100
    expect(validated.budgetSummary.currency).toBe("USD");
    expect(validated.budgetSummary.disclaimer).toBe(ESTIMATE_DISCLAIMER);
  });

  it("sanitizes negative expense values by setting them to 0", () => {
    const planWithNegatives: RawAiPlan = {
      ...sampleRawPlan,
      expenses: [
        {
          id: "neg-1",
          category: "Decor",
          itemName: "Discount coupon",
          estimatedCost: -500,
          priority: "optional",
          isEstimated: true,
          rationale: "Discount",
        },
        {
          id: "pos-1",
          category: "Decor",
          itemName: "Lighting",
          estimatedCost: 1000,
          priority: "must-have",
          isEstimated: true,
          rationale: "String lights",
        },
      ],
    };

    const validated = validateAndRecalculateBudget(planWithNegatives, sampleInput);
    const negativeItem = validated.expenses.find((e) => e.id === "neg-1");
    expect(negativeItem?.estimatedCost).toBe(0);
    expect(validated.budgetSummary.calculatedTotalExpenses).toBe(1000);
  });

  it("flags over-budget scenarios explicitly and appends a warning to feasibility assessment", () => {
    const tightBudgetInput: EventInput = {
      ...sampleInput,
      totalBudget: 20000, // Expenses sum to 27000
    };

    const validated = validateAndRecalculateBudget(sampleRawPlan, tightBudgetInput);
    expect(validated.budgetSummary.isOverBudget).toBe(true);
    expect(validated.budgetSummary.remainingBudget).toBe(-7000);
    expect(validated.budgetSummary.overBudgetAmount).toBe(7000);
    expect(validated.feasibilityAssessment).toContain("Budget Alert");
    expect(validated.feasibilityAssessment).toContain("exceeds your target budget by USD 7,000");
  });
});
