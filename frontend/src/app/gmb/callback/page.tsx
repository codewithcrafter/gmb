"use client";

import { useEffect, useState, useRef, Suspense } from "react";

import { useRouter, useSearchParams } from "next/navigation";
import { useGmb } from "@/context/GmbContext";
import { Sparkles, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";

function GmbCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const { handleCallback } = useGmb();

  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [errorMsg, setErrorMsg] = useState<string>("");

  const processedRef = useRef(false);

  useEffect(() => {
    if (!code || processedRef.current) return;
    processedRef.current = true;

    let isMounted = true;

    const processCode = async () => {
      try {
        await handleCallback(code);
        if (isMounted) {
          setStatus("success");
          setTimeout(() => {
            router.push("/dashboard?status=connected");
          }, 1000);
        }
      } catch (err: any) {
        if (isMounted) {
          setStatus("error");
          setErrorMsg(err.message || "Failed to complete Google OAuth authentication.");
        }
      }
    };

    processCode();

    return () => {
      isMounted = false;
    };
  }, [code, handleCallback, router]);


  return (
    <div className="surface-card p-8 max-w-md w-full text-center space-y-6 shadow-xl border border-slate-200">
      <div className="w-14 h-14 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center mx-auto text-indigo-600">
        <Sparkles className="w-7 h-7" />
      </div>

      {status === "processing" && (
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2 text-indigo-600 font-semibold text-sm">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Connecting Google Business Account...</span>
          </div>
          <p className="text-xs text-slate-500">
            Securely exchanging authorization tokens and fetching your business profiles.
          </p>
        </div>
      )}

      {status === "success" && (
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2 text-emerald-600 font-bold text-sm">
            <CheckCircle2 className="w-5 h-5" />
            <span>Google Account Connected!</span>
          </div>
          <p className="text-xs text-slate-500">
            Redirecting to location selector...
          </p>
        </div>
      )}

      {status === "error" && (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-2 text-rose-600 font-bold text-sm">
            <AlertCircle className="w-5 h-5" />
            <span>Connection Failed</span>
          </div>
          <p className="text-xs text-slate-600 bg-rose-50 border border-rose-100 p-3 rounded-xl">
            {errorMsg}
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold py-2.5 rounded-xl transition-all"
          >
            Return to Dashboard
          </button>
        </div>
      )}
    </div>
  );
}

export default function GmbCallbackPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFB] flex flex-col items-center justify-center p-4">
      <Suspense fallback={<div className="surface-card p-8 text-xs text-slate-500">Loading callback...</div>}>
        <GmbCallbackContent />
      </Suspense>
    </div>
  );
}
