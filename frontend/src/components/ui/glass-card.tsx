"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export const GlassCard = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  const divRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current || isFocused) return;
    const div = divRef.current;
    const rect = div.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div className="relative group rounded-[24px]">
      {/* Animated Gradient Border Layer */}
      <div className="absolute -inset-[1px] rounded-[24px] bg-gradient-to-br from-indigo-500/30 via-transparent to-purple-500/30 opacity-0 group-hover:opacity-100 transition duration-700 blur-[2px]" />
      
      <motion.div
        ref={divRef}
        onMouseMove={handleMouseMove}
        onFocus={() => { setIsFocused(true); setOpacity(1); }}
        onBlur={() => { setIsFocused(false); setOpacity(0); }}
        onMouseEnter={() => setOpacity(1)}
        onMouseLeave={() => setOpacity(0)}
        whileHover={{ y: -4, scale: 1.01 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className={cn(
          "relative flex h-full w-full flex-col overflow-hidden rounded-[24px] glass-panel z-10 transition-all duration-300",
          className
        )}
      >
        {/* Dynamic Inner Glow Spotlight */}
        <div
          className="pointer-events-none absolute inset-0 opacity-0 transition duration-500 z-0 mix-blend-soft-light"
          style={{
            opacity,
            background: `radial-gradient(800px circle at ${position.x}px ${position.y}px, rgba(255,255,255,0.1), transparent 40%)`,
          }}
        />
        {/* Top-Left Specular Highlight for Glass Volume */}
        <div className="absolute inset-0 rounded-[24px] pointer-events-none z-0 border border-white/10 [mask-image:linear-gradient(to_bottom_right,white,transparent_40%)]" />
        
        <div className="relative z-10 w-full h-full flex flex-col">{children}</div>
      </motion.div>
    </div>
  );
};
