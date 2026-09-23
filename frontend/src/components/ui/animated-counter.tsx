"use client";

import { useEffect, useState } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

export const AnimatedCounter = ({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) => {
  const spring = useSpring(0, { mass: 1, stiffness: 50, damping: 20 });
  const display = useTransform(spring, (current) => {
    // Format to 1 decimal place if it's a small float, else integer
    const formatted = value % 1 !== 0 
      ? current.toFixed(1)
      : Math.floor(current).toLocaleString();
    return `${prefix}${formatted}${suffix}`;
  });

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  return <motion.span className="tabular-nums">{display}</motion.span>;
};
