export default function ChecklistLoading() {
  return (
    <div className="px-4 pt-2 pb-28 space-y-3 animate-pulse">
      <div className="h-[150px] bg-[var(--color-bg-card)] rounded-[18px]" />
      <div className="h-px my-4" style={{ background: "var(--color-border)" }} />
      <div className="h-[70px] bg-[var(--color-bg-card)] rounded-[18px]" />
      <div className="h-[120px] bg-[var(--color-bg-card)] rounded-[18px]" />
      <div className="h-[120px] bg-[var(--color-bg-card)] rounded-[18px]" />
    </div>
  );
}
