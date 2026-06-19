import { cn } from "@/lib/utils";

interface PillButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

export function PillButton({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: PillButtonProps) {
  return (
    <button
      className={cn(
        "rounded-pill font-medium transition-opacity active:opacity-75 disabled:opacity-40",
        variant === "primary" && "bg-accent text-white",
        variant === "secondary" && "bg-[var(--color-bg-card)] text-[var(--color-fg)]",
        variant === "ghost" && "text-[var(--color-muted)]",
        size === "sm" && "px-3 py-1.5 text-[12px]",
        size === "md" && "px-5 py-2.5 text-[14px]",
        size === "lg" && "px-6 py-3.5 text-[15px] w-full",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
