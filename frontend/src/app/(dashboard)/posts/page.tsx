"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Plus, Check, Search, Image as ImageIcon, RefreshCcw, MoreHorizontal, Edit, Trash2, Clock, Calendar } from "lucide-react";
import { useGmb } from "@/context/GmbContext";

export default function PostsPage() {
  const { locations, selectedLocation, selectLocation } = useGmb();
  const [postsData, setPostsData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  // New Post Form State
  const [isCreating, setIsCreating] = useState(false);
  const [newPostSummary, setNewPostSummary] = useState("");
  const [topicType, setTopicType] = useState("STANDARD");
  const [ctaType, setCtaType] = useState("NONE");
  const [ctaUrl, setCtaUrl] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [scheduledMode, setScheduledMode] = useState<"NOW" | "LATER">("NOW");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // Edit Post State
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editSummary, setEditSummary] = useState("");
  const [editTopicType, setEditTopicType] = useState("STANDARD");
  const [editCtaType, setEditCtaType] = useState("NONE");
  const [editCtaUrl, setEditCtaUrl] = useState("");
  const [editMediaUrl, setEditMediaUrl] = useState("");
  const [editScheduledMode, setEditScheduledMode] = useState<"NOW" | "LATER">("NOW");
  const [editScheduledDate, setEditScheduledDate] = useState("");
  const [editScheduledTime, setEditScheduledTime] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete Post State
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Dropdown menu state
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchPosts();
  }, [selectedLocation]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchPosts = () => {
    if (selectedLocation) {
      setIsLoading(true);
      setErrorStatus(null);
      setSuccessMsg("");
      fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/gmb/dashboard-data`, {
        credentials: "include",
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" }
      })
        .then(res => res.json())
        .then(data => {
          if (data.posts?.status === "CONNECTED") {
            setPostsData(data.posts.data || []);
          } else {
            setErrorStatus(data.posts?.status || "API_ERROR");
            setPostsData([]);
          }
        })
        .catch(err => {
          console.error(err);
          setErrorStatus("API_ERROR");
        })
        .finally(() => setIsLoading(false));
    }
  };

  const extractPostId = (name: string) => {
    return name.split("/").pop() || null;
  };

  const getScheduledTimestamp = (dateStr: string, timeStr: string) => {
    if (!dateStr || !timeStr) return null;
    const dt = new Date(`${dateStr}T${timeStr}`);
    if (dt <= new Date()) {
      return "PAST";
    }
    return `${dateStr}T${timeStr}:00+05:30`;
  };

  const handleCreatePost = async () => {
    if (!newPostSummary.trim()) return;
    
    let scheduled_time = null;
    if (scheduledMode === "LATER") {
      scheduled_time = getScheduledTimestamp(scheduledDate, scheduledTime);
      if (!scheduled_time) {
        alert("Please select both a valid date and time for scheduling.");
        return;
      }
      if (scheduled_time === "PAST") {
        alert("Scheduled time must be in the future.");
        return;
      }
    }

    setIsSubmitting(true);
    setSuccessMsg("");
    setErrorStatus(null);
    try {
      const payload: any = {
        summary: newPostSummary,
        topic_type: topicType,
      };
      if (ctaType !== "NONE") {
        payload.call_to_action = { actionType: ctaType, url: ctaUrl };
      }
      if (mediaUrl.trim()) {
        payload.media_url = mediaUrl.trim();
      }
      if (scheduled_time) {
        payload.scheduled_time = scheduled_time;
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/gmb/posts/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        setNewPostSummary("");
        setTopicType("STANDARD");
        setCtaType("NONE");
        setCtaUrl("");
        setMediaUrl("");
        setScheduledMode("NOW");
        setScheduledDate("");
        setScheduledTime("");
        setIsCreating(false);
        setSuccessMsg("Post created successfully");
        fetchPosts();
      } else {
        const errorData = await res.json();
        alert("Failed to create post: " + (errorData.detail || "Unknown error"));
      }
    } catch (err) {
      alert("Error creating post.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (post: any) => {
    setActiveDropdown(null);
    const postId = extractPostId(post.name);
    setEditingPostId(postId);
    setEditSummary(post.summary || "");
    setEditTopicType(post.topicType || "STANDARD");
    
    if (post.callToAction) {
      setEditCtaType(post.callToAction.actionType || "NONE");
      setEditCtaUrl(post.callToAction.url || "");
    } else {
      setEditCtaType("NONE");
      setEditCtaUrl("");
    }
    
    if (post.media && post.media.length > 0 && post.media[0].sourceUrl) {
      setEditMediaUrl(post.media[0].sourceUrl);
    } else {
      setEditMediaUrl("");
    }

    if (post.state === "SCHEDULED" && post.scheduledTime) {
      setEditScheduledMode("LATER");
      // convert UTC ISO string to local HTML input formats (simplification, assuming user is in local TZ)
      const d = new Date(post.scheduledTime);
      const tzOffset = d.getTimezoneOffset() * 60000;
      const localISOTime = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
      setEditScheduledDate(localISOTime.split("T")[0]);
      setEditScheduledTime(localISOTime.split("T")[1]);
    } else {
      setEditScheduledMode("NOW");
      setEditScheduledDate("");
      setEditScheduledTime("");
    }
  };

  const handleUpdatePost = async () => {
    if (!editSummary.trim() || !editingPostId) return;

    let scheduled_time = null;
    if (editScheduledMode === "LATER") {
      scheduled_time = getScheduledTimestamp(editScheduledDate, editScheduledTime);
      if (!scheduled_time) {
        alert("Please select both a valid date and time for scheduling.");
        return;
      }
      if (scheduled_time === "PAST") {
        alert("Scheduled time must be in the future.");
        return;
      }
    }

    setIsUpdating(true);
    setSuccessMsg("");
    
    try {
      const payload: any = {
        summary: editSummary,
        topic_type: editTopicType,
      };
      if (editCtaType !== "NONE") {
        payload.call_to_action = { actionType: editCtaType, url: editCtaUrl };
      }
      if (editMediaUrl.trim()) {
        payload.media_url = editMediaUrl.trim();
      }
      if (scheduled_time) {
        payload.scheduled_time = scheduled_time;
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/gmb/posts/${editingPostId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        setEditingPostId(null);
        setSuccessMsg("Post updated successfully");
        fetchPosts();
      } else {
        const errorData = await res.json();
        alert("Failed to update post: " + (errorData.detail || "Unknown error"));
      }
    } catch (err) {
      alert("Error updating post.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteClick = (post: any) => {
    setActiveDropdown(null);
    setDeletingPostId(extractPostId(post.name));
  };

  const confirmDelete = async () => {
    if (!deletingPostId) return;
    setIsDeleting(true);
    setSuccessMsg("");
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/gmb/posts/${deletingPostId}`, {
        method: "DELETE",
        credentials: "include"
      });
      
      if (res.ok) {
        setDeletingPostId(null);
        setSuccessMsg("Post deleted successfully");
        fetchPosts();
      } else {
        const errorData = await res.json();
        alert("Failed to delete post: " + (errorData.detail || "Unknown error"));
      }
    } catch (err) {
      alert("Error deleting post.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLocationChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const locId = e.target.value;
    const loc = locations.find(l => l.locationId === locId);
    if (loc && selectedLocation?.account_id) {
      await selectLocation({
        account_id: selectedLocation.account_id,
        location_id: loc.locationId,
        location_name: loc.businessName,
        address: loc.address,
        primary_category: loc.primaryCategory,
      });
    }
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Google Posts</h1>
          <p className="text-xs text-slate-500">Manage updates, offers, and events for your business profile.</p>
        </div>
        
        <div className="flex items-center gap-4">
          {locations.length > 0 && (
            <select 
              className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 focus:outline-none focus:border-blue-500 shadow-sm"
              value={selectedLocation?.location_id || ""}
              onChange={handleLocationChange}
            >
              {locations.map(loc => (
                <option key={loc.locationId} value={loc.locationId}>
                  {loc.businessName}
                </option>
              ))}
            </select>
          )}

          <button 
            onClick={fetchPosts}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors shadow-sm"
            title="Refresh Posts"
          >
            <RefreshCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button 
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Create Post
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 text-sm font-medium text-emerald-700 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center gap-2">
          <Check className="w-4 h-4" /> {successMsg}
        </div>
      )}

      {isCreating && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-6 bg-white rounded-2xl border border-blue-200 shadow-sm space-y-4">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-600" /> New Post Update
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Post Type</label>
              <select 
                value={topicType}
                onChange={e => setTopicType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="STANDARD">What's New (Standard)</option>
                <option value="EVENT">Event</option>
                <option value="OFFER">Offer</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Image URL (Optional)</label>
              <div className="flex items-center gap-2 relative">
                <ImageIcon className="w-4 h-4 text-slate-400 absolute left-3" />
                <input 
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={mediaUrl}
                  onChange={e => setMediaUrl(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 pl-9 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Summary / Content</label>
            <textarea
              value={newPostSummary}
              onChange={(e) => setNewPostSummary(e.target.value)}
              rows={4}
              placeholder="Write your update here..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Call To Action Button</label>
              <select 
                value={ctaType}
                onChange={e => setCtaType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="NONE">None</option>
                <option value="LEARN_MORE">Learn More</option>
                <option value="BOOK">Book</option>
                <option value="ORDER">Order</option>
                <option value="SHOP">Shop</option>
                <option value="SIGN_UP">Sign Up</option>
                <option value="CALL">Call</option>
              </select>
            </div>
            {ctaType !== "NONE" && ctaType !== "CALL" && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">CTA URL</label>
                <input 
                  type="url"
                  placeholder="https://example.com/link"
                  value={ctaUrl}
                  onChange={e => setCtaUrl(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500"
                  required={ctaType !== "NONE" && ctaType !== "CALL"}
                />
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100">
            <label className="block text-xs font-semibold text-slate-700 mb-3">Publishing Options</label>
            <div className="flex items-center gap-4 mb-4">
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input 
                  type="radio" 
                  checked={scheduledMode === "NOW"} 
                  onChange={() => setScheduledMode("NOW")} 
                  className="text-blue-600 focus:ring-blue-500"
                />
                Publish Now
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input 
                  type="radio" 
                  checked={scheduledMode === "LATER"} 
                  onChange={() => setScheduledMode("LATER")} 
                  className="text-blue-600 focus:ring-blue-500"
                />
                Schedule for Later
              </label>
            </div>

            {scheduledMode === "LATER" && (
              <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Schedule Date</label>
                  <div className="flex items-center gap-2 relative">
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3" />
                    <input 
                      type="date"
                      value={scheduledDate}
                      onChange={e => setScheduledDate(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 pl-9 text-sm focus:outline-none focus:border-blue-500"
                      min={new Date().toISOString().split("T")[0]}
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Schedule Time (Local)</label>
                  <div className="flex items-center gap-2 relative">
                    <Clock className="w-4 h-4 text-slate-400 absolute left-3" />
                    <input 
                      type="time"
                      value={scheduledTime}
                      onChange={e => setScheduledTime(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 pl-9 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button onClick={() => setIsCreating(false)} className="text-xs text-slate-500 hover:text-slate-900 font-semibold">Cancel</button>
            <button 
              onClick={handleCreatePost}
              disabled={isSubmitting || !newPostSummary.trim()}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCcw className="w-3 h-3 animate-spin" /> {scheduledMode === "LATER" ? "Scheduling..." : "Publishing..."}
                </>
              ) : (scheduledMode === "LATER" ? "Schedule Post" : "Publish to Google")}
            </button>
          </div>
        </motion.div>
      )}

      {errorStatus ? (
        <div className="p-8 text-center text-rose-500 bg-rose-50 rounded-xl border border-rose-100">
          Google Posts API is unavailable or disabled. Status: {errorStatus}
        </div>
      ) : isLoading ? (
        <div className="p-8 text-center text-slate-400 flex items-center justify-center gap-2">
          <RefreshCcw className="w-4 h-4 animate-spin text-slate-300" /> Loading posts...
        </div>
      ) : postsData.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-slate-400 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
          <FileText className="w-12 h-12 text-slate-200 mb-4" />
          <p className="text-sm font-medium text-slate-900">No active posts</p>
          <p className="text-xs mt-1">Create your first post to engage with customers on Google.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {postsData.map((post: any, i: number) => {
            const postId = extractPostId(post.name);
            
            let stateLabel = "Published";
            let stateColor = "text-emerald-700 bg-emerald-50";
            if (post.state === "SCHEDULED") {
              stateLabel = "Scheduled";
              stateColor = "text-amber-700 bg-amber-50";
            } else if (post.state === "PROCESSING") {
              stateLabel = "Processing";
              stateColor = "text-blue-700 bg-blue-50";
            } else if (post.state === "REJECTED") {
              stateLabel = "Rejected";
              stateColor = "text-rose-700 bg-rose-50";
            }

            return (
              <div key={post.name || i} className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col gap-4 overflow-visible relative">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded tracking-wide uppercase w-fit ${stateColor}`}>
                      {stateLabel}
                    </span>
                    <div className="text-xs text-slate-500 font-medium">
                      {post.state === "SCHEDULED" && post.scheduledTime 
                        ? new Date(post.scheduledTime).toLocaleString('en-US', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })
                        : new Date(post.createTime).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded tracking-wide uppercase">
                      {post.topicType}
                    </span>
                    <div className="relative">
                      <button 
                        onClick={() => setActiveDropdown(activeDropdown === postId ? null : postId)}
                        className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                      
                      <AnimatePresence>
                        {activeDropdown === postId && (
                          <motion.div 
                            initial={{ opacity: 0, y: 5 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            exit={{ opacity: 0, y: 5 }}
                            className="absolute right-0 top-full mt-1 w-32 bg-white border border-slate-100 shadow-lg rounded-xl py-1 z-10"
                          >
                            <button 
                              onClick={() => handleEditClick(post)}
                              className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                            >
                              <Edit className="w-3.5 h-3.5" /> Edit
                            </button>
                            <button 
                              onClick={() => handleDeleteClick(post)}
                              className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
                
                {post.media && post.media.length > 0 && post.media[0].sourceUrl && (
                  <div className="w-full h-32 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                    <img 
                      src={post.media[0].sourceUrl} 
                      alt="Post Media" 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                )}
                
                <p className="text-sm text-slate-800 flex-1 whitespace-pre-wrap">
                  {post.summary}
                </p>
                
                {post.callToAction && (
                  <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                      {post.callToAction.actionType}
                    </span>
                    {post.callToAction.url && (
                      <a href={post.callToAction.url} target="_blank" rel="noreferrer" className="text-[10px] text-slate-500 hover:underline truncate max-w-[120px]">
                        {post.callToAction.url}
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      {editingPostId && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <Edit className="w-4 h-4 text-blue-600" /> Edit Google Post
              </h2>
            </div>
            
            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Post Type</label>
                  <select 
                    value={editTopicType}
                    onChange={e => setEditTopicType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="STANDARD">What's New (Standard)</option>
                    <option value="EVENT">Event</option>
                    <option value="OFFER">Offer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Image URL (Optional)</label>
                  <div className="flex items-center gap-2 relative">
                    <ImageIcon className="w-4 h-4 text-slate-400 absolute left-3" />
                    <input 
                      type="url"
                      placeholder="https://example.com/image.jpg"
                      value={editMediaUrl}
                      onChange={e => setEditMediaUrl(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 pl-9 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Summary / Content</label>
                <textarea
                  value={editSummary}
                  onChange={(e) => setEditSummary(e.target.value)}
                  rows={4}
                  placeholder="Write your update here..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Call To Action Button</label>
                  <select 
                    value={editCtaType}
                    onChange={e => setEditCtaType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="NONE">None</option>
                    <option value="LEARN_MORE">Learn More</option>
                    <option value="BOOK">Book</option>
                    <option value="ORDER">Order</option>
                    <option value="SHOP">Shop</option>
                    <option value="SIGN_UP">Sign Up</option>
                    <option value="CALL">Call</option>
                  </select>
                </div>
                {editCtaType !== "NONE" && editCtaType !== "CALL" && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">CTA URL</label>
                    <input 
                      type="url"
                      placeholder="https://example.com/link"
                      value={editCtaUrl}
                      onChange={e => setEditCtaUrl(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500"
                      required={editCtaType !== "NONE" && editCtaType !== "CALL"}
                    />
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-700 mb-3">Publishing Options</label>
                <div className="flex items-center gap-4 mb-4">
                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input 
                      type="radio" 
                      checked={editScheduledMode === "NOW"} 
                      onChange={() => setEditScheduledMode("NOW")} 
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    Publish Now
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input 
                      type="radio" 
                      checked={editScheduledMode === "LATER"} 
                      onChange={() => setEditScheduledMode("LATER")} 
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    Schedule for Later
                  </label>
                </div>

                {editScheduledMode === "LATER" && (
                  <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Schedule Date</label>
                      <div className="flex items-center gap-2 relative">
                        <Calendar className="w-4 h-4 text-slate-400 absolute left-3" />
                        <input 
                          type="date"
                          value={editScheduledDate}
                          onChange={e => setEditScheduledDate(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 pl-9 text-sm focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Schedule Time (Local)</label>
                      <div className="flex items-center gap-2 relative">
                        <Clock className="w-4 h-4 text-slate-400 absolute left-3" />
                        <input 
                          type="time"
                          value={editScheduledTime}
                          onChange={e => setEditScheduledTime(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 pl-9 text-sm focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/50">
              <button 
                onClick={() => setEditingPostId(null)} 
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                disabled={isUpdating}
              >
                Cancel
              </button>
              <button 
                onClick={handleUpdatePost}
                disabled={isUpdating || !editSummary.trim()}
                className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isUpdating ? (
                  <>
                    <RefreshCcw className="w-3.5 h-3.5 animate-spin" /> Updating...
                  </>
                ) : (editScheduledMode === "LATER" ? "Schedule Post" : "Save Changes")}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingPostId && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-2">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Delete this Google post?</h3>
              <p className="text-sm text-slate-500">
                This will permanently remove the post from your Google Business Profile. This action cannot be undone.
              </p>
            </div>
            <div className="p-4 flex gap-3 bg-slate-50 border-t border-slate-100">
              <button 
                onClick={() => setDeletingPostId(null)}
                disabled={isDeleting}
                className="flex-1 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex-1 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <RefreshCcw className="w-4 h-4 animate-spin" /> Deleting...
                  </>
                ) : "Delete"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
