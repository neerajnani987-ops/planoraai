"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  ArrowRight,
  Heart,
  Cake,
  Users,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { LoadingState } from "@/components/ui/LoadingState";
import { Alert } from "@/components/ui/Alert";
import { EventInputSchema, EventType, ValidatedPlan } from "@/schemas/event";
import { useEventStore } from "@/hooks/useEventStore";
import { formatCurrency } from "@/lib/utils";

export default function CreateEventPage() {
  const router = useRouter();
  const { saveEvent } = useEventStore();

  // Form State
  const [formData, setFormData] = useState({
    eventName: "",
    eventType: "wedding" as EventType,
    eventDate: "",
    location: "",
    guestCount: 80,
    totalBudget: 15000,
    currency: "USD",
    theme: "",
    userPreferences: "",
    specialRequirements: "",
  });

  // UI States
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [apiError, setApiError] = useState<string | null>(null);
  const [generatedPlan, setGeneratedPlan] = useState<ValidatedPlan | null>(null);

  // Quick template pre-fill
  const loadTemplate = (type: EventType) => {
    setErrors({});
    setApiError(null);
    if (type === "wedding") {
      setFormData({
        eventName: "Elena & Marcus's Coastal Sunset Wedding",
        eventType: "wedding",
        eventDate: "2027-07-24",
        location: "Big Sur Coastal Bluffs, CA",
        guestCount: 100,
        totalBudget: 35000,
        currency: "USD",
        theme: "Coastal Modern Organic & Warm Terracotta",
        userPreferences: "Acoustic indie folk duo for ceremony, local seafood feast, craft cocktail pairing",
        specialRequirements: "Wind-resistant ceremony arch, wheelchair accessible path to dining tent, celiac-safe meals",
      });
    } else if (type === "birthday") {
      setFormData({
        eventName: "Noah's Retro Neon 30th Birthday Bash",
        eventType: "birthday",
        eventDate: "2027-05-22",
        location: "Warehouse District Lounge, Denver, CO",
        guestCount: 60,
        totalBudget: 7500,
        currency: "USD",
        theme: "Synthwave Glow & 80s Arcade",
        userPreferences: "Retro arcade machines, craft IPA bar, specialty sliders, synthwave DJ set",
        specialRequirements: "Non-alcoholic craft mocktail menu and vegan cupcakes",
      });
    } else if (type === "community") {
      setFormData({
        eventName: "Oakdale Community Green Living Fair",
        eventType: "community",
        eventDate: "2027-09-11",
        location: "Oakdale Central Park & Community Center",
        guestCount: 450,
        totalBudget: 6000,
        currency: "USD",
        theme: "Neighborhood Sustainability & Local Crafts",
        userPreferences: "Local artisan marketplace, solar workshops, children's garden craft tent",
        specialRequirements: "Park noise permits, volunteer hospitality station, ADA portable restrooms",
      });
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validateForm = () => {
    const result = EventInputSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const path = issue.path[0];
        if (path) {
          fieldErrors[String(path)] = issue.message;
        }
      });
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsGenerating(true);
    setApiError(null);
    setGenerationStep(0);

    // Step animation intervals
    const stepInterval = setInterval(() => {
      setGenerationStep((prev) => (prev < 3 ? prev + 1 : prev));
    }, 2500);

    try {
      const response = await fetch("/api/ai/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      clearInterval(stepInterval);

      // Read response body safely as text first to prevent "Unexpected end of JSON input" on empty bodies
      const rawText = await response.text();
      let payload: { success?: boolean; data?: ValidatedPlan; error?: string } | null = null;

      if (rawText && rawText.trim().length > 0) {
        try {
          payload = JSON.parse(rawText);
        } catch {
          // Response is not valid JSON
        }
      }

      // Check HTTP status code first
      if (!response.ok) {
        const errorMsg =
          payload?.error ||
          (rawText && rawText.length < 200 && !rawText.startsWith("<")
            ? rawText
            : `AI service request failed with status ${response.status} (${response.statusText || "Error"}). Please try again.`);
        throw new Error(errorMsg);
      }

      // Ensure JSON payload was parsed and reported success
      if (!payload || !payload.success) {
        throw new Error(payload?.error || "AI service returned an empty or invalid response.");
      }

      // Validate the generated event plan structure before displaying or saving
      const plan = payload.data;
      if (
        !plan ||
        typeof plan !== "object" ||
        !plan.id ||
        !plan.title ||
        !Array.isArray(plan.expenses) ||
        !Array.isArray(plan.timeline) ||
        !Array.isArray(plan.tasks) ||
        !plan.budgetSummary
      ) {
        throw new Error("AI service returned an incomplete event plan structure. Please retry.");
      }

      setGeneratedPlan(plan);
    } catch (err: unknown) {
      clearInterval(stepInterval);
      const message = err instanceof Error ? err.message : String(err);
      console.error("Plan generation error:", message);
      setApiError(
        message ||
          "Could not generate event plan. Please check that GEMINI_API_KEY is configured in .env.local or retry."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveAndOpen = async () => {
    if (!generatedPlan) return;
    await saveEvent(generatedPlan);
    router.push(`/events/${generatedPlan.id}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#faf9f5]">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Wizard Header */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            <span>AI Planning Wizard</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Design Your Event Masterplan
          </h1>
          <p className="text-sm text-slate-600 mt-2">
            Share your event vision, guest target, and budget. Our Gemini AI model and
            deterministic budget engine will generate an itemized, schedule-ready blueprint.
          </p>

          {/* Quick Template Fill Buttons */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs text-slate-500 font-medium mr-1">Quick Fill:</span>
            <button
              type="button"
              onClick={() => loadTemplate("wedding")}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 border border-rose-200/80 hover:bg-rose-100 transition-colors"
            >
              Wedding Demo
            </button>
            <button
              type="button"
              onClick={() => loadTemplate("birthday")}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-violet-50 text-violet-700 border border-violet-200/80 hover:bg-violet-100 transition-colors"
            >
              Birthday Demo
            </button>
            <button
              type="button"
              onClick={() => loadTemplate("community")}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-teal-50 text-teal-700 border border-teal-200/80 hover:bg-teal-100 transition-colors"
            >
              Community Fair Demo
            </button>
          </div>
        </div>

        {/* Loading State Overlay */}
        {isGenerating ? (
          <div className="py-12">
            <LoadingState
              title={`Generating Plan for "${formData.eventName || "Your Event"}"`}
              description="Connecting to Google Gemini API, structuring itemized expenses, and calculating verified budget totals..."
              activeStepIndex={generationStep}
              steps={[
                "Submitting parameters to Google Gemini 2.5 Flash",
                "Drafting 12-point strategic plan & vendor questions",
                "Verifying expense calculations with server-side TypeScript engine",
                "Finalizing contingency mitigations & readiness checklists",
              ]}
            />
          </div>
        ) : generatedPlan ? (
          /* Success Plan Review Card */
          <div className="space-y-6">
            <Alert variant="success" title="Event Plan Generated Successfully!">
              Your customized event blueprint has been created and all budget math verified. Review the summary below and click &quot;Open in Workspace&quot; to manage tasks, expenses, and timeline.
            </Alert>

            <Card className="border-teal-200/80 bg-white shadow-lg">
              <CardContent className="p-6 sm:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="teal">{generatedPlan.input.eventType.toUpperCase()}</Badge>
                      <span className="text-xs text-slate-500">
                        {generatedPlan.input.guestCount} guests • {generatedPlan.input.location}
                      </span>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900">{generatedPlan.title}</h2>
                    <p className="text-sm font-medium text-teal-700 italic mt-0.5">
                      &quot;{generatedPlan.tagline}&quot;
                    </p>
                    <p className="text-sm text-slate-600 mt-3 leading-relaxed">
                      {generatedPlan.visionSummary}
                    </p>
                  </div>

                  <div className="flex sm:flex-col gap-2 shrink-0">
                    <Button
                      variant="teal"
                      size="md"
                      onClick={handleSaveAndOpen}
                      rightIcon={<ArrowRight className="w-4 h-4" />}
                    >
                      Open in Workspace
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setGeneratedPlan(null)}
                      leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                    >
                      Edit Inputs
                    </Button>
                  </div>
                </div>

                {/* Verified Budget Summary Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
                  <div>
                    <span className="text-slate-500 block mb-0.5">Target Budget</span>
                    <span className="text-base font-bold text-slate-900">
                      {formatCurrency(generatedPlan.budgetSummary.totalUserBudget, generatedPlan.budgetSummary.currency)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5">Calculated Total</span>
                    <span className="text-base font-bold text-slate-900">
                      {formatCurrency(generatedPlan.budgetSummary.calculatedTotalExpenses, generatedPlan.budgetSummary.currency)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5">Remaining Reserve</span>
                    <span
                      className={`text-base font-bold ${
                        generatedPlan.budgetSummary.isOverBudget ? "text-rose-600" : "text-emerald-700"
                      }`}
                    >
                      {formatCurrency(generatedPlan.budgetSummary.remainingBudget, generatedPlan.budgetSummary.currency)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5">Cost Per Guest</span>
                    <span className="text-base font-bold text-slate-900">
                      {formatCurrency(generatedPlan.budgetSummary.costPerGuest, generatedPlan.budgetSummary.currency)}
                    </span>
                  </div>
                </div>

                {/* Feasibility Assessment Alert */}
                <div className="p-4 rounded-xl bg-teal-50/50 border border-teal-200/60 text-xs text-teal-950 leading-relaxed">
                  <span className="font-bold block mb-1">Feasibility & Financial Analysis:</span>
                  {generatedPlan.feasibilityAssessment}
                </div>

                {/* Generated Highlights Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <div className="space-y-3">
                    <h4 className="text-xs uppercase tracking-wider font-bold text-slate-700">
                      Key Tasks & Milestones ({generatedPlan.tasks.length} tasks)
                    </h4>
                    <div className="space-y-2">
                      {generatedPlan.tasks.slice(0, 4).map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-white text-xs"
                        >
                          <span className="font-medium text-slate-800 line-clamp-1">{task.title}</span>
                          <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                            {task.timelineMarker}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs uppercase tracking-wider font-bold text-slate-700">
                      Identified Vendors & Services ({generatedPlan.vendors.length} vendors)
                    </h4>
                    <div className="space-y-2">
                      {generatedPlan.vendors.slice(0, 4).map((ven) => (
                        <div
                          key={ven.id}
                          className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-white text-xs"
                        >
                          <span className="font-medium text-slate-800">{ven.serviceType}</span>
                          <span className="font-semibold text-slate-700">
                            {formatCurrency(ven.estimatedCost, generatedPlan.budgetSummary.currency)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <Button
                    variant="teal"
                    size="lg"
                    onClick={handleSaveAndOpen}
                    rightIcon={<ArrowRight className="w-5 h-5" />}
                  >
                    Save & Open Event Workspace
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Event Input Form */
          <form onSubmit={handleGenerate} className="space-y-8">
            {apiError && (
              <Alert variant="danger" title="Generation Error">
                {apiError}
              </Alert>
            )}

            {/* Section 1: Event Type Selector */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-white text-xs">
                  1
                </span>
                <span>Select Event Classification</span>
              </h3>

              <div role="radiogroup" aria-label="Event Classification" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  {
                    id: "wedding",
                    title: "Wedding Ceremony",
                    icon: <Heart className="w-5 h-5 text-rose-500" />,
                    desc: "Ceremonies, banquets, vows, and receptions",
                  },
                  {
                    id: "birthday",
                    title: "Milestone Birthday",
                    icon: <Cake className="w-5 h-5 text-violet-500" />,
                    desc: "Theme soirees, dinners, DJs, and parties",
                  },
                  {
                    id: "community",
                    title: "Community Event",
                    icon: <Users className="w-5 h-5 text-teal-500" />,
                    desc: "Festivals, fundraisers, and neighborhood fairs",
                  },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="radio"
                    aria-checked={formData.eventType === item.id}
                    onClick={() => handleInputChange("eventType", item.id)}
                    className={`flex flex-col text-left p-4 rounded-xl border-2 transition-all cursor-pointer ${
                      formData.eventType === item.id
                        ? "border-teal-600 bg-teal-50/50 shadow-sm"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-2 rounded-lg bg-white border border-slate-100 shadow-2xs">
                        {item.icon}
                      </div>
                      {formData.eventType === item.id && (
                        <CheckCircle2 className="w-4 h-4 text-teal-600" />
                      )}
                    </div>
                    <span className="font-bold text-slate-900 text-sm">{item.title}</span>
                    <span className="text-xs text-slate-500 mt-1">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Section 2: Core Details */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-5">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-white text-xs">
                  2
                </span>
                <span>Core Event Parameters</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Input
                  label="Event Name"
                  required
                  placeholder="e.g. Maya & Alex's Summer Solstice Wedding"
                  value={formData.eventName}
                  onChange={(e) => handleInputChange("eventName", e.target.value)}
                  error={errors.eventName}
                />

                <Input
                  label="Target Event Date"
                  type="date"
                  required
                  value={formData.eventDate}
                  onChange={(e) => handleInputChange("eventDate", e.target.value)}
                  error={errors.eventDate}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <Input
                  label="Location / Venue City"
                  required
                  placeholder="e.g. Austin, TX or Conservatory Lawn"
                  value={formData.location}
                  onChange={(e) => handleInputChange("location", e.target.value)}
                  error={errors.location}
                />

                <Input
                  label="Expected Guest Count"
                  type="number"
                  required
                  min={1}
                  value={formData.guestCount}
                  onChange={(e) => handleInputChange("guestCount", Number(e.target.value))}
                  error={errors.guestCount}
                />

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <Input
                      label="Total Budget"
                      type="number"
                      required
                      min={0}
                      value={formData.totalBudget}
                      onChange={(e) => handleInputChange("totalBudget", Number(e.target.value))}
                      error={errors.totalBudget}
                    />
                  </div>
                  <div>
                    <label htmlFor="currency-select" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                      Curr.
                    </label>
                    <select
                      id="currency-select"
                      aria-label="Currency"
                      value={formData.currency}
                      onChange={(e) => handleInputChange("currency", e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-4 focus:ring-teal-500/10"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="CAD">CAD ($)</option>
                      <option value="AUD">AUD ($)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Vision & Preferences */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-5">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-white text-xs">
                  3
                </span>
                <span>Atmosphere & Special Preferences</span>
              </h3>

              <Input
                label="Theme or Aesthetic Inspiration"
                placeholder="e.g. Modern botanical rustic, 90s retro vinyl, eco-friendly harvest fair"
                value={formData.theme}
                onChange={(e) => handleInputChange("theme", e.target.value)}
                helperText="Give Gemini creative direction on colors, styling, and ambience."
              />

              <Textarea
                label="Food, Music & Entertainment Preferences"
                rows={3}
                placeholder="e.g. Passed tapas, espresso martini bar, acoustic guitar for ceremony, lively funk DJ for dancing."
                value={formData.userPreferences}
                onChange={(e) => handleInputChange("userPreferences", e.target.value)}
              />

              <Textarea
                label="Special Requirements & Contingencies"
                rows={3}
                placeholder="e.g. Strict vegan and gluten-free catering, wheelchair ramp required, backup tent for potential rain."
                value={formData.specialRequirements}
                onChange={(e) => handleInputChange("specialRequirements", e.target.value)}
                helperText="Will be factored into safety, accessibility, and contingency recommendations."
              />
            </div>

            {/* Submit Action */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 to-teal-950 text-white shadow-xl">
              <div>
                <h4 className="font-bold text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Ready to Synthesize Your Event Blueprint?</span>
                </h4>
                <p className="text-xs text-slate-300 mt-0.5">
                  Gemini generates the custom plan; our verified server logic validates all budget arithmetic.
                </p>
              </div>

              <Button
                type="submit"
                variant="teal"
                size="lg"
                isLoading={isGenerating}
                rightIcon={<Sparkles className="w-4 h-4 text-amber-200" />}
                className="w-full sm:w-auto shrink-0 shadow-lg shadow-teal-500/20"
              >
                Generate AI Plan
              </Button>
            </div>
          </form>
        )}
      </main>

      <Footer />
    </div>
  );
}
