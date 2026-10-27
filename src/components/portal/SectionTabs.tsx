"use client";

import React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

// Tabs inside one portal section (e.g. orders: list / kanban / shipping).
// The active tab lives in ?tab= so it survives refresh and can be linked.
export interface SectionTab {
  id: string;
  label: string;
  content: React.ReactNode;
}

export default function SectionTabs({ tabs }: { tabs: SectionTab[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeId = tabs.some((t) => t.id === searchParams.get("tab")) ? searchParams.get("tab")! : tabs[0]?.id;
  const active = tabs.find((t) => t.id === activeId);

  if (tabs.length === 1) return <>{tabs[0].content}</>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-1.5 border-b border-border-hairline pb-3" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={tab.id === activeId}
            onClick={() => router.replace(`${pathname}?tab=${tab.id}`, { scroll: false })}
            className={`nav-tab-base ${tab.id === activeId ? "nav-tab-active" : "nav-tab-inactive"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div role="tabpanel">{active?.content}</div>
    </div>
  );
}
