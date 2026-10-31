import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
} from "firebase/firestore";
import { getClientFirestore } from "@/lib/firebase";
import {
  ValidatedPlan,
  SavedEventDocument,
  SavedEventDocumentSchema,
} from "@/schemas/event";
import { validateAndRecalculateBudget } from "@/server/budget";

const EVENTS_COLLECTION = "events";

export class FirestoreClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FirestoreClientError";
  }
}

/**
 * Saves or updates an event document in Cloud Firestore for an authenticated user.
 * Validates deterministic budget math before writing.
 */
export async function saveEventToFirestore(
  userId: string,
  plan: ValidatedPlan
): Promise<SavedEventDocument> {
  if (!userId) {
    throw new FirestoreClientError("User ID is required to save event to Firestore");
  }

  const db = getClientFirestore();
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

  const docRef = doc(db, EVENTS_COLLECTION, eventId);
  await setDoc(docRef, eventDoc, { merge: true });

  return eventDoc;
}

/**
 * Retrieves all events owned by an authenticated user from Cloud Firestore.
 */
export async function getUserEventsFromFirestore(
  userId: string
): Promise<SavedEventDocument[]> {
  if (!userId) {
    throw new FirestoreClientError("User ID is required to fetch events from Firestore");
  }

  const db = getClientFirestore();
  const q = query(
    collection(db, EVENTS_COLLECTION),
    where("userId", "==", userId)
  );

  const snapshot = await getDocs(q);
  const events: SavedEventDocument[] = [];

  snapshot.forEach((d) => {
    const data = d.data();
    const parsed = SavedEventDocumentSchema.safeParse(data);
    if (parsed.success) {
      events.push(parsed.data);
    } else {
      console.warn(`Skipping invalid Firestore event document ${d.id}:`, parsed.error.issues);
    }
  });

  return events.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

/**
 * Retrieves a single event document by ID from Cloud Firestore, verifying ownership.
 */
export async function getEventByIdFromFirestore(
  eventId: string,
  userId: string
): Promise<SavedEventDocument | null> {
  if (!eventId || !userId) {
    throw new FirestoreClientError("Event ID and User ID are required");
  }

  const db = getClientFirestore();
  const docRef = doc(db, EVENTS_COLLECTION, eventId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  const data = docSnap.data();
  if (data.userId !== userId) {
    throw new FirestoreClientError("Permission denied: You do not own this event.");
  }

  const parsed = SavedEventDocumentSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

/**
 * Deletes an event document from Cloud Firestore, verifying ownership.
 */
export async function deleteEventFromFirestore(
  eventId: string,
  userId: string
): Promise<void> {
  if (!eventId || !userId) {
    throw new FirestoreClientError("Event ID and User ID are required");
  }

  const db = getClientFirestore();
  const docRef = doc(db, EVENTS_COLLECTION, eventId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return;
  }

  const data = docSnap.data();
  if (data.userId !== userId) {
    throw new FirestoreClientError("Permission denied: You cannot delete another user's event.");
  }

  await deleteDoc(docRef);
}
