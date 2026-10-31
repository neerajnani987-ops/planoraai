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
  CheckCircle2,
  Clock,
  CheckSquare,
  Square,
  Plus,
  Trash2,
  AlertTriangle,
  Send,
  Building2,
  CalendarDays,
  ListTodo,
  FileText,
  Search,
  Percent,
  Pencil,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Alert } from "@/components/ui/Alert";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { LoadingState } from "@/components/ui/LoadingState";
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

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    if (!currentPlan) return [];
    return currentPlan.tasks.filter((t) => {
      const matchesSearch = t.title.toLowerCase().includes(taskSearch.toLowerCase());
      const matchesStatus =
        taskStatusFilter === "all" ||
        (taskStatusFilter === "completed" ? t.completed : !t.completed);
      return matchesSearch && matchesStatus;
    });
  }, [currentPlan, taskSearch, taskStatusFilter]);

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    if (!currentPlan) return [];
    return currentPlan.expenses.filter((e) =>
      e.itemName.toLowerCase().includes(expenseSearch.toLowerCase()) ||
      e.category.toLowerCase().includes(expenseSearch.toLowerCase())
    );
  }, [currentPlan, expenseSearch]);

  // Filtered Vendors
  const filteredVendors = useMemo(() => {
    if (!currentPlan) return [];
    return currentPlan.vendors.filter((v) =>
      v.serviceType.toLowerCase().includes(vendorSearch.toLowerCase()) ||
      v.category.toLowerCase().includes(vendorSearch.toLowerCase()) ||
      v.status.toLowerCase().includes(vendorSearch.toLowerCase())
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
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Feasibility Alert */}
            {currentPlan.budgetSummary.isOverBudget ? (
              <Alert variant="warning" title="Budget Advisory Warning">
                {currentPlan.feasibilityAssessment}
              </Alert>
            ) : (
              <Alert variant="info" title="Verified Feasibility Assessment">
                {currentPlan.feasibilityAssessment}
              </Alert>
            )}

            {/* Vision & Atmosphere */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Creative Vision & Narrative</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-slate-700 leading-relaxed">
                  <p>{currentPlan.visionSummary}</p>

                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                      Color Palette & Styling
                    </span>
                    <div className="flex items-center gap-2 mb-3">
                      {currentPlan.themeAndDecor.primaryColorPalette.map((color, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-xs">
                          <span
                            className="w-5 h-5 rounded-full border border-slate-200 shadow-2xs"
                            style={{ backgroundColor: color }}
                          />
                          <span className="font-mono text-[11px] text-slate-500">{color}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-slate-600">
                      <strong>Style:</strong> {currentPlan.themeAndDecor.aestheticStyle}
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                      <strong>Atmosphere:</strong> {currentPlan.themeAndDecor.atmosphere}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Food & Entertainment */}
              <Card>
                <CardHeader>
                  <CardTitle>Culinary & Entertainment Curation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-slate-700 leading-relaxed">
                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Catering Approach
                    </span>
                    <p className="font-semibold text-slate-800">
                      {currentPlan.foodAndEntertainment.cateringStyle}
                    </p>
                    <ul className="list-disc list-inside text-xs text-slate-600 mt-2 space-y-1">
                      {currentPlan.foodAndEntertainment.menuConcepts.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Dietary & Allergen Protocol
                    </span>
                    <p className="text-xs text-slate-600">
                      {currentPlan.foodAndEntertainment.dietaryInclusivityNotes}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Guest Management & Contingencies */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Guest Experience & Flow</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs text-slate-700">
                  <div>
                    <span className="font-bold text-slate-900 block mb-0.5">Seating & Layout:</span>
                    <p className="text-slate-600">{currentPlan.guestManagement.seatingLayout}</p>
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block mb-0.5">Invitation Cadence:</span>
                    <p className="text-slate-600">{currentPlan.guestManagement.invitationTimeline}</p>
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block mb-0.5">Accessibility & Inclusivity:</span>
                    <p className="text-slate-600">{currentPlan.guestManagement.accessibilityAccommodations}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Risk Factors & Contingencies</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  {currentPlan.contingencies.map((c, i) => (
                    <div key={i} className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/70">
                      <span className="font-bold text-amber-950 block mb-1">Risk: {c.riskFactor}</span>
                      <p className="text-slate-700 mb-1">
                        <strong>Mitigation:</strong> {c.mitigationStrategy}
                      </p>
                      <p className="text-slate-700">
                        <strong>Backup:</strong> {c.backupPlan}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Tab 2: Budget Manager */}
        {activeTab === "budget" && (
          <div className="space-y-6">
            {/* Top KPI Metrics Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-white border-slate-200/80 p-4">
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block mb-1">
                  Total Budget
                </span>
                <div className="text-xl font-extrabold text-slate-900">
                  {formatCurrency(
                    currentPlan.budgetSummary.totalUserBudget,
                    currentPlan.budgetSummary.currency
                  )}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Target client budget
                </div>
              </Card>

              <Card className="bg-white border-slate-200/80 p-4">
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block mb-1">
                  Calculated Expenses
                </span>
                <div className="text-xl font-extrabold text-slate-900">
                  {formatCurrency(
                    currentPlan.budgetSummary.calculatedTotalExpenses,
                    currentPlan.budgetSummary.currency
                  )}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Sum of all {currentPlan.expenses.length} itemized costs
                </div>
              </Card>

              <Card
                className={`p-4 border ${
                  currentPlan.budgetSummary.isOverBudget
                    ? "bg-rose-50/50 border-rose-200/80"
                    : "bg-teal-50/40 border-teal-200/80"
                }`}
              >
                <span className="text-xs text-slate-600 font-semibold uppercase tracking-wider block mb-1">
                  {currentPlan.budgetSummary.isOverBudget
                    ? "Budget Overrun"
                    : "Remaining Reserve"}
                </span>
                <div
                  className={`text-xl font-extrabold ${
                    currentPlan.budgetSummary.isOverBudget
                      ? "text-rose-700"
                      : "text-teal-800"
                  }`}
                >
                  {formatCurrency(
                    Math.abs(currentPlan.budgetSummary.remainingBudget),
                    currentPlan.budgetSummary.currency
                  )}
                </div>
                <div className="text-[11px] mt-1 font-medium">
                  {currentPlan.budgetSummary.isOverBudget ? (
                    <span className="text-rose-600">
                      Over budget by {formatCurrency(currentPlan.budgetSummary.overBudgetAmount, currentPlan.budgetSummary.currency)}
                    </span>
                  ) : (
                    <span className="text-teal-700">
                      Unallocated contingency reserve
                    </span>
                  )}
                </div>
              </Card>

              <Card className="bg-white border-slate-200/80 p-4">
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block mb-1">
                  Cost Per Guest
                </span>
                <div className="text-xl font-extrabold text-slate-900">
                  {formatCurrency(
                    currentPlan.budgetSummary.costPerGuest,
                    currentPlan.budgetSummary.currency
                  )}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Based on {currentPlan.input.guestCount} invited guests
                </div>
              </Card>
            </div>

            {/* Quick Actions Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <div className="text-xs text-slate-600">
                Deterministic calculation verified at{" "}
                <span className="font-mono text-slate-800">
                  {new Date(currentPlan.budgetSummary.verifiedTimestamp).toLocaleTimeString()}
                </span>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOptimizeBudget}
                  leftIcon={<Percent className="w-3.5 h-3.5 text-teal-600" />}
                >
                  Optimize Budget (-10%)
                </Button>
                <Button
                  variant="teal"
                  size="sm"
                  onClick={() => setIsAddExpenseModalOpen(true)}
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                >
                  Add Line Item
                </Button>
              </div>
            </div>

            {/* Category Allocations Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentPlan.categoryBudgets.map((cat, i) => (
                <Card key={i} className="p-4">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-slate-900">{cat.category}</span>
                    <span className="font-semibold text-slate-700">
                      {formatCurrency(cat.allocatedAmount, currentPlan.budgetSummary.currency)}
                    </span>
                  </div>
                  <ProgressBar value={cat.percentage} variant="teal" />
                  <div className="flex justify-between text-[11px] text-slate-500 mt-1.5">
                    <span>{cat.percentage}% of total</span>
                    <span className="truncate max-w-[150px]">{cat.notes}</span>
                  </div>
                </Card>
              ))}
            </div>

            {/* Itemized Expenses Table */}
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle>Itemized Expense Estimates</CardTitle>
                  <CardDescription>
                    All values verified with non-negative constraints. Click edit to adjust figures.
                  </CardDescription>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Search expenses..."
                    value={expenseSearch}
                    onChange={(e) => setExpenseSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-y border-slate-200 bg-slate-50/70 text-slate-500 uppercase tracking-wider font-semibold">
                      <th className="py-3 px-4">Item Name</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Priority</th>
                      <th className="py-3 px-4 text-right">Estimated Cost</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredExpenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900 block">{exp.itemName}</span>
                          <span className="text-[11px] text-slate-500">{exp.rationale}</span>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-700">{exp.category}</td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={
                              exp.priority === "must-have"
                                ? "rose"
                                : exp.priority === "nice-to-have"
                                ? "violet"
                                : "secondary"
                            }
                            size="sm"
                          >
                            {exp.priority}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900">
                          {formatCurrency(exp.estimatedCost, currentPlan.budgetSummary.currency)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => openEditExpenseModal(exp)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-slate-100 transition-colors"
                              title="Edit line item"
                              aria-label={`Edit ${exp.itemName}`}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeExpenseItem(currentPlan.id, exp.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors"
                              title="Remove line item"
                              aria-label={`Remove ${exp.itemName}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* Mandatory Estimate Disclaimer */}
            <div className="p-4 rounded-xl bg-slate-100/70 text-xs text-slate-500 leading-relaxed">
              <strong>Advisory Note:</strong> {currentPlan.budgetSummary.disclaimer}
            </div>
          </div>
        )}

        {/* Tab 3: Timeline */}
        {activeTab === "timeline" && (
          <div className="space-y-6">
            {/* Reschedule Date Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Need to change your event date?</h4>
                <p className="text-xs text-slate-500">
                  Planora recalculates vendor booking windows and milestones for the new date.
                </p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="date"
                  value={newRescheduleDate}
                  onChange={(e) => setNewRescheduleDate(e.target.value)}
                  className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-slate-900 bg-white"
                />
                <Button
                  variant="teal"
                  size="sm"
                  onClick={handleReschedule}
                  disabled={!newRescheduleDate || newRescheduleDate === currentPlan.input.eventDate}
                >
                  Reschedule Timeline
                </Button>
              </div>
            </div>

            {/* Timeline Phases */}
            <div className="space-y-4">
              {currentPlan.timeline.map((phase, idx) => (
                <Card key={idx} className="overflow-hidden">
                  <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-teal-800">
                        {phase.phaseName}
                      </span>
                      <Badge variant="outline" size="sm">
                        {phase.timeWindow}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                    <div>
                      <span className="font-bold text-slate-900 block mb-2">Core Milestones:</span>
                      <ul className="space-y-1.5 text-slate-700">
                        {phase.milestones.map((m, mIdx) => (
                          <li
                            key={mIdx}
                            className="flex items-center justify-between group p-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                          >
                            <div className="flex items-start gap-2 flex-1 min-w-0 pr-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 mt-0.5 shrink-0" />
                              <span className="text-slate-800 leading-snug break-words">{m}</span>
                            </div>
                            <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity shrink-0">
                              <button
                                type="button"
                                onClick={() => moveTimelineMilestone(currentPlan.id, idx, mIdx, "up")}
                                disabled={mIdx === 0}
                                className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 disabled:opacity-20 transition-colors"
                                title="Move milestone earlier"
                                aria-label="Move milestone up"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveTimelineMilestone(currentPlan.id, idx, mIdx, "down")}
                                disabled={mIdx === phase.milestones.length - 1}
                                className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 disabled:opacity-20 transition-colors"
                                title="Move milestone later"
                                aria-label="Move milestone down"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditMilestoneModal(idx, mIdx, m)}
                                className="p-1 rounded text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
                                title="Edit milestone"
                                aria-label="Edit milestone"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeTimelineMilestone(currentPlan.id, idx, mIdx)}
                                className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                title="Delete milestone"
                                aria-label="Delete milestone"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                      <div className="pt-3">
                        <button
                          type="button"
                          onClick={() => openAddMilestoneModal(idx)}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-800 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Milestone</span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="font-bold text-slate-900 block mb-2">Key Deadlines:</span>
                      <ul className="space-y-1.5 text-slate-700">
                        {phase.keyDeadlines.map((d, dIdx) => (
                          <li key={dIdx} className="flex items-start gap-2">
                            <Clock className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                            <span>{d}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Task Checklist */}
        {activeTab === "tasks" && (
          <div className="space-y-6">
            {/* Checklist Progress Overview Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900">Checklist Completion Status</span>
                <span className="font-semibold text-slate-700">
                  {completedTaskCount} of {currentPlan.tasks.length} tasks completed ({taskProgressPct}%)
                </span>
              </div>
              <ProgressBar value={taskProgressPct} variant="teal" />
            </div>

            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setTaskStatusFilter("all")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    taskStatusFilter === "all" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  All ({currentPlan.tasks.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTaskStatusFilter("pending")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    taskStatusFilter === "pending" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Pending ({currentPlan.tasks.filter((t) => !t.completed).length})
                </button>
                <button
                  type="button"
                  onClick={() => setTaskStatusFilter("completed")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    taskStatusFilter === "completed" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Completed ({completedTaskCount})
                </button>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="Filter tasks..."
                  value={taskSearch}
                  onChange={(e) => setTaskSearch(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-800 bg-white"
                />
                <Button
                  variant="teal"
                  size="sm"
                  onClick={() => setIsAddTaskModalOpen(true)}
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                >
                  Add Task
                </Button>
              </div>
            </div>

            {/* Tasks list */}
            <div className="space-y-2">
              {filteredTasks.length === 0 ? (
                <p className="text-center text-xs text-slate-500 py-10">No tasks match your criteria.</p>
              ) : (
                filteredTasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => toggleTask(currentPlan.id, task.id)}
                    className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer group ${
                      task.completed
                        ? "bg-slate-50 border-slate-200/60 opacity-60"
                        : "bg-white border-slate-200/90 hover:border-teal-400 hover:shadow-xs"
                    }`}
                  >
                    <button
                      type="button"
                      className="mt-0.5 text-teal-600 shrink-0"
                      aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
                    >
                      {task.completed ? (
                        <CheckSquare className="w-5 h-5 text-teal-600" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-300" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-semibold ${
                          task.completed ? "line-through text-slate-400" : "text-slate-900"
                        }`}
                      >
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                        <span className="font-medium text-slate-700">{task.category}</span>
                        <span>•</span>
                        <span>{task.timelineMarker}</span>
                        {task.notes && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-[200px]">{task.notes}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {task.priority === "high" && !task.completed && (
                      <Badge variant="rose" size="sm">
                        High Priority
                      </Badge>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTask(currentPlan.id, task.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                      title="Delete task"
                      aria-label={`Delete task ${task.title}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 5: Vendors */}
        {activeTab === "vendors" && (
          <div className="space-y-6">
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <div className="text-xs text-slate-600">
                Managing <span className="font-bold text-slate-900">{currentPlan.vendors.length}</span> key vendor categories for this event.
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Search vendors..."
                    value={vendorSearch}
                    onChange={(e) => setVendorSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>
                <Button
                  variant="teal"
                  size="sm"
                  onClick={() => setIsAddVendorModalOpen(true)}
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                >
                  Add Vendor
                </Button>
              </div>
            </div>

            {/* Vendor Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredVendors.length === 0 ? (
                <div className="col-span-full py-12 text-center text-xs text-slate-500">
                  No vendors found matching your search.
                </div>
              ) : (
                filteredVendors.map((ven) => (
                  <Card key={ven.id} className="p-6 space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Badge variant="secondary" size="sm" className="mb-1">
                          {ven.category}
                        </Badge>
                        <h4 className="text-base font-bold text-slate-900">{ven.serviceType}</h4>
                        <span className="text-xs text-slate-500">
                          Window: {ven.recommendedBookingWindow}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-slate-900 block">
                          {formatCurrency(ven.estimatedCost, currentPlan.budgetSummary.currency)}
                        </span>
                        <div className="mt-1 flex items-center justify-end gap-1.5">
                          <Badge
                            variant={
                              ven.status === "booked"
                                ? "teal"
                                : ven.status === "contacted"
                                ? "violet"
                                : "outline"
                            }
                            size="sm"
                          >
                            {ven.status}
                          </Badge>
                          <button
                            type="button"
                            onClick={() => openEditVendorModal(ven)}
                            className="p-1 rounded text-slate-400 hover:text-teal-600 hover:bg-slate-100 transition-colors"
                            title="Edit vendor"
                            aria-label={`Edit vendor ${ven.serviceType}`}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeVendor(currentPlan.id, ven.id)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors"
                            title="Remove vendor"
                            aria-label={`Delete vendor ${ven.serviceType}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 text-xs space-y-2">
                      <span className="font-bold text-slate-700 block">Key Questions to Ask:</span>
                      <ul className="list-disc list-inside space-y-1 text-slate-600">
                        {ven.keyQuestionsToAsk.map((q, idx) => (
                          <li key={idx}>{q}</li>
                        ))}
                      </ul>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 6: AI Assistant & Natural Language Plan Revision */}
        {activeTab === "ai-assistant" && (
          <div className="space-y-6">
            <Card className="border-teal-200/80 bg-gradient-to-br from-white via-white to-teal-50/20">
              <CardHeader>
                <div className="flex items-center gap-2 text-teal-800 font-bold text-xs uppercase tracking-wider mb-1">
                  <Sparkles className="w-4 h-4 text-teal-600" />
                  <span>Interactive AI Revision Assistant</span>
                </div>
                <CardTitle>Refine & Adapt Your Event Plan</CardTitle>
                <CardDescription>
                  Instruct Gemini to adjust catering costs, suggest backup rain strategies, or adapt the theme.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Sample Revision Prompts */}
                <div>
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">
                    Quick Revision Ideas:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "Reduce catering costs by 10%",
                      "Suggest affordable decorations and DIY centerpieces",
                      "Create a rain and high-wind backup plan",
                      "Make the event suitable and engaging for young children",
                      "Adjust the plan for 15 additional guests",
                    ].map((promptText, i) => (
                      <button
                        key={i}
                        onClick={() => handleAiRevision(promptText)}
                        disabled={isAiLoading}
                        className="px-3 py-1.5 rounded-xl border border-teal-200 bg-teal-50/60 text-xs font-semibold text-teal-900 hover:bg-teal-100 transition-colors disabled:opacity-50"
                      >
                        &quot;{promptText}&quot;
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom revision form */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAiRevision(revisionPrompt);
                  }}
                  className="space-y-3"
                >
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Custom AI Revision Prompt:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Substitute high-end flowers with local eucalyptus and fairy lights..."
                      value={revisionPrompt}
                      onChange={(e) => setRevisionPrompt(e.target.value)}
                      disabled={isAiLoading}
                      className="flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-4 focus:ring-teal-500/10"
                    />
                    <Button
                      type="submit"
                      variant="teal"
                      isLoading={isAiLoading}
                      disabled={!revisionPrompt.trim()}
                      rightIcon={<Send className="w-4 h-4" />}
                    >
                      Apply Revision
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
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
