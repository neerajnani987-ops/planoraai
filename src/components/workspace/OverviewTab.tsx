"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { ValidatedPlan } from "@/schemas/event";

interface OverviewTabProps {
  plan: ValidatedPlan;
}

export const OverviewTab = React.memo(function OverviewTab({ plan }: OverviewTabProps) {
  return (
    <div className="space-y-6">
      {/* Feasibility Alert */}
      {plan.budgetSummary.isOverBudget ? (
        <Alert variant="warning" title="Budget Advisory Warning">
          {plan.feasibilityAssessment}
        </Alert>
      ) : (
        <Alert variant="info" title="Verified Feasibility Assessment">
          {plan.feasibilityAssessment}
        </Alert>
      )}

      {/* Vision & Atmosphere */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Creative Vision & Narrative</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-700 leading-relaxed">
            <p>{plan.visionSummary}</p>

            <div className="pt-2 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                Color Palette & Styling
              </span>
              <div className="flex items-center gap-2 mb-3">
                {plan.themeAndDecor.primaryColorPalette.map((color, idx) => (
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
                <strong>Style:</strong> {plan.themeAndDecor.aestheticStyle}
              </p>
              <p className="text-xs text-slate-600 mt-1">
                <strong>Atmosphere:</strong> {plan.themeAndDecor.atmosphere}
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
                {plan.foodAndEntertainment.cateringStyle}
              </p>
              <ul className="list-disc list-inside text-xs text-slate-600 mt-2 space-y-1">
                {plan.foodAndEntertainment.menuConcepts.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Dietary & Allergen Protocol
              </span>
              <p className="text-xs text-slate-600">
                {plan.foodAndEntertainment.dietaryInclusivityNotes}
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
              <p className="text-slate-600">{plan.guestManagement.seatingLayout}</p>
            </div>
            <div>
              <span className="font-bold text-slate-900 block mb-0.5">Invitation Cadence:</span>
              <p className="text-slate-600">{plan.guestManagement.invitationTimeline}</p>
            </div>
            <div>
              <span className="font-bold text-slate-900 block mb-0.5">Accessibility & Inclusivity:</span>
              <p className="text-slate-600">{plan.guestManagement.accessibilityAccommodations}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Risk Factors & Contingencies</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            {plan.contingencies.map((c, i) => (
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
  );
});

