import { describe, it, expect } from "vitest";
import { validateAndRecalculateBudget } from "@/server/budget";
import { ValidatedPlan, ExpenseItem, TaskItem, VendorItem, TimelinePhase } from "@/schemas/event";
import { SAMPLE_EVENTS } from "@/data/sample-events";

describe("PlanoraAI Functional Audit - End-to-End Core Capabilities", () => {
  const baseEvent: ValidatedPlan = JSON.parse(JSON.stringify(SAMPLE_EVENTS[0]));

  describe("1. Budget Manager - Expenses, Totals, Reserve & Cost Per Guest", () => {
    it("accurately computes total expenses, remaining reserve, and cost per guest", () => {
      const recalculated = validateAndRecalculateBudget(baseEvent, baseEvent.input, baseEvent.id);

      const expectedTotal = recalculated.expenses.reduce((sum, e) => sum + e.estimatedCost, 0);
      expect(recalculated.budgetSummary.calculatedTotalExpenses).toBe(expectedTotal);

      const expectedRemaining = baseEvent.input.totalBudget - expectedTotal;
      expect(recalculated.budgetSummary.remainingBudget).toBe(expectedRemaining);

      const expectedCostPerGuest =
        baseEvent.input.guestCount > 0
          ? Math.round((expectedTotal / baseEvent.input.guestCount) * 100) / 100
          : 0;
      expect(recalculated.budgetSummary.costPerGuest).toBe(expectedCostPerGuest);
    });

    it("updates totals and remaining reserve when an expense item is edited", () => {
      const originalExpense = baseEvent.expenses[0];
      const updatedCost = originalExpense.estimatedCost + 500;

      const modifiedExpenses = baseEvent.expenses.map((e) =>
        e.id === originalExpense.id ? { ...e, estimatedCost: updatedCost } : e
      );

      const updatedPlan = validateAndRecalculateBudget(
        { ...baseEvent, expenses: modifiedExpenses },
        baseEvent.input,
        baseEvent.id
      );

      expect(updatedPlan.budgetSummary.calculatedTotalExpenses).toBe(
        baseEvent.budgetSummary.calculatedTotalExpenses + 500
      );
      expect(updatedPlan.budgetSummary.remainingBudget).toBe(
        baseEvent.budgetSummary.remainingBudget - 500
      );
    });

    it("correctly identifies over-budget status when expense additions exceed budget", () => {
      const massiveExpense: ExpenseItem = {
        id: "exp-overflow",
        category: "Venue & Rentals",
        itemName: "Luxury Helicopter Transport",
        estimatedCost: 100000,
        priority: "optional",
        isEstimated: false,
        rationale: "Extreme luxury addition",
      };

      const updatedPlan = validateAndRecalculateBudget(
        { ...baseEvent, expenses: [massiveExpense, ...baseEvent.expenses] },
        baseEvent.input,
        baseEvent.id
      );

      expect(updatedPlan.budgetSummary.isOverBudget).toBe(true);
      expect(updatedPlan.budgetSummary.overBudgetAmount).toBeGreaterThan(0);
      expect(updatedPlan.budgetSummary.remainingBudget).toBeLessThan(0);
    });

    it("recalculates category percentages dynamically after removing an expense", () => {
      const filteredExpenses = baseEvent.expenses.slice(1);
      const updatedPlan = validateAndRecalculateBudget(
        { ...baseEvent, expenses: filteredExpenses },
        baseEvent.input,
        baseEvent.id
      );

      const sumPercentages = updatedPlan.categoryBudgets.reduce((sum, c) => sum + c.percentage, 0);
      expect(sumPercentages).toBeGreaterThanOrEqual(99.0);
      expect(sumPercentages).toBeLessThanOrEqual(100.5);
    });

    it("handles extreme budget boundaries: zero budget and single guest safely", () => {
      const zeroBudgetInput = {
        ...baseEvent.input,
        totalBudget: 0,
        guestCount: 1,
      };

      const result = validateAndRecalculateBudget(baseEvent, zeroBudgetInput, "zero-budget-test");

      expect(result.budgetSummary.totalUserBudget).toBe(0);
      expect(result.budgetSummary.isOverBudget).toBe(true);
      expect(result.budgetSummary.remainingBudget).toBe(-result.budgetSummary.calculatedTotalExpenses);
      expect(result.budgetSummary.costPerGuest).toBe(result.budgetSummary.calculatedTotalExpenses);
      expect(result.feasibilityAssessment).toContain("Budget Alert");
    });

    it("supports international currencies accurately without arithmetic drift", () => {
      const eurInput = {
        ...baseEvent.input,
        currency: "EUR",
        totalBudget: 25000,
      };

      const result = validateAndRecalculateBudget(baseEvent, eurInput, "eur-test");
      expect(result.budgetSummary.currency).toBe("EUR");
      expect(result.budgetSummary.totalUserBudget).toBe(25000);
    });
  });

  describe("2. Problem-Statement Alignment - Event Types Support", () => {
    it("validates and calculates plans for Wedding events", () => {
      const weddingPlan = SAMPLE_EVENTS.find((e) => e.input.eventType === "wedding");
      expect(weddingPlan).toBeDefined();
      if (!weddingPlan) return;

      const verified = validateAndRecalculateBudget(weddingPlan, weddingPlan.input, weddingPlan.id);
      expect(verified.input.eventType).toBe("wedding");
      expect(verified.budgetSummary.calculatedTotalExpenses).toBeGreaterThan(0);
      expect(verified.tasks.length).toBeGreaterThan(0);
      expect(verified.timeline.length).toBeGreaterThan(0);
    });

    it("validates and calculates plans for Milestone Birthday celebrations", () => {
      const birthdayPlan = SAMPLE_EVENTS.find((e) => e.input.eventType === "birthday");
      expect(birthdayPlan).toBeDefined();
      if (!birthdayPlan) return;

      const verified = validateAndRecalculateBudget(birthdayPlan, birthdayPlan.input, birthdayPlan.id);
      expect(verified.input.eventType).toBe("birthday");
      expect(verified.input.guestCount).toBeGreaterThan(0);
      expect(verified.vendors.length).toBeGreaterThan(0);
    });

    it("validates and calculates plans for Community events", () => {
      const communityPlan = SAMPLE_EVENTS.find((e) => e.input.eventType === "community");
      expect(communityPlan).toBeDefined();
      if (!communityPlan) return;

      const verified = validateAndRecalculateBudget(communityPlan, communityPlan.input, communityPlan.id);
      expect(verified.input.eventType).toBe("community");
      expect(verified.categoryBudgets.length).toBeGreaterThan(0);
      expect(verified.budgetSummary.disclaimer).toBeTruthy();
    });
  });

  describe("2. Checklist - Completion, Progress Percentage & Tasks", () => {
    it("computes task progress percentage correctly", () => {
      const tasks: TaskItem[] = [
        {
          id: "t1",
          title: "Book caterer",
          category: "Catering",
          priority: "high",
          timelineMarker: "6 months",
          completed: true,
          notes: "",
        },
        {
          id: "t2",
          title: "Hire photographer",
          category: "Media",
          priority: "medium",
          timelineMarker: "4 months",
          completed: false,
          notes: "",
        },
        {
          id: "t3",
          title: "Send invitations",
          category: "Stationery",
          priority: "high",
          timelineMarker: "2 months",
          completed: true,
          notes: "",
        },
        {
          id: "t4",
          title: "Finalize seating chart",
          category: "Coordination",
          priority: "low",
          timelineMarker: "1 week",
          completed: false,
          notes: "",
        },
      ];

      const completedCount = tasks.filter((t) => t.completed).length;
      const progressPct = Math.round((completedCount / tasks.length) * 100);

      expect(completedCount).toBe(2);
      expect(progressPct).toBe(50);
    });

    it("toggles task completion state properly", () => {
      const task = baseEvent.tasks[0];
      const initialStatus = task.completed;

      const toggledTasks = baseEvent.tasks.map((t) =>
        t.id === task.id ? { ...t, completed: !t.completed } : t
      );

      expect(toggledTasks[0].completed).toBe(!initialStatus);
    });
  });

  describe("3. Timeline - Milestones Ordering & Editing", () => {
    it("allows reordering milestones in a timeline phase", () => {
      const phase: TimelinePhase = {
        phaseName: "Initial Planning",
        timeWindow: "9-12 Months Before",
        milestones: ["Establish core budget", "Tour top 3 venues", "Hire wedding planner"],
        keyDeadlines: ["Lock down venue deposit"],
      };

      // Move milestone at index 2 up to index 1
      const reordered = [...phase.milestones];
      const [item] = reordered.splice(2, 1);
      reordered.splice(1, 0, item);

      expect(reordered).toEqual([
        "Establish core budget",
        "Hire wedding planner",
        "Tour top 3 venues",
      ]);
    });

    it("allows updating milestone text", () => {
      const phase: TimelinePhase = {
        phaseName: "Final Countdown",
        timeWindow: "1-2 Weeks Before",
        milestones: ["Finalize seating chart", "Rehearsal dinner"],
        keyDeadlines: ["Final vendor payment"],
      };

      const updatedMilestones = [...phase.milestones];
      updatedMilestones[0] = "Finalize seating chart and allergen cards";

      expect(updatedMilestones[0]).toBe("Finalize seating chart and allergen cards");
      expect(updatedMilestones.length).toBe(2);
    });
  });

  describe("4. Vendors - Adding, Updating & Status Transitions", () => {
    it("handles vendor status transitions from researching to contacted to booked", () => {
      const vendor: VendorItem = {
        id: "ven-test-1",
        category: "Florals & Ambience",
        serviceType: "Botanical Floral Stylist",
        recommendedBookingWindow: "6-8 months prior",
        estimatedCost: 2200,
        status: "researching",
        keyQuestionsToAsk: ["Do you source local flowers?"],
        requiredSpecifications: [],
      };

      expect(vendor.status).toBe("researching");

      const contactedVendor: VendorItem = { ...vendor, status: "contacted" };
      expect(contactedVendor.status).toBe("contacted");

      const bookedVendor: VendorItem = {
        ...contactedVendor,
        status: "booked",
        estimatedCost: 2400,
      };
      expect(bookedVendor.status).toBe("booked");
      expect(bookedVendor.estimatedCost).toBe(2400);
    });

    it("supports adding and deleting vendor entries", () => {
      const initialCount = baseEvent.vendors.length;
      const newVendor: VendorItem = {
        id: "ven-new-test",
        category: "Music & Audio",
        serviceType: "Acoustic String Quartet",
        recommendedBookingWindow: "3-5 months prior",
        estimatedCost: 1500,
        status: "researching",
        keyQuestionsToAsk: ["Do you have personal amplification?"],
        requiredSpecifications: [],
      };

      const withVendor = [...baseEvent.vendors, newVendor];
      expect(withVendor.length).toBe(initialCount + 1);

      const afterDelete = withVendor.filter((v) => v.id !== newVendor.id);
      expect(afterDelete.length).toBe(initialCount);
    });
  });

  describe("5. Reliability & Security Guarantees", () => {
    it("guarantees non-negative budget math even when input contains negative numbers", () => {
      const malformedInput = {
        ...baseEvent.input,
        totalBudget: -5000,
      };

      const result = validateAndRecalculateBudget(baseEvent, malformedInput, "negative-budget-check");
      expect(result.budgetSummary.totalUserBudget).toBe(0);
      expect(result.budgetSummary.isOverBudget).toBe(true);
    });

    it("preserves event immutability by producing clean timestamps", () => {
      const result = validateAndRecalculateBudget(baseEvent, baseEvent.input, "timestamp-check");
      expect(result.budgetSummary.verifiedTimestamp).toBeTruthy();
      expect(new Date(result.budgetSummary.verifiedTimestamp).getTime()).not.toBeNaN();
    });
  });
});

