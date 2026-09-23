"use client";

import { useState, useEffect } from "react";
import { useGmb } from "@/context/GmbContext";
import LocationSelectModal from "@/components/LocationSelectModal";
import { 
  Building2, 
  Mail, 
  RefreshCw, 
  LogOut, 
  MapPin, 
  ShieldCheck, 
  Clock, 
  Sparkles, 
  UserCheck, 
  Sliders, 
  ArrowRight 
} from "lucide-react";

export default function SettingsPage() {
  const { 
    connected, 
    connectedEmail, 
    expiresAt, 
    selectedAccount, 
    selectedLocation, 
    fetchAccounts, 
    disconnectGoogle,
    connect,
    loading 
  } = useGmb();

  const [showLocationModal, setShowLocationModal] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  useEffect(() => {
    if (connected) {
      fetchAccounts();
    }
  }, [connected, fetchAccounts]);

  const handleRefreshAccounts = async () => {
    setIsRefreshing(true);
    await fetchAccounts();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const handleChangeLocation = async () => {
    await fetchAccounts();
    setShowLocationModal(true);
  };

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header Banner */}
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
          <Sliders className="w-7 h-7 text-indigo-600" />
          <span>Account & Integration Settings</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Manage your connected Google Business account, location selections, and security credentials.
        </p>
      </div>

      {/* MILESTONE 2: CONNECTED GOOGLE ACCOUNT SECTION */}
      <section className="surface-card p-6 sm:p-8 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Connected Google Account</h2>
              <p className="text-xs text-slate-500">
                Official Google Business Profile OAuth 2.0 connection details
              </p>
            </div>
          </div>

          {connected ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Connected & Active</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs font-bold text-amber-700">
              <span>Disconnected</span>
            </span>
          )}
        </div>

        {connected ? (
          <div className="space-y-6">
            {/* Connection Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                  Connected Email
                </span>
                <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-indigo-600" />
                  <span>{connectedEmail || "owner.google@buzzspire.com"}</span>
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                  Google Account
                </span>
                <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  <span>{selectedAccount?.accountName || "No Account Selected"}</span>
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                  Connected Business
                </span>
                <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>{selectedLocation?.location_name || "No Business Selected"}</span>
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                  Selected Location
                </span>
                <p className="text-sm font-bold text-slate-900 flex items-center gap-2 truncate">
                  <MapPin className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="truncate">{selectedLocation?.address || "No Address Available"}</span>
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1 md:col-span-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                  Last Sync
                </span>
                <p className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span>
                    {selectedLocation?.updated_at 
                      ? new Date(selectedLocation.updated_at).toLocaleString() 
                      : "Synchronized with Google APIs"}
                  </span>
                </p>
              </div>
            </div>

            {/* Milestone 2 Requirement Buttons */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                onClick={handleRefreshAccounts}
                disabled={isRefreshing}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs px-4 py-2.5 rounded-xl border border-indigo-200 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
                <span>Refresh Accounts</span>
              </button>

              <button
                onClick={handleChangeLocation}
                className="bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs px-4 py-2.5 rounded-xl border border-slate-200 shadow-xs transition-all flex items-center gap-2 cursor-pointer"
              >
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>Change Location</span>
              </button>

              <button
                onClick={disconnectGoogle}
                className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs px-4 py-2.5 rounded-xl border border-rose-200 transition-all flex items-center gap-2 cursor-pointer ml-auto"
              >
                <LogOut className="w-4 h-4" />
                <span>Disconnect Google</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center space-y-4">
            <p className="text-xs text-slate-500">
              No Google Business Profile account connected. Connect your official Google account to enable location management.
            </p>
            <button
              onClick={connect}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 mx-auto cursor-pointer"
            >
              <span>Connect Google Account</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </section>

      {/* Location Select Modal */}
      <LocationSelectModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
      />
    </div>
  );
}
