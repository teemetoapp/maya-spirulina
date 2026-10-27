"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import LogoutButton from "@/components/portal/LogoutButton";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { SectionIcon } from "@/components/portal/portal-icons";
import { PORTAL_GROUPS, getAllowedSections, getAllowedAreas } from "@/lib/portal/sections";
import { toPersianDigits } from "@/lib/currency";
import LiveChatWidget from "@/components/livechat/LiveChatWidget";

// ==============================================================
// Unified portal shell: one header + one right-hand sidebar for every
// role. The menu is built from the user's permissions, so a customer,
// an ambassador, a warehouse clerk and the super admin all see the same
// layout with only the sections they are allowed to open.
// ==============================================================

interface PortalShellProps {
  user: { name: string | null; phone: string; roleNames: string[] };
  permissions: string[];
  children: React.ReactNode;
}

interface InboxItem {
  id: string;
  body: string;
  createdAt: string;
}

export default function PortalShell({ user, permissions, children }: PortalShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCmdkOpen, setIsCmdkOpen] = useState(false);
  const [cmdkSearch, setCmdkSearch] = useState("");
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [inbox, setInbox] = useState<InboxItem[]>([]);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const sections = useMemo(() => getAllowedSections(permissions), [permissions]);
  const areas = useMemo(() => getAllowedAreas(permissions), [permissions]);
  const activeId = pathname.split("/")[2] ?? "";
  const activeSection = sections.find((s) => s.id === activeId);
  const activeArea = activeSection?.area ?? areas[0]?.id ?? "account";
  const profileId = ["profile", "ambassador-profile"].find((id) => sections.some((s) => s.id === id));
  const profileHref = profileId ? `/portal/${profileId}` : null;
  // منوی راست فقط بخش‌های پرتال فعلی را نشان می‌دهد
  const groups = PORTAL_GROUPS.map((g) => ({
    title: g,
    items: sections.filter((s) => s.group === g && s.area === activeArea),
  })).filter((g) => g.items.length > 0);
  const filteredCmdkItems = sections.filter((s) => s.label.includes(cmdkSearch.trim()));

  // Remember the collapsed state per browser
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from localStorage
      setIsSidebarCollapsed(localStorage.getItem("maya_sidebar_collapsed") === "1");
    } catch {
      // storage unavailable
    }
  }, []);

  const toggleCollapsed = () => {
    setIsSidebarCollapsed((prev) => {
      try {
        localStorage.setItem("maya_sidebar_collapsed", prev ? "0" : "1");
      } catch {
        // storage unavailable
      }
      return !prev;
    });
  };

  // Close the mobile drawer after navigation (state adjusted during render)
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setIsMobileOpen(false);
    setIsCmdkOpen(false);
  }

  // Spotlight effect for .card elements
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      const card = (e.target as HTMLElement)?.closest?.(".card") as HTMLElement | null;
      if (!card) return;
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - rect.left}px`);
      card.style.setProperty("--my", `${e.clientY - rect.top}px`);
    };
    document.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => document.removeEventListener("pointermove", handlePointerMove);
  }, []);

  // Ctrl+K command palette, Esc closes popovers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCmdkOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setIsCmdkOpen(false);
        setIsNotifOpen(false);
        setIsProfileOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setIsNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setIsProfileOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isNotifOpen) return;
    fetch("/api/portal/inbox")
      .then((res) => res.json())
      .then((data) => data.success && setInbox(data.items))
      .catch(() => {});
  }, [isNotifOpen]);

  const toggleMenu = () => {
    if (window.innerWidth >= 1024) toggleCollapsed();
    else setIsMobileOpen((prev) => !prev);
  };

  return (
    <div className="min-h-screen bg-bg-page text-text-main flex flex-col antialiased">
      {/* ==================== HEADER ==================== */}
      <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border-hairline bg-bg-page/80 backdrop-blur-md px-3 sm:px-6">
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={toggleMenu}
            className="inline-grid size-9 place-items-center rounded-lg text-text-muted hover:text-text-main hover:bg-bg-subtle transition"
            aria-label="باز و بسته کردن منو"
          >
            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <Link href="/" className="hidden min-[360px]:flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-accent-primary font-black text-xs">
              MS
            </span>
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-black tracking-tight">مایا اسپیرولینا</span>
              <span className="text-[10px] text-accent-primary">{user.roleNames.join("، ") || "حساب کاربری"}</span>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => setIsCmdkOpen(true)}
            className="ms-3 hidden lg:flex h-9 w-64 items-center gap-2 rounded-lg border border-border-hairline bg-bg-card px-3 text-xs text-text-subtle hover:text-text-muted hover:border-border-strong transition cursor-pointer"
          >
            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="truncate">جستجو در پنل…</span>
            <span className="ms-auto flex items-center gap-1" dir="ltr">
              <kbd className="kbd">Ctrl</kbd>
              <kbd className="kbd">K</kbd>
            </span>
          </button>
        </div>

        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          {/* سوئیچ پرتال‌ها: هر کاربر فقط پرتال‌هایی را می‌بیند که دسترسی دارد */}
          <nav aria-label="پرتال‌ها" className="flex min-w-0 items-center gap-1 overflow-x-auto rounded-lg border border-border-hairline bg-bg-card p-1">
            {areas.map((a) => (
              <Link
                key={a.id}
                href={a.href}
                aria-current={a.id === activeArea ? "page" : undefined}
                className={`h-7 shrink-0 whitespace-nowrap px-2 sm:px-3 inline-flex items-center rounded-md text-xs font-medium transition ${
                  a.id === activeArea ? "bg-bg-subtle text-accent-primary font-bold shadow-sm" : "text-text-muted hover:bg-bg-subtle hover:text-text-main"
                }`}
              >
                {a.label}
              </Link>
            ))}
            <Link href="/" className="h-7 shrink-0 whitespace-nowrap px-3 hidden md:inline-flex items-center rounded-md text-xs font-medium text-text-muted hover:bg-bg-subtle hover:text-text-main transition">
              نمای فروشگاه
            </Link>
          </nav>

          <span className="hidden min-[360px]:contents"><ThemeToggle /></span>

          {/* Notifications sent to this user (SMS / Telegram / email log) */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="inline-grid size-8 place-items-center rounded-lg text-text-muted hover:text-text-main hover:bg-bg-subtle transition"
              aria-label="اعلان‌ها"
            >
              <svg className="size-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>

            {isNotifOpen && (
              <div className="absolute end-0 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-border-hairline bg-bg-card shadow-xl z-50 overflow-hidden">
                <div className="border-b border-border-hairline px-4 py-3 text-xs font-bold">اعلان‌های اخیر شما</div>
                <div className="divide-y divide-[var(--border-hairline)] max-h-72 overflow-y-auto text-xs">
                  {inbox.length === 0 ? (
                    <p className="p-4 text-center text-text-subtle">اعلان تازه‌ای ندارید.</p>
                  ) : (
                    inbox.map((n) => (
                      <div key={n.id} className="p-3 space-y-1">
                        <p className="whitespace-pre-line leading-relaxed">{n.body}</p>
                        <span className="text-[10px] text-text-subtle">{n.createdAt}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="h-5 w-px bg-border-hairline mx-1 hidden sm:block" />

          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2 rounded-lg p-1 hover:bg-bg-subtle transition cursor-pointer"
            >
              <div className="grid size-7 place-items-center rounded-full bg-bg-subtle font-bold text-xs">
                <span>{user.name ? user.name[0] : "م"}</span>
              </div>
              <span className="hidden sm:block text-xs font-semibold">{user.name || "کاربر مایا"}</span>
            </button>

            {isProfileOpen && (
              <div className="absolute end-0 mt-2 w-52 rounded-xl border border-border-hairline bg-bg-card p-1.5 shadow-xl z-50">
                <div className="px-3 py-2 border-b border-border-hairline mb-1">
                  <p className="text-xs font-bold">{user.name || "کاربر مایا"}</p>
                  <p className="text-[10px] text-text-subtle mt-0.5">{toPersianDigits(user.phone)}</p>
                </div>
                {profileHref && (
                  <Link
                    href={profileHref}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-text-muted hover:bg-bg-subtle transition"
                  >
                    پروفایل و اعلان‌ها
                  </Link>
                )}
                <div className="p-1">
                  <LogoutButton />
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ==================== SIDEBAR + CONTENT ==================== */}
      <div className="flex flex-1 overflow-hidden relative">
        <aside
          className={`h-[calc(100vh-64px)] shrink-0 bg-bg-card border-l border-border-hairline flex flex-col justify-between z-20 transition-all duration-300 ease-out fixed lg:relative start-0 top-[64px] lg:top-0 ${
            isMobileOpen ? "translate-x-0 shadow-2xl" : "translate-x-full lg:translate-x-0"
          } ${isSidebarCollapsed ? "w-16" : "w-60"}`}
          aria-label="منوی پنل"
        >
          <nav className="relative flex-1 overflow-y-auto overflow-x-hidden p-2.5 space-y-4">
            {!isSidebarCollapsed && (
              <div className="md:hidden grid gap-1 pb-3 border-b border-border-hairline">
                {areas.map((a) => (
                  <Link
                    key={a.id}
                    href={a.href}
                    className={`h-8 px-3 flex items-center rounded-lg text-xs font-medium ${a.id === activeArea ? "bg-bg-subtle text-accent-primary font-bold shadow-sm" : "text-text-muted hover:bg-bg-subtle"}`}
                  >
                    {a.label}
                  </Link>
                ))}
                <Link href="/" className="h-8 px-3 flex items-center rounded-lg text-xs font-medium text-text-muted hover:bg-bg-subtle">
                  نمای فروشگاه
                </Link>
              </div>
            )}
            {groups.map((group) => (
              <div key={group.title} className="space-y-0.5">
                {!isSidebarCollapsed && (
                  <p className="px-3 pb-1.5 text-[10px] font-semibold text-text-subtle select-none">{group.title}</p>
                )}
                <ul className="space-y-0.5">
                  {group.items.map((item) => {
                    const isActive = activeId === item.id;
                    return (
                      <li key={item.id} className="relative">
                        {isActive && (
                          <span className="absolute start-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-e-full bg-accent-primary z-10" />
                        )}
                        <Link
                          href={`/portal/${item.id}`}
                          title={item.label}
                          aria-current={isActive ? "page" : undefined}
                          className={`flex w-full items-center gap-2.5 h-9 rounded-lg px-2.5 text-xs transition ${
                            isActive
                              ? "bg-bg-subtle text-text-main font-semibold"
                              : "text-text-muted hover:text-text-main hover:bg-bg-subtle"
                          } ${isSidebarCollapsed ? "justify-center px-0" : ""}`}
                        >
                          <span className={isActive ? "text-accent-primary" : "text-text-subtle"}>
                            <SectionIcon id={item.id} />
                          </span>
                          {!isSidebarCollapsed && <span className="flex-1 truncate text-right">{item.label}</span>}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

          <div className="p-2 border-t border-border-hairline">
            <button
              type="button"
              onClick={toggleCollapsed}
              className="hidden lg:flex w-full items-center justify-center h-8 rounded-lg text-xs text-text-subtle hover:text-text-main hover:bg-bg-subtle transition"
              title={isSidebarCollapsed ? "باز کردن منو" : "جمع کردن منو"}
            >
              <svg
                className={`size-4 transition-transform duration-300 ${isSidebarCollapsed ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
              {!isSidebarCollapsed && <span className="ms-2">جمع کردن منو</span>}
            </button>
          </div>
        </aside>

        {isMobileOpen && (
          <div onClick={() => setIsMobileOpen(false)} className="fixed inset-0 bg-black/40 z-10 lg:hidden" />
        )}

        <main
          id="main-content"
          className="flex-1 h-[calc(100vh-64px)] overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-[1440px] mx-auto w-full space-y-6"
        >
          <nav className="text-xs text-text-subtle flex items-center gap-1.5" aria-label="مسیر">
            <span>{areas.find((a) => a.id === activeArea)?.label ?? "پنل"}</span>
            <span>/</span>
            <span>{activeSection?.group ?? ""}</span>
            <span>/</span>
            <span className="text-text-main font-semibold">{activeSection?.label ?? ""}</span>
          </nav>
          {children}
        </main>
      </div>

      {/* ==================== COMMAND PALETTE (Ctrl+K) ==================== */}
      {isCmdkOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs" onClick={() => setIsCmdkOpen(false)} />
          <div className="relative w-full max-w-lg overflow-hidden rounded-xl border border-border-hairline bg-bg-card shadow-2xl z-10">
            <div className="flex items-center gap-2.5 border-b border-border-hairline px-4 py-3">
              <input
                type="text"
                autoFocus
                value={cmdkSearch}
                onChange={(e) => setCmdkSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && filteredCmdkItems[0]) router.push(`/portal/${filteredCmdkItems[0].id}`);
                }}
                placeholder="جستجو در بخش‌های پنل…"
                className="w-full bg-transparent text-xs placeholder:text-text-subtle outline-none"
              />
              <kbd className="kbd cursor-pointer" onClick={() => setIsCmdkOpen(false)}>
                Esc
              </kbd>
            </div>
            <div className="max-h-72 overflow-y-auto p-1.5 space-y-0.5">
              {filteredCmdkItems.length === 0 ? (
                <div className="py-6 text-center text-xs text-text-subtle">موردی یافت نشد.</div>
              ) : (
                filteredCmdkItems.map((item) => (
                  <Link
                    key={item.id}
                    href={`/portal/${item.id}`}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-text-muted hover:bg-bg-subtle transition"
                  >
                    <SectionIcon id={item.id} />
                    <span>{item.label}</span>
                    <span className="ms-auto text-[10px] text-text-subtle">{item.group}</span>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      {(activeArea === "account" || activeArea === "ambassador") && <LiveChatWidget inPortal />}
    </div>
  );
}
