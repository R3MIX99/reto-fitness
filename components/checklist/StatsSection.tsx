"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Calendar, TrendingUp, ChevronDown, ChevronUp } from "lucide-react";
import type { DailyCheck, CategoryView } from "@/lib/hooks/useChecklist";
import { CATEGORY_CONFIG } from "@/lib/hooks/useChecklist";

// ── Tipos ──────────────────────────────────────────────────────────────────

interface DaySummary {
  day: number;
  gym: boolean;
  dietDone: number;
  dietTotal: number;
  goalsDone: number;
  goalsTotal: number;
  pts: number;
  pct: number;
}

interface StatsSectionProps {
  checks: DailyCheck[];
  dietTotal: number;
  goalsTotal: number;
  view: CategoryView;
  onViewChange: (v: CategoryView) => void;
  onDaySelect?: (dateStr: string | null) => void;
}

const ORDER: CategoryView[] = ["general", "ejercicio", "dieta", "metas"];

// ── Donut SVG ──────────────────────────────────────────────────────────────

function Donut({ pct, color, size = 44 }: { pct: number; color: string; size?: number }) {
  const r = size * 0.41;
  const sw = size * 0.114;
  const C = 2 * Math.PI * r;
  const off = C * (1 - pct / 100);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-surface)" strokeWidth={sw} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color}
        strokeWidth={sw} strokeLinecap="round"
        strokeDasharray={C.toFixed(1)} strokeDashoffset={off.toFixed(1)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x={size / 2} y={size / 2 + 4} textAnchor="middle" fontSize={size * 0.25}
        fontWeight="500" fill="var(--color-fg)">{pct}%</text>
    </svg>
  );
}

// ── Bar Chart ──────────────────────────────────────────────────────────────

function BarChart({ checks, view, month, dietTotal, goalsTotal }: { checks: DailyCheck[]; view: CategoryView; month: string; dietTotal: number; goalsTotal: number }) {
  const cfg = CATEGORY_CONFIG[view];
  const weeks = [1, 2, 3, 4];
  const weekPcts = weeks.map((w) => {
    const start = (w - 1) * 7 + 1;
    const end = w * 7;
    const days: number[] = [];
    for (let d = start; d <= end; d++) days.push(d);
    const dayStrs = days.map((d) => `${month}-${String(d).padStart(2, "0")}`);

    if (view === "general") {
      const maxPts = days.length * 13;
      let pts = 0;
      for (const ds of dayStrs) {
        const dc = checks.filter((c) => c.check_date === ds && c.status !== "rejected");
        const gymPts = dc.some((c) => c.kind === "gym") ? 3 : 0;
        const dietDone = dc.filter((c) => c.kind === "diet").length;
        const goalDone = dc.filter((c) => c.kind === "goal").length;
        pts += gymPts + (dietTotal > 0 ? Math.floor((dietDone / dietTotal) * 5) : 0) + (goalsTotal > 0 ? Math.floor((goalDone / goalsTotal) * 5) : 0);
      }
      return Math.min(100, Math.round((pts / maxPts) * 100));
    }
    const relevant = checks.filter((c) => dayStrs.includes(c.check_date) && viewMatchesKind(view, c.kind) && c.status !== "rejected");
    if (view === "ejercicio") return Math.min(100, Math.round((new Set(relevant.map((c) => c.check_date)).size / days.length) * 100));
    if (view === "dieta") return Math.min(100, dietTotal > 0 ? Math.round((relevant.length / (days.length * dietTotal)) * 100) : 0);
    if (view === "metas") return Math.min(100, goalsTotal > 0 ? Math.round((relevant.length / (days.length * goalsTotal)) * 100) : 0);
    return 0;
  });

  const maxH = 70;
  return (
    <div className="flex items-end justify-between gap-2 px-1" style={{ height: maxH + 20 }}>
      {weeks.map((w, i) => (
        <div key={w} className="flex-1 flex flex-col items-center gap-1.5 justify-end">
          <div
            className="w-full rounded-t-[6px] transition-all duration-300"
            style={{
              height: Math.max(4, (weekPcts[i] / 100) * maxH),
              background: `linear-gradient(to top, ${cfg.color}, #EEE5E9)`,
            }}
          />
          <span className="text-[9px] text-[var(--color-muted)]">S{w}</span>
        </div>
      ))}
    </div>
  );
}

