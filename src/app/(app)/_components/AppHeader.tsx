"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDate } from "../_lib/DateContext";
import { toLocalDateStr, TODAY } from "@/lib/date";
import { navBtn, inkDim } from "./shared";
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
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
      <button onClick={() => router.push("/profile")} aria-label="Profile" style={navBtn}>
        👤
      </button>

      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 11, letterSpacing: 0.5, color: inkDim, marginBottom: 2 }}>CUT LOG</div>
        <div style={{ fontSize: 22, fontWeight: 600 }}>
          {dateLabel}
          {isToday ? " · Today" : ""}
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, position: "relative" }}>
        <button onClick={() => shiftDate(-1)} aria-label="Previous day" style={navBtn}>
          ‹
        </button>
        <button onClick={() => setPickerOpen((v) => !v)} aria-label="Jump to date" aria-expanded={pickerOpen} style={navBtn}>
          📅
        </button>
        <button onClick={() => shiftDate(1)} aria-label="Next day" style={navBtn} disabled={isToday}>
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
