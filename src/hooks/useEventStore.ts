"use client";

import { useState, useCallback, useEffect, useRef } from "react";
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

export function useEventStore() {
  const { user, isDemoMode, getIdToken, loading: authLoading } = useAuth();
  // Initialize to SAMPLE_EVENTS consistently on server and client to avoid SSR hydration mismatches
  const [events, setEvents] = useState<ValidatedPlan[]>(SAMPLE_EVENTS);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const prevUserIdRef = useRef<string | null>(null);

  // Sync / Load events when auth state settles
  useEffect(() => {
    if (authLoading) return;

    let isMounted = true;

    async function loadUserEvents() {
      if (user) {
        setIsSyncing(true);
        setSyncError(null);
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

          if (isMounted) {
            if (loadedPlans) {
              setEvents(loadedPlans);
            } else {
              // Fallback to local events if both cloud methods fail
              setEvents(getLocalEvents());
            }
          }
        } catch (err: unknown) {
          console.warn("Error loading cloud events, retaining local state:", err);
          if (isMounted) {
            setSyncError(err instanceof Error ? err.message : "Failed to sync with cloud");
          }
        } finally {
          if (isMounted) {
            setIsSyncing(false);
            setIsLoaded(true);
          }
        }
      } else {
        // Guest or Demo Mode
        if (isMounted) {
          setEvents(getLocalEvents());
          setIsLoaded(true);
        }
      }
    }

    // Trigger on user change or initial load
    if (user?.uid !== prevUserIdRef.current || !isLoaded) {
      prevUserIdRef.current = user?.uid || null;
      loadUserEvents();
    }

    return () => {
      isMounted = false;
    };
  }, [user, authLoading, getIdToken, isLoaded]);

  // Persist local changes to localStorage when in demo mode or unauthenticated
  const persistLocally = useCallback((updated: ValidatedPlan[]) => {
    setEvents(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn("Could not persist to localStorage:", e);
    }
  }, []);

  const getEvent = useCallback(
    (id: string): ValidatedPlan | undefined => {
      return events.find((e) => e.id === id);
    },
    [events]
  );

  const saveEvent = useCallback(
    async (newEvent: ValidatedPlan): Promise<void> => {
      const existingIdx = events.findIndex((e) => e.id === newEvent.id);
      const isUpdate = existingIdx >= 0;

      // Optimistic local update
      let updated: ValidatedPlan[];
      if (isUpdate) {
        updated = [...events];
        updated[existingIdx] = newEvent;
      } else {
        updated = [newEvent, ...events];
      }
      setEvents(updated);

      if (user) {
        setIsSyncing(true);
        setSyncError(null);
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
            setSyncError(
              firestoreErr instanceof Error
                ? firestoreErr.message
                : "Failed to persist event to Cloud Firestore"
            );
          }
        }

        // Always update local cache
        persistLocally(updated);
        setIsSyncing(false);
      } else {
        persistLocally(updated);
      }
    },
    [events, user, getIdToken, persistLocally]
  );

  const deleteEvent = useCallback(
    async (id: string): Promise<void> => {
      const updated = events.filter((e) => e.id !== id);
      setEvents(updated);

      if (user) {
        setIsSyncing(true);
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
          setIsSyncing(false);
        }
      } else {
        persistLocally(updated);
      }
    },
    [events, user, getIdToken, persistLocally]
  );

  const toggleTask = useCallback(
    (eventId: string, taskId: string) => {
      const target = events.find((e) => e.id === eventId);
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
    [events, saveEvent]
  );

  const addExpenseItem = useCallback(
    (eventId: string, item: Omit<ExpenseItem, "id" | "isEstimated">) => {
      const target = events.find((e) => e.id === eventId);
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
    [events, saveEvent]
  );

  const removeExpenseItem = useCallback(
    (eventId: string, itemId: string) => {
      const target = events.find((e) => e.id === eventId);
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
    [events, saveEvent]
  );

  const updateExpenseItem = useCallback(
    (eventId: string, itemId: string, updatedFields: Partial<ExpenseItem>) => {
      const target = events.find((e) => e.id === eventId);
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
    [events, saveEvent]
  );

  const addTask = useCallback(
    (eventId: string, task: Omit<TaskItem, "id">) => {
      const target = events.find((e) => e.id === eventId);
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
    [events, saveEvent]
  );

  const deleteTask = useCallback(
    (eventId: string, taskId: string) => {
      const target = events.find((e) => e.id === eventId);
      if (!target) return;

      const updatedTasks = target.tasks.filter((t) => t.id !== taskId);
      const updatedPlan: ValidatedPlan = {
        ...target,
        tasks: updatedTasks,
        updatedAt: new Date().toISOString(),
      };

      saveEvent(updatedPlan);
    },
    [events, saveEvent]
  );

  const addVendor = useCallback(
    (eventId: string, vendor: Omit<VendorItem, "id">) => {
      const target = events.find((e) => e.id === eventId);
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
    [events, saveEvent]
  );

  const updateVendor = useCallback(
    (eventId: string, vendorId: string, updatedFields: Partial<VendorItem>) => {
      const target = events.find((e) => e.id === eventId);
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
    [events, saveEvent]
  );

  const removeVendor = useCallback(
    (eventId: string, vendorId: string) => {
      const target = events.find((e) => e.id === eventId);
      if (!target) return;

      const updatedVendors = target.vendors.filter((v) => v.id !== vendorId);
      const updatedPlan: ValidatedPlan = {
        ...target,
        vendors: updatedVendors,
        updatedAt: new Date().toISOString(),
      };

      saveEvent(updatedPlan);
    },
    [events, saveEvent]
  );

  const addTimelineMilestone = useCallback(
    (eventId: string, phaseIndex: number, milestone: string) => {
      const target = events.find((e) => e.id === eventId);
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
    [events, saveEvent]
  );

  const updateTimelineMilestone = useCallback(
    (
      eventId: string,
      phaseIndex: number,
      milestoneIndex: number,
      newMilestone: string
    ) => {
      const target = events.find((e) => e.id === eventId);
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
    [events, saveEvent]
  );

  const removeTimelineMilestone = useCallback(
    (eventId: string, phaseIndex: number, milestoneIndex: number) => {
      const target = events.find((e) => e.id === eventId);
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
    [events, saveEvent]
  );

  const moveTimelineMilestone = useCallback(
    (
      eventId: string,
      phaseIndex: number,
      milestoneIndex: number,
      direction: "up" | "down"
    ) => {
      const target = events.find((e) => e.id === eventId);
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
    [events, saveEvent]
  );

  const resetToDefaults = useCallback(() => {
    persistLocally(SAMPLE_EVENTS);
  }, [persistLocally]);

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
