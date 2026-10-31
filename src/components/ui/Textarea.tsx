import React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  label?: string;
  helperText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, label, helperText, id, ...props }, ref) => {
    const generatedId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
    const errorId = generatedId ? `${generatedId}-error` : undefined;
    const helperId = generatedId ? `${generatedId}-helper` : undefined;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={generatedId}
            className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
          >
            {label}
            {props.required && <span className="text-rose-500 ml-1">*</span>}
          </label>
        )}
        <textarea
          id={generatedId}
          ref={ref}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          className={cn(
            "flex min-h-[90px] w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-all",
            "focus:border-teal-500 focus:outline-none focus:ring-4 focus:ring-teal-500/10",
            "disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-60",
            error && "border-rose-400 focus:border-rose-500 focus:ring-rose-500/10",
            className
          )}
          {...props}
        />
        {error ? (
          <p id={errorId} className="text-xs text-rose-600 font-medium" role="alert">
            {error}
          </p>
        ) : helperText ? (
          <p id={helperId} className="text-xs text-slate-500">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
