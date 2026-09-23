"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, ArrowLeft, Mail, AlertCircle, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [resetLink, setResetLink] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setResetLink("");

    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await forgotPassword(email);
      setSuccessMsg(res.message || "A password reset link has been generated.");
      if (res.reset_link) {
        setResetLink(res.reset_link);
      }
    } catch (err: any) {
      setError(err.message || "Failed to process request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#FAFAFB] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Ambient background blur */}
      <div className="absolute inset-0 pointer-events-none -z-10 opacity-70">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-indigo-100/50 rounded-full blur-[140px]" />
      </div>

      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-xs font-semibold text-indigo-600">
          <Sparkles className="w-3.5 h-3.5" />
          <span>BuzzSpire Account Recovery</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Forgot your password?
        </h1>
        <p className="text-xs text-slate-500 font-medium">
          Enter your registered email address and we'll send you a password reset link.
        </p>
      </div>

      {/* Form Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="surface-card p-8 shadow-sm space-y-6">
          
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-100 flex items-start gap-2 text-rose-700 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 space-y-2 text-emerald-800 text-xs font-medium">
              <div className="flex items-center gap-2 font-bold text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
              {resetLink && (
                <div className="p-2.5 bg-white rounded-lg border border-emerald-200 text-[11px] font-mono text-slate-700 break-all select-all">
                  {resetLink}
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="owner@buzzspire.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 font-medium transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs py-3 px-4 rounded-xl shadow-sm shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              <span>{isSubmitting ? "Generating link..." : "Send Reset Link"}</span>
            </button>
          </form>

          <div className="pt-2 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to sign in</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
