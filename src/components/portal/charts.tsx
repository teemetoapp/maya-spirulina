"use client";

import React, { useState } from "react";
import { toPersianDigits } from "@/lib/currency";

// ==============================================================
// Small SVG charts for the management dashboards. No chart library:
// one y-axis, thin marks, 2px gaps, hover tooltips, colors from the
// validated --chart-* tokens (globals.css), text in text tokens only.
// Time runs right-to-left (oldest on the right) to match RTL reading.
// Text inherits direction:rtl from globals.css, so textAnchor="start"
// means "right edge at x".
// ==============================================================

export const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"] as const;

/** Compact Persian number: 12.5M → ۱۲٫۵ میلیون */
export function compact(n: number): string {
  const abs = Math.abs(n);
  const fmt = (v: number, unit: string) => `${toPersianDigits(String(Math.round(v * 10) / 10).replace(".", "٫"))} ${unit}`;
  if (abs >= 1e9) return fmt(n / 1e9, "میلیارد");
  if (abs >= 1e6) return fmt(n / 1e6, "میلیون");
  if (abs >= 1e3) return fmt(n / 1e3, "هزار");
  return toPersianDigits(Math.round(n).toLocaleString("en-US"));
}

function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

function Tooltip({ x, y, children, width, height }: { x: number; y: number; width: number; height: number; children: React.ReactNode }) {
  // نگه داشتن تولتیپ داخل کادر
  const left = Math.min(Math.max(x, 70), width - 70);
  return (
    <div
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border border-border-hairline bg-bg-card px-2.5 py-1.5 text-[11px] shadow-lg whitespace-nowrap"
      style={{ left: `${(left / width) * 100}%`, top: `calc(${(y / height) * 100}% - 8px)` }}
    >
      {children}
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-text-muted">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

/** Single-series area chart with a crosshair tooltip. */
export function AreaChart({
  data,
  height = 180,
  format = compact,
  extra,
  ariaLabel,
}: {
  data: { label: string; value: number }[];
  height?: number;
  format?: (n: number) => string;
  extra?: (i: number) => React.ReactNode;
  ariaLabel: string;
}) {
  const W = 640;
  const H = height;
  const pad = { t: 10, b: 22, l: 8, r: 52 };
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const n = data.length;
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  // RTL: اولین نقطه (قدیمی‌ترین) سمت راست
  const xAt = (i: number) => pad.l + iw - (n <= 1 ? iw / 2 : (i / (n - 1)) * iw);
  const yAt = (v: number) => pad.t + ih - (v / max) * ih;
  const line = data.map((d, i) => `${i ? "L" : "M"}${xAt(i).toFixed(1)},${yAt(d.value).toFixed(1)}`).join(" ");
  const area = `${line} L${xAt(n - 1).toFixed(1)},${pad.t + ih} L${xAt(0).toFixed(1)},${pad.t + ih} Z`;
  const ticks = [0, 0.5, 1].map((f) => f * max);

  function onMove(e: React.MouseEvent<SVGRectElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const idx = Math.round(((pad.l + iw - px) / iw) * (n - 1));
    setHover(Math.min(n - 1, Math.max(0, idx)));
  }

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={ariaLabel}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={pad.l + iw} y1={yAt(t)} y2={yAt(t)} stroke={t === 0 ? "var(--chart-axis)" : "var(--chart-grid)"} />
            <text x={W - 2} y={yAt(t) + 3} textAnchor="start" fontSize="10" fill="var(--text-subtle)">
              {compact(t)}
            </text>
          </g>
        ))}
        <path d={area} fill="var(--chart-1)" opacity={0.12} />
        <path d={line} fill="none" stroke="var(--chart-1)" strokeWidth={2} strokeLinejoin="round" />
        {[0, Math.floor((n - 1) / 2), n - 1].filter((v, i, a) => n && a.indexOf(v) === i).map((i) => (
          <text key={i} x={xAt(i)} y={H - 6} textAnchor="middle" fontSize="10" fill="var(--text-subtle)">
            {toPersianDigits(data[i].label)}
          </text>
        ))}
        {hover !== null && (
          <g>
            <line x1={xAt(hover)} x2={xAt(hover)} y1={pad.t} y2={pad.t + ih} stroke="var(--chart-axis)" strokeDasharray="3 3" />
            <circle cx={xAt(hover)} cy={yAt(data[hover].value)} r={4.5} fill="var(--chart-1)" stroke="var(--bg-card)" strokeWidth={2} />
          </g>
        )}
        <rect x={pad.l} y={0} width={iw} height={H} fill="transparent" onMouseMove={onMove} onMouseLeave={() => setHover(null)} />
      </svg>
      {hover !== null && (
        <Tooltip x={xAt(hover)} y={yAt(data[hover].value)} width={W} height={H}>
          <span className="text-text-muted">{toPersianDigits(data[hover].label)}</span>
          <span className="block font-bold text-text-main">{format(data[hover].value)}</span>
          {extra?.(hover)}
        </Tooltip>
      )}
    </div>
  );
}

