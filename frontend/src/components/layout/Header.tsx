"use client";

import { useState } from "react";
import { Search, Bell, Sparkles, Building2, ChevronDown, Plus, User as UserIcon, LogOut, RefreshCw } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useGmb } from "@/context/GmbContext";
import LocationSelectModal from "../LocationSelectModal";

export const Header = () => {
  const { user, logout } = useAuth();
  const { connected, selectedLocation, fetchAccounts } = useGmb();
  const [showMenu, setShowMenu] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      const parts = name.split(" ");
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return name.substring(0, 2).toUpperCase();
    }
    if (email) return email.substring(0, 2).toUpperCase();
    return "US";
  };

  const handleOpenSwitchLocation = async () => {
    await fetchAccounts();
    setShowLocationModal(true);
  };

  return (
    <>
      <header className="h-16 px-8 flex items-center justify-between relative z-20 pt-4 pb-2">
        {/* Floating Light Search Pill */}
        <div className="flex-1 max-w-md">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5" />
            <input 
              type="text" 
              placeholder="Search keywords, posts, or reviews..."
              className="w-full bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-full pl-10 pr-4 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 shadow-sm transition-all"
            />
          </div>
        </div>

        {/* Right Floating Actions & Controls */}
        <div className="flex items-center gap-4">
          {/* Current Business Location & Switch Location Dropdown */}
          {connected && (
            <button
              onClick={handleOpenSwitchLocation}
              className="hidden sm:flex items-center gap-2 bg-white/90 backdrop-blur-md border border-slate-200/80 px-3.5 py-1.5 rounded-full shadow-sm text-xs font-semibold text-slate-700 hover:text-indigo-600 hover:border-indigo-300 transition-colors cursor-pointer"
              title="Switch Google Business Location"
            >
              <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="max-w-[180px] truncate font-bold text-slate-900">
                {selectedLocation?.location_name || "Select Business Location"}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>
          )}

          {/* Quick Action Button */}
          <button className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-sm shadow-indigo-600/20 transition-all cursor-pointer">
            <Plus className="w-3.5 h-3.5" />
            <span>Create Post</span>
          </button>

          {/* Notifications */}
          <button className="p-2 rounded-full bg-white/90 backdrop-blur-md border border-slate-200/80 text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-sm transition-all relative cursor-pointer">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-indigo-600 rounded-full border border-white" />
          </button>

          {/* Profile Avatar & Menu */}
          <div className="relative">
            <button 
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-2 bg-white/90 border border-slate-200/80 rounded-full p-1 pr-3 shadow-sm hover:bg-slate-50 transition-all cursor-pointer"
            >
              {user?.avatar_url ? (
                <img 
                  src={user.avatar_url} 
                  alt={user.full_name || "Profile"} 
                  className="w-8 h-8 rounded-full object-cover border border-slate-200" 
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-inner">
                  {getInitials(user?.full_name, user?.email)}
                </div>
              )}
              <span className="text-xs font-bold text-slate-800 hidden md:block max-w-[120px] truncate">
                {user?.full_name || user?.email || "Account"}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* User Dropdown Menu */}
            {showMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-lg p-2 space-y-1 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-900 truncate">{user?.full_name || "BuzzSpire User"}</p>
                  <p className="text-[11px] text-slate-500 truncate">{user?.email || "No email"}</p>
                </div>

                <button 
                  onClick={logout}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Location Selector Modal */}
      <LocationSelectModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
      />
    </>
  );
};
