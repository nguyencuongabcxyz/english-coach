"use client";

import { useMemo, useState, useTransition } from "react";
import { startTopic } from "@/app/actions/practice";
import { Icon, ICON } from "@/components/icons";

type T = {
  id: string;
  n: string;
  title: string;
  vi: string;
  bg: string;
  foot: string;
  ink: string;
  sessions: number;
  subs: { id: string; name: string; count: number }[];
};

export function TopicsBrowser({ topics }: { topics: T[] }) {
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, start] = useTransition();

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return topics
      .filter((t) => filter === "all" || t.id === filter)
      .map((t) => ({
        ...t,
        subs: term
          ? t.subs.filter((s) => s.name.toLowerCase().includes(term) || t.title.toLowerCase().includes(term) || t.vi.toLowerCase().includes(term))
          : t.subs,
      }))
      .filter((t) => t.subs.length);
  }, [topics, filter, q]);

  const filters = [{ id: "all", label: "Tất cả" }, ...topics.map((t) => ({ id: t.id, label: t.title }))];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-9">
        <div role="tablist" aria-label="Lọc chủ đề" className="no-scrollbar -mx-1 flex max-w-full gap-2 overflow-x-auto px-1 sm:flex-wrap sm:overflow-visible">
          {filters.map((f) => {
            const on = f.id === filter;
            return (
              <button
                key={f.id}
                role="tab"
                aria-selected={on}
                onClick={() => setFilter(f.id)}
                className={`min-h-10 shrink-0 cursor-pointer rounded-full px-5 text-[13px] ${
                  on ? "bg-ink font-semibold text-white" : "bg-chip font-medium text-ink hover:bg-line"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
        <label className="flex min-h-10 w-full items-center gap-2 rounded-full border border-line px-3.5 sm:w-auto">
          <Icon d={ICON.search} size={16} stroke="#5E5C68" width={2} />
          <span className="sr-only">Tìm chủ đề</span>
          <input
            type="search"
            placeholder="Tìm chủ đề"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full bg-transparent text-sm outline-none sm:w-40"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-[18px] px-5 pt-6 pb-8 sm:px-9 md:grid-cols-2 xl:grid-cols-3">
        {shown.map((t) => (
          <section key={t.id} className="flex flex-col overflow-hidden rounded-[22px]" style={{ background: t.bg }}>
            <div className="flex flex-col gap-2.5 p-3.5">
              <div className="flex items-center gap-3 px-0.5 pt-1 pb-1.5">
                <span className="flex size-11 items-center justify-center rounded-xl bg-white text-[15px] font-extrabold">{t.n}</span>
                <span className="flex flex-col gap-0.5">
                  <span className="text-[17px] font-bold">{t.title}</span>
                  <span className="text-xs" style={{ color: t.ink }}>
                    {t.vi}
                  </span>
                </span>
              </div>
              {t.subs.map((s) => (
                <button
                  key={s.id}
                  disabled={pendingId !== null}
                  onClick={() => {
                    setPendingId(s.id);
                    start(() => startTopic(s.id));
                  }}
                  className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-[14px] bg-white px-3.5 py-3 text-left transition-shadow hover:shadow-md disabled:cursor-wait"
                >
                  <span className="flex size-[34px] shrink-0 items-center justify-center rounded-[10px] bg-soft">
                    {pendingId === s.id ? (
                      <span className="spin size-4 rounded-full border-2 border-ink border-t-transparent" />
                    ) : (
                      <Icon d={ICON.mic} size={16} />
                    )}
                  </span>
                  <span className="flex flex-1 flex-col gap-0.5">
                    <span className="text-sm font-semibold">{s.name}</span>
                    <span className="text-xs text-muted">
                      {s.count} câu hỏi · ~{s.count} phút
                    </span>
                  </span>
                  <Icon d={ICON.chevronRight} size={16} width={2} />
                </button>
              ))}
            </div>
            <div className="mt-auto flex items-center gap-2 px-3.5 py-2.5" style={{ background: t.foot }}>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-[5px] text-xs font-semibold">
                {t.sessions > 0 && <Icon d={ICON.check} size={12} stroke="#11663F" width={3} />}
                {t.sessions > 0 ? "Đã luyện" : "Chưa luyện"}
              </span>
              <span className="rounded-full bg-white px-2.5 py-[5px] text-xs font-semibold">{t.sessions} buổi</span>
            </div>
          </section>
        ))}
        {shown.length === 0 && (
          <p className="col-span-full m-0 text-sm text-muted">Không tìm thấy chủ đề phù hợp với “{q}”.</p>
        )}
        {filter === "all" && !q && (
          <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-[22px] border-2 border-dashed border-line-strong p-6 text-center">
            <Icon d={ICON.plus} size={28} stroke="#5E5C68" />
            <span className="text-[15px] font-bold">Sắp có thêm chủ đề</span>
            <span className="max-w-[240px] text-[13px] leading-normal text-muted">
              Giáo viên có thể bổ sung chủ đề theo chương trình của từng khối lớp.
            </span>
          </div>
        )}
      </div>
    </>
  );
}
