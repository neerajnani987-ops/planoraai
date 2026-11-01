import { GoogleGenAI } from "@google/genai";
import {
  EventInput,
  PlanRevisionRequest,
  BudgetOptimizeRequest,
  RescheduleRequest,
  RawAiPlan,
  RawAiPlanSchema,
  ValidatedPlan,
} from "@/schemas/event";
import { getServerEnv } from "@/server/env";
import { validateAndRecalculateBudget } from "@/server/budget";

export class AiServiceError extends Error {
  public statusCode: number;
  public isTransient: boolean;

  constructor(message: string, statusCode = 500, isTransient = false) {
    super(message);
    this.name = "AiServiceError";
    this.statusCode = statusCode;
    this.isTransient = isTransient;
  }
}

/**
 * Returns an instance of GoogleGenAI using the server environment variable.
 */
function getGenAiClient(): { client: GoogleGenAI; model: string } {
  const env = getServerEnv();
  const apiKey = (env.GEMINI_API_KEY || "").trim();
  if (
    !apiKey ||
    apiKey === "" ||
    apiKey.includes("your_gemini_api_key") ||
    apiKey === "placeholder" ||
    apiKey === "your_api_key_here"
  ) {
    throw new AiServiceError(
      "GEMINI_API_KEY is not configured on the server. Please set a valid GEMINI_API_KEY in your environment.",
      503
    );
  }

  const client = new GoogleGenAI({ apiKey });
  return { client, model: env.GEMINI_MODEL || "gemini-3.8-flash" };
}

interface CandidatePart {
  text?: string;
}

interface ResponseCandidate {
  finishReason?: string;
  content?: {
    parts?: CandidatePart[];
  };
}

interface GenAiResponseShape {
  text?: string | (() => string);
  candidates?: ResponseCandidate[];
}

/**
 * Extracts text safely from the Gemini response across various SDK shapes.
 */
function extractResponseText(response: unknown): string {
  if (!response || typeof response !== "object") return "";

  const resp = response as GenAiResponseShape;

  // 1. response.text getter / property / method
  if (typeof resp.text === "string") {
    return resp.text;
  }
  if (typeof resp.text === "function") {
    try {
      const res = resp.text.call(response);
      if (typeof res === "string") return res;
    } catch {
      // Fall through to candidates inspection
    }
  }

  // 2. Candidates array inspection
  if (Array.isArray(resp.candidates) && resp.candidates.length > 0) {
    const candidate = resp.candidates[0];
    if (candidate.finishReason === "SAFETY") {
      throw new AiServiceError(
        "Gemini content safety filters blocked the response. Please adjust your event parameters.",
        422
      );
    }
    const parts = candidate.content?.parts;
    if (Array.isArray(parts)) {
      return parts.map((p) => (p && typeof p.text === "string" ? p.text : "")).join("");
    }
  }

  return "";
}

/**
 * Executes a call to the Gemini API with bounded retries, timeout protection,
 * and automatic model fallback for 404 (unavailable/deprecated) or 503 (high demand) scenarios.
 */
