import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "teal" | "violet" | "amber" | "rose" | "outline" | "secondary";
  size?: "sm" | "md";
}

export function Badge({
  className,
  variant = "default",
  size = "md",
  children,
  ...props
}: BadgeProps) {
  const variantStyles = {
    default: "bg-slate-900 text-white",
    teal: "bg-teal-50 text-teal-800 border border-teal-200/70",
    violet: "bg-violet-50 text-violet-800 border border-violet-200/70",
    amber: "bg-amber-50 text-amber-800 border border-amber-200/70 font-semibold",
    rose: "bg-rose-50 text-rose-800 border border-rose-200/70",
    outline: "border border-slate-300 text-slate-700 bg-white",
    secondary: "bg-slate-100 text-slate-700",
  };

  const sizeStyles = {
    sm: "text-[11px] px-2 py-0.5 font-medium rounded-md",
    md: "text-xs px-2.5 py-1 font-semibold rounded-lg",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 transition-colors select-none",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
