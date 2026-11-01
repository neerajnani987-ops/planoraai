"use client";

import React from "react";
import { CheckCircle2, ArrowUp, ArrowDown, Pencil, Trash2, Plus, Clock } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ValidatedPlan } from "@/schemas/event";

interface TimelineTabProps {
  plan: ValidatedPlan;
  newRescheduleDate: string;
  setNewRescheduleDate: (date: string) => void;
  onReschedule: () => void;
  onMoveTimelineMilestone: (
    planId: string,
    phaseIndex: number,
    milestoneIndex: number,
    direction: "up" | "down"
  ) => void;
  onOpenAddMilestoneModal: (phaseIndex: number) => void;
  onOpenEditMilestoneModal: (
    phaseIndex: number,
    milestoneIndex: number,
    text: string
  ) => void;
  onRemoveTimelineMilestone: (
    planId: string,
    phaseIndex: number,
    milestoneIndex: number
  ) => void;
}

export const TimelineTab = React.memo(function TimelineTab({
  plan,
  newRescheduleDate,
  setNewRescheduleDate,
  onReschedule,
  onMoveTimelineMilestone,
  onOpenAddMilestoneModal,
  onOpenEditMilestoneModal,
  onRemoveTimelineMilestone,
}: TimelineTabProps) {
  return (
    <div className="space-y-6">
      {/* Reschedule Date Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
        <div>
          <h4 className="text-sm font-bold text-slate-900">Need to change your event date?</h4>
          <p className="text-xs text-slate-500">
            Planora recalculates vendor booking windows and milestones for the new date.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="date"
            value={newRescheduleDate}
            onChange={(e) => setNewRescheduleDate(e.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-slate-900 bg-white"
          />
          <Button
            variant="teal"
            size="sm"
            onClick={onReschedule}
            disabled={!newRescheduleDate || newRescheduleDate === plan.input.eventDate}
          >
            Reschedule Timeline
          </Button>
        </div>
      </div>

      {/* Timeline Phases */}
      <div className="space-y-4">
        {plan.timeline.map((phase, idx) => (
          <Card key={idx} className="overflow-hidden">
            <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-800">
                  {phase.phaseName}
                </span>
                <Badge variant="outline" size="sm">
                  {phase.timeWindow}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div>
                <span className="font-bold text-slate-900 block mb-2">Core Milestones:</span>
                <ul className="space-y-1.5 text-slate-700">
                  {phase.milestones.map((m, mIdx) => (
                    <li
                      key={mIdx}
                      className="flex items-center justify-between group p-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-start gap-2 flex-1 min-w-0 pr-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 mt-0.5 shrink-0" />
                        <span className="text-slate-800 leading-snug break-words">{m}</span>
                      </div>
                      <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          type="button"
                          onClick={() => onMoveTimelineMilestone(plan.id, idx, mIdx, "up")}
                          disabled={mIdx === 0}
                          className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 disabled:opacity-20 transition-colors"
                          title="Move milestone earlier"
                          aria-label="Move milestone up"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onMoveTimelineMilestone(plan.id, idx, mIdx, "down")}
                          disabled={mIdx === phase.milestones.length - 1}
                          className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 disabled:opacity-20 transition-colors"
                          title="Move milestone later"
                          aria-label="Move milestone down"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenEditMilestoneModal(idx, mIdx, m)}
                          className="p-1 rounded text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
                          title="Edit milestone"
                          aria-label="Edit milestone"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemoveTimelineMilestone(plan.id, idx, mIdx)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete milestone"
                          aria-label="Delete milestone"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="pt-3">
                  <button
                    type="button"
                    onClick={() => onOpenAddMilestoneModal(idx)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-800 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Milestone</span>
                  </button>
                </div>
              </div>

              <div>
                <span className="font-bold text-slate-900 block mb-2">Key Deadlines:</span>
                <ul className="space-y-1.5 text-slate-700">
                  {phase.keyDeadlines.map((d, dIdx) => (
                    <li key={dIdx} className="flex items-start gap-2">
                      <Clock className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
});