async function callGeminiWithRetry(
  prompt: string,
  systemInstruction?: string,
  maxRetries = 2,
  timeoutMs = 40000
): Promise<string> {
  const { client, model: configuredModel } = getGenAiClient();

  // Primary model plus supported fallback models
  const modelsToTry: string[] = [configuredModel];
  if (!modelsToTry.includes("gemini-3.8-flash")) {
    modelsToTry.push("gemini-3.8-flash");
  }
  if (!modelsToTry.includes("gemini-3.5-flash-lite")) {
    modelsToTry.push("gemini-3.5-flash-lite");
  }

  let lastError: unknown = null;

  for (let modelIndex = 0; modelIndex < modelsToTry.length; modelIndex++) {
    const currentModel = modelsToTry[modelIndex];
    let attempt = 0;

    while (attempt <= maxRetries) {
      attempt++;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await client.models.generateContent({
          model: currentModel,
          contents: prompt,
          config: {
            systemInstruction:
              systemInstruction ||
              "You are Planora AI, a world-class professional event planning and budget advisory director.",
            responseMimeType: "application/json",
            temperature: 0.4,
          },
        });

        clearTimeout(timeoutId);

        const text = extractResponseText(response);
        if (!text || text.trim() === "") {
          throw new AiServiceError("Gemini returned an empty response. Please try again.", 502);
        }

        return text;
      } catch (err: unknown) {
        clearTimeout(timeoutId);
        lastError = err;

        if (
          err != null &&
          typeof err === "object" &&
          "name" in err &&
          (err as { name: string }).name === "AbortError"
        ) {
          throw new AiServiceError("Gemini API request timed out. Please try again.", 504, true);
        }

        if (err instanceof AiServiceError) {
          throw err;
        }

        const errorMsg = err instanceof Error ? err.message : String(err);

        // Check if model was not found / deprecated
        const isModelNotFound =
          errorMsg.includes("404") ||
          errorMsg.includes("NOT_FOUND") ||
          errorMsg.includes("no longer available") ||
          errorMsg.includes("not found");

        if (isModelNotFound && modelIndex < modelsToTry.length - 1) {
          console.warn(`Model ${currentModel} not available (404), trying ${modelsToTry[modelIndex + 1]}...`);
          break; // Try next model in modelsToTry
        }

        // Check if transient error (429 rate limit or 503 service unavailable / overloaded)
        const isTransient =
          errorMsg.includes("429") ||
          errorMsg.includes("RESOURCE_EXHAUSTED") ||
          errorMsg.includes("503") ||
          errorMsg.includes("UNAVAILABLE") ||
          errorMsg.includes("overloaded") ||
          errorMsg.includes("high demand");

        // If high demand / 503 on current model and we have another model, switch to fallback
        if (
          (errorMsg.includes("high demand") || errorMsg.includes("503") || errorMsg.includes("UNAVAILABLE")) &&
          modelIndex < modelsToTry.length - 1 &&
          attempt >= 1
        ) {
          console.warn(`Model ${currentModel} experiencing high demand, falling back to ${modelsToTry[modelIndex + 1]}...`);
          break;
        }

        if (attempt <= maxRetries && isTransient) {
          const isTest = process.env.NODE_ENV === "test";
          const backoffMs = isTest
            ? 10
            : Math.min(1000 * Math.pow(2, attempt) + Math.random() * 500, 6000);
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
          continue;
        }

        break;
      }
    }

    // If error was not a model not found / demand fallback, don't try other models
    const lastMsg = lastError instanceof Error ? lastError.message : String(lastError || "");
    const isModelSpecific =
      lastMsg.includes("404") ||
      lastMsg.includes("NOT_FOUND") ||
      lastMsg.includes("no longer available") ||
      lastMsg.includes("not found") ||
      lastMsg.includes("high demand") ||
      lastMsg.includes("503");
    if (!isModelSpecific) {
      break;
    }
  }

  if (lastError instanceof AiServiceError) {
    throw lastError;
  }

  const rawErrorMsg =
    lastError instanceof Error ? lastError.message : String(lastError || "Failed to communicate with AI provider");
  const sanitizedMsg = rawErrorMsg
    .replace(/key=[^&\s]+/gi, "key=***")
    .replace(/apiKey=[^&\s]+/gi, "apiKey=***");

  // Determine appropriate HTTP status code
  let statusCode = 500;
  const lowerMsg = sanitizedMsg.toLowerCase();
  if (lowerMsg.includes("401") || lowerMsg.includes("api key not valid") || lowerMsg.includes("invalid api key")) {
    statusCode = 401;
  } else if (lowerMsg.includes("403") || lowerMsg.includes("permission denied")) {
    statusCode = 403;
  } else if (lowerMsg.includes("404") || lowerMsg.includes("not found")) {
    statusCode = 404;
  } else if (lowerMsg.includes("429") || lowerMsg.includes("resource_exhausted") || lowerMsg.includes("quota")) {
    statusCode = 429;
  } else if (lowerMsg.includes("503") || lowerMsg.includes("unavailable") || lowerMsg.includes("overloaded")) {
    statusCode = 503;
  } else if (lowerMsg.includes("enotfound") || lowerMsg.includes("fetch failed") || lowerMsg.includes("network")) {
    statusCode = 502;
  }

  throw new AiServiceError(`AI generation failed: ${sanitizedMsg}`, statusCode);
}

