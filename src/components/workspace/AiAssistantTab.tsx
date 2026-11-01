"use client";

import React from "react";
import { Sparkles, Send } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface AiAssistantTabProps {
  isAiLoading: boolean;
  revisionPrompt: string;
  setRevisionPrompt: (prompt: string) => void;
  onAiRevision: (instruction: string) => void;
}

const QUICK_PROMPTS = [
  "Reduce catering costs by 10%",
  "Suggest affordable decorations and DIY centerpieces",
  "Create a rain and high-wind backup plan",
  "Make the event suitable and engaging for young children",
  "Adjust the plan for 15 additional guests",
];

export const AiAssistantTab = React.memo(function AiAssistantTab({
  isAiLoading,
  revisionPrompt,
  setRevisionPrompt,
  onAiRevision,
}: AiAssistantTabProps) {
  return (
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
              {QUICK_PROMPTS.map((promptText, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onAiRevision(promptText)}
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
              onAiRevision(revisionPrompt);
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
  );
});

