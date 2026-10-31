import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken, AuthenticationError, AuthorizationError } from "@/server/firebase-admin";
import { getUserEvents, createEvent, DatabaseError } from "@/server/events-db";
import { CreateEventRequestSchema } from "@/schemas/event";

export const maxDuration = 30;

/**
 * GET /api/events
 * Returns all events belonging to the authenticated user.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuthToken(request);
    const events = await getUserEvents(user.uid);

    return NextResponse.json({
      success: true,
      data: events,
    });
  } catch (error: unknown) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    if (error instanceof DatabaseError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }

    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("GET /api/events error:", errorMsg);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred while fetching events." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/events
 * Creates or saves a new event for the authenticated user.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuthToken(request);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON in request body" }, { status: 400 });
    }

    const validation = CreateEventRequestSchema.safeParse(body);
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

    const savedDoc = await createEvent(user.uid, validation.data.plan);

    return NextResponse.json(
      {
        success: true,
        data: savedDoc,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    if (error instanceof DatabaseError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }

    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("POST /api/events error:", errorMsg);
    return NextResponse.json(
      { success: false, error: "Failed to save event to database." },
      { status: 500 }
    );
  }
}
