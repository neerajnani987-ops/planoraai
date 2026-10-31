import { z } from "zod";

export const EventTypeEnum = z.enum(["wedding", "birthday", "community", "other"]);
export type EventType = z.infer<typeof EventTypeEnum>;

export const TaskPriorityEnum = z.enum(["high", "medium", "low"]);
export type TaskPriority = z.infer<typeof TaskPriorityEnum>;

export const ExpensePriorityEnum = z.enum(["must-have", "nice-to-have", "optional"]);
export type ExpensePriority = z.infer<typeof ExpensePriorityEnum>;

export const EventInputSchema = z.object({
  eventName: z.string().min(2, "Event name must be at least 2 characters").max(100),
  eventType: EventTypeEnum,
  eventDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "A valid event date is required",
  }),
  location: z.string().min(2, "Location must be at least 2 characters").max(120),
  guestCount: z.coerce.number().int().min(1, "Guest count must be at least 1").max(50000),
  totalBudget: z.coerce.number().min(0, "Budget must be a non-negative amount"),
  currency: z.string().min(1).max(5).default("USD"),
  theme: z.string().max(200).optional().default(""),
  userPreferences: z.string().max(1000).optional().default(""),
  specialRequirements: z.string().max(1000).optional().default(""),
});

export type EventInput = z.infer<typeof EventInputSchema>;

// Individual expense estimate
export const ExpenseItemSchema = z.object({
  id: z.string().default(() => Math.random().toString(36).substring(2, 9)),
  category: z.string(),
  itemName: z.string(),
  estimatedCost: z.number().min(0, "Expense cannot be negative"),
  priority: ExpensePriorityEnum.default("must-have"),
  isEstimated: z.boolean().default(true),
  rationale: z.string().default(""),
});
export type ExpenseItem = z.infer<typeof ExpenseItemSchema>;

// Category breakdown
export const CategoryBudgetSchema = z.object({
  category: z.string(),
  allocatedAmount: z.number().min(0),
  percentage: z.number().min(0).max(100),
  notes: z.string().default(""),
});
export type CategoryBudget = z.infer<typeof CategoryBudgetSchema>;

// Timeline Phase
export const TimelinePhaseSchema = z.object({
  phaseName: z.string(),
  timeWindow: z.string(),
  milestones: z.array(z.string()).default([]),
  keyDeadlines: z.array(z.string()).default([]),
});
export type TimelinePhase = z.infer<typeof TimelinePhaseSchema>;

// Task item
export const TaskItemSchema = z.object({
  id: z.string().default(() => Math.random().toString(36).substring(2, 9)),
  title: z.string(),
  category: z.string(),
  priority: TaskPriorityEnum.default("medium"),
  timelineMarker: z.string().default(""),
  dueDate: z.string().optional(),
  completed: z.boolean().default(false),
  notes: z.string().default(""),
});
export type TaskItem = z.infer<typeof TaskItemSchema>;

// Vendor checklist item
export const VendorItemSchema = z.object({
  id: z.string().default(() => Math.random().toString(36).substring(2, 9)),
  category: z.string(),
  serviceType: z.string(),
  recommendedBookingWindow: z.string(),
  estimatedCost: z.number().min(0).default(0),
  status: z.enum(["researching", "contacted", "booked"]).default("researching"),
  keyQuestionsToAsk: z.array(z.string()).default([]),
  requiredSpecifications: z.array(z.string()).default([]),
});
export type VendorItem = z.infer<typeof VendorItemSchema>;

// Cost saving tip
export const CostSavingTipSchema = z.object({
  title: z.string(),
  potentialSavings: z.string(),
  implementationGuide: z.string(),
  impactOnExperience: z.enum(["low", "moderate"]).default("low"),
});
export type CostSavingTip = z.infer<typeof CostSavingTipSchema>;

// Contingency plan item
export const ContingencyItemSchema = z.object({
  riskFactor: z.string(),
  mitigationStrategy: z.string(),
  backupPlan: z.string(),
});
export type ContingencyItem = z.infer<typeof ContingencyItemSchema>;

// Theme and decoration ideas
export const ThemeAndDecorSchema = z.object({
  primaryColorPalette: z.array(z.string()).default([]),
  aestheticStyle: z.string(),
  decorElements: z.array(z.string()).default([]),
  atmosphere: z.string().default(""),
});
export type ThemeAndDecor = z.infer<typeof ThemeAndDecorSchema>;

