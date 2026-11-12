"use client";

/**
 * Small hand-rolled SVG chart kit (dataviz skill rules):
 * one y-axis, thin marks (2px lines, <=24px bars, 4px rounded data-ends), hairline grid,
 * selective labels, hover/focus tooltips that never gate (each chart has a table view).
 * Colours: ACCENT = the series the reader is looking at, CONTEXT = comparison (class average…).
 */
import { useEffect, useId, useRef, useState } from "react";
import { scoreDomain } from "@/lib/chart-domain";

export const ACCENT = "#4F55D8";
export const ACCENT_SOFT = "#B9BDEF";
export const CONTEXT = "#8F8D9B";
const GRID = "#ECEAF1";
const AXIS_TEXT = "#5E5C68";

type Tip = { x: number; y: number; title: string; rows: { label: string; value: string; color?: string; dash?: boolean }[] } | null;

function Tooltip({ tip }: { tip: Tip }) {
  if (!tip) return null;
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-10 min-w-[120px] -translate-x-1/2 -translate-y-[calc(100%+10px)] rounded-xl border border-line bg-white px-3 py-2 text-xs shadow-lg"
      style={{ left: tip.x, top: tip.y }}
    >
      <div className="mb-1 font-semibold text-muted">{tip.title}</div>
      {tip.rows.map((r) => (
        <div key={r.label} className="flex items-center gap-2 py-0.5">
          {r.color && (
            <svg width="14" height="4" aria-hidden="true">
              <line x1="0" y1="2" x2="14" y2="2" stroke={r.color} strokeWidth="2.5" strokeDasharray={r.dash ? "3 2" : undefined} />
            </svg>
          )}
          <span className="text-[13px] font-bold text-ink tabular-nums">{r.value}</span>
          <span className="text-muted">{r.label}</span>
        </div>
      ))}
    </div>
  );
}

const fmt1 = (v: number | null | undefined) => (v == null ? "–" : v.toFixed(1));


