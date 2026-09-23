"use client";

import React, { useEffect, useState } from "react";
import { TrendingUp, BarChart2, Activity, Map, Search as SearchIcon, Eye, MousePointerClick, Navigation } from "lucide-react";
import { useGmb } from "@/context/GmbContext";

export default function AnalyticsPage() {
  const { selectedLocation } = useGmb();
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  useEffect(() => {
    if (selectedLocation) {
      setIsLoading(true);
      setErrorStatus(null);
      fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/gmb/dashboard-data`, {
        credentials: "include",
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" }
      })
        .then(res => res.json())
        .then(data => {
          if (data.performance?.status === "CONNECTED") {
            setPerformanceData(data.performance.metrics || {});
          } else {
            setErrorStatus(data.performance?.status || "API_ERROR");
            setPerformanceData(null);
          }
        })
        .catch(err => {
          console.error(err);
          setErrorStatus("API_ERROR");
        })
        .finally(() => setIsLoading(false));
    }
  }, [selectedLocation]);

  // Aggregate metrics safely
  const getMetricTotal = (metricName: string) => {
    if (!performanceData?.multiDailyMetricTimeSeries) return 0;
    const series = performanceData.multiDailyMetricTimeSeries.find((s: any) => 
      s.dailyMetricTimeSeries?.some((ts: any) => ts.dailyMetric === metricName)
    );
    if (!series) return 0;
    const timeSeries = series.dailyMetricTimeSeries.find((ts: any) => ts.dailyMetric === metricName);
    if (!timeSeries?.timeSeries?.datedValues) return 0;
    return timeSeries.timeSeries.datedValues.reduce((sum: number, val: any) => sum + (parseInt(val.value) || 0), 0);
  };

  const desktopMaps = getMetricTotal("BUSINESS_IMPRESSIONS_DESKTOP_MAPS");
  const mobileMaps = getMetricTotal("BUSINESS_IMPRESSIONS_MOBILE_MAPS");
  const desktopSearch = getMetricTotal("BUSINESS_IMPRESSIONS_DESKTOP_SEARCH");
  const mobileSearch = getMetricTotal("BUSINESS_IMPRESSIONS_MOBILE_SEARCH");
  const conversations = getMetricTotal("BUSINESS_CONVERSATIONS");
  const directionRequests = getMetricTotal("BUSINESS_DIRECTION_REQUESTS");
  const websiteClicks = getMetricTotal("WEBSITE_CLICKS");

  const totalImpressions = desktopMaps + mobileMaps + desktopSearch + mobileSearch;
  const totalInteractions = conversations + directionRequests + websiteClicks;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Performance & Analytics</h1>
          <p className="text-xs text-slate-500">Real-time data directly from your Google Business Profile (Last 30 Days).</p>
        </div>
      </div>

      {errorStatus ? (
        <div className="p-8 text-center text-rose-500 bg-rose-50 rounded-xl border border-rose-100">
          Google Performance API is unavailable or disabled. Status: {errorStatus}
        </div>
      ) : isLoading ? (
        <div className="p-8 text-center text-slate-400">Loading performance metrics...</div>
      ) : (
        <div className="space-y-6">
          {/* Top level KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard title="Total Impressions" value={totalImpressions.toLocaleString()} icon={<Eye className="w-5 h-5 text-indigo-500" />} />
            <MetricCard title="Total Interactions" value={totalInteractions.toLocaleString()} icon={<MousePointerClick className="w-5 h-5 text-emerald-500" />} />
            <MetricCard title="Website Clicks" value={websiteClicks.toLocaleString()} icon={<Activity className="w-5 h-5 text-blue-500" />} />
            <MetricCard title="Direction Requests" value={directionRequests.toLocaleString()} icon={<Navigation className="w-5 h-5 text-amber-500" />} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Impressions Breakdown */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><BarChart2 className="w-5 h-5" /> Impressions Breakdown</h2>
              <div className="space-y-4">
                <BreakdownItem label="Desktop Maps" value={desktopMaps} total={totalImpressions} icon={<Map className="w-4 h-4 text-slate-400" />} />
                <BreakdownItem label="Mobile Maps" value={mobileMaps} total={totalImpressions} icon={<Map className="w-4 h-4 text-slate-400" />} />
                <BreakdownItem label="Desktop Search" value={desktopSearch} total={totalImpressions} icon={<SearchIcon className="w-4 h-4 text-slate-400" />} />
                <BreakdownItem label="Mobile Search" value={mobileSearch} total={totalImpressions} icon={<SearchIcon className="w-4 h-4 text-slate-400" />} />
              </div>
            </div>

            {/* Keyword Rankings notice */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col items-center justify-center text-center space-y-4">
              <TrendingUp className="w-12 h-12 text-slate-200" />
              <div>
                <h2 className="text-lg font-bold text-slate-800">Local Keyword Rankings</h2>
                <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
                  Keyword ranking positions are <strong>not supported by the official Google Business Profile API</strong>. 
                  We do not display fake or estimated rankings.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ title, value, icon }: { title: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</h3>
        {icon}
      </div>
      <div className="text-3xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

function BreakdownItem({ label, value, total, icon }: { label: string; value: number; total: number; icon: React.ReactNode }) {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="flex items-center gap-2 font-medium text-slate-700">{icon} {label}</span>
        <span className="text-slate-900 font-bold">{value.toLocaleString()} <span className="text-slate-400 font-normal text-xs">({percentage}%)</span></span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
        <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${percentage}%` }}></div>
      </div>
    </div>
  );
}
