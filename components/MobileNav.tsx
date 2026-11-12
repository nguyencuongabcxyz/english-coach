"use client";

import Link from "next/link";
import { AppLogo } from "@/components/AppLogo";
import { useEffect, useState } from "react";
import { Icon, ICON } from "./icons";
import type { NavItem } from "@/lib/nav";
import { useActiveKey, useStayHere } from "./NavLinks";

type Props = {
  items: NavItem[];
  portal: string;
  userName: string;
  userRole: string;
  initials: string;
  avatarBg: string;
  aiNote: string;
  logoutAction: () => Promise<void>;
};

/** Top bar + slide-in drawer + bottom tab bar for phones and tablets (< lg). */
export function MobileNav(p: Props) {
  const [open, setOpen] = useState(false);
  const active = useActiveKey(p.items);
  const stay = useStayHere();
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <header className="mb-2 flex items-center justify-between gap-3 px-2 pt-1 lg:hidden">
        <div className="flex items-center gap-2.5">
          <AppLogo size={38} />
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-extrabold">Speaking Coach</span>
            <span className="text-[11px] text-muted">{p.portal}</span>
          </div>
        </div>
        <button
          onClick={() => setOpen(true)}
          aria-label="Mở menu"
          aria-expanded={open}
          className="press flex size-11 cursor-pointer items-center justify-center rounded-full bg-white hover:bg-soft"
        >
          <Icon d={ICON.menu} />
        </button>
      </header>

      {/* Always mounted so it can slide in and out; inert + hidden from AT while closed. */}
      <div
        className={`fixed inset-0 z-50 overflow-hidden lg:hidden ${open ? "" : "pointer-events-none"}`}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        aria-hidden={!open}
        inert={!open}
      >
        <button
          aria-label="Đóng menu"
          tabIndex={-1}
          className={`absolute inset-0 bg-ink/40 backdrop-blur-[2px] transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`}
          onClick={() => setOpen(false)}
        />
        <nav
          className={`absolute top-0 right-0 flex h-full w-[min(320px,86vw)] flex-col gap-5 overflow-x-hidden overflow-y-auto bg-shell px-3 pt-4 pb-6 transition-[translate,box-shadow] duration-300 ease-out-soft motion-reduce:transition-none ${
            open ? "translate-x-0 shadow-xl" : "translate-x-full shadow-none"
          }`}
        >
          <div className="flex items-center justify-between px-2">
            <span className="text-sm font-bold">Menu</span>
            <button
              onClick={() => setOpen(false)}
              aria-label="Đóng menu"
              className="press flex size-11 cursor-pointer items-center justify-center rounded-full bg-white hover:bg-soft"
            >
              <Icon d={ICON.close} />
            </button>
          </div>
          <div className="flex flex-col gap-1">
            {p.items.map((item, i) => {
              const on = item.key === active;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  aria-current={on ? "page" : undefined}
                  onClick={(e) => {
                    if (stay(item)) e.preventDefault();
                    setOpen(false);
                  }}
                  style={{ transitionDelay: open ? `${80 + i * 35}ms` : "0ms" }}
                  className={`flex min-h-12 items-center gap-3 rounded-full px-4 text-[15px] transition-[opacity,translate,background-color] duration-300 ease-out-soft active:bg-white/70 ${
                    open ? "translate-x-0 opacity-100" : "translate-x-6 opacity-0"
                  } ${on ? "bg-white font-bold shadow-sm" : "font-medium"}`}
                >
                  <Icon d={item.d} />
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span className="pop-in rounded-full bg-brand px-2 py-0.5 text-[11px] font-bold text-white">{item.badge}</span>
                  )}
                </Link>
              );
            })}
          </div>
          <div className="mt-auto flex flex-col gap-3">
            <div className="flex flex-col gap-1.5 rounded-[18px] bg-white p-3.5">
              <span className="text-xs font-bold">AI hỗ trợ, giáo viên quyết định</span>
              <span className="text-xs leading-normal text-muted">{p.aiNote}</span>
            </div>
            <div className="flex items-center gap-3 px-2">
              <div
                className="flex size-[42px] shrink-0 items-center justify-center rounded-full text-sm font-bold"
                style={{ background: p.avatarBg }}
              >
                {p.initials}
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm leading-tight font-bold">{p.userName}</span>
                <span className="text-xs text-muted">{p.userRole}</span>
              </div>
              <form action={p.logoutAction}>
                <button
                  aria-label="Đăng xuất"
                  className="press flex size-11 cursor-pointer items-center justify-center rounded-full bg-white"
                >
                  <Icon d={ICON.logout} />
                </button>
              </form>
            </div>
          </div>
        </nav>
      </div>

      {/* Bottom tab bar on phones/tablets */}
      <nav
        aria-label="Điều hướng nhanh"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 px-2 pt-1.5 pb-[max(6px,env(safe-area-inset-bottom))] backdrop-blur lg:hidden"
      >
        <ul className="mx-auto flex max-w-xl justify-around">
          {p.items.map((item) => {
            const on = item.key === active;
            return (
              <li key={item.key} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={on ? "page" : undefined}
                  onClick={(e) => {
                    if (stay(item)) e.preventDefault();
                  }}
                  className={`press relative flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] ${
                    on ? "font-bold text-ink" : "font-medium text-muted"
                  }`}
                >
                  <span
                    className={`flex h-7 items-center justify-center rounded-full transition-all duration-300 ease-out-soft ${
                      on ? "w-12 bg-lilac" : "w-9 bg-transparent"
                    }`}
                  >
                    <Icon d={item.d} size={18} />
                  </span>
                  {item.short}
                  {item.badge && !on && (
                    <span className="pop-in absolute top-0.5 right-[calc(50%-22px)] size-2 rounded-full bg-rec" aria-label={item.badge} />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