/* ------------------------------------------------------------------ */
/* Line chart on a 0–10 score axis: one accent series + optional gray reference series. */
export function ScoreLineChart({
  labels,
  series,
  reference,
  height = 220,
  ariaLabel,
}: {
  labels: string[];
  series: { name: string; values: (number | null)[] };
  reference?: { name: string; values: (number | null)[] };
  height?: number;
  ariaLabel: string;
}) {
  const dom = scoreDomain([...series.values, ...(reference?.values ?? [])]);
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [width, setWidth] = useState(640);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const pad = { l: 28, r: 40, t: 14, b: 26 };
  const plotW = Math.max(width - pad.l - pad.r, 50);
  const plotH = height - pad.t - pad.b;
  const n = labels.length;
  const x = (i: number) => pad.l + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (v: number) => pad.t + plotH - ((v - dom.min) / (dom.max - dom.min)) * plotH;
  const path = (vals: (number | null)[]) =>
    vals
      .map((v, i) => (v == null ? null : `${x(i)},${y(v)}`))
      .reduce<string[]>((acc, p, i) => {
        if (p == null) return acc;
        acc.push(`${i === 0 || vals[i - 1] == null ? "M" : "L"}${p}`);
        return acc;
      }, [])
      .join(" ");
  const lastIdx = [...series.values.keys()].reverse().find((i) => series.values[i] != null);

  function onMove(clientX: number) {
    const box = ref.current?.getBoundingClientRect();
    if (!box) return;
    const rel = clientX - box.left;
    const i = Math.round(((rel - pad.l) / plotW) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  }

  const tip: Tip =
    hover == null
      ? null
      : {
          x: x(hover),
          y: y(Math.max(series.values[hover] ?? 0, reference?.values[hover] ?? 0)),
          title: labels[hover],
          rows: [
            { label: series.name, value: fmt1(series.values[hover]), color: ACCENT },
            ...(reference ? [{ label: reference.name, value: fmt1(reference.values[hover]), color: CONTEXT, dash: true }] : []),
          ],
        };

  return (
    <div
      ref={ref}
      className="relative w-full select-none"
      onPointerMove={(e) => onMove(e.clientX)}
      onPointerLeave={() => setHover(null)}
    >
      {reference && (
        <div className="mb-1 flex flex-wrap items-center gap-4 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <svg width="18" height="6" aria-hidden="true">
              <line x1="1" y1="3" x2="17" y2="3" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" />
            </svg>
            {series.name}
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="18" height="6" aria-hidden="true">
              <line x1="1" y1="3" x2="17" y2="3" stroke={CONTEXT} strokeWidth="2" strokeDasharray="4 3" />
            </svg>
            {reference.name}
          </span>
        </div>
      )}
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ariaLabel}>
        {Array.from({ length: Math.floor((dom.max - dom.min) / dom.step) + 1 }, (_, i) => dom.min + i * dom.step).map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={pad.l + plotW} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth="1" />
            <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill={AXIS_TEXT} className="tabular-nums">
              {t}
            </text>
          </g>
        ))}
        {labels.map((l, i) =>
          n <= 8 || i % Math.ceil(n / 8) === 0 || i === n - 1 ? (
            <text key={i} x={x(i)} y={height - 6} textAnchor="middle" fontSize="11" fill={AXIS_TEXT}>
              {l}
            </text>
          ) : null,
        )}
        {hover != null && <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + plotH} stroke="#D9D6E2" strokeWidth="1" />}
        {reference && (
          <path d={path(reference.values)} fill="none" stroke={CONTEXT} strokeWidth="2" strokeDasharray="5 4" strokeLinecap="round" strokeLinejoin="round" />
        )}
        <path d={path(series.values)} fill="none" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {series.values.map((v, i) =>
          v == null ? null : (
            <circle key={i} cx={x(i)} cy={y(v)} r={hover === i || i === lastIdx ? 5 : 3.5} fill={ACCENT} stroke="#fff" strokeWidth="2" />
          ),
        )}
        {lastIdx != null && series.values[lastIdx] != null && (
          <text x={x(lastIdx) + 9} y={y(series.values[lastIdx]!) + 4} fontSize="12" fontWeight="700" fill="#16151A">
            {fmt1(series.values[lastIdx])}
          </text>
        )}
      </svg>
      <Tooltip tip={tip} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Column chart for counts (one series). The latest column is the accent, earlier ones soft. */
