"use client";

import { useEffect, useRef } from "react";
import { countDirection } from "@/lib/count-direction";

/** A number that rolls up or down when it changes. */
export function AnimatedCount({ value, className = "" }: { value: number; className?: string }) {
  const prev = useRef<number | null>(null);
  const dir = countDirection(prev.current, value);
  useEffect(() => {
    prev.current = value;
  }, [value]);
  return (
    <span className={`inline-flex justify-center overflow-hidden ${className}`} aria-live="polite">
      <span key={value} className={dir ? `inline-block anim-count-${dir}` : "inline-block"}>{value}</span>
    </span>
  );
}
