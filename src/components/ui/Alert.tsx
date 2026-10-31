import React from "react";
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface AlertProps {
  variant?: "info" | "warning" | "success" | "danger";
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Alert({
  variant = "info",
  title,
  children,
  className,
}: AlertProps) {
  const styles = {
    info: "bg-teal-50/80 border-teal-200 text-teal-950",
    warning: "bg-amber-50/90 border-amber-200 text-amber-950",
    success: "bg-emerald-50/80 border-emerald-200 text-emerald-950",
    danger: "bg-rose-50/80 border-rose-200 text-rose-950",
  };

  const icons = {
    info: <Info className="w-5 h-5 text-teal-600 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />,
    success: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />,
    danger: <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />,
  };

  return (
    <div
      className={cn(
        "flex gap-3 rounded-xl border p-4 text-sm leading-relaxed",
        styles[variant],
        className
      )}
      role="alert"
      aria-live="polite"
    >
      {icons[variant]}
      <div className="flex-1 space-y-1">
        {title && <h5 className="font-semibold">{title}</h5>}
        <div className="text-xs md:text-sm text-slate-700">{children}</div>
      </div>
    </div>
  );
}
