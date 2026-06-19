import { Flame } from "lucide-react";

interface StreakFlameProps {
  days: number;
  size?: "sm" | "md" | "lg";
}

export function StreakFlame({ days, size = "md" }: StreakFlameProps) {
  const iconSize = size === "sm" ? 14 : size === "md" ? 18 : 24;
  const textClass = size === "sm" ? "text-[12px]" : size === "md" ? "text-[14px]" : "text-[18px]";

  return (
    <span className="inline-flex items-center gap-1">
      <Flame size={iconSize} strokeWidth={1.5} className="text-accent" fill="#CF5C36" />
      <span className={`font-display font-semibold text-accent ${textClass}`}>{days}</span>
    </span>
  );
}