/**
 * Parse and validate JSON content from Gemini
 */
function parseAndValidateAiJson(rawJson: string): RawAiPlan {
  let parsed: unknown;
  try {
    let cleanJson = rawJson.trim();
    if (cleanJson.startsWith("```")) {
      cleanJson = cleanJson.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    } else {
      const jsonStart = cleanJson.indexOf("{");
      const jsonEnd = cleanJson.lastIndexOf("}");
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        cleanJson = cleanJson.substring(jsonStart, jsonEnd + 1);
      }
    }
    parsed = JSON.parse(cleanJson);
  } catch {
    throw new AiServiceError(
      "AI model output could not be parsed as valid JSON. Please retry.",
      502
    );
  }

  const validation = RawAiPlanSchema.safeParse(parsed);
  if (!validation.success) {
    const issues = JSON.stringify(validation.error.format());
    console.error("Zod schema validation failed on AI output:", issues);
    throw new AiServiceError(
      "AI output did not meet the required event plan structure. Please retry.",
      502
    );
  }

  return validation.data;
}

// ============================================================================
// Safe In-Memory LRU / TTL Response Cache for Gemini AI
// ============================================================================
interface CachedPlanEntry {
  plan: ValidatedPlan;
  timestamp: number;
}

const AI_CACHE_TTL_MS = 15 * 60 * 1000; // 15-minute TTL
const MAX_CACHE_ENTRIES = 50;
const aiPlanCache = new Map<string, CachedPlanEntry>();

export function getCachedAiPlan(key: string): ValidatedPlan | null {
  if (process.env.NODE_ENV === "test") return null;
  const entry = aiPlanCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > AI_CACHE_TTL_MS) {
    aiPlanCache.delete(key);
    return null;
  }
  return entry.plan;
}

export function setCachedAiPlan(key: string, plan: ValidatedPlan): void {
  if (aiPlanCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = aiPlanCache.keys().next().value;
    if (oldestKey) aiPlanCache.delete(oldestKey);
  }
  aiPlanCache.set(key, { plan, timestamp: Date.now() });
}

export function clearAiPlanCache(): void {
  aiPlanCache.clear();
}

/**
 * 1. Generate an Event Plan
 */
