"use client";

import { useGmb } from "@/context/GmbContext";
import { 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck, 
  ArrowRight, 
  RefreshCw, 
  Mail, 
  Clock, 
  Building2 
} from "lucide-react";

export default function ConnectGmbCard() {
  const { connected, connectedEmail, expiresAt, loading, error, connect, checkStatus } = useGmb();

  const formattedExpiry = expiresAt 
    ? new Date(expiresAt).toLocaleDateString(undefined, { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      }) 
    : null;

  if (loading) {
    return (
      <div className="surface-card p-6 bg-white border border-slate-200 rounded-3xl flex items-center justify-between shadow-xs animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center" />
          <div className="space-y-2">
            <div className="w-48 h-4 bg-slate-200 rounded" />
            <div className="w-32 h-3 bg-slate-100 rounded" />
          </div>
        </div>
        <div className="w-28 h-8 bg-slate-100 rounded-xl" />
      </div>
    );
  }

  if (connected) {
    return (
      <div className="surface-card p-5 bg-gradient-to-r from-emerald-900/90 via-slate-900 to-slate-950 text-white rounded-3xl border border-emerald-500/30 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-400 flex items-center justify-center font-bold shrink-0 mt-0.5 sm:mt-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-xs font-bold text-emerald-300">
                  Connected Successfully
                </span>
                <span className="text-xs text-slate-400 font-mono hidden sm:inline">• OAuth 2.0 Active</span>
              </div>

              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-400" />
                <span>Google Business Profile Linked</span>
              </h3>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-0.5">
                <span className="flex items-center gap-1.5 font-medium">
                  <Mail className="w-3.5 h-3.5 text-emerald-400" />
                  <strong className="text-white">{connectedEmail || "owner.google@buzzspire.com"}</strong>
                </span>

                {formattedExpiry && (
                  <span className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Expires: {formattedExpiry} (Auto-refresh)</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <button
              onClick={checkStatus}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 transition-colors"
              title="Refresh Connection Status"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={connect}
              className="text-xs font-semibold text-emerald-300 hover:text-white bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/30 px-3.5 py-2 rounded-xl transition-all"
            >
              Reconnect Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="surface-card p-6 sm:p-8 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-3xl relative overflow-hidden shadow-xl border border-indigo-800/30">
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      
      <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-semibold text-indigo-200 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Milestone 1: Google OAuth Integration</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Connect Your Google Business Profile
          </h2>

          <p className="text-xs sm:text-sm text-indigo-200/90 leading-relaxed">
            Securely link your official Google account to manage your business presence, 
            receive automated token refreshes, and enable real-time local SaaS tools.
          </p>

          <div className="flex flex-wrap gap-4 pt-1 text-xs text-indigo-200 font-medium">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> AES-256 Encrypted Storage
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Automatic Token Refresh
            </span>
          </div>
        </div>

        <div className="w-full lg:w-auto shrink-0 space-y-2">
          <button
            onClick={connect}
            disabled={loading}
            className="w-full lg:w-auto bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs sm:text-sm py-3 px-6 rounded-2xl shadow-lg shadow-black/20 hover:shadow-indigo-500/20 transition-all flex items-center justify-center gap-3 cursor-pointer group disabled:opacity-60"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.15C3.26 21.3 7.31 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.39l3.99-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.61l3.99 3.15c.95-2.85 3.6-4.96 6.72-4.96z"
              />
            </svg>
            <span>{loading ? "Connecting..." : "Connect Google Business"}</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>

          {error && (
            <p className="text-[11px] text-rose-300 font-medium text-center">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
