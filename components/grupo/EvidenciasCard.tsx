import { ClipboardList, CheckCircle2 } from "lucide-react";

interface EvidenciasCardProps {
  pending: number;
  onReview: () => void;
  onViewHistory: () => void;
}

export function EvidenciasCard({ pending, onReview, onViewHistory }: EvidenciasCardProps) {
  const hasPending = pending > 0;

  return (
    <div
      className="rounded-[18px] p-4 mb-5 border"
      style={{
        background: "var(--color-bg-card)",
        borderColor: hasPending ? "rgba(207,92,54,0.4)" : "var(--color-border)",
      }}
    >
      <div className="flex items-center gap-3 mb-2.5">
        <div
          className="w-[30px] h-[30px] rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: hasPending ? "rgba(207,92,54,0.2)" : "var(--color-surface)" }}
        >
          {hasPending
            ? <ClipboardList size={17} strokeWidth={1.5} className="text-accent" />
            : <CheckCircle2 size={17} strokeWidth={1.5} className="text-[var(--color-muted)]" />
          }
        </div>
        <span className="text-[14px] font-medium">Evidencias de la semana</span>
      </div>

      <p className="text-[12px] text-[var(--color-muted)] mb-3">
        {hasPending
          ? `${pending} evidencia${pending !== 1 ? "s" : ""} pendiente${pending !== 1 ? "s" : ""} de tus compañeros`
          : "Todo revisado por esta semana"}
      </p>

      <div className="flex flex-col gap-2">
        {hasPending && (
          <button
            onClick={onReview}
            className="w-full flex items-center justify-center gap-1.5 text-[12px] font-medium rounded-[12px] py-2.5 bg-[#CF5C36] text-white"
          >
            <ClipboardList size={14} strokeWidth={1.5} />
            Revisar evidencias
          </button>
        )}
        <button
          onClick={onViewHistory}
          className="w-full flex items-center justify-center gap-1.5 text-[12px] font-medium rounded-[12px] py-2.5 transition-opacity"
          style={{
            background: "var(--color-surface)",
            color: "var(--color-muted)",
            border: "1px solid var(--color-border)",
          }}
        >
          <ClipboardList size={14} strokeWidth={1.5} />
          Ver mis auditorías
        </button>
      </div>
    </div>
  );
}
