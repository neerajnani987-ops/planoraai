"use client";

import React from "react";
import { Plus, CheckSquare, Square, Trash2 } from "lucide-react";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ValidatedPlan, TaskItem } from "@/schemas/event";

interface TasksTabProps {
  plan: ValidatedPlan;
  completedTaskCount: number;
  taskProgressPct: number;
  taskStatusFilter: "all" | "pending" | "completed";
  setTaskStatusFilter: (status: "all" | "pending" | "completed") => void;
  taskSearch: string;
  setTaskSearch: (search: string) => void;
  filteredTasks: TaskItem[];
  onToggleTask: (planId: string, taskId: string) => void;
  onDeleteTask: (planId: string, taskId: string) => void;
  onOpenAddTaskModal: () => void;
}

export const TasksTab = React.memo(function TasksTab({
  plan,
  completedTaskCount,
  taskProgressPct,
  taskStatusFilter,
  setTaskStatusFilter,
  taskSearch,
  setTaskSearch,
  filteredTasks,
  onToggleTask,
  onDeleteTask,
  onOpenAddTaskModal,
}: TasksTabProps) {
  return (
    <div className="space-y-6">
      {/* Checklist Progress Overview Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-900">Checklist Completion Status</span>
          <span className="font-semibold text-slate-700">
            {completedTaskCount} of {plan.tasks.length} tasks completed ({taskProgressPct}%)
          </span>
        </div>
        <ProgressBar value={taskProgressPct} variant="teal" />
      </div>

      {/* Top Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setTaskStatusFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              taskStatusFilter === "all" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            All ({plan.tasks.length})
          </button>
          <button
            type="button"
            onClick={() => setTaskStatusFilter("pending")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              taskStatusFilter === "pending" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Pending ({plan.tasks.filter((t) => !t.completed).length})
          </button>
          <button
            type="button"
            onClick={() => setTaskStatusFilter("completed")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              taskStatusFilter === "completed" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Completed ({completedTaskCount})
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Filter tasks..."
            value={taskSearch}
            onChange={(e) => setTaskSearch(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-800 bg-white"
          />
          <Button
            variant="teal"
            size="sm"
            onClick={onOpenAddTaskModal}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Add Task
          </Button>
        </div>
      </div>

      {/* Tasks list */}
      <div className="space-y-2">
        {filteredTasks.length === 0 ? (
          <p className="text-center text-xs text-slate-500 py-10">No tasks match your criteria.</p>
        ) : (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              onClick={() => onToggleTask(plan.id, task.id)}
              className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer group ${
                task.completed
                  ? "bg-slate-50 border-slate-200/60 opacity-60"
                  : "bg-white border-slate-200/90 hover:border-teal-400 hover:shadow-xs"
              }`}
            >
              <button
                type="button"
                className="mt-0.5 text-teal-600 shrink-0"
                aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
              >
                {task.completed ? (
                  <CheckSquare className="w-5 h-5 text-teal-600" />
                ) : (
                  <Square className="w-5 h-5 text-slate-300" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-semibold ${
                    task.completed ? "line-through text-slate-400" : "text-slate-900"
                  }`}
                >
                  {task.title}
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                  <span className="font-medium text-slate-700">{task.category}</span>
                  <span>•</span>
                  <span>{task.timelineMarker}</span>
                  {task.notes && (
                    <>
                      <span>•</span>
                      <span className="truncate max-w-[200px]">{task.notes}</span>
                    </>
                  )}
                </div>
              </div>
              {task.priority === "high" && !task.completed && (
                <Badge variant="rose" size="sm">
                  High Priority
                </Badge>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteTask(plan.id, task.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                title="Delete task"
                aria-label={`Delete task ${task.title}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
});

