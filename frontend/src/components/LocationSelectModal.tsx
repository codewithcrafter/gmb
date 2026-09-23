"use client";

import React from "react";
import { useGmb, BusinessLocationItem } from "@/context/GmbContext";
import { Building2, MapPin, CheckCircle2, ShieldCheck, ArrowRight, X, RefreshCw } from "lucide-react";

interface LocationSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LocationSelectModal({ isOpen, onClose }: LocationSelectModalProps) {
  const { locations, selectedAccount, selectLocation, loadingLocations } = useGmb();

  if (!isOpen) return null;

  const handleSelect = async (loc: BusinessLocationItem) => {
    if (!selectedAccount) return;
    await selectLocation({
      account_id: selectedAccount.accountId,
      location_id: loc.locationId,
      location_name: loc.businessName,
      address: loc.address,
      primary_category: loc.primaryCategory,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Select Your Business Location</h2>
              <p className="text-xs text-slate-500">
                Choose the Google Business location you want to manage
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-200/60 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content / Locations List */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          {loadingLocations ? (
            <div className="py-12 text-center space-y-3">
              <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-medium">Loading Google Business locations...</p>
            </div>
          ) : locations.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center mx-auto">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">No Business Locations Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No verified Google Business Profile locations were detected under this account.
              </p>
            </div>
          ) : (
            locations.map((loc) => (
              <div
                key={loc.locationId}
                className="p-4 rounded-2xl border border-slate-200/80 hover:border-indigo-400 bg-white hover:bg-indigo-50/20 transition-all flex items-start justify-between gap-4 group"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {loc.businessName}
                    </h3>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-bold text-emerald-700">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      <span>{loc.verificationState || "Verified"}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{loc.address}</span>
                  </div>

                  {loc.primaryCategory && (
                    <span className="inline-block text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                      {loc.primaryCategory}
                    </span>
                  )}
                </div>

                <button
                  onClick={() => handleSelect(loc)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5 shrink-0 self-center cursor-pointer"
                >
                  <span>Select</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
