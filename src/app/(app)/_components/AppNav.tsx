"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { bg2, bg, line, inkDim, amber } from "./shared";

const NAV_ITEMS = [
  { href: "/", label: "Workout", icon: "🏋️" },
  { href: "/food", label: "Food", icon: "🥗" },
  { href: "/supplements", label: "Supplements", icon: "💊" },
  { href: "/weight", label: "Weight", icon: "⚖️" },
  { href: "/water", label: "Water", icon: "💧" },
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
] as const;

// Two variants, one shown per CSS breakpoint (see the "App nav shell
// responsive breakpoint" block in globals.css — inline `style` objects
// can't express @media, so this is the one deliberate exception to this
// app's otherwise-inline-only styling). Both render server-agnostically
// the same 6 destinations; CSS decides which is visible, avoiding a JS
// resize-listener flash-of-wrong-nav on first paint.
export function AppNav() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <>
      <nav className="app-nav-sidebar" aria-label="Main navigation" style={sidebarStyle}>
        {NAV_ITEMS.map((item) => (
          <Link key={item.href} href={item.href} style={sidebarLinkStyle(isActive(item.href))}>
            <span style={{ fontSize: 16 }}>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <nav className="app-nav-bottombar" aria-label="Main navigation" style={bottombarStyle}>
        {NAV_ITEMS.map((item) => (
          <Link key={item.href} href={item.href} style={bottombarLinkStyle(isActive(item.href))} aria-label={item.label}>
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            <span style={{ fontSize: 10 }}>{item.label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}

const sidebarStyle = {
  position: "fixed",
  left: 0,
  top: 0,
  bottom: 0,
  width: 200,
  flexDirection: "column",
  gap: 4,
  padding: "24px 12px",
  background: bg2,
  borderRight: `1px solid ${line}`,
} as const;

function sidebarLinkStyle(active: boolean) {
  return {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    color: active ? amber : inkDim,
    background: active ? bg : "none",
    textDecoration: "none",
    fontSize: 14,
    fontWeight: active ? 600 : 400,
  } as const;
}

const bottombarStyle = {
  position: "fixed",
  left: 0,
  right: 0,
  bottom: 0,
  justifyContent: "space-around",
  padding: "8px 4px",
  background: bg2,
  borderTop: `1px solid ${line}`,
  zIndex: 15,
} as const;

function bottombarLinkStyle(active: boolean) {
  return {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
    padding: "4px 8px",
    color: active ? amber : inkDim,
    textDecoration: "none",
    flex: 1,
  } as const;
}
