"use client";

import { motion } from "framer-motion";
import { 
  Bot, 
  Cpu, 
  Terminal, 
  Activity, 
  CheckCircle2, 
  Clock, 
  Zap, 
  Server
} from "lucide-react";

const AGENTS_LIST = [
  {
    id: "agent-1",
    name: "Review Sentiment & Response Architect",
    model: "Google Gemini 2.5 Pro",
    status: "Active (Listening)",
    trigger: "GMB Webhook Event",
    executions: "12,482",
    avgLatency: "1.2s",
    successRate: "99.8%",
    lastRun: "2 mins ago",
    logs: [
      "[09:42:01] Received payload: Review_ID_492 (5 Stars)",
      "[09:42:01] LangGraph Pipeline initiated -> Sentiment (Positive: 0.98)",
      "[09:42:02] Synthesized response using brand guidelines.",
      "[09:42:02] Response queued for human approval."
    ]
  },
  {
    id: "agent-2",
    name: "Google Posts Content Generator",
    model: "Google Gemini 2.5 Flash",
    status: "Idle (Scheduled)",
    trigger: "Cron Job (Weekly)",
    executions: "4,120",
    avgLatency: "3.5s",
    successRate: "98.4%",
    lastRun: "1 day ago",
    logs: [
      "[Yesterday 09:00] Cron trigger fired.",
      "[Yesterday 09:01] Generated post copy for 3 locations.",
      "[Yesterday 09:02] Image prompt rendered & attached.",
      "[Yesterday 09:02] Scheduled for Friday at 9:00 AM."
    ]
  },
  {
    id: "agent-3",
    name: "Local SEO Profile Auditor",
    model: "LangGraph Multi-Agent",
    status: "Idle (Scheduled)",
    trigger: "Cron Job (Daily)",
    executions: "892",
    avgLatency: "8.4s",
    successRate: "100%",
    lastRun: "6 hours ago",
    logs: [
      "[04:00:01] Daily audit initiated across 3 profiles.",
      "[04:00:05] NAP consistency check: 100% match.",
      "[04:00:08] Category optimization check: Complete.",
      "[04:00:09] Audit complete. Zero critical issues."
    ]
  }
];

export default function AgentsPage() {
  return (
    <div className="space-y-6">
      {/* Infrastructure Telemetry Header */}
      <div className="pb-4 border-b border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 mb-1">
              <Server className="w-3.5 h-3.5" />
              <span>LangGraph Infrastructure</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">AI Control Center</h1>
            <p className="text-xs text-slate-500">Monitor multi-agent execution telemetry, latency, and worker logs.</p>
          </div>

          <div className="flex items-center gap-3">
            <button className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm">
              <Zap className="w-3.5 h-3.5" /> Deploy New Agent
            </button>
          </div>
        </div>

        {/* Telemetry Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
          <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Cluster Status</span>
            <div className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Optimal (100% Uptime)
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Executions</span>
            <div className="text-sm font-bold text-slate-900">17,494 <span className="text-xs font-normal text-slate-500">cycles</span></div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Avg Latency</span>
            <div className="text-sm font-bold text-slate-900">1.8s <span className="text-xs font-semibold text-emerald-600">-0.2s</span></div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Queue Backlog</span>
            <div className="text-sm font-bold text-indigo-600">0 tasks queued</div>
          </div>
        </div>
      </div>

      {/* Worker List */}
      <div className="space-y-4">
        {AGENTS_LIST.map((agent) => (
          <div key={agent.id} className="rounded-2xl bg-white border border-slate-200/80 p-5 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{agent.name}</h3>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                    <span>Model: <strong className="text-slate-800 font-mono text-[11px]">{agent.model}</strong></span>
                    <span>• Trigger: <strong className="text-slate-800">{agent.trigger}</strong></span>
                  </div>
                </div>
              </div>

              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {agent.status}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-slate-500">
              <div>
                <span className="block text-[10px] uppercase font-bold text-slate-400">Executions</span>
                <span className="text-xs font-bold text-slate-900">{agent.executions}</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase font-bold text-slate-400">Avg Latency</span>
                <span className="text-xs font-bold text-slate-900">{agent.avgLatency}</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase font-bold text-slate-400">Success Rate</span>
                <span className="text-xs font-bold text-emerald-600">{agent.successRate}</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase font-bold text-slate-400">Last Execution</span>
                <span className="text-xs font-bold text-slate-900">{agent.lastRun}</span>
              </div>
            </div>

            {/* Monospace Log Stream */}
            <div className="rounded-xl bg-slate-900 p-3.5 font-mono text-[11px] space-y-1 text-slate-300">
              <div className="flex items-center justify-between text-slate-500 pb-1 border-b border-slate-800 text-[10px] mb-2">
                <span className="flex items-center gap-1.5">
                  <Terminal className="w-3 h-3 text-indigo-400" />
                  Live Stream Log
                </span>
                <span>stdout</span>
              </div>

              {agent.logs.map((log, i) => (
                <div key={i} className="text-slate-300">
                  {log}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
