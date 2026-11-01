"use client";

import React from "react";
import { Percent, Plus, Search, Pencil, Trash2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";
import { ValidatedPlan, ExpenseItem } from "@/schemas/event";

interface BudgetTabProps {
  plan: ValidatedPlan;
  expenseSearch: string;
  setExpenseSearch: (query: string) => void;
  filteredExpenses: ExpenseItem[];
  onOptimizeBudget: () => void;
  onOpenAddExpenseModal: () => void;
  onOpenEditExpenseModal: (exp: ExpenseItem) => void;
  onRemoveExpenseItem: (planId: string, expenseId: string) => void;
}

export const BudgetTab = React.memo(function BudgetTab({
  plan,
  expenseSearch,
  setExpenseSearch,
  filteredExpenses,
  onOptimizeBudget,
  onOpenAddExpenseModal,
  onOpenEditExpenseModal,
  onRemoveExpenseItem,
}: BudgetTabProps) {
  return (
    <div className="space-y-6">
      {/* Top KPI Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border-slate-200/80 p-4">
          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block mb-1">
            Total Budget
          </span>
          <div className="text-xl font-extrabold text-slate-900">
            {formatCurrency(
              plan.budgetSummary.totalUserBudget,
              plan.budgetSummary.currency
            )}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Target client budget
          </div>
        </Card>

        <Card className="bg-white border-slate-200/80 p-4">
          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block mb-1">
            Calculated Expenses
          </span>
          <div className="text-xl font-extrabold text-slate-900">
            {formatCurrency(
              plan.budgetSummary.calculatedTotalExpenses,
              plan.budgetSummary.currency
            )}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Sum of all {plan.expenses.length} itemized costs
          </div>
        </Card>

        <Card
          className={`p-4 border ${
            plan.budgetSummary.isOverBudget
              ? "bg-rose-50/50 border-rose-200/80"
              : "bg-teal-50/40 border-teal-200/80"
          }`}
        >
          <span className="text-xs text-slate-600 font-semibold uppercase tracking-wider block mb-1">
            {plan.budgetSummary.isOverBudget
              ? "Budget Overrun"
              : "Remaining Reserve"}
          </span>
          <div
            className={`text-xl font-extrabold ${
              plan.budgetSummary.isOverBudget
                ? "text-rose-700"
                : "text-teal-800"
            }`}
          >
            {formatCurrency(
              Math.abs(plan.budgetSummary.remainingBudget),
              plan.budgetSummary.currency
            )}
          </div>
          <div className="text-[11px] mt-1 font-medium">
            {plan.budgetSummary.isOverBudget ? (
              <span className="text-rose-600">
                Over budget by {formatCurrency(plan.budgetSummary.overBudgetAmount, plan.budgetSummary.currency)}
              </span>
            ) : (
              <span className="text-teal-700">
                Unallocated contingency reserve
              </span>
            )}
          </div>
        </Card>

        <Card className="bg-white border-slate-200/80 p-4">
          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block mb-1">
            Cost Per Guest
          </span>
          <div className="text-xl font-extrabold text-slate-900">
            {formatCurrency(
              plan.budgetSummary.costPerGuest,
              plan.budgetSummary.currency
            )}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Based on {plan.input.guestCount} invited guests
          </div>
        </Card>
      </div>

      {/* Quick Actions Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
        <div className="text-xs text-slate-600">
          Deterministic calculation verified at{" "}
          <span className="font-mono text-slate-800">
            {new Date(plan.budgetSummary.verifiedTimestamp).toLocaleTimeString()}
          </span>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={onOptimizeBudget}
            leftIcon={<Percent className="w-3.5 h-3.5 text-teal-600" />}
          >
            Optimize Budget (-10%)
          </Button>
          <Button
            variant="teal"
            size="sm"
            onClick={onOpenAddExpenseModal}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Add Line Item
          </Button>
        </div>
      </div>

      {/* Category Allocations Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {plan.categoryBudgets.map((cat, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-bold text-slate-900">{cat.category}</span>
              <span className="font-semibold text-slate-700">
                {formatCurrency(cat.allocatedAmount, plan.budgetSummary.currency)}
              </span>
            </div>
            <ProgressBar value={cat.percentage} variant="teal" />
            <div className="flex justify-between text-[11px] text-slate-500 mt-1.5">
              <span>{cat.percentage}% of total</span>
              <span className="truncate max-w-[150px]">{cat.notes}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Itemized Expenses Table */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle>Itemized Expense Estimates</CardTitle>
            <CardDescription>
              All values verified with non-negative constraints. Click edit to adjust figures.
            </CardDescription>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search expenses..."
              value={expenseSearch}
              onChange={(e) => setExpenseSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-y border-slate-200 bg-slate-50/70 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Item Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4 text-right">Estimated Cost</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-bold text-slate-900 block">{exp.itemName}</span>
                    <span className="text-[11px] text-slate-500">{exp.rationale}</span>
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-700">{exp.category}</td>
                  <td className="py-3 px-4">
                    <Badge
                      variant={
                        exp.priority === "must-have"
                          ? "rose"
                          : exp.priority === "nice-to-have"
                          ? "violet"
                          : "secondary"
                      }
                      size="sm"
                    >
                      {exp.priority}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900">
                    {formatCurrency(exp.estimatedCost, plan.budgetSummary.currency)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => onOpenEditExpenseModal(exp)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-slate-100 transition-colors"
                        title="Edit line item"
                        aria-label={`Edit ${exp.itemName}`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveExpenseItem(plan.id, exp.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors"
                        title="Remove line item"
                        aria-label={`Remove ${exp.itemName}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Mandatory Estimate Disclaimer */}
      <div className="p-4 rounded-xl bg-slate-100/70 text-xs text-slate-500 leading-relaxed">
        <strong>Advisory Note:</strong> {plan.budgetSummary.disclaimer}
      </div>
    </div>
  );
});

