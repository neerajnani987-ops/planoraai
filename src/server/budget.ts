import {
  EventInput,
  RawAiPlan,
  ValidatedPlan,
  ExpenseItem,
  CategoryBudget,
} from "@/schemas/event";

export const ESTIMATE_DISCLAIMER =
  "All financial projections and item costs are AI-generated advisory estimates for planning purposes only and must be verified directly with licensed local vendors.";

/**
 * Deterministically recalculates and validates all budget math using pure TypeScript logic.
 * Never trusts AI arithmetic. Guarantees non-negative expenses, verifies category percentages,
 * and flags over-budget scenarios explicitly.
 */
export function validateAndRecalculateBudget(
  rawPlan: RawAiPlan,
  input: EventInput,
  existingPlanId?: string
): ValidatedPlan {
  // 1. Sanitize expenses: guarantee no negative numbers, ensure isEstimated flag is set
  const sanitizedExpenses: ExpenseItem[] = (rawPlan.expenses || []).map(
    (item, index) => {
      const sanitizedCost = Math.max(0, Math.round((Number(item.estimatedCost) || 0) * 100) / 100);
      return {
        id: item.id || `exp-${index + 1}-${Math.random().toString(36).substring(2, 7)}`,
        category: (item.category || "General").trim(),
        itemName: (item.itemName || `Expense item ${index + 1}`).trim(),
        estimatedCost: sanitizedCost,
        priority: item.priority || "must-have",
        isEstimated: true,
        rationale: item.rationale || "Estimated based on event parameters and guest count",
      };
    }
  );

  // 2. Sum up expenses deterministically
  const calculatedTotalExpenses = sanitizedExpenses.reduce(
    (sum, item) => Math.round((sum + item.estimatedCost) * 100) / 100,
    0
  );

  const totalUserBudget = Math.max(0, Math.round(input.totalBudget * 100) / 100);
  const remainingBudget = Math.round((totalUserBudget - calculatedTotalExpenses) * 100) / 100;
  const isOverBudget = remainingBudget < 0;
  const overBudgetAmount = isOverBudget ? Math.abs(remainingBudget) : 0;
  const costPerGuest =
    input.guestCount > 0
      ? Math.round((calculatedTotalExpenses / input.guestCount) * 100) / 100
      : 0;

  // 3. Recalculate Category Budgets based on actual item totals
  const categoryTotals = new Map<string, number>();
  sanitizedExpenses.forEach((item) => {
    const current = categoryTotals.get(item.category) || 0;
    categoryTotals.set(item.category, current + item.estimatedCost);
  });

  // Merge with rawPlan.categoryBudgets or generate if empty
  const rawCatMap = new Map((rawPlan.categoryBudgets || []).map((cb) => [cb.category, cb]));
  const categoriesToProcess = Array.from(
    new Set([...categoryTotals.keys(), ...rawCatMap.keys()])
  );

  const verifiedCategoryBudgets: CategoryBudget[] = categoriesToProcess.map((category) => {
    const itemTotal = categoryTotals.get(category) || 0;
    const existingCat = rawCatMap.get(category);
    const allocated = itemTotal > 0 ? itemTotal : existingCat?.allocatedAmount || 0;
    const percentage =
      calculatedTotalExpenses > 0
        ? Math.round((allocated / calculatedTotalExpenses) * 1000) / 10
        : 0;

    return {
      category,
      allocatedAmount: Math.round(allocated * 100) / 100,
      percentage,
      notes: existingCat?.notes || `Calculated based on ${sanitizedExpenses.filter(e => e.category === category).length} items`,
    };
  });

  // 4. Check feasibility narrative and append warning if over budget
  let feasibility = rawPlan.feasibilityAssessment || "Plan feasibility assessed against target budget.";
  if (isOverBudget) {
    const overrunWarning = `[Budget Alert: The current estimated item breakdown exceeds your target budget by ${input.currency} ${overBudgetAmount.toLocaleString()}. Consider reviewing nice-to-have items or adjusting guest count/scope.]`;
    if (!feasibility.includes("Budget Alert")) {
      feasibility = `${feasibility} ${overrunWarning}`;
    }
  }

  // 5. Ensure tasks have unique IDs and safe defaults
  const sanitizedTasks = (rawPlan.tasks || []).map((task, idx) => ({
    id: task.id || `task-${idx + 1}-${Math.random().toString(36).substring(2, 7)}`,
    title: task.title,
    category: task.category || "General",
    priority: task.priority || "medium",
    timelineMarker: task.timelineMarker || "Preparation",
    dueDate: task.dueDate || undefined,
    completed: Boolean(task.completed),
    notes: task.notes || "",
  }));

  // 6. Ensure vendors have unique IDs and non-negative estimates
  const sanitizedVendors = (rawPlan.vendors || []).map((vendor, idx) => ({
    id: vendor.id || `ven-${idx + 1}-${Math.random().toString(36).substring(2, 7)}`,
    category: vendor.category || "General Service",
    serviceType: vendor.serviceType,
    recommendedBookingWindow: vendor.recommendedBookingWindow || "4-8 weeks prior",
    estimatedCost: Math.max(0, Number(vendor.estimatedCost) || 0),
    status: vendor.status || "researching",
    keyQuestionsToAsk: vendor.keyQuestionsToAsk || [],
    requiredSpecifications: vendor.requiredSpecifications || [],
  }));

  const nowIso = new Date().toISOString();

  return {
    ...rawPlan,
    id: existingPlanId || `plan-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    input,
    createdAt: nowIso,
    updatedAt: nowIso,
    feasibilityAssessment: feasibility,
    expenses: sanitizedExpenses,
    categoryBudgets: verifiedCategoryBudgets,
    tasks: sanitizedTasks,
    vendors: sanitizedVendors,
    budgetSummary: {
      totalUserBudget,
      calculatedTotalExpenses,
      remainingBudget,
      isOverBudget,
      overBudgetAmount,
      costPerGuest,
      currency: input.currency,
      verifiedTimestamp: nowIso,
      disclaimer: ESTIMATE_DISCLAIMER,
    },
  };
}