export async function generateEventPlan(input: EventInput): Promise<ValidatedPlan> {
  const cacheKey = `gen:${input.eventType}:${input.eventName.trim().toLowerCase()}:${input.eventDate}:${input.guestCount}:${input.totalBudget}:${input.currency}:${(input.theme || "").trim().toLowerCase()}:${(input.userPreferences || "").trim().toLowerCase()}`;
  const cached = getCachedAiPlan(cacheKey);
  if (cached) {
    return cached;
  }

  const systemInstruction = `You are Planora AI, an elite, highly organized event producer.
Your goal is to build an exhaustive, realistic, and tailored event plan.
IMPORTANT EVENT-SPECIFIC RULES:
- If eventType is 'wedding': Emphasize romantic styling, reception flow, ceremony timeline, seating, photography, attire, and vendor coordination.
- If eventType is 'birthday': Emphasize age-appropriate excitement, interactive entertainment, cake/dessert moment, party favors, dynamic playlist.
- If eventType is 'community': Emphasize inclusive accessibility, permit coordination, crowd safety, volunteer roles, signage, sound ordinances, sponsorships.

CRITICAL INSTRUCTIONS:
1. Always output ONLY raw JSON adhering precisely to the requested schema. No code fences.
2. In 'expenses', provide realistic itemized cost estimates. Make sure all 'estimatedCost' are positive numbers.
3. In 'categoryBudgets', provide category allocations that reasonably align with typical event spending.
4. Provide actionable, detailed tasks, vendor checklists with inquiry questions, and contingency mitigations.
5. In 'feasibilityAssessment', honestly review whether the target budget is sufficient for the guest count and expectations.`;

  const prompt = `Generate a complete event plan JSON for this event:
Event Name: ${input.eventName}
Event Type: ${input.eventType}
Date: ${input.eventDate}
Location: ${input.location}
Guest Count: ${input.guestCount} guests
Target Budget: ${input.currency} ${input.totalBudget}
Currency: ${input.currency}
Theme: ${input.theme || "Not specified (propose an elegant, fitting theme)"}
Preferences: ${input.userPreferences || "None specified"}
Special Requirements: ${input.specialRequirements || "None specified"}

JSON Schema to match:
{
  "title": string,
  "tagline": string,
  "visionSummary": string,
  "feasibilityAssessment": string,
  "themeAndDecor": {
    "primaryColorPalette": [string],
    "aestheticStyle": string,
    "decorElements": [string],
    "atmosphere": string
  },
  "categoryBudgets": [
    { "category": string, "allocatedAmount": number, "percentage": number, "notes": string }
  ],
  "expenses": [
    { "category": string, "itemName": string, "estimatedCost": number, "priority": "must-have" | "nice-to-have" | "optional", "isEstimated": true, "rationale": string }
  ],
  "timeline": [
    { "phaseName": string, "timeWindow": string, "milestones": [string], "keyDeadlines": [string] }
  ],
  "tasks": [
    { "title": string, "category": string, "priority": "high" | "medium" | "low", "timelineMarker": string, "completed": false, "notes": string }
  ],
  "vendors": [
    { "category": string, "serviceType": string, "recommendedBookingWindow": string, "estimatedCost": number, "status": "researching", "keyQuestionsToAsk": [string], "requiredSpecifications": [string] }
  ],
  "foodAndEntertainment": {
    "cateringStyle": string,
    "menuConcepts": [string],
    "entertainmentOptions": [string],
    "dietaryInclusivityNotes": string
  },
  "guestManagement": {
    "seatingLayout": string,
    "invitationTimeline": string,
    "rsvpTrackingTips": string,
    "accessibilityAccommodations": string
  },
  "costSavingIdeas": [
    { "title": string, "potentialSavings": string, "implementationGuide": string, "impactOnExperience": "low" | "moderate" }
  ],
  "contingencies": [
    { "riskFactor": string, "mitigationStrategy": string, "backupPlan": string }
  ],
  "finalReadinessChecklist": [string]
}`;

  const rawJson = await callGeminiWithRetry(prompt, systemInstruction);
  const rawPlan = parseAndValidateAiJson(rawJson);
  const validated = validateAndRecalculateBudget(rawPlan, input);
  setCachedAiPlan(cacheKey, validated);
  return validated;
}

/**
 * 2. Revise an existing event plan
 */
export async function reviseEventPlan(req: PlanRevisionRequest): Promise<ValidatedPlan> {
  const current = req.currentPlan;
  const instruction = req.revisionInstruction;

  const cacheKey = `rev:${current.id}:${instruction.trim().toLowerCase()}:${Boolean(req.preserveTasks)}`;
  const cached = getCachedAiPlan(cacheKey);
  if (cached) {
    return cached;
  }

  const systemInstruction = `You are Planora AI modifying an existing event plan based on user instructions.
Preserve existing items, tasks, and structure wherever possible unless explicitly requested to change.
Do not overwrite user completed task progress.
Output valid JSON matching the RawAiPlan schema.`;

  const prompt = `User request for plan revision: "${instruction}"

CURRENT EVENT PLAN:
Title: ${current.title}
Type: ${current.input.eventType}
Date: ${current.input.eventDate}
Guest Count: ${current.input.guestCount}
Budget: ${current.input.currency} ${current.input.totalBudget}

Current Summary: ${current.visionSummary}
Current Expenses: ${JSON.stringify(current.expenses.slice(0, 15))}
Current Categories: ${JSON.stringify(current.categoryBudgets)}
Current Tasks: ${JSON.stringify(current.tasks.slice(0, 15))}
Current Theme: ${JSON.stringify(current.themeAndDecor)}
Current Food & Entertainment: ${JSON.stringify(current.foodAndEntertainment)}

Apply the requested modification. Return the complete updated plan JSON matching the original schema.`;

  const rawJson = await callGeminiWithRetry(prompt, systemInstruction);
  const rawPlan = parseAndValidateAiJson(rawJson);

  // If user wanted to preserve completed task status
  if (req.preserveTasks && current.tasks.length > 0) {
    const completedMap = new Map(current.tasks.map((t) => [t.title.toLowerCase(), t.completed]));
    rawPlan.tasks = rawPlan.tasks.map((t) => ({
      ...t,
      completed: completedMap.get(t.title.toLowerCase()) ?? false,
    }));
  }

  const validated = validateAndRecalculateBudget(rawPlan, current.input, current.id);
  setCachedAiPlan(cacheKey, validated);
  return validated;
}

