"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  MessageSquareText, 
  Bot, 
  ChevronDown, 
  Building2,
  TrendingUp,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  QrCode,
  Search,
  Sparkles,
  Calendar,
  Layers,
  BarChart2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useGmb } from "@/context/GmbContext";

interface NavItem {
  href: string;
  label: string;
  icon: any;
  color: string;
  bg: string;
  badge?: string;
  count?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Overview",
    items: [
      { href: "/dashboard", label: "Business Overview", icon: LayoutDashboard, color: "text-indigo-600", bg: "bg-indigo-50" },
      { href: "/analytics", label: "Local Rankings", icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50", badge: "Live" }
    ]
  },
  {
    title: "Reputation & Content",
    items: [
      { href: "/reviews", label: "Recent Reviews", icon: MessageSquareText, color: "text-amber-600", bg: "bg-amber-50", count: "3" },
      { href: "/posts", label: "Google Posts", icon: FileText, color: "text-blue-600", bg: "bg-blue-50" },
      { href: "/social", label: "Social Media", icon: Layers, color: "text-purple-600", bg: "bg-purple-50" }
    ]
  },
  {
    title: "Growth & Tools",
    items: [
      { href: "/qr", label: "Magic QR Generator", icon: QrCode, color: "text-pink-600", bg: "bg-pink-50" },
      { href: "/agents", label: "AI Control Center", icon: Bot, color: "text-indigo-600", bg: "bg-indigo-50" }
    ]
  }
];

export const Sidebar = () => {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { connected, locations, selectedLocation } = useGmb();

  const businessName = connected 
    ? (selectedLocation?.location_name || "Select Business") 
    : "No Business Connected";
  
  const locationsCountText = connected 
    ? `${locations?.length || 0} Google Location${locations?.length !== 1 ? 's' : ''}`
    : "0 Google Locations";

  return (
    <aside 
      className={cn(
        "h-full bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-2xl shadow-sm flex flex-col transition-all duration-300 relative z-30 select-none",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Brand & Business Switcher Header */}
      <div className="p-3.5 border-b border-slate-100">
        <div className={cn(
          "flex items-center gap-3 p-2 rounded-xl bg-slate-50 border border-slate-200/60 hover:bg-slate-100/80 transition-colors cursor-pointer",
          collapsed && "justify-center px-0"
        )}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white shrink-0 font-bold text-xs shadow-sm">
            <Building2 className="w-4 h-4" />
          </div>
          
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-slate-900 truncate">{businessName}</div>
              <div className="text-[11px] font-medium text-slate-500 truncate">{locationsCountText}</div>
            </div>
          )}

          {!collapsed && <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 custom-scrollbar">
        {NAV_SECTIONS.map((section, sIdx) => (
          <div key={sIdx}>
            {!collapsed && (
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2.5 mb-2">
                {section.title}
              </div>
            )}
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href}>
                    <div className={cn(
                      "flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-xs font-medium transition-all group relative cursor-pointer",
                      isActive 
                        ? "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white font-semibold shadow-sm" 
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80",
                      collapsed && "justify-center px-0 py-2.5"
                    )}>
                      {/* Colorful Icon Badge */}
                      <div className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                        isActive ? "bg-white/20 text-white" : `${item.bg} ${item.color}`
                      )}>
                        <item.icon className="w-4 h-4" />
                      </div>
                      
                      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                      
                      {!collapsed && item.count && (
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold",
                          isActive ? "bg-white/20 text-white" : "bg-amber-100 text-amber-700"
                        )}>
                          {item.count}
                        </span>
                      )}

                      {!collapsed && item.badge && (
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold",
                          isActive ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-700"
                        )}>
                          {item.badge}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Settings & Collapse Toggle */}
      <div className="p-3 border-t border-slate-100 space-y-1">
        <Link href="/settings">
          <div className={cn(
            "flex items-center gap-3 px-2.5 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-colors cursor-pointer",
            collapsed && "justify-center px-0"
          )}>
            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
              <Settings className="w-4 h-4" />
            </div>
            {!collapsed && <span>Settings & Billing</span>}
          </div>
        </Link>

        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-between p-2 rounded-xl text-xs text-slate-400 hover:text-slate-600 hover:bg-slate-100/80 transition-colors"
        >
          {!collapsed && <span className="text-[11px] font-medium">Collapse menu</span>}
          {collapsed ? <ChevronRight className="w-4 h-4 mx-auto" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
};
