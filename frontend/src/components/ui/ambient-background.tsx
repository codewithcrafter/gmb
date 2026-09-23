"use client";

import { motion } from "framer-motion";

export const AmbientBackground = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-50 bg-[#050816]">
      {/* Deep Space Background Layer */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
      
      {/* Animated Glowing Orbs */}
      <motion.div
        animate={{
          x: ["-10%", "100%", "-10%"],
          y: ["-20%", "50%", "-20%"],
          scale: [1, 1.2, 1],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        className="absolute -top-1/4 -left-1/4 w-[800px] h-[800px] bg-indigo-600/30 rounded-full blur-[120px] mix-blend-screen"
      />
      
      <motion.div
        animate={{
          x: ["100%", "-10%", "100%"],
          y: ["50%", "-20%", "50%"],
          scale: [1, 1.5, 1],
        }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        className="absolute top-1/4 -right-1/4 w-[600px] h-[600px] bg-purple-900/40 rounded-full blur-[100px] mix-blend-screen"
      />
      
      <motion.div
        animate={{
          x: ["50%", "0%", "50%"],
          y: ["100%", "0%", "100%"],
          scale: [1, 1.3, 1],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute -bottom-1/4 left-1/4 w-[700px] h-[700px] bg-blue-900/30 rounded-full blur-[130px] mix-blend-screen"
      />
    </div>
  );
};
