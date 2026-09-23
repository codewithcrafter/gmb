"use client";

import { motion } from "framer-motion";

export const Sparkline = ({ data, color = "#4F46E5" }: { data: number[]; color?: string }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  // Normalize points between 0 and 100 for SVG
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((d - min) / range) * 100;
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="w-full h-12 relative overflow-hidden">
      <svg viewBox="0 -10 100 120" preserveAspectRatio="none" className="w-full h-full overflow-visible">
        {/* Gradient Definition */}
        <defs>
          <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Fill under the line */}
        <motion.polygon
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
          points={`0,100 ${points} 100,100`}
          fill={`url(#gradient-${color})`}
        />

        {/* The Animated Stroke */}
        <motion.polyline
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="drop-shadow-[0_0_8px_rgba(var(--color),0.8)]"
          style={{ "--color": color } as any}
        />
      </svg>
    </div>
  );
};