/** Grouped columns: up to 4 series on one shared axis (values may be negative). */
export function GroupedColumns({
  labels,
  series,
  height = 200,
  format = compact,
  ariaLabel,
}: {
  labels: string[];
  series: { name: string; values: number[] }[];
  height?: number;
  format?: (n: number) => string;
  ariaLabel: string;
}) {
  const W = 640;
  const H = height;
  const pad = { t: 10, b: 22, l: 8, r: 52 };
  const [hover, setHover] = useState<number | null>(null);
  const all = series.flatMap((s) => s.values);
  const max = niceMax(Math.max(0, ...all));
  const min = Math.min(0, ...all) < 0 ? -niceMax(-Math.min(...all)) : 0;
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const yAt = (v: number) => pad.t + ((max - v) / (max - min)) * ih;
  const n = labels.length;
  const slot = iw / Math.max(1, n);
  const gap = 2;
  const groupW = Math.min(slot * 0.7, 36);
  const barW = (groupW - gap * (series.length - 1)) / series.length;
  const slotX = (i: number) => pad.l + iw - slot * (i + 0.5); // RTL
  const ticks = min < 0 ? [min, 0, max] : [0, max / 2, max];

  return (
    <div className="relative space-y-2">
      <Legend items={series.map((s, i) => ({ label: s.name, color: CHART_COLORS[i] }))} />
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={ariaLabel}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={pad.l + iw} y1={yAt(t)} y2={yAt(t)} stroke={t === 0 ? "var(--chart-axis)" : "var(--chart-grid)"} />
              <text x={W - 2} y={yAt(t) + 3} textAnchor="start" fontSize="10" fill="var(--text-subtle)">
                {compact(t)}
              </text>
            </g>
          ))}
          {labels.map((l, i) => (
            <g key={l} opacity={hover === null || hover === i ? 1 : 0.45}>
              {series.map((s, si) => {
                const v = s.values[i];
                const x = slotX(i) + groupW / 2 - (si + 1) * barW - si * gap;
                const y = Math.min(yAt(v), yAt(0));
                const h = Math.max(Math.abs(yAt(v) - yAt(0)), v ? 1 : 0);
                const r = Math.min(4, barW / 2, h);
                // گوشه گرد فقط در سر داده
                const d =
                  v >= 0
                    ? `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + barW - r} Q${x + barW},${y} ${x + barW},${y + r} V${y + h} Z`
                    : `M${x},${y} V${y + h - r} Q${x},${y + h} ${x + r},${y + h} H${x + barW - r} Q${x + barW},${y + h} ${x + barW},${y + h - r} V${y} Z`;
                return <path key={s.name} d={d} fill={CHART_COLORS[si]} />;
              })}
              <text x={slotX(i)} y={H - 6} textAnchor="middle" fontSize="10" fill="var(--text-subtle)">
                {toPersianDigits(l.slice(-2))}
              </text>
              <rect x={slotX(i) - slot / 2} y={0} width={slot} height={H} fill="transparent" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
            </g>
          ))}
        </svg>
        {hover !== null && (
          <Tooltip x={slotX(hover)} y={yAt(Math.max(0, ...series.map((s) => s.values[hover])))} width={W} height={H}>
            <span className="text-text-muted">{toPersianDigits(labels[hover])}</span>
            {series.map((s, si) => (
              <span key={s.name} className="flex items-center gap-1.5 text-text-main">
                <span className="inline-block w-2 h-2 rounded-sm" style={{ background: CHART_COLORS[si] }} />
                {s.name}: <b>{format(s.values[hover])}</b>
              </span>
            ))}
          </Tooltip>
        )}
      </div>
    </div>
  );
}

/** Ranked horizontal bars, single series. Label and value stay in text ink. */
export function BarList({
  items,
  format = compact,
  color = "var(--chart-1)",
}: {
  items: { label: string; value: number; hint?: string }[];
  format?: (n: number) => string;
  color?: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-2.5">
      {items.map((i, idx) => (
        <li key={`${idx}-${i.label}`} className="group" title={`${i.label}: ${format(i.value)}${i.hint ? ` · ${i.hint}` : ""}`}>
          <div className="flex justify-between gap-2 text-[11px] mb-1">
            <span className="text-text-main truncate">{i.label}</span>
            <span className="font-mono text-text-muted shrink-0">
              {format(i.value)}
              {i.hint && <span className="text-text-subtle"> · {i.hint}</span>}
            </span>
          </div>
          <div className="h-2 rounded-full bg-bg-subtle overflow-hidden">
            <div className="h-full rounded-full transition-opacity group-hover:opacity-80" style={{ width: `${(i.value / max) * 100}%`, background: color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** 100% stacked bar for a part-to-whole split (2–4 parts), with legend and values. */
export function ShareBar({ parts, format = compact }: { parts: { label: string; value: number }[]; format?: (n: number) => string }) {
  const total = parts.reduce((s, p) => s + p.value, 0);
  return (
    <div className="space-y-3">
      <div className="flex h-4 gap-[2px] rounded-md overflow-hidden bg-bg-subtle">
        {total > 0 &&
          parts.map((p, i) =>
            p.value > 0 ? (
              <div key={p.label} style={{ width: `${(p.value / total) * 100}%`, background: CHART_COLORS[i] }} title={`${p.label}: ${format(p.value)}`} />
            ) : null
          )}
      </div>
      <ul className="grid grid-cols-2 gap-2 text-[11px]">
        {parts.map((p, i) => (
          <li key={p.label} className="flex items-start gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-sm mt-0.5 shrink-0" style={{ background: CHART_COLORS[i] }} />
            <span>
              <span className="text-text-muted block">{p.label}</span>
              <b className="text-text-main font-mono">{total ? toPersianDigits(Math.round((p.value / total) * 100)) : "۰"}٪</b>
              <span className="text-text-subtle"> · {format(p.value)}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Thin progress meter for a single ratio (0–100). */
export function Meter({ value, label, hint }: { value: number | null; label: string; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[11px]">
        <span className="text-text-muted">{label}</span>
        <b className="font-mono text-text-main">{value === null ? "—" : `${toPersianDigits(value)}٪`}</b>
      </div>
      <div className="h-2 rounded-full bg-bg-subtle overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${value ?? 0}%`, background: "var(--chart-1)" }} />
      </div>
      {hint && <p className="text-[10px] text-text-subtle">{hint}</p>}
    </div>
  );
}
