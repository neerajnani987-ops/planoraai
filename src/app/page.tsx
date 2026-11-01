import React from "react";
import Link from "next/link";
import {
  Sparkles,
  Heart,
  Cake,
  Users,
  ArrowRight,
  Calculator,
  ShieldCheck,
  CheckCircle2,
  Clock,
  TrendingDown,
  ChevronRight,
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { SAMPLE_EVENTS } from "@/data/sample-events";

export default function LandingPage() {
  const eventCards = [
    {
      type: "wedding",
      title: "Weddings & Ceremonies",
      subtitle: "Unforgettable romance, zero logistical chaos",
      icon: <Heart className="w-5 h-5 text-rose-500" />,
      tag: "Wedding Focus",
      color: "border-rose-100 hover:border-rose-300",
      description:
        "Seating blueprints, multi-course catering projections, golden-hour photo schedules, and weather backup plans tailored to your guest count.",
      sample: SAMPLE_EVENTS[0],
    },
    {
      type: "birthday",
      title: "Milestone Birthdays",
      subtitle: "Effortlessly celebrate another milestone",
      icon: <Cake className="w-5 h-5 text-violet-500" />,
      tag: "Birthday Focus",
      color: "border-violet-100 hover:border-violet-300",
      description:
        "Theme ideation, playlist curation, interactive photo stations, custom cake timelines, and entertainment bookings calibrated to your vibe.",
      sample: SAMPLE_EVENTS[1],
    },
    {
      type: "community",
      title: "Community Gatherings",
      subtitle: "Bring neighborhoods and people together",
      icon: <Users className="w-5 h-5 text-teal-500" />,
      tag: "Community Focus",
      color: "border-teal-100 hover:border-teal-300",
      description:
        "Permit checklists, crowd management, accessible facilities, volunteer shift assignments, and waste triage plans.",
      sample: SAMPLE_EVENTS[2],
    },
  ];

  const features = [
    {
      icon: <Calculator className="w-6 h-6 text-teal-600" />,
      title: "Deterministic Budgeting Engine",
      description:
        "Never trust AI math. Planora recalculates all expense item totals with verified server-side TypeScript arithmetic, guaranteeing non-negative costs and clear overrun alerts.",
    },
    {
      icon: <Clock className="w-6 h-6 text-violet-600" />,
      title: "Auto-Calibrated Timelines",
      description:
        "Generates phased milestone markers (from 12 months prior to day-of run-sheets) customized dynamically to your exact celebration date.",
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-slate-800" />,
      title: "Intelligent Contingency Plans",
      description:
        "Every plan identifies risk factors (inclement weather, vendor delays, dietary cross-contact) and produces actionable mitigations before emergencies strike.",
    },
    {
      icon: <TrendingDown className="w-6 h-6 text-amber-600" />,
      title: "Targeted Cost-Saving Ideas",
      description:
        "Suggests realistic trade-offs that shave 10-25% off expenses without degrading guest sentiment or visual quality.",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#faf9f5]">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 md:pt-24 md:pb-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-50 border border-teal-200/80 text-teal-800 text-xs font-semibold mb-6 shadow-sm">
            <Sparkles className="w-4 h-4 text-teal-600 animate-pulse" />
            <span>Plan smarter. Celebrate better.</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-slate-900 tracking-tight max-w-4xl mx-auto leading-[1.1] mb-6">
            Intelligent Event Planning,{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 via-teal-700 to-violet-700">
              Orchestrated in Minutes.
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
            Organize weddings, milestone birthdays, and community festivals with
            verified budgets, milestone timelines, vendor checklists, and personalized AI ideas.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto mb-16">
            <Link href="/create" className="w-full sm:w-auto">
              <Button
                variant="teal"
                size="lg"
                className="w-full sm:w-auto text-base shadow-lg shadow-teal-700/20"
                rightIcon={<ArrowRight className="w-5 h-5" />}
              >
                Plan Your Event
              </Button>
            </Link>
            <Link href="/dashboard" className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto text-base bg-white/80"
              >
                View Dashboard
              </Button>
            </Link>
          </div>

          {/* Social Proof Badges */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 pt-4">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-teal-600" />
              <span>Official Google Gemini SDK</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-teal-600" />
              <span>Deterministic Budget Validation</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-teal-600" />
              <span>Interactive Event Workspaces</span>
            </div>
          </div>
        </div>

        {/* Ambient subtle background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-teal-100/40 via-violet-100/30 to-amber-100/40 blur-3xl -z-10 rounded-full pointer-events-none" />
      </section>

      {/* Event Types Showcase */}
      <section className="py-16 bg-white/70 border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-xs uppercase tracking-widest font-bold text-teal-600 mb-2">
              Versatile Planning Architectures
            </h2>
            <h3 className="text-3xl font-bold text-slate-900 tracking-tight">
              Tailored for Every Milestone
            </h3>
            <p className="text-slate-600 text-sm mt-2">
              Explore specialized planning frameworks designed around the exact dynamics of your celebration.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {eventCards.map((card) => (
              <Card
                key={card.type}
                className={`relative flex flex-col justify-between overflow-hidden border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${card.color}`}
              >
                <CardContent className="p-7">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      {card.icon}
                    </div>
                    <Badge variant="secondary" size="sm">
                      {card.tag}
                    </Badge>
                  </div>

                  <h4 className="text-xl font-bold text-slate-900 mb-1">
                    {card.title}
                  </h4>
                  <p className="text-xs font-semibold text-slate-500 mb-3">
                    {card.subtitle}
                  </p>
                  <p className="text-sm text-slate-600 leading-relaxed mb-6">
                    {card.description}
                  </p>

                  <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100 mb-4 text-xs space-y-1.5">
                    <div className="text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
                      Sample Blueprint
                    </div>
                    <div className="font-semibold text-slate-800 line-clamp-1">
                      {card.sample.title}
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>{card.sample.input.guestCount} guests</span>
                      <span className="font-medium text-slate-700">
                        ${card.sample.budgetSummary.totalUserBudget.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <Link href={`/events/${card.sample.id}`}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-between text-teal-700 hover:text-teal-800 hover:bg-teal-50"
                      rightIcon={<ChevronRight className="w-4 h-4" />}
                    >
                      Explore Blueprint
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <Badge variant="teal" size="sm" className="mb-3">
            Production Engineering
          </Badge>
          <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Built for Precision, Not Hallucinations
          </h3>
          <p className="text-slate-600 text-sm mt-3">
            GenAI powers the creative vision; deterministic TypeScript logic verifies every dollar and deadline.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((feat, i) => (
            <div
              key={i}
              className="flex gap-4 p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 shrink-0 h-fit">
                {feat.icon}
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-900 mb-1.5">
                  {feat.title}
                </h4>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {feat.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How it Works Walkthrough */}
      <section className="py-16 bg-gradient-to-b from-white to-teal-50/30 border-t border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h3 className="text-3xl font-bold text-slate-900 tracking-tight">
              How Planora AI Works
            </h3>
            <p className="text-slate-600 text-sm mt-2">
              From raw concept to actionable master plan in three straightforward steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="bg-white p-7 rounded-2xl border border-slate-200/80 shadow-sm relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white font-bold text-base mb-4">
                1
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-2">Input Parameters</h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                Provide your celebration type, date, location, guest target, and financial budget. Include specific vibes or dietary needs.
              </p>
            </div>

            <div className="bg-white p-7 rounded-2xl border border-slate-200/80 shadow-sm relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-white font-bold text-base mb-4">
                2
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-2">AI Synthesis & Validation</h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                Google Gemini generates a 12-point strategic event blueprint, while our backend calculates deterministic category allocations.
              </p>
            </div>

            <div className="bg-white p-7 rounded-2xl border border-slate-200/80 shadow-sm relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white font-bold text-base mb-4">
                3
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-2">Manage & Revise</h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                Track checklist tasks, adjust vendor contracts, and use the AI revision assistant to dynamically tweak items and reschedule.
              </p>
            </div>
          </div>

          {/* Bottom CTA Banner */}
          <div className="mt-16 rounded-3xl bg-slate-900 p-8 md:p-12 text-center text-white relative overflow-hidden shadow-2xl">
            <div className="relative z-10 max-w-2xl mx-auto space-y-4">
              <h3 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
                Ready to plan smarter and celebrate better?
              </h3>
              <p className="text-slate-300 text-sm sm:text-base">
                Start crafting your next wedding, birthday, or community gathering with Planora AI today.
              </p>
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/create">
                  <Button variant="teal" size="lg" rightIcon={<Sparkles className="w-4 h-4 text-amber-200" />}>
                    Launch Event Creation Wizard
                  </Button>
                </Link>
                <Link href="/dashboard">
                  <Button variant="outline" size="lg" className="border-slate-700 text-white hover:bg-slate-800">
                    Open Existing Events
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
