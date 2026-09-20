"use client";

import ScrollReveal from "@/app/components/common/ScrollReveal";
import { cn } from "@/lib/utils";

interface HeroScrollIndicatorProps {
  label?: string;
  delay?: number;
  className?: string;
}

export default function HeroScrollIndicator({
  label = "Explore",
  delay = 600,
  className,
}: HeroScrollIndicatorProps) {
  return (
    <ScrollReveal
      direction="none"
      delay={delay}
      className={cn(
        "hero-scroll-indicator w-full mt-auto pt-6 pb-2 flex flex-col items-center justify-center relative z-10 select-none pointer-events-none",
        className,
      )}
    >
      <div className="flex flex-col items-center gap-2">
        <span className="text-[11px] tracking-[0.22em] uppercase text-gray-400 dark:text-gray-400 font-medium animate-pulse-slow">
          {label}
        </span>
        <div className="w-px h-8 sm:h-10 md:h-12 bg-gradient-to-b from-gray-400 to-transparent animate-float" />
      </div>
    </ScrollReveal>
  );
}