// Food and entertainment
export const FoodAndEntertainmentSchema = z.object({
  cateringStyle: z.string(),
  menuConcepts: z.array(z.string()).default([]),
  entertainmentOptions: z.array(z.string()).default([]),
  dietaryInclusivityNotes: z.string().default(""),
});
export type FoodAndEntertainment = z.infer<typeof FoodAndEntertainmentSchema>;

// Guest management
export const GuestManagementSchema = z.object({
  seatingLayout: z.string().default(""),
  invitationTimeline: z.string().default(""),
  rsvpTrackingTips: z.string().default(""),
  accessibilityAccommodations: z.string().default(""),
});
export type GuestManagement = z.infer<typeof GuestManagementSchema>;

// Raw AI-generated output schema before deterministic server math validation
export const RawAiPlanSchema = z.object({
  title: z.string(),
  tagline: z.string(),
  visionSummary: z.string(),
  feasibilityAssessment: z.string(),
  themeAndDecor: ThemeAndDecorSchema,
  categoryBudgets: z.array(CategoryBudgetSchema).default([]),
  expenses: z.array(ExpenseItemSchema).default([]),
  timeline: z.array(TimelinePhaseSchema).default([]),
  tasks: z.array(TaskItemSchema).default([]),
  vendors: z.array(VendorItemSchema).default([]),
  foodAndEntertainment: FoodAndEntertainmentSchema,
  guestManagement: GuestManagementSchema,
  costSavingIdeas: z.array(CostSavingTipSchema).default([]),
  contingencies: z.array(ContingencyItemSchema).default([]),
  finalReadinessChecklist: z.array(z.string()).default([]),
});
export type RawAiPlan = z.infer<typeof RawAiPlanSchema>;

// Validated Plan with deterministic math computed on server
export const ValidatedPlanSchema = RawAiPlanSchema.extend({
  id: z.string(),
  input: EventInputSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  budgetSummary: z.object({
    totalUserBudget: z.number(),
    calculatedTotalExpenses: z.number(),
    remainingBudget: z.number(),
    isOverBudget: z.boolean(),
    overBudgetAmount: z.number(),
    costPerGuest: z.number(),
    currency: z.string(),
    verifiedTimestamp: z.string(),
    disclaimer: z.string(),
  }),
});
export type ValidatedPlan = z.infer<typeof ValidatedPlanSchema>;

// API Request schemas
export const PlanRevisionRequestSchema = z.object({
  currentPlan: ValidatedPlanSchema,
  revisionInstruction: z.string().min(3, "Revision instructions must be at least 3 characters").max(500),
  preserveTasks: z.boolean().default(true),
  preserveBudgetTotal: z.boolean().default(true),
});
export type PlanRevisionRequest = z.infer<typeof PlanRevisionRequestSchema>;

export const BudgetOptimizeRequestSchema = z.object({
  currentPlan: ValidatedPlanSchema,
  targetReductionPercentage: z.number().min(1).max(50).default(10),
  protectedCategories: z.array(z.string()).default([]),
});
export type BudgetOptimizeRequest = z.infer<typeof BudgetOptimizeRequestSchema>;

export const RescheduleRequestSchema = z.object({
  currentPlan: ValidatedPlanSchema,
  newEventDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "A valid new event date is required",
  }),
});
export type RescheduleRequest = z.infer<typeof RescheduleRequestSchema>;

// Saved Event in Firestore
export const SavedEventDocumentSchema = z.object({
  id: z.string(),
  userId: z.string(),
  plan: ValidatedPlanSchema,
  title: z.string(),
  eventType: EventTypeEnum,
  eventDate: z.string(),
  location: z.string(),
  guestCount: z.number().min(1),
  totalBudget: z.number().min(0),
  calculatedTotalExpenses: z.number().min(0),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type SavedEventDocument = z.infer<typeof SavedEventDocumentSchema>;

export const CreateEventRequestSchema = z.object({
  plan: ValidatedPlanSchema,
});
export type CreateEventRequest = z.infer<typeof CreateEventRequestSchema>;

export const UpdateEventRequestSchema = z.object({
  plan: ValidatedPlanSchema,
});
export type UpdateEventRequest = z.infer<typeof UpdateEventRequestSchema>;

