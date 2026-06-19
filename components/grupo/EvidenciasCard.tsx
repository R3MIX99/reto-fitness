import { ClipboardList, FileImage } from "lucide-react";

interface EvidenciasCardProps {
  pending: number;
  onReview: () => void;
}

export function EvidenciasCard({ pending, onReview }: EvidenciasCardProps) {
  return (
    <div className="bg-[var(--color-bg-card)] rounded-[18px] p-4 mb-5 border border-accent/40">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2.5">
        <div className="w-[30px] h-[30px] rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
          <FileImage size={17} strokeWidth={1.5} className="text-accent" />
        </div>
        <span className="text-[14px] font-medium">Evidencias por revisar</span>
      </div>

      {/* Subtitle */}
      <p className="text-[12px] text-[var(--color-muted)] mb-3">
        Auditoría de la semana · {pending} pendiente{pending !== 1 ? "s" : ""}
      </p>

      {/* Button */}
      <button
        onClick={onReview}
        className="w-full flex items-center justify-center gap-1.5 bg-accent text-white text-[12px] font-medium rounded-[12px] py-2.5"
      >
        <ClipboardList size={14} strokeWidth={1.5} />
        Revisar evidencias
      </button>
    </div>
  );
}
