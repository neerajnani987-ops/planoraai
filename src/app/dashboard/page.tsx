"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Plus,
  Calendar,
  DollarSign,
  CheckCircle2,
  Clock,
  MapPin,
  Users,
  AlertTriangle,
  ArrowUpRight,
  Filter,
  Sparkles,
  ChevronRight,
  CheckSquare,
  Square,
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { useEventStore } from "@/hooks/useEventStore";
import { formatCurrency, formatDate } from "@/lib/utils";
import { EventType } from "@/schemas/event";

import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  const { events, toggleTask } = useEventStore();
  const [filterType, setFilterType] = useState<string>("all");

  // Filtered events
  const filteredEvents = useMemo(() => {
    if (filterType === "all") return events;
    return events.filter((e) => e.input.eventType === filterType);
  }, [events, filterType]);

  // Aggregate stats in a single pass
  const stats = useMemo(() => {
    let totalBudget = 0;
    let totalExpenses = 0;
    let totalTasks = 0;
    let completedTasks = 0;

    for (let i = 0; i < events.length; i++) {
      const e = events[i];
      totalBudget += e.budgetSummary.totalUserBudget;
      totalExpenses += e.budgetSummary.calculatedTotalExpenses;
      const tasks = e.tasks;
      for (let j = 0; j < tasks.length; j++) {
        totalTasks++;
        if (tasks[j].completed) completedTasks++;
      }
    }

    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      totalEvents: events.length,
      totalBudget,
      totalExpenses,
      totalTasks,
      completedTasks,
      completionRate,
    };
  }, [events]);

  // Upcoming priority deadlines across all events
  const upcomingTasks = useMemo(() => {
    const list: Array<{
      eventId: string;
      eventTitle: string;
      taskId: string;
      title: string;
      priority: string;
      timelineMarker: string;
      completed: boolean;
    }> = [];

    events.forEach((ev) => {
      ev.tasks.forEach((t) => {
        list.push({
          eventId: ev.id,
          eventTitle: ev.title,
          taskId: t.id,
          title: t.title,
          priority: t.priority,
          timelineMarker: t.timelineMarker,
          completed: t.completed,
        });
      });
    });

    // Return uncompleted high priority tasks first
    return list
      .sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        if (a.priority === "high" && b.priority !== "high") return -1;
        if (b.priority === "high" && a.priority !== "high") return 1;
        return 0;
      })
      .slice(0, 5);
  }, [events]);

  const getEventTypeBadge = (type: EventType) => {
    switch (type) {
      case "wedding":
        return <Badge variant="rose">Wedding</Badge>;
      case "birthday":
        return <Badge variant="violet">Birthday</Badge>;
      case "community":
        return <Badge variant="teal">Community</Badge>;
      default:
        return <Badge variant="secondary">Event</Badge>;
    }
  };

  const getDaysRemaining = (dateStr: string) => {
    const target = new Date(dateStr).getTime();
    const now = new Date().getTime();
    const diffDays = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return "Event passed";
    if (diffDays === 0) return "Today!";
    return `${diffDays} days away`;
  };

  return (
    <ProtectedRoute title="Planora AI Dashboard">
      <div className="min-h-screen flex flex-col bg-[#faf9f5]">
        <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs uppercase tracking-wider font-bold text-teal-700">
                Event Production Suite
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
              <span className="text-xs text-slate-500">Live Workspace</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Welcome to Planora Studio
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Track event budgets, milestone progress, and AI blueprints all in one place.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/create">
              <Button
                variant="teal"
                size="md"
                leftIcon={<Plus className="w-4 h-4" />}
                className="shadow-sm"
              >
                Create Event
              </Button>
            </Link>
          </div>
        </div>

        {/* Aggregate KPI Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white border-slate-200/80">
            <CardContent className="p-5">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Active Events</span>
                <Calendar className="w-4 h-4 text-teal-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900">{stats.totalEvents}</div>
              <div className="text-xs text-slate-500 mt-1">Weddings, birthdays & community</div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200/80">
            <CardContent className="p-5">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Budget Managed</span>
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {formatCurrency(stats.totalBudget, "USD")}
              </div>
              <div className="text-xs text-emerald-700 font-medium mt-1">
                Allocated: {formatCurrency(stats.totalExpenses, "USD")}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200/80">
            <CardContent className="p-5">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Task Completion</span>
                <CheckCircle2 className="w-4 h-4 text-violet-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900">{stats.completionRate}%</div>
              <div className="text-xs text-slate-500 mt-1">
                {stats.completedTasks} of {stats.totalTasks} tasks done
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200/80">
            <CardContent className="p-5">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Engine Status</span>
                <Sparkles className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-bold text-slate-900">Active</div>
              <div className="text-xs text-slate-500 mt-1">Gemini AI Engine + TypeScript math</div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Bar & Event Section */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
          <div role="tablist" aria-label="Event category filters" className="flex items-center gap-1.5 sm:gap-2">
            <Filter className="w-4 h-4 text-slate-400 mr-1 hidden sm:block" />
            {[
              { id: "all", label: "All Events" },
              { id: "wedding", label: "Weddings" },
              { id: "birthday", label: "Birthdays" },
              { id: "community", label: "Community" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={filterType === tab.id}
                onClick={() => setFilterType(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  filterType === tab.id
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-200/60"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <span className="text-xs text-slate-500">
            Showing {filteredEvents.length} {filteredEvents.length === 1 ? "event" : "events"}
          </span>
        </div>

        {/* Main Grid: Events on left, Tasks & Activities on right */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Events List (2 Cols) */}
          <div className="lg:col-span-2 space-y-4">
            {filteredEvents.length === 0 ? (
              <EmptyState
                title="No events found"
                description="There are no events matching your filter. Create a new event or clear the filter."
                actionLabel="Create New Event"
                onAction={() => router.push("/create")}
              />
            ) : (
              filteredEvents.map((ev) => {
                const completedCount = ev.tasks.filter((t) => t.completed).length;
                const taskPercent =
                  ev.tasks.length > 0
                    ? Math.round((completedCount / ev.tasks.length) * 100)
                    : 0;
                const budgetPercent =
                  ev.budgetSummary.totalUserBudget > 0
                    ? Math.round(
                        (ev.budgetSummary.calculatedTotalExpenses /
                          ev.budgetSummary.totalUserBudget) *
                          100
                      )
                    : 0;

                return (
                  <Card
                    key={ev.id}
                    className="overflow-hidden border border-slate-200/90 hover:border-slate-300 transition-all hover:shadow-md"
                  >
                    <CardContent className="p-6">
                      {/* Header Row */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            {getEventTypeBadge(ev.input.eventType)}
                            <span className="text-xs font-medium text-slate-500">
                              {getDaysRemaining(ev.input.eventDate)}
                            </span>
                          </div>
                          <Link
                            href={`/events/${ev.id}`}
                            className="text-lg font-bold text-slate-900 hover:text-teal-700 transition-colors inline-flex items-center gap-1 group"
                          >
                            <span>{ev.title}</span>
                            <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-teal-600" />
                          </Link>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                            {ev.visionSummary}
                          </p>
                        </div>

                        <Link href={`/events/${ev.id}`} className="shrink-0">
                          <Button variant="outline" size="sm" rightIcon={<ChevronRight className="w-3.5 h-3.5" />}>
                            Workspace
                          </Button>
                        </Link>
                      </div>

                      {/* Event Details Ribbon */}
                      <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-100 text-xs text-slate-600 mb-4">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{formatDate(ev.input.eventDate)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{ev.input.location}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{ev.input.guestCount} guests</span>
                        </div>
                      </div>

                      {/* Budget and Tasks Dual Progress */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Budget Status */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500">Budget Allocated</span>
                            <span className="font-semibold text-slate-800">
                              {formatCurrency(
                                ev.budgetSummary.calculatedTotalExpenses,
                                ev.budgetSummary.currency
                              )}{" "}
                              /{" "}
                              {formatCurrency(
                                ev.budgetSummary.totalUserBudget,
                                ev.budgetSummary.currency
                              )}
                            </span>
                          </div>
                          <ProgressBar
                            value={budgetPercent}
                            variant={ev.budgetSummary.isOverBudget ? "rose" : "teal"}
                          />
                          {ev.budgetSummary.isOverBudget && (
                            <div className="flex items-center gap-1 text-[11px] text-rose-600 font-medium">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Over budget by ${ev.budgetSummary.overBudgetAmount.toLocaleString()}</span>
                            </div>
                          )}
                        </div>

                        {/* Task Status */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500">Tasks Checklist</span>
                            <span className="font-semibold text-slate-800">
                              {completedCount} of {ev.tasks.length} ({taskPercent}%)
                            </span>
                          </div>
                          <ProgressBar value={taskPercent} variant="violet" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {/* Sidebar (1 Col): Priority Deadlines & Tips */}
          <div className="space-y-6">
            {/* Actionable Deadlines with live interactive checkmark toggle */}
            <Card className="border-slate-200/90 bg-white">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-teal-600" />
                    <span>Upcoming Deadlines</span>
                  </CardTitle>
                  <span className="text-[11px] text-slate-400">Click to complete</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {upcomingTasks.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">No pending tasks found.</p>
                ) : (
                  upcomingTasks.map((task) => (
                    <div
                      key={task.taskId}
                      onClick={() => toggleTask(task.eventId, task.taskId)}
                      className={`flex items-start gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
                        task.completed
                          ? "bg-slate-50/60 border-slate-100 text-slate-400"
                          : "bg-white border-slate-200/80 hover:border-teal-300 text-slate-800 hover:shadow-sm"
                      }`}
                    >
                      <button
                        type="button"
                        aria-label={task.completed ? `Mark "${task.title}" as incomplete` : `Mark "${task.title}" as complete`}
                        className="mt-0.5 text-teal-600 shrink-0"
                      >
                        {task.completed ? (
                          <CheckSquare className="w-4 h-4 text-teal-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-xs font-semibold line-clamp-1 ${
                            task.completed ? "line-through text-slate-400" : "text-slate-900"
                          }`}
                        >
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                          <span className="truncate max-w-[120px] font-medium">{task.eventTitle}</span>
                          <span>•</span>
                          <span>{task.timelineMarker}</span>
                        </div>
                      </div>
                      {task.priority === "high" && !task.completed && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-200 shrink-0">
                          High
                        </span>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Quick AI Pro-Tip Box */}
            <div className="rounded-2xl border border-teal-200/80 bg-gradient-to-br from-teal-50/60 via-white to-violet-50/30 p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-teal-800 font-bold text-xs uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-teal-600" />
                <span>Deterministic Safety</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                All financial figures and category percentages on this dashboard are calculated by Planora&apos;s verified TypeScript mathematical engine, ensuring your budget totals never hallucinate.
              </p>
              <Link href="/create">
                <Button variant="teal" size="sm" className="w-full text-xs">
                  Generate New Plan with Gemini
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
    </ProtectedRoute>
  );
}
