"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  Star,
  Search,
  Check,
  Edit3,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  X,
  MessageSquare
} from "lucide-react";

import { useGmb } from "@/context/GmbContext";

export default function ReviewsPage() {
  const { selectedLocation } = useGmb();
  const [reviewsData, setReviewsData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  const [generatingDrafts, setGeneratingDrafts] = useState<Record<string, boolean>>({});
  const [aiErrors, setAiErrors] = useState<Record<string, string>>({});
  const processedReviews = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (selectedLocation) {
      setIsLoading(true);
      setErrorStatus(null);
      fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/gmb/dashboard-data`, {
        credentials: "include"
      })
        .then(res => res.json())
        .then(data => {
          if (data.reviews?.status === "CONNECTED") {
            setReviewsData(data.reviews.recent || []);
          } else {
            setErrorStatus(data.reviews?.status || "API_ERROR");
            setReviewsData([]);
          }
        })
        .catch(err => {
          console.error(err);
          setErrorStatus("API_ERROR");
        })
        .finally(() => setIsLoading(false));
    }
  }, [selectedLocation]);

  const fetchAIDraft = async (review: any) => {
    if (processedReviews.current.has(review.id)) return;
    processedReviews.current.add(review.id);

    setGeneratingDrafts(prev => ({ ...prev, [review.id]: true }));
    setAiErrors(prev => { const next = { ...prev }; delete next[review.id]; return next; });

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/gmb/reviews/${review.id}/generate-reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          review_text: review.text,
          star_rating: review.rating,
          reviewer_name: review.author,
          business_name: selectedLocation?.location_name || "Our Business"
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setReviewsData(prev => prev.map(r => r.id === review.id ? { ...r, aiDraft: data.reply } : r));
        if (selectedId === review.id) {
          setEditedReply(data.reply);
        }
      } else {
        setAiErrors(prev => ({ ...prev, [review.id]: data.error || "Failed to generate reply" }));
      }
    } catch (err) {
      setAiErrors(prev => ({ ...prev, [review.id]: "Network error generating reply" }));
    } finally {
      setGeneratingDrafts(prev => ({ ...prev, [review.id]: false }));
    }
  };

  useEffect(() => {
    if (reviewsData.length > 0) {
      const unreplied = reviewsData.filter(r => r.status === "Pending Approval" && !r.aiDraft && !processedReviews.current.has(r.id));
      unreplied.forEach(review => {
        fetchAIDraft(review);
      });
    }
  }, [reviewsData]);

  const [selectedId, setSelectedId] = useState<string>("");
  const [filter, setFilter] = useState<"all" | "pending" | "published">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (reviewsData.length > 0 && !selectedId) {
      setSelectedId(reviewsData[0].id);
      setEditedReply(reviewsData[0].aiDraft || "");
    }
  }, [reviewsData, selectedId]);

  const selectedReview = reviewsData.find((r) => r.id === selectedId) || reviewsData[0] || null;
  const [editedReply, setEditedReply] = useState("");

  useEffect(() => {
    if (selectedReview) {
      setEditedReply(selectedReview.aiDraft || "");
    }
  }, [selectedReview]);

  const filteredReviews = reviewsData.filter((r) => {
    if (filter === "pending") return r.status === "Pending Approval";
    if (filter === "published") return r.status === "Approved & Published" || r.status === "Published on Google";
    return true;
  }).filter((r) => r.author?.toLowerCase().includes(searchQuery.toLowerCase()) || r.text?.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleReplySubmit = async () => {
    if (!selectedId || !editedReply) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/gmb/reviews/${selectedId}/reply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({ reply_text: editedReply })
      });
      const data = await res.json();
      if (res.ok && data.status === "SUCCESS") {
        const publishedText = data.data?.comment || editedReply;
        setReviewsData(prev => prev.map(r => r.id === selectedId ? { ...r, status: "Published on Google", ownerReply: publishedText } : r));
        // Also clear out the AI drafts to reflect a clean published state
        setEditedReply("");
      } else {
        alert("Failed to submit reply: " + (data.detail || data.message || "Unknown error"));
      }
    } catch (err) {
      alert("Error submitting reply.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Inbox Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Review Inbox</h1>
          <p className="text-xs text-slate-500">Manage, analyze, and deploy AI responses across Google locations.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 border border-slate-200 text-xs">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${filter === "all" ? "bg-white text-slate-900 shadow-sm font-semibold" : "text-slate-600 hover:text-slate-900"}`}
            >
              All ({reviewsData.length})
            </button>
            <button
              onClick={() => setFilter("pending")}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${filter === "pending" ? "bg-white text-slate-900 shadow-sm font-semibold" : "text-slate-600 hover:text-slate-900"}`}
            >
              Pending ({reviewsData.filter(r => r.status === "Pending Approval").length})
            </button>
            <button
              onClick={() => setFilter("published")}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${filter === "published" ? "bg-white text-slate-900 shadow-sm font-semibold" : "text-slate-600 hover:text-slate-900"}`}
            >
              Published ({reviewsData.filter(r => r.status === "Approved & Published" || r.status === "Published on Google").length})
            </button>
          </div>
        </div>
      </div>

      {/* Superhuman / Intercom Split Inbox Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-220px)] min-h-[600px]">

        {/* Left List Stream */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col rounded-2xl bg-white border border-slate-200/80 overflow-hidden shadow-sm">
          {/* Search bar inside list */}
          <div className="p-3 border-b border-slate-100">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter reviews..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/80 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* List items */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
            {isLoading ? (
              <div className="p-8 text-center text-slate-500 text-xs">Loading reviews...</div>
            ) : errorStatus ? (
              <div className="p-8 text-center text-slate-500 text-xs flex flex-col items-center">
                <span className="text-amber-500 mb-2">Google API Error</span>
                <span>{errorStatus === "REVIEWS_API_DISABLED" ? "Reviews API is disabled." : "Failed to load reviews."}</span>
              </div>
            ) : filteredReviews.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">No reviews found.</div>
            ) : filteredReviews.map((rev) => {
              const isSelected = rev.id === selectedId;
              return (
                <div
                  key={rev.id}
                  onClick={() => {
                    setSelectedId(rev.id);
                    setEditedReply(rev.aiDraft || "");
                    setIsEditing(false);
                  }}
                  className={`p-4 cursor-pointer transition-colors space-y-2 relative ${isSelected ? "bg-indigo-50/70 border-l-4 border-indigo-600" : "hover:bg-slate-50/80"
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900">{rev.author}</span>
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${i < rev.rating ? "text-amber-400 fill-amber-400" : "text-slate-200"}`}
                          />
                        ))}
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400">{rev.time?.split("ago")[0] || "Recently"}</span>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {rev.text}
                  </p>

                  <div className="flex items-center justify-between pt-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${rev.sentiment === "Positive"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                      : rev.sentiment === "Neutral"
                        ? "bg-amber-50 text-amber-700 border border-amber-100"
                        : "bg-rose-50 text-rose-700 border border-rose-100"
                      }`}>
                      {rev.sentiment || "Neutral"}
                    </span>

                    <span className="text-[10px] text-slate-500 font-medium">{rev.status || "Published on Google"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Reading & Reply Pane */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col rounded-2xl bg-white border border-slate-200/80 p-6 space-y-6 overflow-y-auto custom-scrollbar shadow-sm">

          {selectedReview ? (
            <>
              {/* Header of selected review */}
              <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-sm text-indigo-600">
                    {selectedReview.avatar || selectedReview.author.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">{selectedReview.author}</h2>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`w-3.5 h-3.5 ${i < selectedReview.rating ? "text-amber-400 fill-amber-400" : "text-slate-200"}`} />
                        ))}
                      </div>
                      <span>• {selectedLocation?.location_name}</span>
                      <span>• {selectedReview.time || "Recently"}</span>
                    </div>
                  </div>
                </div>

                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${selectedReview.status === "Approved & Published" || selectedReview.status === "Published on Google"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}>
                  {selectedReview.status || "Published on Google"}
                </span>
              </div>

              {/* Full Review Quote Text */}
              <div className="p-5 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Customer Review</span>
                <p className="text-slate-800 text-sm leading-relaxed">
                  "{selectedReview.text}"
                </p>
              </div>

              {/* AI Response Generator & Editor Box */}
              <div className="rounded-xl bg-indigo-50/50 border border-indigo-100 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span>{selectedReview.status === "Pending Approval" ? "BuzzSpire AI Suggested Response" : "Owner Reply"}</span>
                  </div>

                  {selectedReview.status === "Pending Approval" && (
                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      {isEditing ? "Done Editing" : "Edit Response"}
                    </button>
                  )}
                </div>

                {selectedReview.status !== "Pending Approval" ? (
                  <p className="text-slate-700 text-xs leading-relaxed bg-white p-3.5 rounded-xl border border-slate-200/80">
                    {selectedReview.ownerReply}
                  </p>
                ) : generatingDrafts[selectedId] ? (
                  <p className="text-slate-500 text-xs leading-relaxed bg-white p-3.5 rounded-xl border border-indigo-100 flex items-center justify-center animate-pulse">
                    Generating AI reply...
                  </p>
                ) : aiErrors[selectedId] ? (
                  <p className="text-rose-600 text-xs leading-relaxed bg-rose-50 p-3.5 rounded-xl border border-rose-200">
                    {aiErrors[selectedId]}
                  </p>
                ) : isEditing ? (
                  <textarea
                    value={editedReply}
                    onChange={(e) => setEditedReply(e.target.value)}
                    rows={4}
                    className="w-full bg-white border border-indigo-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-sans leading-relaxed"
                  />
                ) : (
                  <p className="text-slate-700 text-xs leading-relaxed bg-white p-3.5 rounded-xl border border-slate-200/80 whitespace-pre-wrap">
                    {editedReply || "No AI draft available. Click Edit to write a response."}
                  </p>
                )}

                {/* Action Bar */}
                <div className="flex items-center justify-between pt-2">
                  {selectedReview.status === "Pending Approval" ? (
                    <button 
                      onClick={() => {
                        processedReviews.current.delete(selectedId);
                        fetchAIDraft(selectedReview);
                      }}
                      disabled={generatingDrafts[selectedId]}
                      className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 disabled:opacity-50">
                      <RefreshCw className={`w-3.5 h-3.5 ${generatingDrafts[selectedId] ? "animate-spin" : ""}`} /> Regenerate Draft
                    </button>
                  ) : (
                    <div></div>
                  )}

                  {selectedReview.status === "Pending Approval" ? (
                    <button 
                      onClick={handleReplySubmit}
                      disabled={generatingDrafts[selectedId] || !editedReply.trim()}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50">
                      <Check className="w-3.5 h-3.5" /> Approve & Publish to Google
                    </button>
                  ) : (
                    <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> ✓ Reply Published
                    </span>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-4">
              <MessageSquare className="w-12 h-12 text-slate-200" />
              <p className="text-sm">Select a review to read and reply</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
