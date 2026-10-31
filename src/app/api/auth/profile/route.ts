import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken, AuthenticationError } from "@/server/firebase-admin";
import { getUserProfile, upsertUserProfile } from "@/server/events-db";
import { UserPreferencesSchema } from "@/schemas/auth";
import { z } from "zod";

export const maxDuration = 30;

const UpdateProfileBodySchema = z.object({
  displayName: z.string().trim().min(2).max(60).optional(),
  photoURL: z.string().optional(),
  preferences: UserPreferencesSchema.optional(),
});

/**
 * GET /api/auth/profile
 */
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuthToken(request);
    let profile = await getUserProfile(user.uid);

    if (!profile) {
      // Auto-initialize profile if missing
      profile = await upsertUserProfile(user.uid, {
        email: user.email || "",
        displayName: user.name || "",
        photoURL: user.picture || "",
      });
    }

    return NextResponse.json({
      success: true,
      data: profile,
    });
  } catch (error: unknown) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }

    console.error("GET /api/auth/profile error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch user profile." },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/auth/profile
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await verifyAuthToken(request);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
    }

    const validation = UpdateProfileBodySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: "Invalid profile data", details: validation.error.format() },
        { status: 400 }
      );
    }

    const updated = await upsertUserProfile(user.uid, {
      email: user.email || "",
      displayName: validation.data.displayName,
      photoURL: validation.data.photoURL,
      preferences: validation.data.preferences,
    });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error: unknown) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }

    console.error("PUT /api/auth/profile error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update user profile." },
      { status: 500 }
    );
  }
}
