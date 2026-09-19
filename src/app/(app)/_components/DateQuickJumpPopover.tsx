"use client";

import { useEffect, useRef, useState } from "react";
import { getMonthGrid } from "@/lib/calendarGrid";
import { toLocalDateStr, TODAY } from "@/lib/date";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAY_INITIALS = ["S", "M", "T", "W", "T", "F", "S"];

// Lightweight "jump to a date" control anchored under the header's calendar
// button — deliberately NOT a preview of Phase 4's real Dashboard calendar
// (no per-day data, no goal-hit coloring, just click-a-day-to-jump). Shares
// only the pure month-grid math (getMonthGrid) with that future component,
// not any rendering.
export function DateQuickJumpPopover({
  selectedDate,
  onPick,
  onClose,
}: {
  selectedDate: string;
  onPick: (date: string) => void;
  onClose: () => void;
}) {
  const selected = new Date(selectedDate + "T00:00:00");
  const [viewYear, setViewYear] = useState(selected.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected.getMonth());
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onClickOutside);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, [onClose]);

  const cells = getMonthGrid(viewYear, viewMonth);
  const todayStr = TODAY();

  const shiftMonth = (delta: number) => {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  return (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label="Jump to date"
      className="absolute top-[calc(100%+6px)] right-0 bg-card border border-border p-2.5 w-60 z-20 shadow-xl"
    >
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => shiftMonth(-1)} aria-label="Previous month" className="nav-btn w-7 h-7">
          ‹
        </button>
        <div className="text-[13px] font-semibold">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </div>
        <button onClick={() => shiftMonth(1)} aria-label="Next month" className="nav-btn w-7 h-7">
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {WEEKDAY_INITIALS.map((w, i) => (
          <div key={i} className="text-center text-[10px] text-muted-foreground">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const dStr = toLocalDateStr(d);
          const isSelected = dStr === selectedDate;
          const isToday = dStr === todayStr;
          return (
            <button
              key={i}
              onClick={() => onPick(dStr)}
              aria-label={dStr}
              aria-current={isSelected ? "date" : undefined}
              className={`aspect-square text-xs border ${
                isSelected
                  ? "bg-primary text-primary-foreground font-bold border-transparent"
                  : isToday
                    ? "bg-transparent text-foreground font-normal border-primary"
                    : "bg-transparent text-foreground font-normal border-transparent"
              }`}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
