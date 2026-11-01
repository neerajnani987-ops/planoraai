"use client";

import React, { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  DollarSign,
  Trash2,
  AlertTriangle,
  Building2,
  CalendarDays,
  ListTodo,
  FileText,
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { LoadingState } from "@/components/ui/LoadingState";
import {
  OverviewTab,
  BudgetTab,
  TimelineTab,
  TasksTab,
  VendorsTab,
  AiAssistantTab,
} from "@/components/workspace";
import { useEventStore } from "@/hooks/useEventStore";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ValidatedPlan, ExpenseItem, VendorItem } from "@/schemas/event";

type ActiveTab = "overview" | "budget" | "timeline" | "tasks" | "vendors" | "ai-assistant";

export default function EventWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const eventId = String(params.id);

  const {
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
    isLoaded,
  } = useEventStore();

  const currentPlan = getEvent(eventId);

  // Active Tab
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");

  // Filter & Search states
  const [taskSearch, setTaskSearch] = useState("");
  const [taskStatusFilter, setTaskStatusFilter] = useState<"all" | "pending" | "completed">("all");
  const [expenseSearch, setExpenseSearch] = useState("");
  const [vendorSearch, setVendorSearch] = useState("");

  // Modals & AI Revision States
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
  const [isEditExpenseModalOpen, setIsEditExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);

  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [isAddVendorModalOpen, setIsAddVendorModalOpen] = useState(false);
  const [isEditVendorModalOpen, setIsEditVendorModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<VendorItem | null>(null);

  const [isAddMilestoneModalOpen, setIsAddMilestoneModalOpen] = useState(false);
  const [selectedPhaseIndex, setSelectedPhaseIndex] = useState(0);
  const [newMilestoneText, setNewMilestoneText] = useState("");
  const [isEditMilestoneModalOpen, setIsEditMilestoneModalOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<{
    phaseIndex: number;
    milestoneIndex: number;
    text: string;
  } | null>(null);

  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiActionMessage, setAiActionMessage] = useState("");
  const [revisionPrompt, setRevisionPrompt] = useState("");
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuccessMessage, setAiSuccessMessage] = useState<string | null>(null);

  // New Expense form state
  const [newExpense, setNewExpense] = useState({
    category: "Venue & Rentals",
    itemName: "",
    estimatedCost: 100,
    priority: "must-have" as "must-have" | "nice-to-have" | "optional",
    rationale: "",
  });

  // New Vendor form state
  const [newVendor, setNewVendor] = useState({
    category: "Venue & Rentals",
    serviceType: "",
    recommendedBookingWindow: "3-6 months prior",
    estimatedCost: 500,
    status: "researching" as "researching" | "contacted" | "booked",
    keyQuestionsToAsk: "",
  });

  // New Task form state
  const [newTask, setNewTask] = useState({
    title: "",
    category: "General",
    priority: "medium" as "high" | "medium" | "low",
    timelineMarker: "General Preparation",
  });

  // New Date for reschedule
  const [newRescheduleDate, setNewRescheduleDate] = useState(
    currentPlan?.input.eventDate || ""
  );

  // Filtered Tasks (optimized with precomputed query)
  const filteredTasks = useMemo(() => {
    if (!currentPlan) return [];
    const query = taskSearch.trim().toLowerCase();
    const tasks = currentPlan.tasks;
    if (!query && taskStatusFilter === "all") return tasks;
    return tasks.filter((t) => {
      const matchesStatus =
        taskStatusFilter === "all" ||
        (taskStatusFilter === "completed" ? t.completed : !t.completed);
      if (!matchesStatus) return false;
      if (!query) return true;
      return (
        t.title.toLowerCase().includes(query) ||
        (t.category && t.category.toLowerCase().includes(query))
      );
    });
  }, [currentPlan, taskSearch, taskStatusFilter]);

  // Filtered Expenses (optimized with precomputed query)
  const filteredExpenses = useMemo(() => {
    if (!currentPlan) return [];
    const query = expenseSearch.trim().toLowerCase();
    const expenses = currentPlan.expenses;
    if (!query) return expenses;
    return expenses.filter((e) =>
      e.itemName.toLowerCase().includes(query) ||
      e.category.toLowerCase().includes(query)
    );
  }, [currentPlan, expenseSearch]);

  // Filtered Vendors (optimized with precomputed query)
  const filteredVendors = useMemo(() => {
    if (!currentPlan) return [];
    const query = vendorSearch.trim().toLowerCase();
    const vendors = currentPlan.vendors;
    if (!query) return vendors;
    return vendors.filter((v) =>
      v.serviceType.toLowerCase().includes(query) ||
      v.category.toLowerCase().includes(query) ||
      v.status.toLowerCase().includes(query)
    );
  }, [currentPlan, vendorSearch]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex flex-col bg-[#faf9f5]">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-8">
          <LoadingState title="Loading Workspace" description="Fetching event configuration..." />
        </div>
        <Footer />
      </div>
    );
  }

  if (!currentPlan) {
    return (
      <div className="min-h-screen flex flex-col bg-[#faf9f5]">
        <Navbar />
        <div className="flex-1 max-w-xl mx-auto px-4 py-20 text-center">
          <AlertTriangle className="w-12 h-12 text-amber-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Event Not Found</h2>
          <p className="text-sm text-slate-600 mb-6">
            The event plan you are looking for does not exist or may have been deleted.
          </p>
          <Link href="/dashboard">
            <Button variant="teal">Return to Dashboard</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  // Handle AI Revision Request
  const handleAiRevision = async (instruction: string) => {
    if (!instruction.trim()) return;
    setIsAiLoading(true);
    setAiActionMessage("Applying AI revision to plan...");
    setAiError(null);
    setAiSuccessMessage(null);

    try {
      const res = await fetch("/api/ai/revise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPlan,
          revisionInstruction: instruction,
          preserveTasks: true,
          preserveBudgetTotal: true,
        }),
      });

      const rawText = await res.text();
      let data: { success?: boolean; data?: ValidatedPlan; error?: string } | null = null;
      if (rawText && rawText.trim().length > 0) {
        try {
          data = JSON.parse(rawText);
        } catch {
          // Non-JSON response
        }
      }

      if (!res.ok) {
        throw new Error(
          data?.error ||
          (rawText && rawText.length < 200 && !rawText.startsWith("<")
            ? rawText
            : `Revision request failed with status ${res.status} (${res.statusText || "Error"}).`)
        );
      }

      if (!data || !data.success || !data.data) {
        throw new Error(data?.error || "AI service returned an invalid response structure.");
      }

      saveEvent(data.data);
      setAiSuccessMessage(`Revision applied: "${instruction}"`);
      setRevisionPrompt("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("AI revision failed:", msg);
      setAiError(msg || "Failed to revise event plan with AI.");
    } finally {
      setIsAiLoading(false);
    }
  };

  // Handle Quick 10% Budget Optimization
  const handleOptimizeBudget = async () => {
    setIsAiLoading(true);
    setAiActionMessage("Optimizing budget allocations by 10%...");
    setAiError(null);
    setAiSuccessMessage(null);

    try {
      const res = await fetch("/api/ai/budget-optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPlan,
          targetReductionPercentage: 10,
          protectedCategories: [],
        }),
      });

      const rawText = await res.text();
      let data: { success?: boolean; data?: ValidatedPlan; error?: string } | null = null;
      if (rawText && rawText.trim().length > 0) {
        try {
          data = JSON.parse(rawText);
        } catch {
          // Non-JSON response
        }
      }

      if (!res.ok) {
        throw new Error(
          data?.error ||
          (rawText && rawText.length < 200 && !rawText.startsWith("<")
            ? rawText
            : `Budget optimization request failed with status ${res.status} (${res.statusText || "Error"}).`)
        );
      }

      if (!data || !data.success || !data.data) {
        throw new Error(data?.error || "AI service returned an invalid response structure.");
      }

      saveEvent(data.data);
      setAiSuccessMessage("Budget successfully optimized by 10% across flexible categories!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Budget optimization failed:", msg);
      setAiError(msg || "Failed to optimize budget with AI.");
    } finally {
      setIsAiLoading(false);
    }
  };

  // Handle Rescheduling
  const handleReschedule = async () => {
    if (!newRescheduleDate) return;
    setIsAiLoading(true);
    setAiActionMessage(`Recalibrating timeline for ${formatDate(newRescheduleDate)}...`);
    setAiError(null);
    setAiSuccessMessage(null);

    try {
      const res = await fetch("/api/ai/reschedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPlan,
          newEventDate: newRescheduleDate,
        }),
      });

      const rawText = await res.text();
      let data: { success?: boolean; data?: ValidatedPlan; error?: string } | null = null;
      if (rawText && rawText.trim().length > 0) {
        try {
          data = JSON.parse(rawText);
        } catch {
          // Non-JSON response
        }
      }

      if (!res.ok) {
        throw new Error(
          data?.error ||
          (rawText && rawText.length < 200 && !rawText.startsWith("<")
            ? rawText
            : `Reschedule request failed with status ${res.status} (${res.statusText || "Error"}).`)
        );
      }

      if (!data || !data.success || !data.data) {
        throw new Error(data?.error || "AI service returned an invalid response structure.");
      }

      saveEvent(data.data);
      setAiSuccessMessage(`Timeline successfully adapted to ${formatDate(newRescheduleDate)}!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Reschedule failed:", msg);
      setAiError(msg || "Failed to reschedule timeline with AI.");
    } finally {
      setIsAiLoading(false);
    }
  };

  // Add custom user expense item
  const handleAddExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.itemName.trim()) return;

    addExpenseItem(currentPlan.id, {
      category: newExpense.category,
      itemName: newExpense.itemName.trim(),
      estimatedCost: Number(newExpense.estimatedCost) || 0,
      priority: newExpense.priority,
      rationale: newExpense.rationale || "User custom line item",
    });

    setIsAddExpenseModalOpen(false);
    setNewExpense({
      category: "Venue & Rentals",
      itemName: "",
      estimatedCost: 100,
      priority: "must-have",
      rationale: "",
    });
  };

  // Open edit expense modal
  const openEditExpenseModal = (exp: ExpenseItem) => {
    setEditingExpense({ ...exp });
    setIsEditExpenseModalOpen(true);
  };

  // Save edited expense item
  const handleEditExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense || !editingExpense.itemName.trim()) return;

    updateExpenseItem(currentPlan.id, editingExpense.id, {
      itemName: editingExpense.itemName.trim(),
      category: editingExpense.category,
      estimatedCost: Number(editingExpense.estimatedCost) || 0,
      priority: editingExpense.priority,
      rationale: editingExpense.rationale || "",
    });

    setIsEditExpenseModalOpen(false);
    setEditingExpense(null);
  };

  // Add custom user task
  const handleAddTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;

    addTask(currentPlan.id, {
      title: newTask.title.trim(),
      category: newTask.category,
      priority: newTask.priority,
      timelineMarker: newTask.timelineMarker || "General Preparation",
      completed: false,
      notes: "Custom task",
    });

    setIsAddTaskModalOpen(false);
    setNewTask({
      title: "",
      category: "General",
      priority: "medium",
      timelineMarker: "General Preparation",
    });
  };

  // Add custom vendor item
  const handleAddVendorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVendor.serviceType.trim()) return;

    const questions = newVendor.keyQuestionsToAsk
      .split("\n")
      .map((q) => q.trim())
      .filter(Boolean);

    addVendor(currentPlan.id, {
      category: newVendor.category,
      serviceType: newVendor.serviceType.trim(),
      recommendedBookingWindow:
        newVendor.recommendedBookingWindow.trim() || "3-6 months prior",
      estimatedCost: Number(newVendor.estimatedCost) || 0,
      status: newVendor.status,
      keyQuestionsToAsk:
        questions.length > 0
          ? questions
          : ["Inquire about availability and terms."],
      requiredSpecifications: [],
    });

    setIsAddVendorModalOpen(false);
    setNewVendor({
      category: "Venue & Rentals",
      serviceType: "",
      recommendedBookingWindow: "3-6 months prior",
      estimatedCost: 500,
      status: "researching",
      keyQuestionsToAsk: "",
    });
  };

  // Open edit vendor modal
  const openEditVendorModal = (vendor: VendorItem) => {
    setEditingVendor({ ...vendor });
    setIsEditVendorModalOpen(true);
  };

  // Save edited vendor
  const handleEditVendorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVendor || !editingVendor.serviceType.trim()) return;

    updateVendor(currentPlan.id, editingVendor.id, {
      serviceType: editingVendor.serviceType.trim(),
      category: editingVendor.category,
      recommendedBookingWindow: editingVendor.recommendedBookingWindow,
      estimatedCost: Number(editingVendor.estimatedCost) || 0,
      status: editingVendor.status,
      keyQuestionsToAsk: editingVendor.keyQuestionsToAsk,
    });

    setIsEditVendorModalOpen(false);
    setEditingVendor(null);
  };

  // Open add milestone modal
  const openAddMilestoneModal = (phaseIdx: number) => {
    setSelectedPhaseIndex(phaseIdx);
    setNewMilestoneText("");
    setIsAddMilestoneModalOpen(true);
  };

  // Save new milestone
  const handleAddMilestoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMilestoneText.trim()) return;

    addTimelineMilestone(
      currentPlan.id,
      selectedPhaseIndex,
      newMilestoneText.trim()
    );
    setIsAddMilestoneModalOpen(false);
    setNewMilestoneText("");
  };

  // Open edit milestone modal
  const openEditMilestoneModal = (
    phaseIdx: number,
    milestoneIdx: number,
    text: string
  ) => {
    setEditingMilestone({
      phaseIndex: phaseIdx,
      milestoneIndex: milestoneIdx,
      text,
    });
    setIsEditMilestoneModalOpen(true);
  };

  // Save edited milestone
  const handleEditMilestoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMilestone || !editingMilestone.text.trim()) return;

    updateTimelineMilestone(
      currentPlan.id,
      editingMilestone.phaseIndex,
      editingMilestone.milestoneIndex,
      editingMilestone.text.trim()
    );
    setIsEditMilestoneModalOpen(false);
    setEditingMilestone(null);
  };

  // Confirm delete event
  const handleDeleteConfirm = async () => {
    await deleteEvent(currentPlan.id);
    router.push("/dashboard");
  };

  const completedTaskCount = currentPlan.tasks.filter((t) => t.completed).length;
  const taskProgressPct =
    currentPlan.tasks.length > 0
      ? Math.round((completedTaskCount / currentPlan.tasks.length) * 100)
      : 0;

  return (
    <ProtectedRoute title="Event Workspace">
      <div className="min-h-screen flex flex-col bg-[#faf9f5]">
        <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDeleteModalOpen(true)}
            className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
            leftIcon={<Trash2 className="w-4 h-4" />}
          >
            Delete Event
          </Button>
        </div>

        {/* Workspace Top Header Card */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm mb-8">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="teal">{currentPlan.input.eventType.toUpperCase()}</Badge>
                <Badge variant="outline">{currentPlan.input.currency}</Badge>
                {currentPlan.budgetSummary.isOverBudget ? (
                  <Badge variant="rose">Over Budget</Badge>
                ) : (
                  <Badge variant="secondary">On Track</Badge>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {currentPlan.title}
              </h1>
              <p className="text-sm font-semibold text-teal-700 italic">
                &quot;{currentPlan.tagline}&quot;
              </p>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>{formatDate(currentPlan.input.eventDate)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span>{currentPlan.input.location}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-slate-400" />
                  <span>{currentPlan.input.guestCount} guests</span>
                </div>
              </div>
            </div>

            {/* Quick Summary Snapshot Card */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-xs shrink-0">
              <div>
                <span className="text-slate-500 block">Total Budget</span>
                <span className="text-base font-bold text-slate-900">
                  {formatCurrency(currentPlan.budgetSummary.totalUserBudget, currentPlan.budgetSummary.currency)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Calculated Total</span>
                <span className="text-base font-bold text-slate-900">
                  {formatCurrency(currentPlan.budgetSummary.calculatedTotalExpenses, currentPlan.budgetSummary.currency)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Task Progress</span>
                <span className="text-base font-bold text-slate-900">
                  {completedTaskCount}/{currentPlan.tasks.length} ({taskProgressPct}%)
                </span>
              </div>
            </div>
          </div>

          {/* Tab Navigation Ribbon */}
          <div role="tablist" aria-label="Event workspace sections" className="flex items-center gap-2 overflow-x-auto border-t border-slate-100 pt-6 mt-6 scrollbar-none">
            {[
              { id: "overview", label: "Overview", icon: <FileText className="w-4 h-4" /> },
              { id: "budget", label: "Budget Manager", icon: <DollarSign className="w-4 h-4" /> },
              { id: "timeline", label: "Timeline", icon: <CalendarDays className="w-4 h-4" /> },
              { id: "tasks", label: "Checklist", icon: <ListTodo className="w-4 h-4" /> },
              { id: "vendors", label: "Vendors", icon: <Building2 className="w-4 h-4" /> },
              { id: "ai-assistant", label: "AI Revision Assistant", icon: <Sparkles className="w-4 h-4 text-amber-500" /> },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id as ActiveTab)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Global Feedback Banners */}
        {aiSuccessMessage && (
          <div className="mb-6">
            <Alert variant="success" title="AI Update Applied">
              {aiSuccessMessage}
            </Alert>
          </div>
        )}
        {aiError && (
          <div className="mb-6">
            <Alert variant="danger" title="AI Operation Failed">
              {aiError}
            </Alert>
          </div>
        )}

        {/* Loading overlay for AI operations */}
        {isAiLoading && (
          <div className="mb-8">
            <LoadingState
              title={aiActionMessage}
              description="Contacting Google Gemini API, structuring response, and validating budget math..."
            />
          </div>
        )}

        {/* Tab 1: Overview */}
        {activeTab === "overview" && <OverviewTab plan={currentPlan} />}

        {/* Tab 2: Budget Manager */}
        {activeTab === "budget" && (
          <BudgetTab
            plan={currentPlan}
            expenseSearch={expenseSearch}
            setExpenseSearch={setExpenseSearch}
            filteredExpenses={filteredExpenses}
            onOptimizeBudget={handleOptimizeBudget}
            onOpenAddExpenseModal={() => setIsAddExpenseModalOpen(true)}
            onOpenEditExpenseModal={openEditExpenseModal}
            onRemoveExpenseItem={removeExpenseItem}
          />
        )}

        {/* Tab 3: Timeline */}
        {activeTab === "timeline" && (
          <TimelineTab
            plan={currentPlan}
            newRescheduleDate={newRescheduleDate}
            setNewRescheduleDate={setNewRescheduleDate}
            onReschedule={handleReschedule}
            onMoveTimelineMilestone={moveTimelineMilestone}
            onOpenAddMilestoneModal={openAddMilestoneModal}
            onOpenEditMilestoneModal={openEditMilestoneModal}
            onRemoveTimelineMilestone={removeTimelineMilestone}
          />
        )}

        {/* Tab 4: Task Checklist */}
        {activeTab === "tasks" && (
          <TasksTab
            plan={currentPlan}
            completedTaskCount={completedTaskCount}
            taskProgressPct={taskProgressPct}
            taskStatusFilter={taskStatusFilter}
            setTaskStatusFilter={setTaskStatusFilter}
            taskSearch={taskSearch}
            setTaskSearch={setTaskSearch}
            filteredTasks={filteredTasks}
            onToggleTask={toggleTask}
            onDeleteTask={deleteTask}
            onOpenAddTaskModal={() => setIsAddTaskModalOpen(true)}
          />
        )}

        {/* Tab 5: Vendors */}
        {activeTab === "vendors" && (
          <VendorsTab
            plan={currentPlan}
            vendorSearch={vendorSearch}
            setVendorSearch={setVendorSearch}
            filteredVendors={filteredVendors}
            onOpenAddVendorModal={() => setIsAddVendorModalOpen(true)}
            onOpenEditVendorModal={openEditVendorModal}
            onRemoveVendor={removeVendor}
          />
        )}

        {/* Tab 6: AI Assistant */}
        {activeTab === "ai-assistant" && (
          <AiAssistantTab
            isAiLoading={isAiLoading}
            revisionPrompt={revisionPrompt}
            setRevisionPrompt={setRevisionPrompt}
            onAiRevision={handleAiRevision}
          />
        )}

        {/* Modal: Add Custom Expense */}
        <Modal
          isOpen={isAddExpenseModalOpen}
          onClose={() => setIsAddExpenseModalOpen(false)}
          title="Add Custom Expense Item"
          description="Insert an expense item. The deterministic budget engine will recalculate totals immediately."
        >
          <form onSubmit={handleAddExpenseSubmit} className="space-y-4 pt-2">
            <Input
              label="Item Description"
              required
              placeholder="e.g. Wedding Arch Draping"
              value={newExpense.itemName}
              onChange={(e) => setNewExpense({ ...newExpense, itemName: e.target.value })}
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Category
                </label>
                <select
                  value={newExpense.category}
                  onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs text-slate-900"
                >
                  <option value="Venue & Rentals">Venue & Rentals</option>
                  <option value="Catering & Bar">Catering & Bar</option>
                  <option value="Photography & Video">Photography & Video</option>
                  <option value="Florals & Ambience">Florals & Ambience</option>
                  <option value="Music & Audio">Music & Audio</option>
                  <option value="Permits & Safety">Permits & Safety</option>
                  <option value="General">General</option>
                </select>
              </div>

              <Input
                label="Cost Estimate"
                type="number"
                min={0}
                required
                value={newExpense.estimatedCost}
                onChange={(e) =>
                  setNewExpense({ ...newExpense, estimatedCost: Number(e.target.value) })
                }
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddExpenseModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="teal" size="sm">
                Save Line Item
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal: Add Custom Task */}
        <Modal
          isOpen={isAddTaskModalOpen}
          onClose={() => setIsAddTaskModalOpen(false)}
          title="Add New Task"
          description="Create a task item to track in your event checklist."
        >
          <form onSubmit={handleAddTaskSubmit} className="space-y-4 pt-2">
            <Input
              label="Task Title"
              required
              placeholder="e.g. Order custom champagne glasses"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Timeline Marker"
                placeholder="e.g. 2 months prior"
                value={newTask.timelineMarker}
                onChange={(e) => setNewTask({ ...newTask, timelineMarker: e.target.value })}
              />

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Priority
                </label>
                <select
                  value={newTask.priority}
                  onChange={(e) =>
                    setNewTask({
                      ...newTask,
                      priority: e.target.value as "high" | "medium" | "low",
                    })
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs text-slate-900"
                >
                  <option value="high">High Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="low">Low Priority</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddTaskModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="teal" size="sm">
                Add Task
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal: Edit Custom Expense */}
        <Modal
          isOpen={isEditExpenseModalOpen}
          onClose={() => {
            setIsEditExpenseModalOpen(false);
            setEditingExpense(null);
          }}
          title="Edit Expense Item"
          description="Update this expense line item. Budget totals will be deterministically recalculated."
        >
          {editingExpense && (
            <form onSubmit={handleEditExpenseSubmit} className="space-y-4 pt-2">
              <Input
                label="Item Description"
                required
                value={editingExpense.itemName}
                onChange={(e) =>
                  setEditingExpense({ ...editingExpense, itemName: e.target.value })
                }
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Category
                  </label>
                  <select
                    value={editingExpense.category}
                    onChange={(e) =>
                      setEditingExpense({ ...editingExpense, category: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs text-slate-900"
                  >
                    <option value="Venue & Rentals">Venue & Rentals</option>
                    <option value="Catering & Bar">Catering & Bar</option>
                    <option value="Photography & Video">Photography & Video</option>
                    <option value="Florals & Ambience">Florals & Ambience</option>
                    <option value="Music & Audio">Music & Audio</option>
                    <option value="Permits & Safety">Permits & Safety</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <Input
                  label="Cost Estimate"
                  type="number"
                  min={0}
                  required
                  value={editingExpense.estimatedCost}
                  onChange={(e) =>
                    setEditingExpense({
                      ...editingExpense,
                      estimatedCost: Number(e.target.value),
                    })
                  }
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Priority
                </label>
                <select
                  value={editingExpense.priority}
                  onChange={(e) =>
                    setEditingExpense({
                      ...editingExpense,
                      priority: e.target.value as "must-have" | "nice-to-have" | "optional",
                    })
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs text-slate-900"
                >
                  <option value="must-have">Must-Have</option>
                  <option value="nice-to-have">Nice-To-Have</option>
                  <option value="optional">Optional</option>
                </select>
              </div>

              <Input
                label="Rationale / Notes"
                value={editingExpense.rationale || ""}
                onChange={(e) =>
                  setEditingExpense({ ...editingExpense, rationale: e.target.value })
                }
              />

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsEditExpenseModalOpen(false);
                    setEditingExpense(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="teal" size="sm">
                  Save Changes
                </Button>
              </div>
            </form>
          )}
        </Modal>

        {/* Modal: Add Custom Vendor */}
        <Modal
          isOpen={isAddVendorModalOpen}
          onClose={() => setIsAddVendorModalOpen(false)}
          title="Add Vendor Partner"
          description="Track a new vendor category or service for your event."
        >
          <form onSubmit={handleAddVendorSubmit} className="space-y-4 pt-2">
            <Input
              label="Service Type / Title"
              required
              placeholder="e.g. Master of Ceremonies (MC)"
              value={newVendor.serviceType}
              onChange={(e) =>
                setNewVendor({ ...newVendor, serviceType: e.target.value })
              }
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Category
                </label>
                <select
                  value={newVendor.category}
                  onChange={(e) =>
                    setNewVendor({ ...newVendor, category: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs text-slate-900"
                >
                  <option value="Venue & Rentals">Venue & Rentals</option>
                  <option value="Catering & Bar">Catering & Bar</option>
                  <option value="Photography & Video">Photography & Video</option>
                  <option value="Florals & Ambience">Florals & Ambience</option>
                  <option value="Music & Audio">Music & Audio</option>
                  <option value="Planning & Coordination">Planning & Coordination</option>
                  <option value="General">General</option>
                </select>
              </div>

              <Input
                label="Estimated Cost"
                type="number"
                min={0}
                required
                value={newVendor.estimatedCost}
                onChange={(e) =>
                  setNewVendor({
                    ...newVendor,
                    estimatedCost: Number(e.target.value),
                  })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Booking Window"
                placeholder="e.g. 4-6 months prior"
                value={newVendor.recommendedBookingWindow}
                onChange={(e) =>
                  setNewVendor({
                    ...newVendor,
                    recommendedBookingWindow: e.target.value,
                  })
                }
              />

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Status
                </label>
                <select
                  value={newVendor.status}
                  onChange={(e) =>
                    setNewVendor({
                      ...newVendor,
                      status: e.target.value as "researching" | "contacted" | "booked",
                    })
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs text-slate-900"
                >
                  <option value="researching">Researching</option>
                  <option value="contacted">Contacted</option>
                  <option value="booked">Booked</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Key Questions to Ask (one per line)
              </label>
              <textarea
                rows={3}
                placeholder="Are you licensed and insured?&#10;What is the deposit requirement?"
                value={newVendor.keyQuestionsToAsk}
                onChange={(e) =>
                  setNewVendor({ ...newVendor, keyQuestionsToAsk: e.target.value })
                }
                className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddVendorModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="teal" size="sm">
                Add Vendor
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal: Edit Vendor */}
        <Modal
          isOpen={isEditVendorModalOpen}
          onClose={() => {
            setIsEditVendorModalOpen(false);
            setEditingVendor(null);
          }}
          title="Edit Vendor Partner"
          description="Update vendor booking status, cost, and details."
        >
          {editingVendor && (
            <form onSubmit={handleEditVendorSubmit} className="space-y-4 pt-2">
              <Input
                label="Service Type / Title"
                required
                value={editingVendor.serviceType}
                onChange={(e) =>
                  setEditingVendor({ ...editingVendor, serviceType: e.target.value })
                }
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Category
                  </label>
                  <select
                    value={editingVendor.category}
                    onChange={(e) =>
                      setEditingVendor({ ...editingVendor, category: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs text-slate-900"
                  >
                    <option value="Venue & Rentals">Venue & Rentals</option>
                    <option value="Catering & Bar">Catering & Bar</option>
                    <option value="Photography & Video">Photography & Video</option>
                    <option value="Florals & Ambience">Florals & Ambience</option>
                    <option value="Music & Audio">Music & Audio</option>
                    <option value="Planning & Coordination">Planning & Coordination</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <Input
                  label="Estimated Cost"
                  type="number"
                  min={0}
                  required
                  value={editingVendor.estimatedCost}
                  onChange={(e) =>
                    setEditingVendor({
                      ...editingVendor,
                      estimatedCost: Number(e.target.value),
                    })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Booking Window"
                  value={editingVendor.recommendedBookingWindow}
                  onChange={(e) =>
                    setEditingVendor({
                      ...editingVendor,
                      recommendedBookingWindow: e.target.value,
                    })
                  }
                />

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Status
                  </label>
                  <select
                    value={editingVendor.status}
                    onChange={(e) =>
                      setEditingVendor({
                        ...editingVendor,
                        status: e.target.value as "researching" | "contacted" | "booked",
                      })
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs text-slate-900"
                  >
                    <option value="researching">Researching</option>
                    <option value="contacted">Contacted</option>
                    <option value="booked">Booked</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsEditVendorModalOpen(false);
                    setEditingVendor(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="teal" size="sm">
                  Save Changes
                </Button>
              </div>
            </form>
          )}
        </Modal>

        {/* Modal: Add Timeline Milestone */}
        <Modal
          isOpen={isAddMilestoneModalOpen}
          onClose={() => setIsAddMilestoneModalOpen(false)}
          title="Add Milestone"
          description={`Add a key milestone to "${currentPlan.timeline[selectedPhaseIndex]?.phaseName || "Timeline"}".`}
        >
          <form onSubmit={handleAddMilestoneSubmit} className="space-y-4 pt-2">
            <Input
              label="Milestone Description"
              required
              placeholder="e.g. Confirm acoustic sound check with musicians"
              value={newMilestoneText}
              onChange={(e) => setNewMilestoneText(e.target.value)}
            />

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddMilestoneModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="teal" size="sm">
                Add Milestone
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal: Edit Timeline Milestone */}
        <Modal
          isOpen={isEditMilestoneModalOpen}
          onClose={() => {
            setIsEditMilestoneModalOpen(false);
            setEditingMilestone(null);
          }}
          title="Edit Milestone"
          description="Update milestone text."
        >
          {editingMilestone && (
            <form onSubmit={handleEditMilestoneSubmit} className="space-y-4 pt-2">
              <Input
                label="Milestone Description"
                required
                value={editingMilestone.text}
                onChange={(e) =>
                  setEditingMilestone({ ...editingMilestone, text: e.target.value })
                }
              />

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsEditMilestoneModalOpen(false);
                    setEditingMilestone(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="teal" size="sm">
                  Save Changes
                </Button>
              </div>
            </form>
          )}
        </Modal>

        {/* Modal: Delete Event Confirmation */}
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Delete Event Plan?"
          description="Are you sure you want to delete this event? This action cannot be undone."
        >
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDeleteConfirm}
            >
              Confirm Delete
            </Button>
          </div>
        </Modal>
      </main>

      <Footer />
    </div>
    </ProtectedRoute>
  );
}
