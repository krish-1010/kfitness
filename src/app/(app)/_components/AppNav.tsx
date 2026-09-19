"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Workout", icon: "🏋️" },
  { href: "/food", label: "Food", icon: "🥗" },
  { href: "/supplements", label: "Supplements", icon: "💊" },
  { href: "/weight", label: "Weight", icon: "⚖️" },
  { href: "/water", label: "Water", icon: "💧" },
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
] as const;

// Two variants, one shown per Tailwind breakpoint. Both render
// server-agnostically the same 6 destinations; CSS decides which is
// visible, avoiding a JS resize-listener flash-of-wrong-nav on first paint.
export function AppNav() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <>
      <nav
        aria-label="Main navigation"
        className="hidden md:flex fixed left-0 top-0 bottom-0 w-[200px] flex-col gap-1 py-6 px-3 bg-card border-r border-border"
      >
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2.5 px-3 py-2.5 text-sm no-underline ${
              isActive(item.href) ? "text-primary bg-background font-semibold" : "text-muted-foreground font-normal"
            }`}
          >
            <span className="text-base">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <nav
        aria-label="Main navigation"
        className="flex md:hidden fixed left-0 right-0 bottom-0 justify-around px-1 py-2 bg-card border-t border-border z-[15]"
      >
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-label={item.label}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 no-underline flex-1 ${
              isActive(item.href) ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="text-[10px]">{item.label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
