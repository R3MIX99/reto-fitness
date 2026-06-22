export default function MisAuditoriasLoading() {
  return (
    <div className="px-4 pt-2 pb-28 animate-pulse">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-9 h-9 rounded-full bg-[var(--color-bg-card)]" />
        <div className="h-5 w-40 bg-[var(--color-bg-card)] rounded-full" />
      </div>
      <div className="space-y-3">
        <div className="h-[120px] bg-[var(--color-bg-card)] rounded-[18px]" />
        <div className="h-[120px] bg-[var(--color-bg-card)] rounded-[18px]" />
        <div className="h-[120px] bg-[var(--color-bg-card)] rounded-[18px]" />
      </div>
    </div>
  );
}
