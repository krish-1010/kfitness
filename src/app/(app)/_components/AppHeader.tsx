"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDate } from "../_lib/DateContext";
import { toLocalDateStr, TODAY } from "@/lib/date";
import { DateQuickJumpPopover } from "./DateQuickJumpPopover";

// Rendered once by (app)/layout.tsx, present on every page. Carries the one
// thing genuinely shared across sections (the selected date) plus a
// persistent entry point to Profile — deliberately on the OPPOSITE side of
// the header from the day-nav cluster, not adjacent to it. That adjacency
// (Log out used to sit right next to `‹`/`›`) was the actual bug driving
// this whole restructure; this layout makes the two physically as far
// apart as the header allows, not just relabeled.
export function AppHeader() {
  const { date, setDate } = useDate();
  const router = useRouter();
  const [pickerOpen, setPickerOpen] = useState(false);

  const isToday = date === TODAY();
  const dateLabel = new Date(date + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  const shiftDate = (delta: number) => {
    const d = new Date(date + "T00:00:00");
    d.setDate(d.getDate() + delta);
    setDate(toLocalDateStr(d));
  };

  return (
    <div className="flex items-center justify-between mb-5">
      <button onClick={() => router.push("/profile")} aria-label="Profile" className="nav-btn">
        👤
      </button>

      <div className="text-center">
        <div className="text-[11px] tracking-wide text-muted-foreground mb-0.5">FITR LOG</div>
        <div className="text-[22px] font-semibold">
          {dateLabel}
          {isToday ? " · Today" : ""}
        </div>
      </div>

      <div className="flex gap-1.5 relative">
        <button onClick={() => shiftDate(-1)} aria-label="Previous day" className="nav-btn">
          ‹
        </button>
        <button onClick={() => setPickerOpen((v) => !v)} aria-label="Jump to date" aria-expanded={pickerOpen} className="nav-btn">
          📅
        </button>
        <button onClick={() => shiftDate(1)} aria-label="Next day" className="nav-btn" disabled={isToday}>
          ›
        </button>
        {pickerOpen && (
          <DateQuickJumpPopover
            selectedDate={date}
            onPick={(d) => {
              setDate(d);
              setPickerOpen(false);
            }}
            onClose={() => setPickerOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
