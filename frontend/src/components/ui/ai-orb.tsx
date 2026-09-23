"use client";

import { motion } from "framer-motion";

export const AIOrb = ({ className }: { className?: string }) => {
  return (
    <div className={`relative flex items-center justify-center w-48 h-48 ${className}`}>
      {/* Outer Ambient Glow */}
      <motion.div
        animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.6, 0.4] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 bg-indigo-500/30 rounded-full blur-[40px] mix-blend-screen"
      />
      
      {/* Spinning Ring 1 */}
      <motion.div
        animate={{ rotate: 360, scale: [1, 1.05, 1] }}
        transition={{ rotate: { duration: 15, repeat: Infinity, ease: "linear" }, scale: { duration: 3, repeat: Infinity, ease: "easeInOut" } }}
        className="absolute w-3/4 h-3/4 rounded-full border border-indigo-400/30 border-l-indigo-400/80 blur-[1px]"
      />
      
      {/* Spinning Ring 2 (Counter-Rotate) */}
      <motion.div
        animate={{ rotate: -360, scale: [0.95, 1, 0.95] }}
        transition={{ rotate: { duration: 20, repeat: Infinity, ease: "linear" }, scale: { duration: 4, repeat: Infinity, ease: "easeInOut" } }}
        className="absolute w-2/3 h-2/3 rounded-full border border-purple-400/20 border-r-purple-400/60"
      />
      
      {/* Core Orb */}
      <motion.div
        animate={{ scale: [1, 1.02, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="relative w-1/2 h-1/2 rounded-full overflow-hidden shadow-[inset_0_0_20px_rgba(255,255,255,0.5)] bg-gradient-to-br from-indigo-300 via-indigo-600 to-purple-900"
      >
        {/* Core Specular Highlight */}
        <div className="absolute -top-4 -left-4 w-12 h-12 bg-white/40 blur-md rounded-full" />
      </motion.div>
    </div>
  );
};