export function CountColumns({
  data,
  height = 160,
  unit,
  ariaLabel,
}: {
  data: { label: string; value: number; title?: string }[];
  height?: number;
  unit: string;
  ariaLabel: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const nice = max <= 5 ? 5 : max <= 10 ? 10 : Math.ceil(max / 10) * 10;
  const plotH = height - 40;
  return (
    <div className="relative" role="img" aria-label={ariaLabel}>
      <div className="flex items-end gap-1.5 border-b border-line" style={{ height: plotH + 18 }}>
        {data.map((d, i) => {
          const h = (d.value / nice) * plotH;
          const last = i === data.length - 1;
          return (
            <button
              key={i}
              type="button"
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              aria-label={`${d.title ?? d.label}: ${d.value} ${unit}`}
              className="relative flex h-full flex-1 cursor-default flex-col items-center justify-end gap-1 outline-none"
            >
              {(last || hover === i) && d.value > 0 && (
                <span className="text-[11px] font-bold text-ink tabular-nums">{d.value}</span>
              )}
              <span
                className="w-full max-w-6 rounded-t transition-opacity"
                style={{
                  height: Math.max(d.value > 0 ? 3 : 0, h),
                  background: last ? ACCENT : ACCENT_SOFT,
                  opacity: hover != null && hover !== i ? 0.6 : 1,
                }}
              />
            </button>
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-1.5">
        {data.map((d, i) => (
          <span key={i} className="flex-1 truncate text-center text-[10px] text-muted">
            {d.label}
          </span>
        ))}
      </div>
      {hover != null && (
        <div className="pointer-events-none absolute top-0 right-0 rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs shadow">
          <span className="font-bold text-ink">
            {data[hover].value} {unit}
          </span>{" "}
          <span className="text-muted">· {data[hover].title ?? data[hover].label}</span>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Dumbbell: before → after per row on a shared 0–10 scale. */
export function Dumbbell({
  rows,
  beforeLabel,
  afterLabel,
}: {
  rows: { label: string; before: number | null; after: number | null }[];
  beforeLabel: string;
  afterLabel: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const dom = scoreDomain(rows.flatMap((r) => [r.before, r.after]), 2);
  const pct = (v: number) => `${((v - dom.min) / (dom.max - dom.min)) * 100}%`;
  return (
    <div className="flex flex-col gap-1">
      <div className="mb-1 flex flex-wrap items-center gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full" style={{ background: ACCENT_SOFT }} /> {beforeLabel}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full" style={{ background: ACCENT }} /> {afterLabel}
        </span>
      </div>
      {rows.map((r, i) => {
        const d = r.before != null && r.after != null ? r.after - r.before : null;
        return (
          <div
            key={r.label}
            tabIndex={0}
            onPointerEnter={() => setHover(i)}
            onPointerLeave={() => setHover(null)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
            className={`grid grid-cols-[88px_1fr_74px] items-center gap-3 rounded-lg px-1 py-1.5 outline-none sm:grid-cols-[110px_1fr_84px] ${hover === i ? "bg-soft" : ""}`}
            aria-label={`${r.label}: ${beforeLabel} ${fmt1(r.before)}, ${afterLabel} ${fmt1(r.after)}`}
          >
            <span className="text-sm">{r.label}</span>
            <div className="relative h-5">
              <div className="absolute inset-x-0 top-1/2 h-px bg-line" />
              {r.before != null && r.after != null && (
                <div
                  className="absolute top-1/2 h-0.5 -translate-y-1/2"
                  style={{
                    left: pct(Math.min(r.before, r.after)),
                    width: `${(Math.abs(r.after - r.before) / (dom.max - dom.min)) * 100}%`,
                    background: "#C9C7D1",
                  }}
                />
              )}
              {r.before != null && (
                <span className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white" style={{ left: pct(r.before), background: ACCENT_SOFT }} />
              )}
              {r.after != null && (
                <span className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white" style={{ left: pct(r.after), background: ACCENT }} />
              )}
            </div>
            <span className="text-right text-sm tabular-nums">
              <strong>{fmt1(r.after)}</strong>{" "}
              {d != null && (
                <span className={`text-xs font-semibold ${d > 0.04 ? "text-good" : d < -0.04 ? "text-bad" : "text-muted"}`}>
                  {d > 0.04 ? "▲" : d < -0.04 ? "▼" : "±"}
                  {Math.abs(d).toFixed(1)}
                </span>
              )}
            </span>
          </div>
        );
      })}
      <div className="grid grid-cols-[88px_1fr_74px] gap-3 px-1 text-[10px] text-muted tabular-nums sm:grid-cols-[110px_1fr_84px]">
        <span />
        <span className="flex justify-between">
          <span>{dom.min}</span>
          <span>{dom.max}</span>
        </span>
        <span />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Bullet rows: student's value as a bar, comparison (class average) as a tick. */
export function BulletRows({
  rows,
  valueLabel,
  refLabel,
}: {
  rows: { label: string; value: number | null; ref: number | null; color: string }[];
  valueLabel: string;
  refLabel: string;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded-sm" style={{ background: ACCENT }} /> {valueLabel}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-0.5" style={{ background: "#16151A" }} /> {refLabel}
        </span>
      </div>
      {rows.map((r) => (
        <div
          key={r.label}
          className="grid grid-cols-[88px_1fr_80px] items-center gap-3 sm:grid-cols-[110px_1fr_92px]"
          aria-label={`${r.label}: ${valueLabel} ${fmt1(r.value)}, ${refLabel} ${fmt1(r.ref)}`}
          title={`${valueLabel} ${fmt1(r.value)} · ${refLabel} ${fmt1(r.ref)}`}
        >
          <span className="text-sm">{r.label}</span>
          <div className="relative h-3 rounded-full bg-shell">
            {r.value != null && <div className="h-3 rounded-full" style={{ width: `${r.value * 10}%`, background: r.color }} />}
            {r.ref != null && <span className="absolute -top-1 h-5 w-0.5 bg-ink" style={{ left: `${r.ref * 10}%` }} />}
          </div>
          <span className="text-right text-sm tabular-nums">
            <strong>{fmt1(r.value)}</strong>
            {r.value != null && r.ref != null && (
              <span className={`ml-1 text-xs font-semibold ${r.value - r.ref >= 0 ? "text-good" : "text-bad"}`}>
                {r.value - r.ref >= 0 ? "+" : ""}
                {(r.value - r.ref).toFixed(1)}
              </span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sparkline for table rows / small multiples (de-emphasis line, last point in accent). */
export function Sparkline({
  values,
  width = 96,
  height = 28,
  label,
  domain,
}: {
  values: number[];
  width?: number;
  height?: number;
  label: string;
  /** Shared y-range, e.g. for small multiples that must be comparable. */
  domain?: { min: number; max: number };
}) {
  const id = useId();
  if (values.length === 0) return <span className="text-xs text-muted">–</span>;
  const { min: yMin, max: yMax } = domain ?? scoreDomain(values, 2);
  const p = 4;
  const x = (i: number) => p + (values.length === 1 ? (width - 2 * p) / 2 : (i / (values.length - 1)) * (width - 2 * p));
  const y = (v: number) => p + (height - 2 * p) * (1 - (v - yMin) / (yMax - yMin || 1));
  const d = values.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ");
  const last = values.length - 1;
  return (
    <svg width={width} height={height} role="img" aria-labelledby={id}>
      <title id={id}>{label}</title>
      <path d={d} fill="none" stroke={CONTEXT} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(last)} cy={y(values[last])} r="3.5" fill={ACCENT} stroke="#fff" strokeWidth="1.5" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Tall segmented bar: one whole split into <= 6 parts (share printed when it fits). */
export function SegmentedBar({
  parts,
  total,
}: {
  parts: { label: string; value: number; color: string; text: string }[];
  total: number;
}) {
  const shown = parts.filter((p) => p.value > 0);
  return (
    <div className="flex flex-col gap-2.5">
      <div
        className="flex h-7 w-full gap-0.5"
        role="img"
        aria-label={parts.map((p) => `${p.label}: ${p.value}`).join(", ")}
      >
        {shown.map((p) => {
          const share = total ? p.value / total : 0;
          return (
            <div
              key={p.label}
              title={`${p.label}: ${p.value} (${Math.round(share * 100)}%)`}
              className="flex h-full items-center overflow-hidden rounded px-2 text-xs font-bold"
              style={{ width: `${share * 100}%`, background: p.color, color: p.text }}
            >
              {share >= 0.12 ? p.value : ""}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        {parts.map((p) => (
          <span key={p.label} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ background: p.color }} />
            {p.label} <strong className="text-ink">{p.value}</strong>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Ranked horizontal bars (one hue), value at the tip. */
export function RankedBars({ rows, unit }: { rows: { label: string; value: number; sub?: string }[]; unit: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="flex flex-col gap-2">
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[minmax(90px,140px)_1fr] items-center gap-3" title={`${r.label}: ${r.value} ${unit}`}>
          <span className="truncate text-sm">{r.label}</span>
          <div className="flex items-center gap-2">
            <div className="h-3.5 rounded-r" style={{ width: `${(r.value / max) * 85}%`, minWidth: r.value ? 4 : 0, background: ACCENT }} />
            <span className="text-xs whitespace-nowrap text-muted tabular-nums">
              <strong className="text-ink">{r.value}</strong> {unit}
              {r.sub ? ` · ${r.sub}` : ""}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Collapsible table view – the accessible twin of a chart. */
export function TableView({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <details className="group mt-3 text-xs">
      <summary className="cursor-pointer font-semibold text-link select-none">Xem bảng số liệu</summary>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-soft text-left">
              {head.map((h) => (
                <th key={h} className="px-2.5 py-1.5 font-semibold text-muted">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-line">
                {r.map((c, j) => (
                  <td key={j} className="px-2.5 py-1.5 tabular-nums">
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
