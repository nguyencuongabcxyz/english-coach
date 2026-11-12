"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./icons";
import type { NavItem, NavKey } from "@/lib/nav";

/** The nav item whose href is the longest prefix of the current path. */
export function useActiveKey(items: NavItem[]): NavKey | null {
  const pathname = usePathname();
  let best: NavItem | null = null;
  for (const it of items) {
    if (pathname === it.href || pathname.startsWith(it.href + "/")) {
      if (!best || it.href.length > best.href.length) best = it;
    }
  }
  return best?.key ?? null;
}

/**
 * Clicking the tab you are already on should do nothing, instead of re-rendering the page
 * (which would e.g. throw away a recording in progress on the practice screen).
 */
export function useStayHere() {
  const pathname = usePathname();
  return (item: NavItem) => pathname === item.href || (item.key === "practice" && pathname.startsWith("/practice"));
}

export function SidebarLinks({ items }: { items: NavItem[] }) {
  const active = useActiveKey(items);
  const stay = useStayHere();
  return (
    <>
      {items.map((item) => {
        const on = item.key === active;
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={on ? "page" : undefined}
            onClick={(e) => {
              if (stay(item)) e.preventDefault();
            }}
            className={`flex min-h-11 items-center gap-3 rounded-full px-3.5 text-sm transition-colors ${
              on ? "bg-white font-bold shadow-[0_1px_2px_rgba(22,21,26,0.08)]" : "font-medium hover:bg-white/60"
            }`}
          >
            <Icon d={item.d} />
            <span className="flex-1">{item.label}</span>
            {item.badge && !on && (
              <span className="rounded-full bg-brand px-2 py-0.5 text-[11px] font-bold text-white">{item.badge}</span>
            )}
          </Link>
        );
      })}
    </>
  );
}
