"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import {
  ValidatedPlan,
  ExpenseItem,
  TaskItem,
  VendorItem,
  SavedEventDocument,
} from "@/schemas/event";
import { SAMPLE_EVENTS } from "@/data/sample-events";
import { validateAndRecalculateBudget } from "@/server/budget";
import { useAuth } from "@/hooks/useAuth";
import {
  saveEventToFirestore,
  getUserEventsFromFirestore,
  deleteEventFromFirestore,
} from "@/lib/firestore";

const STORAGE_KEY = "planora_ai_events_v1";

function getLocalEvents(): ValidatedPlan[] {
  if (typeof window === "undefined") return SAMPLE_EVENTS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Could not load events from localStorage:", e);
  }
  return SAMPLE_EVENTS;
}

// ============================================================================
// Shared Singleton Store with In-Flight Deduplication & SWR Caching
// ============================================================================
interface StoreState {
  events: ValidatedPlan[];
  isLoaded: boolean;
  isSyncing: boolean;
  syncError: string | null;
}

let storeState: StoreState = {
  events: SAMPLE_EVENTS,
  isLoaded: false,
  isSyncing: false,
  syncError: null,
};

let lastSyncUserId: string | null = null;
let lastSyncTimestamp = 0;
const CACHE_TTL_MS = 30000; // 30-second SWR cache window
let inFlightSyncPromise: Promise<void> | null = null;

const storeListeners = new Set<() => void>();

function notifyStoreListeners() {
  storeListeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // Ignore listener errors
    }
  });
}

function updateStore(partial: Partial<StoreState>) {
  storeState = { ...storeState, ...partial };
  notifyStoreListeners();
}

function persistLocally(updated: ValidatedPlan[]) {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn("Could not persist to localStorage:", e);
    }
  }
}

