"use client";

import React, { useEffect, useState } from "react";
import { Users, MessageCircle, Globe, Share2, Plus, AlertCircle, RefreshCw, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

export default function SocialMediaPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [composerContent, setComposerContent] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishResults, setPublishResults] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [accRes, postRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/social/accounts`, { credentials: "include" }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/social/posts`, { credentials: "include" })
      ]);
      
      const accData = await accRes.json();
      const postData = await postRes.json();
      
      if (accData.status === "success") setAccounts(accData.accounts || []);
      if (postData.status === "success") setPosts(postData.posts || []);
    } catch (err) {
      console.error("Failed to fetch social data", err);
    } finally {
      setIsLoading(false);
    }
  };

  const isConnected = (platform: string) => accounts.some(a => a.platform === platform && a.connected);
  
  const getAccount = (platform: string) => accounts.find(a => a.platform === platform);

  const handleConnect = async (platform: string) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/social/${platform}/connect`,
        { credentials: "include" }
      );

      if (res.status === 401) {
        alert("You must be logged in to connect a social media account. Please refresh and try again.");
        return;
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        alert(errData.detail || `Failed to initiate ${platform} connection.`);
        return;
      }

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(`Could not retrieve the ${platform} authorization URL. Please try again.`);
      }
    } catch (err) {
      alert("Network error: Failed to initiate connection. Please check your connection and try again.");
    }
  };

  const handleDisconnect = async (platform: string) => {
    if (!confirm(`Are you sure you want to disconnect ${platform}?`)) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/social/${platform}/disconnect`, {
        method: "POST",
        credentials: "include"
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      alert("Failed to disconnect.");
    }
  };

  const handlePublish = async () => {
    if (selectedPlatforms.length === 0) return alert("Select at least one platform.");
    if (!composerContent.trim()) return alert("Post content cannot be empty.");
    
    setIsPublishing(true);
    setPublishResults(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/social/posts/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ platforms: selectedPlatforms, content: composerContent })
      });
      const data = await res.json();
      setPublishResults(data.results || {});
      if (data.status === "completed") {
        fetchData();
        setComposerContent("");
      }
    } catch (err) {
      alert("Error publishing post.");
    } finally {
      setIsPublishing(false);
    }
  };

  const filteredPosts = posts.filter(p => activeTab === "all" || p.platform === activeTab);

  if (isLoading) {
    return <div className="p-8 text-center text-slate-400 flex items-center justify-center gap-2"><RefreshCw className="animate-spin w-4 h-4" /> Loading Social Data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Social Media</h1>
          <p className="text-xs text-slate-500">Connect accounts and publish across platforms simultaneously.</p>
        </div>
        <button 
          onClick={() => { setIsComposerOpen(!isComposerOpen); setPublishResults(null); }}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors flex items-center gap-2 shadow-sm"
        >
          <Plus className="w-4 h-4" /> Create Social Post
        </button>
      </div>

      {isComposerOpen && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-6 bg-white rounded-2xl border border-blue-200 shadow-sm space-y-4">
          <h2 className="font-semibold text-slate-900">Unified Composer</h2>
          
          <div className="flex gap-4">
            {['facebook', 'instagram', 'linkedin'].map(plat => (
              <label key={plat} className={`flex items-center gap-2 text-sm p-3 border rounded-xl cursor-pointer transition-colors ${!isConnected(plat) ? 'opacity-50 bg-slate-50' : 'hover:bg-slate-50'}`}>
                <input 
                  type="checkbox" 
                  disabled={!isConnected(plat)}
                  checked={selectedPlatforms.includes(plat)}
                  onChange={(e) => {
                    if (e.target.checked) setSelectedPlatforms([...selectedPlatforms, plat]);
                    else setSelectedPlatforms(selectedPlatforms.filter(p => p !== plat));
                  }}
                  className="rounded text-blue-600"
                />
                <span className="capitalize font-medium">{plat}</span>
                {!isConnected(plat) && <span className="text-[10px] text-slate-400 ml-1">(Not Connected)</span>}
              </label>
            ))}
          </div>

          <textarea
            value={composerContent}
            onChange={(e) => setComposerContent(e.target.value)}
            rows={4}
            placeholder="Write your cross-platform post..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500"
          />

          {publishResults && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <h3 className="text-xs font-bold text-slate-700">Publishing Results:</h3>
              {Object.entries(publishResults).map(([plat, res]: [string, any]) => (
                <div key={plat} className="flex items-center justify-between text-xs p-2 bg-white rounded border border-slate-100">
                  <span className="capitalize font-semibold text-slate-700">{plat}</span>
                  {res.status === "Published" ? (
                    <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Published (ID: {res.id})</span>
                  ) : (
                    <span className="text-rose-600 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Failed: {res.error}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setIsComposerOpen(false)} className="text-xs text-slate-500 hover:text-slate-900 font-semibold">Cancel</button>
            <button 
              onClick={handlePublish}
              disabled={isPublishing || selectedPlatforms.length === 0}
              className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold disabled:opacity-50"
            >
              {isPublishing ? "Publishing..." : "Publish Now"}
            </button>
          </div>
        </motion.div>
      )}

      {/* Connected Accounts Section */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-800">Connected Accounts</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Facebook */}
          <div className="p-5 bg-white border border-slate-200 rounded-2xl flex flex-col items-center text-center gap-3 shadow-sm">
            <div className={`p-3 rounded-full ${isConnected("facebook") ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-400"}`}>
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Facebook</h3>
              <p className="text-xs text-slate-500">{isConnected("facebook") ? getAccount("facebook")?.account_name : "Not Connected"}</p>
            </div>
            {isConnected("facebook") ? (
              <button onClick={() => handleDisconnect("facebook")} className="text-xs text-rose-600 font-semibold mt-2 hover:underline">Disconnect</button>
            ) : (
              <button onClick={() => handleConnect("facebook")} className="text-xs bg-slate-900 text-white px-4 py-1.5 rounded-lg mt-2 font-semibold">Connect Facebook</button>
            )}
          </div>

          {/* Instagram */}
          <div className="p-5 bg-white border border-slate-200 rounded-2xl flex flex-col items-center text-center gap-3 shadow-sm">
            <div className={`p-3 rounded-full ${isConnected("instagram") ? "bg-fuchsia-50 text-fuchsia-600" : "bg-slate-100 text-slate-400"}`}>
              <MessageCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Instagram</h3>
              <p className="text-xs text-slate-500">{isConnected("instagram") ? getAccount("instagram")?.username : "Professional/Business Account"}</p>
            </div>
            {isConnected("instagram") ? (
              <button onClick={() => handleDisconnect("instagram")} className="text-xs text-rose-600 font-semibold mt-2 hover:underline">Disconnect</button>
            ) : (
              <button onClick={() => handleConnect("instagram")} className="text-xs bg-slate-900 text-white px-4 py-1.5 rounded-lg mt-2 font-semibold">Connect Instagram</button>
            )}
          </div>

          {/* LinkedIn */}
          <div className="p-5 bg-white border border-slate-200 rounded-2xl flex flex-col items-center text-center gap-3 shadow-sm">
            <div className={`p-3 rounded-full ${isConnected("linkedin") ? "bg-sky-50 text-sky-600" : "bg-slate-100 text-slate-400"}`}>
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">LinkedIn</h3>
              <p className="text-xs text-slate-500">{isConnected("linkedin") ? getAccount("linkedin")?.account_name : "Company Page"}</p>
            </div>
            {isConnected("linkedin") ? (
              <button onClick={() => handleDisconnect("linkedin")} className="text-xs text-rose-600 font-semibold mt-2 hover:underline">Disconnect</button>
            ) : (
              <button onClick={() => handleConnect("linkedin")} className="text-xs bg-slate-900 text-white px-4 py-1.5 rounded-lg mt-2 font-semibold">Connect LinkedIn</button>
            )}
          </div>

        </div>
      </div>

      {/* Posts Section */}
      <div className="space-y-4 pt-6">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          {["all", "facebook", "instagram", "linkedin"].map(tab => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold capitalize transition-colors ${activeTab === tab ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {filteredPosts.length === 0 ? (
          <div className="p-12 text-center text-slate-400 border border-dashed border-slate-300 rounded-2xl">
            No posts found. Publish something to see it here!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPosts.map((post, i) => (
              <div key={post.id || i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-3">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-800 capitalize bg-slate-100 px-2 py-1 rounded">{post.platform}</span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {post.published_date ? new Date(post.published_date).toLocaleDateString() : "Unknown Date"}
                  </span>
                </div>
                
                {post.media && (
                  <div className="w-full h-32 bg-slate-100 rounded-xl overflow-hidden mb-2 relative border border-slate-200">
                    <img src={post.media} alt="Post media" className="object-cover w-full h-full" />
                  </div>
                )}
                
                <p className="text-sm text-slate-700 whitespace-pre-wrap flex-1 leading-relaxed">
                  {post.content}
                </p>

                {post.url && (
                  <a href={post.url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 font-semibold hover:underline mt-2">
                    View on {post.platform.charAt(0).toUpperCase() + post.platform.slice(1)} →
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
