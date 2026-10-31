import { getAdminFirestore, AuthorizationError } from "@/server/firebase-admin";
import type { QueryDocumentSnapshot, Transaction } from "firebase-admin/firestore";
import {
  ValidatedPlan,
  SavedEventDocument,
  SavedEventDocumentSchema,
} from "@/schemas/event";
import { UserProfile, UserProfileSchema } from "@/schemas/auth";
import { validateAndRecalculateBudget } from "@/server/budget";

const EVENTS_COLLECTION = "events";
const USERS_COLLECTION = "users";

export class DatabaseError extends Error {
  public statusCode: number;
  constructor(message: string, statusCode = 500) {
    super(message);
    this.name = "DatabaseError";
    this.statusCode = statusCode;
  }
}

/**
 * Retrieves all events owned by a specific authenticated user.
 * Bounded query limit ensures performance and guards against unbounded reads.
 */
export async function getUserEvents(
  userId: string,
  limitCount = 50
): Promise<SavedEventDocument[]> {
  if (!userId) {
    throw new DatabaseError("User ID is required to fetch events", 400);
  }

  try {
    const db = getAdminFirestore();
    const snapshot = await db
      .collection(EVENTS_COLLECTION)
      .where("userId", "==", userId)
      .limit(limitCount)
      .get();

    const events: SavedEventDocument[] = [];
    snapshot.forEach((doc: QueryDocumentSnapshot) => {
      const data = doc.data();
      const parsed = SavedEventDocumentSchema.safeParse(data);
      if (parsed.success) {
        events.push(parsed.data);
      } else {
        console.warn(`Skipping invalid event document ${doc.id}:`, parsed.error.issues);
      }
    });

    // In-memory sort by updatedAt descending so composite index isn't mandatory on fresh Firestore
    return events.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to retrieve events";
    console.error("getUserEvents error:", msg);
    throw new DatabaseError(`Database query failed: ${msg}`);
  }
}

/**
 * Retrieves a single event document while strictly enforcing user ownership.
 */
export async function getEventById(
  eventId: string,
  userId: string
): Promise<SavedEventDocument | null> {
  if (!eventId || !userId) {
    throw new DatabaseError("Event ID and User ID are required", 400);
  }

  try {
    const db = getAdminFirestore();
    const docRef = db.collection(EVENTS_COLLECTION).doc(eventId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return null;
    }

    const data = docSnap.data();
    if (!data) return null;

    // Strict ownership verification
    if (data.userId !== userId) {
      throw new AuthorizationError("You do not have permission to access this event.");
    }

    const parsed = SavedEventDocumentSchema.safeParse(data);
    if (!parsed.success) {
      console.error("Corrupted event document format:", parsed.error.issues);
      throw new DatabaseError("Event data format is invalid", 500);
    }

    return parsed.data;
  } catch (error: unknown) {
    if (error instanceof AuthorizationError) throw error;
    const msg = error instanceof Error ? error.message : "Failed to retrieve event";
    console.error("getEventById error:", msg);
    throw new DatabaseError(`Failed to fetch event: ${msg}`);
  }
}

/**
 * Creates or saves a new event document for an authenticated user.
 * Recomputes all budget math deterministically to prevent tampering.
 */
