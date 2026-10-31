import { NextRequest, NextResponse } from "next/server";
import { EventInputSchema } from "@/schemas/event";
import { generateEventPlan, AiServiceError } from "@/server/gemini";
import { checkRateLimit } from "@/server/rate-limiter";

export const maxDuration = 60; // Allow sufficient duration on serverless

export async function POST(request: NextRequest) {
  try {
    // 1. Rate limiting by IP
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous-client";
    const rate = checkRateLimit(ip, 12, 60000);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many requests. Please wait ${rate.retryAfterSec} seconds before generating another plan.`,
        },
        {
          status: 429,
          headers: { "Retry-After": String(rate.retryAfterSec || 30) },
        }
      );
    }

    // 2. Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    // 3. Validate with Zod
    const validation = EventInputSchema.safeParse(body);
    if (!validation.success) {
      const issueMessages = validation.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
      return NextResponse.json(
        {
          success: false,
          error: `Validation error: ${issueMessages}`,
          details: validation.error.format(),
        },
        { status: 400 }
      );
    }

    // 4. Generate plan via Gemini AI and compute deterministic budget
    const plan = await generateEventPlan(validation.data);

    return NextResponse.json({
      success: true,
      data: plan,
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("API /api/ai/plan error:", errorMsg);

    if (error instanceof AiServiceError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "An unexpected error occurred while generating the plan. Please check your network and try again.",
      },
      { status: 500 }
    );
  }
}
