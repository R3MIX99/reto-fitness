export default function PerfilLoading() {
  return (
    <div className="px-4 pt-2 pb-28 animate-pulse">
      <div className="flex flex-col items-center gap-3 mb-6 pt-4">
        <div className="w-20 h-20 rounded-full bg-[var(--color-bg-card)]" />
        <div className="h-5 w-36 bg-[var(--color-bg-card)] rounded-full" />
        <div className="h-3 w-24 bg-[var(--color-bg-card)] rounded-full" />
      </div>
      <div className="space-y-3">
        <div className="h-[80px] bg-[var(--color-bg-card)] rounded-[16px]" />
        <div className="h-[120px] bg-[var(--color-bg-card)] rounded-[16px]" />
        <div className="h-[120px] bg-[var(--color-bg-card)] rounded-[16px]" />
      </div>
    </div>
  );
}