export async function createEvent(
  userId: string,
  plan: ValidatedPlan
): Promise<SavedEventDocument> {
  if (!userId) {
    throw new DatabaseError("User ID is required to create event", 400);
  }

  // Recalculate deterministic budget
  const verifiedPlan = validateAndRecalculateBudget(plan, plan.input, plan.id);
  const now = new Date().toISOString();
  const eventId = verifiedPlan.id || `plan-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  const eventDoc: SavedEventDocument = {
    id: eventId,
    userId,
    plan: verifiedPlan,
    title: verifiedPlan.title,
    eventType: verifiedPlan.input.eventType,
    eventDate: verifiedPlan.input.eventDate,
    location: verifiedPlan.input.location,
    guestCount: verifiedPlan.input.guestCount,
    totalBudget: verifiedPlan.budgetSummary.totalUserBudget,
    calculatedTotalExpenses: verifiedPlan.budgetSummary.calculatedTotalExpenses,
    createdAt: verifiedPlan.createdAt || now,
    updatedAt: now,
  };

  try {
    const db = getAdminFirestore();
    const docRef = db.collection(EVENTS_COLLECTION).doc(eventId);

    // Use transaction to ensure safe, idempotent write without accidental clobbering
    await db.runTransaction(async (transaction: Transaction) => {
      const existing = await transaction.get(docRef);
      if (existing.exists) {
        const existingData = existing.data();
        if (existingData && existingData.userId !== userId) {
          throw new AuthorizationError("Event ID collision with another user's event.");
        }
      }
      transaction.set(docRef, eventDoc);
    });

    return eventDoc;
  } catch (error: unknown) {
    if (error instanceof AuthorizationError) throw error;
    const msg = error instanceof Error ? error.message : "Failed to save event";
    console.error("createEvent error:", msg);
    throw new DatabaseError(`Could not save event to database: ${msg}`);
  }
}

/**
 * Updates an existing event document atomically with ownership check.
 */
export async function updateEvent(
  eventId: string,
  userId: string,
  updatedPlan: ValidatedPlan
): Promise<SavedEventDocument> {
  if (!eventId || !userId) {
    throw new DatabaseError("Event ID and User ID are required for update", 400);
  }

  const verifiedPlan = validateAndRecalculateBudget(updatedPlan, updatedPlan.input, eventId);
  const now = new Date().toISOString();

  try {
    const db = getAdminFirestore();
    const docRef = db.collection(EVENTS_COLLECTION).doc(eventId);

    const result = await db.runTransaction(async (transaction: Transaction) => {
      const docSnap = await transaction.get(docRef);
      if (!docSnap.exists) {
        throw new DatabaseError("Event not found", 404);
      }

      const existingData = docSnap.data();
      if (!existingData || existingData.userId !== userId) {
        throw new AuthorizationError("You do not have permission to update this event.");
      }

      const updatedDoc: SavedEventDocument = {
        id: eventId,
        userId,
        plan: verifiedPlan,
        title: verifiedPlan.title,
        eventType: verifiedPlan.input.eventType,
        eventDate: verifiedPlan.input.eventDate,
        location: verifiedPlan.input.location,
        guestCount: verifiedPlan.input.guestCount,
        totalBudget: verifiedPlan.budgetSummary.totalUserBudget,
        calculatedTotalExpenses: verifiedPlan.budgetSummary.calculatedTotalExpenses,
        createdAt: existingData.createdAt || verifiedPlan.createdAt || now,
        updatedAt: now,
      };

      transaction.set(docRef, updatedDoc);
      return updatedDoc;
    });

    return result;
  } catch (error: unknown) {
    if (error instanceof AuthorizationError || error instanceof DatabaseError) throw error;
    const msg = error instanceof Error ? error.message : "Failed to update event";
    console.error("updateEvent error:", msg);
    throw new DatabaseError(`Could not update event: ${msg}`);
  }
}

/**
 * Deletes an event document with strict ownership enforcement.
 */
export async function deleteEvent(eventId: string, userId: string): Promise<void> {
  if (!eventId || !userId) {
    throw new DatabaseError("Event ID and User ID are required for deletion", 400);
  }

  try {
    const db = getAdminFirestore();
    const docRef = db.collection(EVENTS_COLLECTION).doc(eventId);

    await db.runTransaction(async (transaction: Transaction) => {
      const docSnap = await transaction.get(docRef);
      if (!docSnap.exists) {
        // Idempotent: already deleted
        return;
      }

      const existingData = docSnap.data();
      if (existingData && existingData.userId !== userId) {
        throw new AuthorizationError("You do not have permission to delete this event.");
      }

      transaction.delete(docRef);
    });
  } catch (error: unknown) {
    if (error instanceof AuthorizationError) throw error;
    const msg = error instanceof Error ? error.message : "Failed to delete event";
    console.error("deleteEvent error:", msg);
    throw new DatabaseError(`Could not delete event: ${msg}`);
  }
}

/**
 * User Profile Firestore Management
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const db = getAdminFirestore();
    const doc = await db.collection(USERS_COLLECTION).doc(userId).get();
    if (!doc.exists) return null;

    const parsed = UserProfileSchema.safeParse(doc.data());
    return parsed.success ? parsed.data : null;
  } catch (error: unknown) {
    console.error("getUserProfile error:", error);
    return null;
  }
}

export async function upsertUserProfile(
  userId: string,
  data: {
    email: string;
    displayName?: string;
    photoURL?: string;
    preferences?: UserProfile["preferences"];
  }
): Promise<UserProfile> {
  const now = new Date().toISOString();
  const db = getAdminFirestore();
  const docRef = db.collection(USERS_COLLECTION).doc(userId);

  const existing = await docRef.get();
  const existingData = existing.exists ? existing.data() : null;

  const profile: UserProfile = {
    uid: userId,
    email: data.email,
    displayName: data.displayName ?? existingData?.displayName ?? "",
    photoURL: data.photoURL ?? existingData?.photoURL ?? "",
    preferences: data.preferences ?? existingData?.preferences ?? {
      defaultCurrency: "USD",
      emailNotifications: true,
      themePreference: "light",
    },
    createdAt: existingData?.createdAt || now,
    updatedAt: now,
  };

  await docRef.set(profile, { merge: true });
  return profile;
}
