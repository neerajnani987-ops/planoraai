import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateEventPlan } from "@/server/gemini";
import { EventInput } from "@/schemas/event";

// Hoisted mock state
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

describe("Gemini Server Service Integration", () => {
  const sampleInput: EventInput = {
    eventName: "Oakridge Annual Block Party",
    eventType: "community",
    eventDate: "2027-08-14",
    location: "Oakridge Park Pavilion",
    guestCount: 200,
    totalBudget: 4500,
    currency: "USD",
    theme: "Summer Jubilee",
    userPreferences: "Live local acoustic music, lawn games",
    specialRequirements: "City park permit and wheelchair accessibility",
  };

  const validRawAiJson = JSON.stringify({
    title: "Oakridge Summer Jubilee Block Party",
    tagline: "Connecting Neighbors, Celebrating Community",
    visionSummary: "A family-friendly festival at Oakridge Park Pavilion with music and food.",
    feasibilityAssessment: "The $4,500 budget is achievable with volunteer support.",
    themeAndDecor: {
      primaryColorPalette: ["#0d9488", "#f59e0b", "#0f172a"],
      aestheticStyle: "Bright Community Festival",
      decorElements: ["Bunting flags", "Welcome chalkboard signs"],
      atmosphere: "Joyful, accessible, welcoming",
    },
    categoryBudgets: [
      { category: "Food & Refreshments", allocatedAmount: 2000, percentage: 44.4, notes: "BBQ and drinks" },
      { category: "Entertainment & Games", allocatedAmount: 1500, percentage: 33.3, notes: "Band & rentals" },
      { category: "Logistics & Permits", allocatedAmount: 1000, percentage: 22.2, notes: "Permits and sanitation" },
    ],
    expenses: [
      {
        id: "exp-1",
        category: "Food & Refreshments",
        itemName: "BBQ Grill Feast & Drinks",
        estimatedCost: 2000,
        priority: "must-have",
        isEstimated: true,
        rationale: "Community lunch",
      },
      {
        id: "exp-2",
        category: "Entertainment & Games",
        itemName: "Local Duo Sound & Acoustic",
        estimatedCost: 800,
        priority: "nice-to-have",
        isEstimated: true,
        rationale: "4 hours music",
      },
      {
        id: "exp-3",
        category: "Entertainment & Games",
        itemName: "Lawn Games & Inflatables",
        estimatedCost: 700,
        priority: "nice-to-have",
        isEstimated: true,
        rationale: "Cornhole, giant Jenga",
      },
      {
        id: "exp-4",
        category: "Logistics & Permits",
        itemName: "City Park Permit & Trash Bins",
        estimatedCost: 1000,
        priority: "must-have",
        isEstimated: true,
        rationale: "Official permit fee",
      },
    ],
    timeline: [
      {
        phaseName: "3 Months Prior",
        timeWindow: "May 2027",
        milestones: ["File city permit", "Reserve pavilion"],
        keyDeadlines: ["Submit noise permit application"],
      },
    ],
    tasks: [
      {
        id: "task-1",
        title: "Submit city pavilion application",
        category: "Logistics & Permits",
        priority: "high",
        timelineMarker: "3 months prior",
        completed: false,
        notes: "Attach insurance certificate",
      },
    ],
    vendors: [
      {
        id: "ven-1",
        category: "Entertainment",
        serviceType: "Acoustic Band",
        recommendedBookingWindow: "2-3 months prior",
        estimatedCost: 800,
        status: "researching",
        keyQuestionsToAsk: ["Do you bring your own PA system?"],
        requiredSpecifications: ["Family-friendly setlist"],
      },
    ],
    foodAndEntertainment: {
      cateringStyle: "Community Potluck & BBQ",
      menuConcepts: ["Burgers, veggie skewers, watermelon slices"],
      entertainmentOptions: ["Local acoustic duo", "Tug of war tournament"],
      dietaryInclusivityNotes: "Vegetarian and halal grilled food sections clearly separated",
    },
    guestManagement: {
      seatingLayout: "Park picnic tables with shaded canopies",
      invitationTimeline: "Distribute flyers 4 weeks prior",
      rsvpTrackingTips: "Community board QR code and Nextdoor group",
      accessibilityAccommodations: "Paved ADA accessible paths to restrooms",
    },
    costSavingIdeas: [
      {
        title: "Volunteer Potluck Side Dishes",
        potentialSavings: "$400 - $600",
        implementationGuide: "Have committee provide main meats while neighbors contribute salads.",
        impactOnExperience: "low",
      },
    ],
    contingencies: [
      {
        riskFactor: "Summer rain shower",
        mitigationStrategy: "Pavilion has covered roof for up to 250 standing.",
        backupPlan: "Move games under covered canopy.",
      },
    ],
    finalReadinessChecklist: ["Verify trash cans and recycle bins in place"],
  });

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = "test-fake-key-for-unit-test";
    process.env.GEMINI_MODEL = "gemini-3.8-flash";
  });

  it("throws clear error when GEMINI_API_KEY is missing or unset", async () => {
    process.env.GEMINI_API_KEY = "";
    await expect(generateEventPlan(sampleInput)).rejects.toThrow(
      "GEMINI_API_KEY is not configured on the server"
    );
  });

  it("successfully parses and validates AI plan when Gemini returns valid JSON", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: () => validRawAiJson,
    });

    const result = await generateEventPlan(sampleInput);

    expect(result.title).toBe("Oakridge Summer Jubilee Block Party");
    expect(result.budgetSummary.totalUserBudget).toBe(4500);
    expect(result.budgetSummary.calculatedTotalExpenses).toBe(4500);
    expect(result.budgetSummary.remainingBudget).toBe(0);
    expect(result.budgetSummary.isOverBudget).toBe(false);
    expect(result.tasks.length).toBeGreaterThan(0);
    expect(result.vendors.length).toBeGreaterThan(0);
  });

  it("handles malformed JSON from Gemini gracefully", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: () => "Invalid JSON string that is definitely not json",
    });

    await expect(generateEventPlan(sampleInput)).rejects.toThrow(
      "AI model output could not be parsed as valid JSON"
    );
  });

  it("handles incomplete AI schema output gracefully", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: () => JSON.stringify({ title: "Incomplete plan without required fields" }),
    });

    await expect(generateEventPlan(sampleInput)).rejects.toThrow(
      "AI output did not meet the required event plan structure"
    );
  });

  it("handles Gemini API provider failure with sanitized message", async () => {
    mockGenerateContent.mockRejectedValueOnce(
      new Error("API internal error key=AIzaSySecretKeyThatMustBeSanitized")
    );

    await expect(generateEventPlan(sampleInput)).rejects.toThrow(
      "AI generation failed: API internal error key=***"
    );
  });

  it("handles empty response from Gemini", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: () => "",
    });

    await expect(generateEventPlan(sampleInput)).rejects.toThrow(
      "Gemini returned an empty response"
    );
  });

  it("handles request timeout when Gemini request aborts", async () => {
    const abortErr = new Error("The operation was aborted");
    abortErr.name = "AbortError";
    mockGenerateContent.mockRejectedValueOnce(abortErr);

    await expect(generateEventPlan(sampleInput)).rejects.toThrow(
      "Gemini API request timed out. Please try again."
    );
  });

  it("successfully parses and validates AI plan when response is wrapped in markdown code fences", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: () => "```json\n" + validRawAiJson + "\n```",
    });

    const result = await generateEventPlan(sampleInput);
    expect(result.title).toBe("Oakridge Summer Jubilee Block Party");
    expect(result.budgetSummary.totalUserBudget).toBe(4500);
  });

  it("extracts text when text is a plain string property instead of a function", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: validRawAiJson,
    });

    const result = await generateEventPlan(sampleInput);
    expect(result.title).toBe("Oakridge Summer Jubilee Block Party");
  });

  it("extracts text from candidates parts when response.text is undefined", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      candidates: [
        {
          content: {
            parts: [{ text: validRawAiJson }],
          },
        },
      ],
    });

    const result = await generateEventPlan(sampleInput);
    expect(result.title).toBe("Oakridge Summer Jubilee Block Party");
  });

  it("throws 422 when response candidate was blocked by content safety filters", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      candidates: [
        {
          finishReason: "SAFETY",
        },
      ],
    });

    await expect(generateEventPlan(sampleInput)).rejects.toThrow(
      "Gemini content safety filters blocked the response"
    );
  });

  it("supports GOOGLE_GENAI_API_KEY as fallback environment variable", async () => {
    delete process.env.GEMINI_API_KEY;
    process.env.GOOGLE_GENAI_API_KEY = "test-fallback-genai-key";

    mockGenerateContent.mockResolvedValueOnce({
      text: () => validRawAiJson,
    });

    const result = await generateEventPlan(sampleInput);
    expect(result.title).toBe("Oakridge Summer Jubilee Block Party");

    delete process.env.GOOGLE_GENAI_API_KEY;
  });
});
