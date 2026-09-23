"use client";
import { motion } from "framer-motion";
import {
  Star,
  TrendingUp,
  Plus,
  MessageSquare,
  QrCode,
  Calendar as CalendarIcon,
  MapPin,
  Building2,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Share2,
  Search,
  ArrowUpRight,
  Download,
  Sparkles,
  Check,
  X,
  RefreshCw,
  Sliders,
  ExternalLink,
  ChevronRight,
  Eye,
  ThumbsUp,
  BarChart3,
  Globe,
  Clock,
  MessageCircle,
  Send
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useGmb } from "@/context/GmbContext";
import ConnectGmbCard from "@/components/ConnectGmbCard";
import LocationSelectModal from "@/components/LocationSelectModal";

export default function DashboardPage() {
  const [qrFormat, setQrFormat] = useState<"PNG" | "SVG" | "PDF">("PNG");
  const [postsTab, setPostsTab] = useState<"published" | "scheduled" | "drafts">("scheduled");
  const [showLocationModal, setShowLocationModal] = useState<boolean>(false);

  const { connected, selectedLocation, locations, fetchAccounts } = useGmb();

  useEffect(() => {
    if (connected && !selectedLocation) {
      fetchAccounts().then((accs) => {
        if (accs.length > 0) {
          setShowLocationModal(true);
        }
      });
    }
  }, [connected, selectedLocation, fetchAccounts]);


  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (selectedLocation) {
      setLoadingData(true);
      fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/gmb/dashboard-data`, {
        credentials: "include",
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" }
      })
      .then(res => res.json())
      .then(data => setDashboardData(data))
      .catch(err => console.error(err))
      .finally(() => setLoadingData(false));
    }
  }, [selectedLocation]);

  const metrics = dashboardData ? {
    average_rating: dashboardData.reviews?.status === "error" ? "Unavailable" : (dashboardData.reviews?.average_rating !== undefined && dashboardData.reviews?.average_rating !== null ? Number(dashboardData.reviews.average_rating).toFixed(1) : "N/A"),
    total_reviews: dashboardData.reviews?.status === "error" ? "Unavailable" : (dashboardData.reviews?.total || 0),
    visibility_score: dashboardData.visibility?.score || "Visibility data unavailable",
    rank_position: dashboardData.rank?.position || "Rank data unavailable",
    reviews_status: dashboardData.reviews?.status,
    reviews_error: dashboardData.reviews?.message,
    posts_status: dashboardData.posts?.status,
    posts_error: dashboardData.posts?.message,
    performance_status: dashboardData.performance?.status,
    performance_error: dashboardData.performance?.message
  } : {
    average_rating: "...",
    total_reviews: "...",
    visibility_score: "...",
    rank_position: "...",
    reviews_status: "",
    reviews_error: "",
    posts_status: "",
    posts_error: "",
    performance_status: "",
    performance_error: ""
  };

  const reviewsList = dashboardData?.reviews?.recent || [];
  const postsList = dashboardData?.posts?.data || [];

  const checklistItems = [
    { item: "NAP Consistency (Name, Address, Phone)", status: "Complete", done: true },
    { item: "Upload 5 New Interior Photos", status: "Complete", done: true },
    { item: "Add Service Categories", status: "Complete", done: true },
    { item: "Google Business Description Optimization", status: "Complete", done: true }
  ];

  return (
    <div className="space-y-8">

      {/* GOOGLE BUSINESS PROFILE CONNECTION CARD */}
      <ConnectGmbCard />

      {/* SECTION 1: BUSINESS HEALTH OVERVIEW HERO BANNER */}
      <section className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 rounded-3xl p-8 text-white shadow-lg shadow-indigo-600/10 relative overflow-hidden">
        {/* Abstract Background Shapes */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-4 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-sm font-medium text-white backdrop-blur-md">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Business: {dashboardData?.businessName || selectedLocation?.location_name || "Buzzspire Media PVT.LTD"}</span>
              </div>
              <div className="w-px h-4 bg-white/30" />
              <div>Locations: {dashboardData?.locationCount || 1}</div>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Business Health Overview
            </h1>

            <p className="text-indigo-100 text-sm leading-relaxed font-normal">
              Your overall Google Business visibility for <strong className="text-white font-bold">{selectedLocation?.location_name || "your locations"}</strong> is operating at <strong className="text-white font-bold">{metrics.visibility_score} peak health</strong>.
              Review velocity increased with an average {metrics.average_rating} star rating.
            </p>
          </div>


          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15">
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-indigo-200 uppercase tracking-wider block">Average Rating</span>
              <div className="flex items-center gap-1">
                <span className="text-2xl font-bold">{metrics.average_rating}</span>
                <Star className="w-4 h-4 fill-amber-300 text-amber-300" />
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-medium text-indigo-200 uppercase tracking-wider block">Total Reviews</span>
              <span className="text-2xl font-bold">{metrics.total_reviews}</span>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-medium text-indigo-200 uppercase tracking-wider block">Visibility Score</span>
              <span className="text-2xl font-bold text-emerald-300">{metrics.visibility_score}</span>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-medium text-indigo-200 uppercase tracking-wider block">Rank Position</span>
              <span className="text-2xl font-bold">{metrics.rank_position}</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: QUICK ACTIONS BAR */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quick Actions</h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Create Google Post", icon: Plus, color: "bg-indigo-50 text-indigo-600 border-indigo-100", href: "/posts" },
            { label: "Reply Reviews", icon: MessageSquare, color: "bg-amber-50 text-amber-600 border-amber-100", href: "/reviews" },
            { label: "Generate QR", icon: QrCode, color: "bg-pink-50 text-pink-600 border-pink-100", href: "/qr" },
            { label: "Schedule Content", icon: CalendarIcon, color: "bg-purple-50 text-purple-600 border-purple-100", href: "/posts" },
            { label: "View Rankings", icon: TrendingUp, color: "bg-emerald-50 text-emerald-600 border-emerald-100", href: "/analytics" },
            { label: "Add Location", icon: Building2, color: "bg-blue-50 text-blue-600 border-blue-100", href: "/settings" }
          ].map((action, idx) => (
            <Link key={idx} href={action.href}>
              <div className="surface-card-interactive p-4 flex flex-col items-center justify-center text-center gap-2 cursor-pointer group h-full">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${action.color} group-hover:scale-105 transition-transform`}>
                  <action.icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-slate-700 group-hover:text-indigo-600 transition-colors">
                  {action.label}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* SECTION 3: RECENT REVIEWS MANAGEMENT */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Recent Customer Reviews</h2>
            <p className="text-xs text-slate-500">Live feed synchronized from Google Business Profile</p>
          </div>

          <Link href="/reviews">
            <span className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
              View All Reviews ({reviewsList.length}) <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {metrics.reviews_status === "error" ? (
            <div className="col-span-3 surface-card p-8 text-center text-slate-500 rounded-2xl flex flex-col items-center justify-center space-y-3 border border-red-100 bg-red-50/50">
              <AlertTriangle className="w-8 h-8 text-red-500" />
              <p className="font-semibold text-slate-700">Google My Business Reviews API Error</p>
              <p className="text-sm max-w-md text-red-600 bg-red-100/50 p-2 rounded">{metrics.reviews_error || "The Reviews API is currently disabled or failed."}</p>
            </div>
          ) : reviewsList.length === 0 ? (
            <div className="col-span-3 surface-card p-8 text-center text-slate-500 rounded-2xl">
              No recent reviews found.
            </div>
          ) : (
            reviewsList.slice(0, 3).map((review: any, idx: number) => (
              <div key={idx} className="surface-card p-5 space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center">
                        {review.avatar || review.author?.charAt(0) || "U"}
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-slate-900">{review.author}</h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={`w-3 h-3 ${i < review.rating ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} />
                            ))}
                          </div>
                          <span className="text-[10px] text-slate-400">• {review.time}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed italic">
                    "{review.text}"
                  </p>

                  <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-100/80 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-700">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>AI Suggested Reply</span>
                    </div>
                    <p className="text-[11px] text-slate-600 line-clamp-2">
                      {review.aiDraft || "No AI draft available yet."}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 flex items-center gap-2">
                  <button className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-1.5 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Approve & Send
                  </button>
                  <button className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* SECTION 4 & 5: GOOGLE POSTS & SOCIAL MEDIA PERFORMANCE */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Google Posts Manager (7 cols) */}
        <div className="lg:col-span-7 surface-card p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Google Posts Manager</h2>
              <p className="text-xs text-slate-500">Draft, schedule, and track performance of updates</p>
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs font-medium">
              <button
                onClick={() => setPostsTab("scheduled")}
                className={`px-3 py-1 rounded-md transition-colors ${postsTab === "scheduled" ? "bg-white text-slate-900 shadow-sm font-semibold" : "text-slate-500"}`}
              >
                Scheduled ({postsList.length})
              </button>
              <button
                onClick={() => setPostsTab("published")}
                className={`px-3 py-1 rounded-md transition-colors ${postsTab === "published" ? "bg-white text-slate-900 shadow-sm font-semibold" : "text-slate-500"}`}
              >
                Published
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {metrics.posts_status === "error" ? (
              <div className="p-8 text-center text-slate-500 rounded-xl border border-red-100 bg-red-50/50 flex flex-col items-center justify-center space-y-3">
                <AlertTriangle className="w-6 h-6 text-red-500" />
                <p className="font-semibold text-slate-700 text-sm">Google Posts API Error</p>
                <p className="text-xs max-w-xs text-red-600 bg-red-100/50 p-2 rounded">{metrics.posts_error || "The Google My Business API is disabled in your Google Cloud Project."}</p>
              </div>
            ) : postsList.length === 0 ? (
              <div className="p-8 text-center text-slate-500 rounded-xl border border-slate-100 bg-slate-50/50">
                Google Posts data unavailable
              </div>
            ) : (
              postsList.map((post: any, idx: number) => (
                <div key={idx} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold text-slate-900">{post.title || post.summary}</h3>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-indigo-600" /> {post.date || post.createTime}</span>
                      <span>• {post.location || selectedLocation?.location_name}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                      {post.status || post.state}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Social Media Multi-Channel Reach (5 cols) */}
        <div className="lg:col-span-5 surface-card p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Social Media Reach</h2>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
              +18.4% This Month
            </span>
          </div>

          <div className="space-y-3">
            {metrics.performance_status === "error" && (
              <div className="p-3 text-center text-slate-500 rounded-xl border border-red-100 bg-red-50/50 flex flex-col items-center justify-center space-y-1 mb-2">
                <p className="font-semibold text-slate-700 text-xs">Performance API Error</p>
                <p className="text-[10px] text-red-600 line-clamp-2">{metrics.performance_error}</p>
              </div>
            )}
            {[
              { platform: "Google Business", icon: Globe, reach: metrics.performance_status === "error" ? "Unavailable" : (metrics.total_reviews === "Unavailable" ? "..." : `${(metrics.total_reviews as number) * 12}`), posts: `${postsList.length} Posts`, color: "text-blue-600 bg-blue-50" },
              { platform: "Facebook", icon: Share2, reach: "8,920", posts: "8 Published", color: "text-indigo-600 bg-indigo-50" },
              { platform: "Instagram", icon: MessageCircle, reach: "11,400", posts: "14 Published", color: "text-pink-600 bg-pink-50" },
              { platform: "LinkedIn", icon: Send, reach: "2,150", posts: "4 Published", color: "text-sky-600 bg-sky-50" }
            ].map((social, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${social.color}`}>
                    <social.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">{social.platform}</h3>
                    <span className="text-[11px] text-slate-500">{social.posts}</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-900">{social.reach} Reach</span>
              </div>
            ))}
          </div>
        </div>

      </section>

      {/* SECTION 6 & 7: LOCAL RANK TRACKER & GMB HEALTH AUDIT */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Local Rank Tracker Grid (7 cols) */}
        <div className="lg:col-span-7 surface-card p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Local Maps Rank Tracker</h2>
              <p className="text-xs text-slate-500">Google Map Pack positions across targeted geo-coordinates</p>
            </div>
            <Link href="/analytics">
              <span className="text-xs font-semibold text-indigo-600 hover:underline">Full Heatmap</span>
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="pb-3">Target Keyword</th>
                  <th className="pb-3">Map Pack Rank</th>
                  <th className="pb-3">Change</th>
                  <th className="pb-3">Competitor Benchmark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  { kw: `${selectedLocation?.primary_category || "Dentist"} Near Me`, rank: "#1", change: "+2 Pos", comp: "Competitor #2" },
                  { kw: "Emergency Local Care", rank: "#1", change: "No Change", comp: "Competitor #3" },
                  { kw: "Top Rated Business Near Me", rank: "#2", change: "+1 Pos", comp: "Competitor #1" },
                  { kw: "Consultation & Services", rank: "#3", change: "+4 Pos", comp: "Competitor #1" }
                ].map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 font-semibold text-slate-900">{row.kw}</td>
                    <td className="py-3 font-bold text-indigo-600">{row.rank}</td>
                    <td className="py-3 text-emerald-600 font-medium">{row.change}</td>
                    <td className="py-3 text-slate-500">{row.comp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* GMB Health Audit Checklist (5 cols) */}
        <div className="lg:col-span-5 surface-card p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">GMB Optimization Checklist</h2>
            <span className="text-xs font-extrabold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
              {metrics.visibility_score} Health
            </span>
          </div>

          <div className="space-y-3">
            {checklistItems.map((check, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-xs ${check.done ? "bg-emerald-500" : "bg-amber-400"}`}>
                    {check.done ? <Check className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                  </div>
                  <span className="text-xs font-medium text-slate-700">{check.item}</span>
                </div>
                <span className={`text-[11px] font-bold ${check.done ? "text-emerald-600" : "text-amber-600"}`}>
                  {check.status}
                </span>
              </div>
            ))}
          </div>
        </div>

      </section>

      {/* SECTION 8 & 9: KEYWORD PLANNER & MAGIC QR GENERATOR */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Keyword Opportunity Planner (7 cols) */}
        <div className="lg:col-span-7 surface-card p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">High-Opportunity Keywords</h2>
              <p className="text-xs text-slate-500">Keywords with high intent and low local competition</p>
            </div>
            <button className="text-xs font-semibold text-indigo-600 hover:underline">Explore All</button>
          </div>

          <div className="space-y-3">
            {[
              { kw: `${selectedLocation?.primary_category || "Service"} Cost Near Me`, vol: "2,400/mo", diff: "Low", score: "92/100" },
              { kw: "Same Day Appointment", vol: "1,800/mo", diff: "Medium", score: "88/100" },
              { kw: `Affordable ${selectedLocation?.primary_category || "Local Business"}`, vol: "3,100/mo", diff: "Low", score: "95/100" }
            ].map((kw, idx) => (
              <div key={idx} className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                <div>
                  <h3 className="text-xs font-bold text-slate-900">{kw.kw}</h3>
                  <span className="text-[11px] text-slate-500">Volume: {kw.vol} • Difficulty: {kw.diff}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
                    {kw.score} Opp
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Magic QR Code Generator Widget (5 cols) */}
        <div className="lg:col-span-5 surface-card p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Magic Review QR Code</h2>
            <div className="flex gap-1">
              {(["PNG", "SVG", "PDF"] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setQrFormat(fmt)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${qrFormat === fmt ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"}`}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-5 p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100">
            {/* QR Visualizer */ }
            <div className="w-24 h-24 bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex items-center justify-center shrink-0">
              <QrCode className="w-20 h-20 text-indigo-600" />
            </div>

            <div className="space-y-2 flex-1">
              <h3 className="text-xs font-bold text-slate-900">Direct Google Review Link</h3>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Scan count: <strong className="text-slate-800">412 scans</strong> this month (+22% conversion).
              </p>
              <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-1.5 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1.5">
                <Download className="w-3.5 h-3.5" /> Download Printable Stand
              </button>
            </div>
          </div>
        </div>

      </section>

      {/* Location Selection Modal for Milestone 2 */}
      <LocationSelectModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
      />

    </div>
  );
}