// ── Calendar ───────────────────────────────────────────────────────────────

function CalendarGrid({
  checks, view, expanded, onToggleExpand, dietTotal, goalsTotal, onDaySelect,
}: {
  checks: DailyCheck[];
  view: CategoryView;
  expanded: boolean;
  onToggleExpand: () => void;
  dietTotal: number;
  goalsTotal: number;
  onDaySelect?: (dateStr: string | null) => void;
}) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const now = new Date();

  function selectDay(d: number | null) {
    setSelectedDay(d);
    if (onDaySelect) {
      if (d === null) {
        onDaySelect(null);
      } else {
        const mm = String(now.getMonth() + 1).padStart(2, "0");
        const dd = String(d).padStart(2, "0");
        onDaySelect(`${now.getFullYear()}-${mm}-${dd}`);
      }
    }
  }
  const cfg = CATEGORY_CONFIG[view];
  const today = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const firstDow = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
  const offset = firstDow === 0 ? 6 : firstDow - 1;

  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  function getDaySummary(day: number): DaySummary {
    const dateStr = `${month}-${String(day).padStart(2, "0")}`;
    const dc = checks.filter((c) => c.check_date === dateStr && c.status !== "rejected");
    const gym = dc.some((c) => c.kind === "gym");
    const dietDone = dc.filter((c) => c.kind === "diet").length;
    const goalsDone = dc.filter((c) => c.kind === "goal").length;
    const gymPts = gym ? 3 : 0;
    const safeDiet = Number(dietTotal) || 0;
    const safeGoals = Number(goalsTotal) || 0;
    const dietPts = safeDiet > 0 ? Math.floor((dietDone / safeDiet) * 5) : 0;
    const goalPts = safeGoals > 0 ? Math.floor((goalsDone / safeGoals) * 5) : 0;
    const pts = gymPts + dietPts + goalPts;
    return { day, gym, dietDone, dietTotal: safeDiet, goalsDone, goalsTotal: safeGoals, pts, pct: Math.round((pts / 13) * 100) };
  }

  function isDone(day: number): boolean {
    const s = getDaySummary(day);
    if (view === "ejercicio") return s.gym;
    if (view === "dieta")    return s.dietTotal > 0 && s.dietDone >= s.dietTotal;
    if (view === "metas")    return s.goalsTotal > 0 && s.goalsDone >= s.goalsTotal;
    // General: las tres categorías completas (si existen)
    if (view === "general") {
      const gymOk  = s.gym;
      const dietOk = s.dietTotal === 0 || s.dietDone >= s.dietTotal;
      const goalOk = s.goalsTotal === 0 || s.goalsDone >= s.goalsTotal;
      return gymOk && dietOk && goalOk;
    }
    return false;
  }

  const cellSize = expanded ? 42 : 36;

  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const DAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];

  return (
    <div>
      <div className="flex items-center gap-2 mb-2.5">
        <Calendar size={15} strokeWidth={1.5} className="text-warm" />
        <span className="text-[14px] font-medium">Calendario</span>
        <span className="text-[11px] text-[var(--color-muted)]">· {cfg.label}</span>
        <button onClick={onToggleExpand} className="ml-auto text-[var(--color-muted)]">
          {expanded ? <ChevronUp size={14} strokeWidth={1.5} /> : <ChevronDown size={14} strokeWidth={1.5} />}
        </button>
      </div>

      <div className="bg-[var(--color-bg-card)] rounded-[16px] p-3">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {DAY_LABELS.map((l, i) => (
            <span key={i} className="text-[9px] text-[var(--color-muted)] text-center">{l}</span>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) =>
            d === null ? <div key={`e-${i}`} /> : (
              <button
                key={d}
                onClick={() => selectDay(selectedDay === d ? null : d)}
                className="flex items-center justify-center rounded-full transition-colors mx-auto"
                style={{
                  width: cellSize, height: cellSize,
                  background: selectedDay === d ? "#EFC88B" : isDone(d) ? cfg.color : "transparent",
                  border: d === today && selectedDay !== d ? "1.5px solid #EFC88B" : "none",
                  color: selectedDay === d ? "#0a0a0a" : isDone(d) ? cfg.textDark : d === today ? "#EFC88B" : "#7C7C7C",
                  fontSize: expanded ? 13 : 11,
                }}
              >
                {d}
              </button>
            )
          )}
        </div>

        {/* Day summary */}
        {selectedDay && (() => {
          const s = getDaySummary(selectedDay);
          const isToday = selectedDay === today;
          const _mm = String(now.getMonth() + 1).padStart(2, "0");
          const _dd = String(selectedDay).padStart(2, "0");
          const dayLabel = isToday ? "Hoy" : `${_dd}/${_mm}`;
          return (
            <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--color-border)" }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-medium">{dayLabel}</span>
                <span className="text-[12px] text-warm font-medium">{s.pts}/13 pts</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[12px]">
                  <span className="text-[var(--color-muted)]">Ejercicio</span>
                  <span>{s.gym ? "3 pts" : "0/3 pts"}</span>
                </div>
                <div className="flex justify-between text-[12px]">
                  <span className="text-[var(--color-muted)]">Dieta ({s.dietDone}/{s.dietTotal})</span>
                  <span>{s.dietTotal > 0 ? Math.floor((s.dietDone / s.dietTotal) * 5) : 0}/5 pts</span>
                </div>
                <div className="flex justify-between text-[12px]">
                  <span className="text-[var(--color-muted)]">Metas ({s.goalsDone}/{s.goalsTotal})</span>
                  <span>{s.goalsTotal > 0 ? Math.floor((s.goalsDone / s.goalsTotal) * 5) : 0}/5 pts</span>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Expand/Collapse button */}
      <button
        onClick={onToggleExpand}
        className="w-full text-center text-[12px] text-[var(--color-muted)] py-1.5"
      >
        {expanded ? "Contraer calendario" : "Expandir calendario"}
      </button>
    </div>
  );
}

// ── Helper ─────────────────────────────────────────────────────────────────

function viewMatchesKind(view: CategoryView, kind: string): boolean {
  if (view === "general") return true;
  if (view === "ejercicio") return kind === "gym";
  if (view === "dieta") return kind === "diet";
  if (view === "metas") return kind === "goal";
  return false;
}

function calcPct(checks: DailyCheck[], view: CategoryView, dietTotal: number, goalsTotal: number): number {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const today = now.getDate();
  if (today === 0) return 0;

  const nonRejected = checks.filter((c) => c.status !== "rejected");
  if (view === "general") {
    const maxPts = today * 13;
    let pts = 0;
    for (let d = 1; d <= today; d++) {
      const ds = `${month}-${String(d).padStart(2, "0")}`;
      const dc = nonRejected.filter((c) => c.check_date === ds);
      const gymPts = dc.some((c) => c.kind === "gym") ? 3 : 0;
      const dietDone = dc.filter((c) => c.kind === "diet").length;
      const goalDone = dc.filter((c) => c.kind === "goal").length;
      pts += gymPts + (dietTotal > 0 ? Math.floor((dietDone / dietTotal) * 5) : 0) + (goalsTotal > 0 ? Math.floor((goalDone / goalsTotal) * 5) : 0);
    }
    return Math.min(100, Math.round((pts / maxPts) * 100));
  }
  if (view === "ejercicio") {
    const done = new Set(nonRejected.filter((c) => c.kind === "gym").map((c) => c.check_date)).size;
    return Math.round((done / today) * 100);
  }
  if (view === "dieta") {
    if (dietTotal === 0) return 0;
    const done = nonRejected.filter((c) => c.kind === "diet").length;
    return Math.min(100, Math.round((done / (today * dietTotal)) * 100));
  }
  if (view === "metas") {
    if (goalsTotal === 0) return 0;
    const done = nonRejected.filter((c) => c.kind === "goal").length;
    return Math.min(100, Math.round((done / (today * goalsTotal)) * 100));
  }
  return 0;
}

// ── Main Component ─────────────────────────────────────────────────────────

export function StatsSection({ checks, dietTotal, goalsTotal, view, onViewChange, onDaySelect }: StatsSectionProps) {
  const cardsRef = useRef<HTMLDivElement>(null);
  const [thumbLeft, setThumbLeft] = useState(0);
  const [thumbWidth, setThumbWidth] = useState(24);
  const [calExpanded, setCalExpanded] = useState(false);

  const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthName = MESES[now.getMonth()];

  // Swipe on the stats stage
  const swipeX = useRef<number | null>(null);

  function handlePointerDown(e: React.PointerEvent) {
    swipeX.current = e.clientX;
  }
  function handlePointerUp(e: React.PointerEvent) {
    if (swipeX.current === null) return;
    const dx = e.clientX - swipeX.current;
    swipeX.current = null;
    if (Math.abs(dx) < 30) return;
    const i = ORDER.indexOf(view);
    onViewChange(dx < 0 ? ORDER[(i + 1) % 4] : ORDER[(i + 3) % 4]);
  }

  // Scroll thumb
  const updateThumb = useCallback(() => {
    const el = cardsRef.current;
    if (!el) return;
    const trackW = 56;
    const ratio = el.clientWidth / el.scrollWidth;
    const tw = Math.max(18, Math.round(trackW * ratio));
    const max = el.scrollWidth - el.clientWidth;
    const p = max > 0 ? el.scrollLeft / max : 0;
    setThumbWidth(tw);
    setThumbLeft(Math.round(p * (trackW - tw)));
  }, []);

  useEffect(() => {
    const el = cardsRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateThumb);
    updateThumb();
    return () => el.removeEventListener("scroll", updateThumb);
  }, [updateThumb]);

  const cfg = CATEGORY_CONFIG[view];
  const pct = calcPct(checks, view, dietTotal, goalsTotal);

  return (
    <div>
      {/* Category cards */}
      <div
        ref={cardsRef}
        className="flex gap-2.5 overflow-x-auto no-scrollbar pb-0.5 scroll-smooth -mx-4"
        style={{ scrollSnapType: "x mandatory", scrollPaddingLeft: 16 }}
      >
        <div className="w-4 flex-shrink-0" />
        {ORDER.map((cat) => {
          const c = CATEGORY_CONFIG[cat];
          const p = calcPct(checks, cat, dietTotal, goalsTotal);
          const active = cat === view;
          return (
            <button
              key={cat}
              onClick={() => onViewChange(cat)}
              className="flex-shrink-0 w-[88px] rounded-[16px] p-3 flex flex-col items-center gap-1.5 border transition-colors"
              style={{
                scrollSnapAlign: "start",
                background: active ? c.tint : "var(--color-bg-card)",
                borderColor: active ? c.color : "var(--color-border)",
              }}
            >
              <Donut pct={p} color={c.color} size={44} />
              <span className="text-[11px]" style={{ color: active ? c.color : "#7C7C7C", fontWeight: active ? 500 : 400 }}>
                {c.label}
              </span>
            </button>
          );
        })}
        <div className="w-4 flex-shrink-0" />
      </div>

      {/* Scroll indicator */}
      <div className="flex justify-center my-2.5">
        <div className="relative w-14 h-1 rounded-full" style={{ background: "rgba(124,124,124,0.22)" }}>
          <div
            className="absolute top-0 h-1 rounded-full transition-all duration-150"
            style={{ width: thumbWidth, left: thumbLeft, background: "var(--color-muted)" }}
          />
        </div>
      </div>

      {/* Swipeable stage */}
      <div
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        style={{ touchAction: "pan-y" }}
      >
        {/* Bar chart */}
        <div className="bg-[var(--color-bg-card)] rounded-[18px] p-4 mb-3.5">
          <div className="flex justify-between items-baseline mb-3">
            <span className="text-[12px] text-[var(--color-muted)]">
              Progreso de {monthName} · {cfg.label}
            </span>
            <span className="font-display font-medium text-[18px]" style={{ color: cfg.color }}>
              {pct}%
            </span>
          </div>
          <BarChart checks={checks} view={view} month={month} dietTotal={dietTotal} goalsTotal={goalsTotal} />
        </div>

        {/* Calendar */}
        <CalendarGrid
          checks={checks}
          view={view}
          expanded={calExpanded}
          onToggleExpand={() => setCalExpanded((e) => !e)}
          dietTotal={dietTotal}
          goalsTotal={goalsTotal}
          onDaySelect={onDaySelect}
        />

        {/* Dots indicator */}
        <div className="flex justify-center gap-1.5 mt-2 mb-1">
          {ORDER.map((cat) => (
            <div
              key={cat}
              className="rounded-full transition-all"
              style={{
                width: cat === view ? 14 : 5,
                height: 5,
                background: cat === view ? cfg.color : "var(--color-border)",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
