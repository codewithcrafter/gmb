"use client";

import { motion } from "framer-motion";

export const AuroraBackground = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-50 bg-[#020617]">
      {/* Base Noise overlay */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.15] mix-blend-overlay z-10"></div>
      
      {/* Central Aurora Swirl */}
      <motion.div
        animate={{
          transform: [
            "translate(-50%, -50%) rotate(0deg) scale(1)",
            "translate(-50%, -50%) rotate(180deg) scale(1.2)",
            "translate(-50%, -50%) rotate(360deg) scale(1)",
          ],
        }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
        className="absolute top-1/2 left-1/2 w-[120vw] h-[120vh] mix-blend-screen opacity-50"
        style={{
          background: "conic-gradient(from 90deg at 50% 50%, #4338ca 0%, #3730a3 30%, #312e81 60%, #4c1d95 80%, #4338ca 100%)",
          filter: "blur(120px)",
        }}
      />
      
      {/* Highlight Blob 1 */}
      <motion.div
        animate={{
          x: ["-20%", "40%", "-20%"],
          y: ["-20%", "40%", "-20%"],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-1/4 -left-1/4 w-[800px] h-[800px] bg-indigo-500/30 rounded-full blur-[140px] mix-blend-screen z-0"
      />
      
      {/* Highlight Blob 2 */}
      <motion.div
        animate={{
          x: ["20%", "-40%", "20%"],
          y: ["20%", "-40%", "20%"],
        }}
        transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-0 -right-1/4 w-[900px] h-[900px] bg-violet-600/20 rounded-full blur-[150px] mix-blend-screen z-0"
      />
    </div>
  );
};
