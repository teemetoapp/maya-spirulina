import React from "react";

// Sidebar icons per portal section (24×24 outline, inherits currentColor)
const ICONS: Record<string, React.ReactNode> = {
  "home": (
    <><rect width="7" height="9" x="3" y="3" rx="1.5" strokeWidth={1.75} /><rect width="7" height="5" x="14" y="3" rx="1.5" strokeWidth={1.75} /><rect width="7" height="9" x="14" y="12" rx="1.5" strokeWidth={1.75} /><rect width="7" height="5" x="3" y="16" rx="1.5" strokeWidth={1.75} /></>
  ),
  "my-orders": (
    <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 11V7a4 4 0 0 0-8 0v4M5 9h14l1 12H4L5 9z" /></>
  ),
  "wallet": (
    <><rect width="20" height="14" x="2" y="5" rx="2" strokeWidth={1.75} /><line x1="2" x2="22" y1="10" y2="10" strokeWidth={1.75} /></>
  ),
  "points": (
    <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 0 1 0 2.828l-7 7a2 2 0 0 1-2.828 0l-7-7A1.994 1.994 0 0 1 3 12V7a4 4 0 0 1 4-4z" /></>
  ),
  "ambassador-referrals": (
    <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></>
  ),
  "ambassador-profile": (
    <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" strokeWidth={1.75} /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>
  ),
  "addresses": (
    <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></>
  ),
  "my-tickets": (
    <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 18v-6a9 9 0 0 1 18 0v6" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" /></>
  ),
  "ambassador-tickets": (
    <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 18v-6a9 9 0 0 1 18 0v6" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" /></>
  ),
  "profile": (
    <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" strokeWidth={1.75} /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>
  ),
  "become-ambassador": (
    <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></>
  ),
  "ambassador": (
    <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></>
  ),
  "ambassador-links": (
    <><rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={1.75} /><circle cx="8.5" cy="8.5" r="1.5" strokeWidth={1.75} /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="m21 15-5-5L5 21" /></>
  ),
  "ambassador-samples": (
    <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" /></>
  ),
  "ambassador-settlements": (
    <><rect width="20" height="14" x="2" y="5" rx="2" strokeWidth={1.75} /><line x1="2" x2="22" y1="10" y2="10" strokeWidth={1.75} /></>
  ),
  "contacts": (
    <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M6 3h11a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" /><circle cx="12" cy="10" r="2.5" strokeWidth={1.75} /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8.5 16.5a3.5 3.5 0 0 1 7 0M3 7h2M3 12h2M3 17h2" /></>
  ),
  "modules": (
    <><rect width="7" height="7" x="3" y="3" rx="1.5" strokeWidth={1.75} /><rect width="7" height="7" x="14" y="3" rx="1.5" strokeWidth={1.75} /><rect width="7" height="7" x="3" y="14" rx="1.5" strokeWidth={1.75} /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17.5 14v7M14 17.5h7" /></>
  ),
  "livechat": (
    <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /><path strokeLinecap="round" strokeWidth={2} d="M8.5 12h.01M12 12h.01M15.5 12h.01" /></>
  ),
  "consult-livechat": (
    <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /><path strokeLinecap="round" strokeWidth={2} d="M8.5 12h.01M12 12h.01M15.5 12h.01" /></>
  ),
  "followups": (
    <><rect width="18" height="17" x="3" y="4" rx="2" strokeWidth={1.75} /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 2v4M8 2v4M3 10h18M9 15l2 2 4-4" /></>
  ),
  "refills": (
    <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M20 11a8 8 0 1 0-2.3 5.6M20 4v7h-7" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8v4l2.5 1.5" /></>
  ),
  "consultations": (
    <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 5h16v10H9l-5 4V5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8v4M10 10h4" /></>
  ),
  "my-consultations": (
    <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 5h16v10H9l-5 4V5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8v4M10 10h4" /></>
  ),
  "costing": (
    <><rect width="16" height="18" x="4" y="3" rx="2" strokeWidth={1.75} /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15v2M8 18h4" /></>
  ),
  "overview": (
    <><rect width="7" height="9" x="3" y="3" rx="1.5" strokeWidth={1.75} /><rect width="7" height="5" x="14" y="3" rx="1.5" strokeWidth={1.75} /><rect width="7" height="9" x="14" y="12" rx="1.5" strokeWidth={1.75} /><rect width="7" height="5" x="3" y="16" rx="1.5" strokeWidth={1.75} /></>
  ),
  "messages": (
    <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></>
  ),
  "orders": (
    <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 11V7a4 4 0 0 0-8 0v4M5 9h14l1 12H4L5 9z" /></>
  ),
  "abandoned": (
    <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></>
  ),
  "catalog": (
    <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 22V12" /><polyline points="3.29 7 12 12 20.71 7" strokeWidth={1.75} strokeLinecap="round" /></>
  ),
  "ambassadors": (
    <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></>
  ),
  "samplekits": (
    <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" /></>
  ),
  "promotions": (
    <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 0 1 0 2.828l-7 7a2 2 0 0 1-2.828 0l-7-7A1.994 1.994 0 0 1 3 12V7a4 4 0 0 1 4-4z" /></>
  ),
  "wholesale": (
    <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 7l9-4 9 4-9 4-9-4zm0 0v10l9 4 9-4V7M12 11v10" /></>
  ),
  "articles": (
    <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 4h12l4 4v12H4V4zm4 6h8M8 14h8M8 18h5" /></>
  ),
  "sales-report": (
    <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 4h18l-7 8v6l-4 2v-8L3 4z" /></>
  ),
  "campaigns": (
    <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1zM16 8a5 5 0 0 1 0 8M19 5a9 9 0 0 1 0 14" /></>
  ),
  "reviews": (
    <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 5h16v10H9l-5 4V5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 7.5l.9 1.8 2 .3-1.45 1.4.35 2-1.8-.95-1.8.95.35-2L9.1 9.6l2-.3z" /></>
  ),
  "content": (
    <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></>
  ),
  "finance": (
    <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></>
  ),
  "tickets": (
    <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 18v-6a9 9 0 0 1 18 0v6" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" /></>
  ),
  "users": (
    <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" strokeWidth={1.75} /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>
  ),
  "settings": (
    <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></>
  ),
  "health": (
    <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 12h4l2-5 4 10 2-5h6" /></>
  ),
  "audit": (
    <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></>
  ),
};

export function SectionIcon({ id, className = "size-4 shrink-0" }: { id: string; className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      {ICONS[id] ?? <circle cx="12" cy="12" r="3" strokeWidth={1.75} />}
    </svg>
  );
}
