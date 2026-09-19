"use client";

import { useEffect, useRef, useState } from "react";
import { getMonthGrid } from "@/lib/calendarGrid";
import { toLocalDateStr, TODAY } from "@/lib/date";
import { bg2, line, inkDim, ink, amber, navBtn } from "./shared";

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
      style={{
        position: "absolute",
        top: "calc(100% + 6px)",
        right: 0,
        background: bg2,
        border: `1px solid ${line}`,
        padding: 10,
        width: 240,
        zIndex: 20,
        boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <button onClick={() => shiftMonth(-1)} aria-label="Previous month" style={{ ...navBtn, width: 28, height: 28 }}>
          ‹
        </button>
        <div style={{ fontSize: 13, fontWeight: 600 }}>
          {MONTH_NAMES[viewMonth]} {viewYear}
        </div>
        <button onClick={() => shiftMonth(1)} aria-label="Next month" style={{ ...navBtn, width: 28, height: 28 }}>
          ›
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
        {WEEKDAY_INITIALS.map((w, i) => (
          <div key={i} style={{ textAlign: "center", fontSize: 10, color: inkDim }}>
            {w}
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
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
              style={{
                aspectRatio: "1",
                background: isSelected ? amber : "none",
                border: isToday && !isSelected ? `1px solid ${amber}` : "1px solid transparent",
                color: isSelected ? bg2 : ink,
                fontSize: 12,
                fontWeight: isSelected ? 700 : 400,
              }}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
