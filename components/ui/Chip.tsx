import { cn } from "@/lib/utils";

interface ChipProps {
  children: React.ReactNode;
  variant?: "warm" | "muted" | "accent";
  className?: string;
}

export function Chip({ children, variant = "muted", className }: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium border",
        variant === "warm" && "border-warm/40 text-warm bg-warm/10",
        variant === "muted" && "border-[#2a2a2a] text-[var(--color-muted)] bg-transparent",
        variant === "accent" && "border-accent/40 text-accent bg-accent/10",
        className
      )}
    >
      {children}
    </span>
  );
}
