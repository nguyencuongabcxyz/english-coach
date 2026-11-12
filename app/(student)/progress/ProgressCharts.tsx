"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Row = {
  id: string;
  seq: number;
  topicId: string;
  topic: string;
  title: string;
  date: string;
  reviewed: boolean;
  total: number;
  fluency: number;
  vocabulary: number;
  grammar: number;
  pronunciation: number;
  content: number;
};

const METRICS = [
  ["total", "Tổng điểm"],
  ["fluency", "Trôi chảy"],
  ["vocabulary", "Từ vựng"],
  ["grammar", "Ngữ pháp"],
  ["pronunciation", "Phát âm"],
  ["content", "Nội dung"],
] as const;
type MetricKey = (typeof METRICS)[number][0];

const f = (v: number) => v.toFixed(1);

export function ProgressCharts({
  rows,
  topics,
  profile,
}: {
  rows: Row[];
  topics: { id: string; title: string }[];
  profile: React.ReactNode;
}) {
  const [metric, setMetric] = useState<MetricKey>("total");
  const [topic, setTopic] = useState("all");
  const filtered = useMemo(() => (topic === "all" ? rows : rows.filter((r) => r.topicId === topic)), [rows, topic]);
  const chartRows = filtered.slice(-8);
  const label = METRICS.find(([k]) => k === metric)![1];
  const H = 200;

  return (
    <>
      <div className="flex flex-wrap items-stretch gap-4 px-5 pt-6 pb-3 sm:px-9">
        {profile}
        <section className="flex min-w-0 flex-[999_1_460px] flex-col gap-4 rounded-[22px] border border-line p-5">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <h2 className="m-0 text-[17px] font-bold">{label} qua các lần luyện</h2>
            <div role="tablist" aria-label="Chọn kỹ năng" className="no-scrollbar -mx-1 flex max-w-full gap-1.5 overflow-x-auto px-1">
              {METRICS.map(([k, l]) => (
                <button
                  key={k}
                  role="tab"
                  aria-selected={k === metric}
                  onClick={() => setMetric(k)}
                  className={`min-h-9 shrink-0 cursor-pointer rounded-full px-3.5 text-xs ${
                    k === metric ? "bg-ink font-semibold text-white" : "bg-chip font-medium hover:bg-line"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <div aria-hidden="true" className="flex w-6 flex-col justify-between text-right text-[11px] text-muted" style={{ height: H }}>
              <span>10</span>
              <span>7.5</span>
              <span>5</span>
              <span>2.5</span>
              <span>0</span>
            </div>
            <div
              className="grid flex-1 items-end gap-2 border-b border-line-strong sm:gap-[18px]"
              style={{
                height: H,
                gridTemplateColumns: `repeat(${chartRows.length}, minmax(0, 1fr))`,
                background: `repeating-linear-gradient(to bottom, #F1EFF6 0 1px, transparent 1px ${H / 4}px)`,
              }}
              role="img"
              aria-label={`${label}: ${chartRows.map((r) => `lần ${r.seq} ${f(r[metric])}`).join(", ")}`}
            >
              {chartRows.map((r, i) => (
                <div key={r.id} className="flex h-full flex-col items-center justify-end gap-1.5">
                  <span className="text-[12px] font-bold sm:text-[13px]">{f(r[metric])}</span>
                  <div
                    className="w-full max-w-[72px] rounded-t-[10px] transition-[height] duration-300"
                    style={{ height: `${(r[metric] / 10) * (H - 24)}px`, background: i === chartRows.length - 1 ? "#16151A" : "#B9BDEF" }}
                  />
                </div>
              ))}
            </div>
          </div>
          <div
            className="grid gap-2 pl-9 text-center text-[11px] text-muted sm:gap-[18px] sm:text-xs"
            style={{ gridTemplateColumns: `repeat(${chartRows.length}, minmax(0, 1fr))` }}
          >
            {chartRows.map((r) => (
              <span key={r.id}>Lần {r.seq}</span>
            ))}
          </div>
        </section>
      </div>

      <section className="mx-5 mt-3 mb-8 overflow-hidden rounded-[22px] border border-line sm:mx-9">
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-[18px]">
          <h2 className="m-0 text-[17px] font-bold">
            Kết quả từng lần{topic !== "all" ? ` · ${topics.find((t) => t.id === topic)?.title}` : ""}
          </h2>
          <div className="flex items-center gap-3">
            <select
              aria-label="Lọc theo chủ đề"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="min-h-9 rounded-full border border-line px-3 text-xs"
            >
              <option value="all">Tất cả chủ đề</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
            <span className="hidden text-xs text-muted sm:inline">Thang điểm 10 · AI tham khảo</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="bg-soft text-left">
                {["Lần", "Chủ đề", "Tổng", "Trôi chảy", "Từ vựng", "Ngữ pháp", "Phát âm", "Nội dung", "Ngày"].map((h, i) => (
                  <th key={h} scope="col" className={`py-3 text-xs font-semibold text-muted ${i === 0 ? "px-5" : "px-3"}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered
                .slice()
                .reverse()
                .map((r) => (
                  <tr key={r.id} className="border-t border-line">
                    <th scope="row" className="px-5 py-3.5 text-left font-semibold">
                      <Link href={`/feedback/${r.id}`} className="hover:underline">
                        Lần {r.seq}
                      </Link>
                    </th>
                    <td className="px-3 py-3.5">
                      <span className="block max-w-[180px] truncate" title={r.title}>
                        {r.topic} · <span className="text-muted">{r.title}</span>
                      </span>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className="rounded-full bg-lilac px-2.5 py-1 font-extrabold">{f(r.total)}</span>
                    </td>
                    <td className="px-3 py-3.5">{f(r.fluency)}</td>
                    <td className="px-3 py-3.5">{f(r.vocabulary)}</td>
                    <td className="px-3 py-3.5">{f(r.grammar)}</td>
                    <td className="px-3 py-3.5">{f(r.pronunciation)}</td>
                    <td className="px-3 py-3.5">{f(r.content)}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-muted">
                      {r.date}
                      {r.reviewed && <span className="ml-1.5 text-good" title="Giáo viên đã duyệt">✓</span>}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
