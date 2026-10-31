import { NextRequest, NextResponse } from "next/server";
import { RescheduleRequestSchema } from "@/schemas/event";
import { reschedulePlan, AiServiceError } from "@/server/gemini";
import { checkRateLimit } from "@/server/rate-limiter";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous-client";
    const rate = checkRateLimit(ip, 15, 60000);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many reschedule requests. Please wait ${rate.retryAfterSec} seconds.`,
        },
        { status: 429 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const validation = RescheduleRequestSchema.safeParse(body);
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

    const rescheduledPlan = await reschedulePlan(validation.data);

    return NextResponse.json({
      success: true,
      data: rescheduledPlan,
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("API /api/ai/reschedule error:", errorMsg);

    if (error instanceof AiServiceError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "An unexpected error occurred while rescheduling the plan timeline.",
      },
      { status: 500 }
    );
  }
}
