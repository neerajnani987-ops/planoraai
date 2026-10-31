import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken, AuthenticationError, AuthorizationError } from "@/server/firebase-admin";
import { getEventById, updateEvent, deleteEvent, DatabaseError } from "@/server/events-db";
import { UpdateEventRequestSchema } from "@/schemas/event";

export const maxDuration = 30;

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/events/[id]
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await verifyAuthToken(request);
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ success: false, error: "Event ID is required" }, { status: 400 });
    }

    const eventDoc = await getEventById(id, user.uid);
    if (!eventDoc) {
      return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: eventDoc,
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
    console.error("GET /api/events/[id] error:", errorMsg);
    return NextResponse.json(
      { success: false, error: "Failed to fetch event." },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/events/[id]
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await verifyAuthToken(request);
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ success: false, error: "Event ID is required" }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON in request body" }, { status: 400 });
    }

    const validation = UpdateEventRequestSchema.safeParse(body);
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

    const updatedDoc = await updateEvent(id, user.uid, validation.data.plan);

    return NextResponse.json({
      success: true,
      data: updatedDoc,
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
    console.error("PUT /api/events/[id] error:", errorMsg);
    return NextResponse.json(
      { success: false, error: "Failed to update event." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/events/[id]
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await verifyAuthToken(request);
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ success: false, error: "Event ID is required" }, { status: 400 });
    }

    await deleteEvent(id, user.uid);

    return NextResponse.json({
      success: true,
      message: "Event deleted successfully",
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
    console.error("DELETE /api/events/[id] error:", errorMsg);
    return NextResponse.json(
      { success: false, error: "Failed to delete event." },
      { status: 500 }
    );
  }
}
