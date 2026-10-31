import React from "react";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number; // 0 to 100
  max?: number;
  variant?: "teal" | "violet" | "amber" | "rose" | "slate";
  showLabel?: boolean;
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  variant = "teal",
  showLabel = false,
  className,
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, Math.round((value / max) * 100)));

  const barColors = {
    teal: "bg-teal-600",
    violet: "bg-violet-600",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
    slate: "bg-slate-800",
  };

  return (
    <div
      className={cn("w-full space-y-1.5", className)}
      role="progressbar"
      aria-valuenow={percentage}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Progress"
    >
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className={cn("h-full transition-all duration-500 ease-out rounded-full", barColors[variant])}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between text-xs text-slate-500">
          <span>Progress</span>
          <span className="font-semibold text-slate-700">{percentage}%</span>
        </div>
      )}
    </div>
  );
}
