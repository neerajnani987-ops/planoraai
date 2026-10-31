"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Copy,
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { SAMPLE_EVENTS } from "@/data/sample-events";
import { useEventStore } from "@/hooks/useEventStore";
import { formatCurrency } from "@/lib/utils";
import { ValidatedPlan } from "@/schemas/event";

function createDuplicatePlan(template: ValidatedPlan): ValidatedPlan {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 7);
  const nowIso = new Date().toISOString();

  return {
    ...template,
    id: `plan-${timestamp}-${randomSuffix}`,
    title: `${template.title} (Customized Copy)`,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

export default function TemplatesPage() {
  const router = useRouter();
  const { saveEvent } = useEventStore();

  const handleDuplicateTemplate = (template: ValidatedPlan) => {
    const duplicated = createDuplicatePlan(template);
    saveEvent(duplicated);
    router.push(`/events/${duplicated.id}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#faf9f5]">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            <span>Curated Architectural Blueprints</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Event Masterplan Templates
          </h1>
          <p className="text-sm text-slate-600 mt-2">
            Jumpstart your celebration with pre-calibrated blueprints. Duplicate any template into your workspace or customize with Gemini AI.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {SAMPLE_EVENTS.map((tpl) => (
            <Card key={tpl.id} className="flex flex-col justify-between overflow-hidden border-slate-200/90 shadow-sm hover:shadow-lg transition-all">
              <CardHeader className="p-6 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <Badge
                    variant={
                      tpl.input.eventType === "wedding"
                        ? "rose"
                        : tpl.input.eventType === "birthday"
                        ? "violet"
                        : "teal"
                    }
                  >
                    {tpl.input.eventType.toUpperCase()}
                  </Badge>
                  <span className="text-xs text-slate-500">
                    {tpl.input.guestCount} guests
                  </span>
                </div>
                <CardTitle className="text-lg font-bold text-slate-900 line-clamp-1">
                  {tpl.title}
                </CardTitle>
                <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                  {tpl.visionSummary}
                </p>
              </CardHeader>

              <CardContent className="p-6 pt-0 space-y-4">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Target Budget:</span>
                    <span className="font-bold text-slate-900">
                      {formatCurrency(tpl.budgetSummary.totalUserBudget, tpl.budgetSummary.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Calculated Expenses:</span>
                    <span className="font-semibold text-slate-700">
                      {formatCurrency(tpl.budgetSummary.calculatedTotalExpenses, tpl.budgetSummary.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Cost Per Guest:</span>
                    <span className="font-semibold text-slate-700">
                      {formatCurrency(tpl.budgetSummary.costPerGuest, tpl.budgetSummary.currency)}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-600 space-y-1">
                  <span className="font-bold text-slate-800 block">Highlights:</span>
                  <p className="line-clamp-2 text-slate-500">{tpl.themeAndDecor.aestheticStyle}</p>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <Button
                    variant="teal"
                    size="sm"
                    className="w-full"
                    onClick={() => handleDuplicateTemplate(tpl)}
                    leftIcon={<Copy className="w-3.5 h-3.5" />}
                  >
                    Use This Template
                  </Button>
                  <Link href={`/events/${tpl.id}`} className="w-full">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-slate-600"
                    >
                      Preview Blueprint
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
