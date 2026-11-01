import React from "react";
import { Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
  title?: string;
  description?: string;
  steps?: string[];
  activeStepIndex?: number;
  className?: string;
}

export function LoadingState({
  title = "Generating Your Planora AI Event Plan",
  description = "Synthesizing custom budget allocations, vendor timelines, and personalized ideas...",
  steps = [
    "Analyzing guest parameters and budget constraints",
    "Running deterministic cost modeling and allocations",
    "Structuring priority tasks and vendor milestones",
    "Drafting personalized contingencies and readiness checklist",
  ],
  activeStepIndex = 1,
  className,
}: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "rounded-2xl border border-teal-200/60 bg-gradient-to-b from-teal-50/50 to-white p-8 md:p-12 text-center max-w-xl mx-auto shadow-xl shadow-teal-900/5",
        className
      )}
    >
      <div className="relative mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-600/30">
        <Sparkles className="h-8 w-8 animate-pulse text-amber-200" />
        <div className="absolute -inset-1 rounded-2xl border-2 border-teal-400/40 animate-ping" />
      </div>

      <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-600 mb-8 max-w-md mx-auto">{description}</p>

      <div className="space-y-3 text-left bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-slate-200/80">
        {steps.map((step, idx) => {
          const isDone = idx < activeStepIndex;
          const isCurrent = idx === activeStepIndex;
          return (
            <div
              key={idx}
              className={cn(
                "flex items-center gap-3 text-xs md:text-sm py-1.5 px-2 rounded-lg transition-all",
                isCurrent && "bg-teal-50/80 text-teal-900 font-semibold",
                isDone && "text-slate-500 line-through opacity-75",
                !isDone && !isCurrent && "text-slate-400"
              )}
            >
              {isDone ? (
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
              ) : isCurrent ? (
                <Loader2 className="w-4 h-4 text-teal-600 animate-spin shrink-0" />
              ) : (
                <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
              )}
              <span>{step}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