export function useEventStore() {
  const { user, isDemoMode, getIdToken, loading: authLoading } = useAuth();

  // Subscribe to external store for tear-free, instant cross-component updates
  const state = useSyncExternalStore(
    (onStoreChange) => {
      storeListeners.add(onStoreChange);
      return () => storeListeners.delete(onStoreChange);
    },
    () => storeState,
    () => ({
      events: SAMPLE_EVENTS,
      isLoaded: false,
      isSyncing: false,
      syncError: null,
    })
  );

  const { events, isLoaded, isSyncing, syncError } = state;

  // Sync / Load events when auth state settles
  useEffect(() => {
    if (authLoading) return;

    async function syncEvents() {
      if (user) {
        // SWR Check: If data is fresh for current user and loaded, skip network round-trip
        const now = Date.now();
        if (
          user.uid === lastSyncUserId &&
          now - lastSyncTimestamp < CACHE_TTL_MS &&
          storeState.isLoaded
        ) {
          return;
        }

        // Deduplication: If a sync request is already in-flight, await the same promise
        if (inFlightSyncPromise) {
          await inFlightSyncPromise;
          return;
        }

        updateStore({ isSyncing: true, syncError: null });

        inFlightSyncPromise = (async () => {
          try {
            const token = await getIdToken();
            let loadedPlans: ValidatedPlan[] | null = null;

            // Attempt 1: Server-side API with verified Firebase Admin ID Token
            if (token) {
              try {
                const res = await fetch("/api/events", {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                });

                if (res.ok) {
                  const rawText = await res.text();
                  if (rawText && rawText.trim().length > 0) {
                    try {
                      const json = JSON.parse(rawText);
                      if (json && json.success && Array.isArray(json.data)) {
                        loadedPlans = json.data.map((doc: SavedEventDocument) => doc.plan);
                      }
                    } catch {
                      // Ignore non-json body
                    }
                  }
                }
              } catch (apiErr) {
                console.warn("API route fetch error, attempting direct Firestore query:", apiErr);
              }
            }

            // Attempt 2: Direct Cloud Firestore Client SDK Query (governed by Firestore Rules)
            if (!loadedPlans) {
              try {
                const docs = await getUserEventsFromFirestore(user.uid);
                loadedPlans = docs.map((d) => d.plan);
              } catch (firestoreErr) {
                console.warn("Direct Firestore fetch error:", firestoreErr);
              }
            }

            if (loadedPlans) {
              updateStore({
                events: loadedPlans,
                isLoaded: true,
                isSyncing: false,
                syncError: null,
              });
              persistLocally(loadedPlans);
            } else {
              const local = getLocalEvents();
              updateStore({
                events: local,
                isLoaded: true,
                isSyncing: false,
                syncError: null,
              });
            }

            lastSyncUserId = user.uid;
            lastSyncTimestamp = Date.now();
          } catch (err: unknown) {
            console.warn("Error loading cloud events, retaining local state:", err);
            updateStore({
              isSyncing: false,
              isLoaded: true,
              syncError: err instanceof Error ? err.message : "Failed to sync with cloud",
            });
          } finally {
            inFlightSyncPromise = null;
          }
        })();

        await inFlightSyncPromise;
      } else {
        // Guest or Demo Mode
        if (!storeState.isLoaded || lastSyncUserId !== null) {
          const local = getLocalEvents();
          lastSyncUserId = null;
          updateStore({
            events: local,
            isLoaded: true,
            isSyncing: false,
            syncError: null,
          });
        }
      }
    }

    syncEvents();
  }, [user, authLoading, getIdToken]);

  const getEvent = useCallback(
    (id: string): ValidatedPlan | undefined => {
      return storeState.events.find((e) => e.id === id);
    },
    []
  );

  const saveEvent = useCallback(
    async (newEvent: ValidatedPlan): Promise<void> => {
      const currentEvents = storeState.events;
      const existingIdx = currentEvents.findIndex((e) => e.id === newEvent.id);
      const isUpdate = existingIdx >= 0;

      // Optimistic local update across all components immediately
      let updated: ValidatedPlan[];
      if (isUpdate) {
        updated = [...currentEvents];
        updated[existingIdx] = newEvent;
      } else {
        updated = [newEvent, ...currentEvents];
      }

      updateStore({ events: updated });
      persistLocally(updated);

      if (user) {
        updateStore({ isSyncing: true, syncError: null });
        let savedSuccessfully = false;

        // Attempt 1: Server-side API with deterministic verification
        try {
          const token = await getIdToken();
          if (token) {
            const endpoint = isUpdate ? `/api/events/${newEvent.id}` : "/api/events";
            const method = isUpdate ? "PUT" : "POST";

            const res = await fetch(endpoint, {
              method,
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ plan: newEvent }),
            });

            if (res.ok) {
              savedSuccessfully = true;
            }
          }
        } catch (apiErr) {
          console.warn("API save failed, falling back to direct Firestore SDK:", apiErr);
        }

        // Attempt 2: Direct Cloud Firestore Client write (strictly enforced by firestore.rules)
        if (!savedSuccessfully) {
          try {
            await saveEventToFirestore(user.uid, newEvent);
            savedSuccessfully = true;
          } catch (firestoreErr) {
            console.error("Direct Firestore write failed:", firestoreErr);
            updateStore({
              syncError:
                firestoreErr instanceof Error
                  ? firestoreErr.message
                  : "Failed to persist event to Cloud Firestore",
            });
          }
        }

        lastSyncTimestamp = Date.now();
        updateStore({ isSyncing: false });
      }
    },
    [user, getIdToken]
  );

  const deleteEvent = useCallback(
    async (id: string): Promise<void> => {
      const updated = storeState.events.filter((e) => e.id !== id);
      updateStore({ events: updated });
      persistLocally(updated);

      if (user) {
        updateStore({ isSyncing: true });
        try {
          const token = await getIdToken();
          let deleted = false;

          // Attempt 1: API route
          if (token) {
            try {
              const res = await fetch(`/api/events/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
              });
              if (res.ok) deleted = true;
            } catch {
              // fallback below
            }
          }

          // Attempt 2: Direct Firestore delete
          if (!deleted) {
            await deleteEventFromFirestore(id, user.uid);
          }
        } catch (err) {
          console.error("Cloud delete failed:", err);
        } finally {
          lastSyncTimestamp = Date.now();
          updateStore({ isSyncing: false });
        }
      }
    },
    [user, getIdToken]
  );

  const toggleTask = useCallback(
    (eventId: string, taskId: string) => {
      const target = storeState.events.find((e) => e.id === eventId);
      if (!target) return;

      const updatedTasks = target.tasks.map((t) =>
        t.id === taskId ? { ...t, completed: !t.completed } : t
      );

      const updatedPlan: ValidatedPlan = {
        ...target,
        tasks: updatedTasks,
        updatedAt: new Date().toISOString(),
      };

      saveEvent(updatedPlan);
    },
    [saveEvent]
  );

  const addExpenseItem = useCallback(
    (eventId: string, item: Omit<ExpenseItem, "id" | "isEstimated">) => {
      const target = storeState.events.find((e) => e.id === eventId);
      if (!target) return;

      const newItem: ExpenseItem = {
        ...item,
        id: `exp-user-${Date.now()}`,
        isEstimated: false,
      };

      const updatedExpenses = [newItem, ...target.expenses];
      const recalculated = validateAndRecalculateBudget(
        {
          ...target,
          expenses: updatedExpenses,
        },
        target.input,
        target.id
      );

      saveEvent(recalculated);
    },
    [saveEvent]
  );

  const removeExpenseItem = useCallback(
    (eventId: string, itemId: string) => {
      const target = storeState.events.find((e) => e.id === eventId);
      if (!target) return;

      const updatedExpenses = target.expenses.filter((e) => e.id !== itemId);
      const recalculated = validateAndRecalculateBudget(
        {
          ...target,
          expenses: updatedExpenses,
        },
        target.input,
        target.id
      );

      saveEvent(recalculated);
    },
    [saveEvent]
  );

  const updateExpenseItem = useCallback(
    (eventId: string, itemId: string, updatedFields: Partial<ExpenseItem>) => {
      const target = storeState.events.find((e) => e.id === eventId);
      if (!target) return;

      const updatedExpenses = target.expenses.map((exp) =>
        exp.id === itemId
          ? {
              ...exp,
              ...updatedFields,
              estimatedCost:
                typeof updatedFields.estimatedCost === "number"
                  ? Math.max(0, updatedFields.estimatedCost)
                  : exp.estimatedCost,
            }
          : exp
      );

      const recalculated = validateAndRecalculateBudget(
        {
          ...target,
          expenses: updatedExpenses,
        },
        target.input,
        target.id
      );

      saveEvent(recalculated);
    },
    [saveEvent]
  );

  const addTask = useCallback(
    (eventId: string, task: Omit<TaskItem, "id">) => {
      const target = storeState.events.find((e) => e.id === eventId);
      if (!target) return;

      const newTask: TaskItem = {
        ...task,
        id: `task-user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      };

      const updatedPlan: ValidatedPlan = {
        ...target,
        tasks: [newTask, ...target.tasks],
        updatedAt: new Date().toISOString(),
      };

      saveEvent(updatedPlan);
    },
    [saveEvent]
  );

  const deleteTask = useCallback(
    (eventId: string, taskId: string) => {
      const target = storeState.events.find((e) => e.id === eventId);
      if (!target) return;

      const updatedTasks = target.tasks.filter((t) => t.id !== taskId);
      const updatedPlan: ValidatedPlan = {
        ...target,
        tasks: updatedTasks,
        updatedAt: new Date().toISOString(),
      };

      saveEvent(updatedPlan);
    },
    [saveEvent]
  );

  const addVendor = useCallback(
    (eventId: string, vendor: Omit<VendorItem, "id">) => {
      const target = storeState.events.find((e) => e.id === eventId);
      if (!target) return;

      const newVendor: VendorItem = {
        ...vendor,
        id: `ven-user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      };

      const updatedPlan: ValidatedPlan = {
        ...target,
        vendors: [...target.vendors, newVendor],
        updatedAt: new Date().toISOString(),
      };

      saveEvent(updatedPlan);
    },
    [saveEvent]
  );

  const updateVendor = useCallback(
    (eventId: string, vendorId: string, updatedFields: Partial<VendorItem>) => {
      const target = storeState.events.find((e) => e.id === eventId);
      if (!target) return;

      const updatedVendors = target.vendors.map((v) =>
        v.id === vendorId ? { ...v, ...updatedFields } : v
      );

      const updatedPlan: ValidatedPlan = {
        ...target,
        vendors: updatedVendors,
        updatedAt: new Date().toISOString(),
      };

      saveEvent(updatedPlan);
    },
    [saveEvent]
  );

  const removeVendor = useCallback(
    (eventId: string, vendorId: string) => {
      const target = storeState.events.find((e) => e.id === eventId);
      if (!target) return;

      const updatedVendors = target.vendors.filter((v) => v.id !== vendorId);
      const updatedPlan: ValidatedPlan = {
        ...target,
        vendors: updatedVendors,
        updatedAt: new Date().toISOString(),
      };

      saveEvent(updatedPlan);
    },
    [saveEvent]
  );

  const addTimelineMilestone = useCallback(
    (eventId: string, phaseIndex: number, milestone: string) => {
      const target = storeState.events.find((e) => e.id === eventId);
      if (!target || !milestone.trim() || !target.timeline[phaseIndex]) return;

      const updatedTimeline = target.timeline.map((phase, idx) => {
        if (idx !== phaseIndex) return phase;
        return {
          ...phase,
          milestones: [...phase.milestones, milestone.trim()],
        };
      });

      const updatedPlan: ValidatedPlan = {
        ...target,
        timeline: updatedTimeline,
        updatedAt: new Date().toISOString(),
      };

      saveEvent(updatedPlan);
    },
    [saveEvent]
  );

  const updateTimelineMilestone = useCallback(
    (
      eventId: string,
      phaseIndex: number,
      milestoneIndex: number,
      newMilestone: string
    ) => {
      const target = storeState.events.find((e) => e.id === eventId);
      if (!target || !newMilestone.trim() || !target.timeline[phaseIndex]) return;

      const updatedTimeline = target.timeline.map((phase, idx) => {
        if (idx !== phaseIndex) return phase;
        const milestones = [...phase.milestones];
        if (milestoneIndex >= 0 && milestoneIndex < milestones.length) {
          milestones[milestoneIndex] = newMilestone.trim();
        }
        return { ...phase, milestones };
      });

      const updatedPlan: ValidatedPlan = {
        ...target,
        timeline: updatedTimeline,
        updatedAt: new Date().toISOString(),
      };

      saveEvent(updatedPlan);
    },
    [saveEvent]
  );

  const removeTimelineMilestone = useCallback(
    (eventId: string, phaseIndex: number, milestoneIndex: number) => {
      const target = storeState.events.find((e) => e.id === eventId);
      if (!target || !target.timeline[phaseIndex]) return;

      const updatedTimeline = target.timeline.map((phase, idx) => {
        if (idx !== phaseIndex) return phase;
        return {
          ...phase,
          milestones: phase.milestones.filter((_, mIdx) => mIdx !== milestoneIndex),
        };
      });

      const updatedPlan: ValidatedPlan = {
        ...target,
        timeline: updatedTimeline,
        updatedAt: new Date().toISOString(),
      };

      saveEvent(updatedPlan);
    },
    [saveEvent]
  );

  const moveTimelineMilestone = useCallback(
    (
      eventId: string,
      phaseIndex: number,
      milestoneIndex: number,
      direction: "up" | "down"
    ) => {
      const target = storeState.events.find((e) => e.id === eventId);
      if (!target || !target.timeline[phaseIndex]) return;

      const currentPhase = target.timeline[phaseIndex];
      const targetIdx =
        direction === "up" ? milestoneIndex - 1 : milestoneIndex + 1;

      if (targetIdx < 0 || targetIdx >= currentPhase.milestones.length) return;

      const reordered = [...currentPhase.milestones];
      const [moved] = reordered.splice(milestoneIndex, 1);
      reordered.splice(targetIdx, 0, moved);

      const updatedTimeline = target.timeline.map((phase, idx) =>
        idx === phaseIndex ? { ...phase, milestones: reordered } : phase
      );

      const updatedPlan: ValidatedPlan = {
        ...target,
        timeline: updatedTimeline,
        updatedAt: new Date().toISOString(),
      };

      saveEvent(updatedPlan);
    },
    [saveEvent]
  );

  const resetToDefaults = useCallback(() => {
    updateStore({ events: SAMPLE_EVENTS, isLoaded: true });
    persistLocally(SAMPLE_EVENTS);
  }, []);

  return {
    events,
    isLoaded,
    isSyncing,
    syncError,
    isDemoMode,
    getEvent,
    saveEvent,
    deleteEvent,
    toggleTask,
    addTask,
    deleteTask,
    addExpenseItem,
    updateExpenseItem,
    removeExpenseItem,
    addVendor,
    updateVendor,
    removeVendor,
    addTimelineMilestone,
    updateTimelineMilestone,
    removeTimelineMilestone,
    moveTimelineMilestone,
    resetToDefaults,
  };
}