/**
 * 3. Optimize Budget
 */
export async function optimizeBudgetPlan(req: BudgetOptimizeRequest): Promise<ValidatedPlan> {
  const current = req.currentPlan;
  const reductionPercent = req.targetReductionPercentage;
  const protectedCats = req.protectedCategories;

  const cacheKey = `opt:${current.id}:${reductionPercent}:${protectedCats.slice().sort().join(",")}`;
  const cached = getCachedAiPlan(cacheKey);
  if (cached) {
    return cached;
  }

  const systemInstruction = `You are a professional event budget consultant.
Your objective is to find smart cost optimizations to reduce expenses by approximately ${reductionPercent}%
without compromising the core attendee experience.
Protected categories that should NOT be reduced: ${protectedCats.join(", ") || "None specified"}.
Provide cost-saving tips, adjust expense allocations realistically, and explain the changes.
Output valid JSON adhering to the RawAiPlan schema.`;

  const prompt = `Please optimize the budget for the following event plan:
Total Budget: ${current.input.currency} ${current.input.totalBudget}
Current Expenses: ${JSON.stringify(current.expenses)}
Target Reduction: ${reductionPercent}%
Protected Categories: ${protectedCats.join(", ") || "None"}

Generate the revised plan with optimized expenses and actionable savings.`;

  const rawJson = await callGeminiWithRetry(prompt, systemInstruction);
  const rawPlan = parseAndValidateAiJson(rawJson);
  const validated = validateAndRecalculateBudget(rawPlan, current.input, current.id);
  setCachedAiPlan(cacheKey, validated);
  return validated;
}

/**
 * 4. Reschedule Plan for a new date
 */
export async function reschedulePlan(req: RescheduleRequest): Promise<ValidatedPlan> {
  const current = req.currentPlan;
  const oldDate = current.input.eventDate;
  const newDate = req.newEventDate;

  const cacheKey = `resched:${current.id}:${newDate}`;
  const cached = getCachedAiPlan(cacheKey);
  if (cached) {
    return cached;
  }

  const systemInstruction = `You are Planora AI event timeline specialist.
The client has changed their event date from ${oldDate} to ${newDate}.
Recalculate timeline phases, vendor booking windows, and task deadlines relative to the new date.
Maintain all existing tasks and expenses.
Output valid JSON adhering to the RawAiPlan schema.`;

  const prompt = `Reschedule this event plan from ${oldDate} to ${newDate}:
Plan Title: ${current.title}
Timeline: ${JSON.stringify(current.timeline)}
Tasks: ${JSON.stringify(current.tasks)}
Vendors: ${JSON.stringify(current.vendors)}

Return the updated plan with all timeline markers and booking windows adapted for ${newDate}.`;

  const rawJson = await callGeminiWithRetry(prompt, systemInstruction);
  const rawPlan = parseAndValidateAiJson(rawJson);

  const updatedInput: EventInput = {
    ...current.input,
    eventDate: newDate,
  };

  const validated = validateAndRecalculateBudget(rawPlan, updatedInput, current.id);
  setCachedAiPlan(cacheKey, validated);
  return validated;
}
