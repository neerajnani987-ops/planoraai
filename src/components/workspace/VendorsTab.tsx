"use client";

import React from "react";
import { Search, Plus, Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";
import { ValidatedPlan, VendorItem } from "@/schemas/event";

interface VendorsTabProps {
  plan: ValidatedPlan;
  vendorSearch: string;
  setVendorSearch: (query: string) => void;
  filteredVendors: VendorItem[];
  onOpenAddVendorModal: () => void;
  onOpenEditVendorModal: (vendor: VendorItem) => void;
  onRemoveVendor: (planId: string, vendorId: string) => void;
}

export const VendorsTab = React.memo(function VendorsTab({
  plan,
  vendorSearch,
  setVendorSearch,
  filteredVendors,
  onOpenAddVendorModal,
  onOpenEditVendorModal,
  onRemoveVendor,
}: VendorsTabProps) {
  return (
    <div className="space-y-6">
      {/* Top Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
        <div className="text-xs text-slate-600">
          Managing <span className="font-bold text-slate-900">{plan.vendors.length}</span> key vendor categories for this event.
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search vendors..."
              value={vendorSearch}
              onChange={(e) => setVendorSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>
          <Button
            variant="teal"
            size="sm"
            onClick={onOpenAddVendorModal}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Add Vendor
          </Button>
        </div>
      </div>

      {/* Vendor Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredVendors.length === 0 ? (
          <div className="col-span-full py-12 text-center text-xs text-slate-500">
            No vendors found matching your search.
          </div>
        ) : (
          filteredVendors.map((ven) => (
            <Card key={ven.id} className="p-6 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Badge variant="secondary" size="sm" className="mb-1">
                    {ven.category}
                  </Badge>
                  <h4 className="text-base font-bold text-slate-900">{ven.serviceType}</h4>
                  <span className="text-xs text-slate-500">
                    Window: {ven.recommendedBookingWindow}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-slate-900 block">
                    {formatCurrency(ven.estimatedCost, plan.budgetSummary.currency)}
                  </span>
                  <div className="mt-1 flex items-center justify-end gap-1.5">
                    <Badge
                      variant={
                        ven.status === "booked"
                          ? "teal"
                          : ven.status === "contacted"
                          ? "violet"
                          : "outline"
                      }
                      size="sm"
                    >
                      {ven.status}
                    </Badge>
                    <button
                      type="button"
                      onClick={() => onOpenEditVendorModal(ven)}
                      className="p-1 rounded text-slate-400 hover:text-teal-600 hover:bg-slate-100 transition-colors"
                      title="Edit vendor"
                      aria-label={`Edit vendor ${ven.serviceType}`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveVendor(plan.id, ven.id)}
                      className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors"
                      title="Remove vendor"
                      aria-label={`Delete vendor ${ven.serviceType}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 text-xs space-y-2">
                <span className="font-bold text-slate-700 block">Key Questions to Ask:</span>
                <ul className="list-disc list-inside space-y-1 text-slate-600">
                  {ven.keyQuestionsToAsk.map((q, idx) => (
                    <li key={idx}>{q}</li>
                  ))}
                </ul>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
});
