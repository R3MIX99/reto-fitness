import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "elevated";
}

export function Card({ children, className, variant = "default" }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-3xl p-4",
        variant === "default" ? "bg-[var(--color-bg-card)]" : "bg-[var(--color-bg-card2)]",
        className
      )}
    >
      {children}
    </div>
  );
}
