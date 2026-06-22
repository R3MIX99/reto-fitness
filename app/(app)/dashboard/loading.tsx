export default function DashboardLoading() {
  return (
    <div className="px-4 pt-2 pb-28 space-y-3 animate-pulse">
      <div className="h-[120px] bg-[var(--color-bg-card)] rounded-[18px]" />
      <div className="flex gap-2.5">
        <div className="flex-1 h-[64px] bg-[var(--color-bg-card)] rounded-[18px]" />
        <div className="flex-1 h-[64px] bg-[var(--color-bg-card)] rounded-[18px]" />
      </div>
      <div className="h-[180px] bg-[var(--color-bg-card)] rounded-[18px]" />
    </div>
  );
}
