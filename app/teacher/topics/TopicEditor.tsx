"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { draftSubtopicAction, saveTopicAction } from "@/app/actions/topics";
import { Icon, ICON } from "@/components/icons";
import { btn } from "@/components/ui";
import { THEME_KEYS, THEMES, type Question, type ThemeKey, type Topic } from "@/lib/topics";

type SubDraft = {
  key: string;
  id?: string;
  name: string;
  hidden: boolean;
  questions: Question[];
  tipsText: string;
  vocabText: string;
  open: boolean;
};

const input =
  "min-h-11 w-full rounded-xl border border-line-strong bg-white px-3.5 text-sm outline-none placeholder:text-[#A9A7B3] focus:border-ink";
const area =
  "w-full rounded-xl border border-line-strong bg-white px-3.5 py-2.5 text-sm leading-relaxed outline-none placeholder:text-[#A9A7B3] focus:border-ink";

let counter = 0;
const newKey = () => `k${++counter}-${Date.now()}`;

const toDraft = (s: Topic["subtopics"][number], open = false): SubDraft => ({
  key: newKey(),
  id: s.id,
  name: s.name,
  hidden: Boolean(s.hidden),
  questions: s.questions.length ? s.questions : [{ q: "", hint: "" }],
  tipsText: s.tips.join("\n"),
  vocabText: s.vocab.join("\n"),
  open,
});

const emptySub = (): SubDraft => ({
  key: newKey(),
  name: "",
  hidden: false,
  questions: [{ q: "", hint: "" }],
  tipsText: "",
  vocabText: "",
  open: true,
});

const lines = (s: string) =>
  s
    .split(/\n|;/)
    .map((x) => x.trim())
    .filter(Boolean);
const vocabList = (s: string) =>
  s
    .split(/\n|,/)
    .map((x) => x.trim())
    .filter(Boolean);

export function TopicEditor({ topic }: { topic?: Topic }) {
  const router = useRouter();
  const [title, setTitle] = useState(topic?.title ?? "");
  const [vi, setVi] = useState(topic?.vi ?? "");
  const [theme, setTheme] = useState<ThemeKey>(topic?.theme ?? "lilac");
  const [hidden, setHidden] = useState(Boolean(topic?.hidden));
  const [subs, setSubs] = useState<SubDraft[]>(() =>
    topic?.subtopics.length ? topic.subtopics.map((s) => toDraft(s)) : [emptySub()],
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();
  const [drafting, setDrafting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const colors = THEMES[theme];

  const update = (key: string, patch: Partial<SubDraft>) =>
    setSubs((list) => list.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  const setQuestion = (key: string, i: number, patch: Partial<Question>) =>
    setSubs((list) =>
      list.map((s) => (s.key === key ? { ...s, questions: s.questions.map((q, j) => (j === i ? { ...q, ...patch } : q)) } : s)),
    );
  const move = (key: string, dir: -1 | 1) =>
    setSubs((list) => {
      const i = list.findIndex((s) => s.key === key);
      const j = i + dir;
      if (j < 0 || j >= list.length) return list;
      const copy = [...list];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });

  async function aiDraft(s: SubDraft) {
    setError(null);
    setDrafting(s.key);
    const r = await draftSubtopicAction(title, s.name, 5);
    setDrafting(null);
    if (!r.ok) return setError(r.error);
    const existing = s.questions.filter((q) => q.q.trim());
    const fresh = r.draft.questions.filter((q) => !existing.some((e) => e.q.toLowerCase() === q.q.toLowerCase()));
    const tips = lines(s.tipsText);
    const vocab = vocabList(s.vocabText);
    update(s.key, {
      questions: [...existing, ...fresh],
      tipsText: [...tips, ...r.draft.tips.filter((t) => !tips.includes(t))].join("\n"),
      vocabText: [...vocab, ...r.draft.vocab.filter((v) => !vocab.includes(v))].join("\n"),
      open: true,
    });
  }

  function save() {
    setError(null);
    const payload = {
      id: topic?.id,
      title,
      vi,
      theme,
      hidden,
      subtopics: subs.map((s) => ({
        id: s.id,
        name: s.name,
        hidden: s.hidden,
        questions: s.questions,
        tips: lines(s.tipsText),
        vocab: vocabList(s.vocabText),
      })),
    };
    startSave(async () => {
      const r = await saveTopicAction(payload);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      router.push(`/teacher/topics?saved=${encodeURIComponent(r.id)}`);
    });
  }

  return (
    <div className="flex flex-col gap-5 px-5 pt-6 pb-28 sm:px-9">
      {/* Topic details */}
      <section className="grid grid-cols-1 gap-5 rounded-[22px] border border-line p-5 lg:grid-cols-[1fr_280px]">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold">Tên chủ đề (tiếng Anh)</span>
              <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: Health" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold">Tên tiếng Việt</span>
              <input className={input} value={vi} onChange={(e) => setVi(e.target.value)} placeholder="VD: Sức khoẻ" />
            </label>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold">Màu thẻ chủ đề</span>
            <div role="radiogroup" aria-label="Màu thẻ" className="flex flex-wrap gap-2">
              {THEME_KEYS.map((k) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={theme === k}
                  onClick={() => setTheme(k)}
                  className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-full border-2 px-3 text-xs font-semibold ${
                    theme === k ? "border-ink" : "border-transparent"
                  }`}
                  style={{ background: THEMES[k].bg }}
                >
                  <span className="size-3.5 rounded-full" style={{ background: THEMES[k].foot }} />
                  {THEMES[k].label}
                </button>
              ))}
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2.5 text-[13px]">
            <input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} className="size-4 accent-ink" />
            Ẩn chủ đề này với học sinh
          </label>
        </div>

        {/* Live preview */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-muted">Xem trước</span>
          <div className="overflow-hidden rounded-[18px]" style={{ background: colors.bg }}>
            <div className="flex items-center gap-3 p-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-white text-sm font-extrabold">
                {topic?.n ?? "06"}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-[15px] font-bold">{title || "Tên chủ đề"}</span>
                <span className="text-xs" style={{ color: colors.ink }}>
                  {vi || "Tên tiếng Việt"}
                </span>
              </span>
            </div>
            <div className="px-3 py-2 text-xs font-semibold" style={{ background: colors.foot }}>
              {subs.filter((s) => !s.hidden).length} tiểu chủ đề ·{" "}
              {subs.filter((s) => !s.hidden).reduce((a, s) => a + s.questions.filter((q) => q.q.trim()).length, 0)} câu hỏi
            </div>
          </div>
        </div>
      </section>

      {/* Subtopics */}
      <div className="flex items-center justify-between">
        <h2 className="m-0 text-lg font-bold">Tiểu chủ đề</h2>
        <span className="text-xs text-muted">Học sinh chọn tiểu chủ đề để luyện. Mỗi buổi dùng các câu hỏi bên dưới.</span>
      </div>

      {subs.map((s, i) => {
        const qCount = s.questions.filter((q) => q.q.trim()).length;
        return (
          <section key={s.key} className={`overflow-hidden rounded-[20px] border border-line ${s.hidden ? "bg-soft" : "bg-white"}`}>
            <div className="flex flex-wrap items-center gap-2 px-4 py-3">
              <button
                type="button"
                onClick={() => update(s.key, { open: !s.open })}
                aria-expanded={s.open}
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 text-left"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-shell text-xs font-bold">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold">{s.name || "Tiểu chủ đề mới"}</span>
                  <span className="text-xs text-muted">
                    {qCount} câu hỏi{s.hidden ? " · đang ẩn" : ""}
                  </span>
                </span>
                <Icon d={s.open ? "m6 15 6-6 6 6" : "m6 9 6 6 6-6"} size={16} width={2} />
              </button>
              <button type="button" aria-label="Đưa lên" onClick={() => move(s.key, -1)} disabled={i === 0} className="flex size-9 cursor-pointer items-center justify-center rounded-full hover:bg-shell disabled:opacity-30">
                <Icon d="m6 15 6-6 6 6" size={14} width={2} />
              </button>
              <button type="button" aria-label="Đưa xuống" onClick={() => move(s.key, 1)} disabled={i === subs.length - 1} className="flex size-9 cursor-pointer items-center justify-center rounded-full hover:bg-shell disabled:opacity-30">
                <Icon d="m6 9 6 6 6-6" size={14} width={2} />
              </button>
            </div>

            {s.open && (
              <div className="flex flex-col gap-4 border-t border-line px-4 pt-4 pb-5">
                <div className="flex flex-wrap items-end gap-3">
                  <label className="flex min-w-[220px] flex-1 flex-col gap-1.5">
                    <span className="text-[13px] font-semibold">Tên tiểu chủ đề</span>
                    <input className={input} value={s.name} onChange={(e) => update(s.key, { name: e.target.value })} placeholder="VD: Healthy eating" />
                  </label>
                  <button
                    type="button"
                    onClick={() => aiDraft(s)}
                    disabled={drafting !== null}
                    className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-lilac px-4 text-sm font-semibold text-lilac-ink hover:bg-lilac-deep disabled:opacity-60"
                  >
                    {drafting === s.key ? (
                      <span className="spin size-4 rounded-full border-2 border-lilac-ink border-t-transparent" />
                    ) : (
                      <span aria-hidden="true">✨</span>
                    )}
                    {drafting === s.key ? "AI đang gợi ý…" : "Gợi ý bằng AI"}
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-[13px] font-semibold">Câu hỏi</span>
                  {s.questions.map((q, j) => (
                    <div key={j} className="flex flex-col gap-1.5 rounded-xl bg-soft p-2.5 sm:flex-row sm:items-center">
                      <span className="w-6 shrink-0 text-center text-xs font-bold text-muted">{j + 1}</span>
                      <input
                        className={`${input} sm:flex-[3]`}
                        value={q.q}
                        onChange={(e) => setQuestion(s.key, j, { q: e.target.value })}
                        placeholder="Câu hỏi tiếng Anh, VD: What do you usually eat for breakfast?"
                        aria-label={`Câu hỏi ${j + 1}`}
                      />
                      <input
                        className={`${input} sm:flex-[2]`}
                        value={q.hint}
                        onChange={(e) => setQuestion(s.key, j, { hint: e.target.value })}
                        placeholder="Gợi ý tiếng Việt"
                        aria-label={`Gợi ý tiếng Việt cho câu ${j + 1}`}
                      />
                      <button
                        type="button"
                        aria-label={`Xoá câu hỏi ${j + 1}`}
                        onClick={() =>
                          update(s.key, {
                            questions: s.questions.length > 1 ? s.questions.filter((_, x) => x !== j) : [{ q: "", hint: "" }],
                          })
                        }
                        className="flex size-9 shrink-0 cursor-pointer items-center justify-center self-end rounded-full text-muted hover:bg-white hover:text-bad sm:self-auto"
                      >
                        <Icon d={ICON.close} size={14} width={2} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => update(s.key, { questions: [...s.questions, { q: "", hint: "" }] })}
                    className="self-start text-[13px] font-semibold text-link hover:underline"
                  >
                    + Thêm câu hỏi
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[13px] font-semibold">Mẹo trả lời (mỗi dòng một mẹo)</span>
                    <textarea
                      rows={4}
                      className={area}
                      value={s.tipsText}
                      onChange={(e) => update(s.key, { tipsText: e.target.value })}
                      placeholder={"Nêu ý chính rồi giải thích bằng because.\nĐưa một ví dụ cụ thể."}
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[13px] font-semibold">Từ vựng hữu ích (mỗi dòng hoặc cách nhau bằng dấu phẩy)</span>
                    <textarea
                      rows={4}
                      className={area}
                      value={s.vocabText}
                      onChange={(e) => update(s.key, { vocabText: e.target.value })}
                      placeholder={"balanced diet\nwork out\nstay hydrated"}
                    />
                  </label>
                </div>

                <div className="flex flex-wrap items-center gap-3 border-t border-line pt-3">
                  <label className="flex cursor-pointer items-center gap-2 text-[13px]">
                    <input type="checkbox" checked={s.hidden} onChange={(e) => update(s.key, { hidden: e.target.checked })} className="size-4 accent-ink" />
                    Ẩn tiểu chủ đề này
                  </label>
                  <span className="flex-1" />
                  {confirmDelete === s.key ? (
                    <span className="flex items-center gap-2 text-[13px]">
                      Xoá tiểu chủ đề này?
                      <button
                        type="button"
                        onClick={() => {
                          setSubs((list) => list.filter((x) => x.key !== s.key));
                          setConfirmDelete(null);
                        }}
                        className="min-h-9 cursor-pointer rounded-full bg-bad px-3 text-xs font-semibold text-white"
                      >
                        Xoá
                      </button>
                      <button type="button" onClick={() => setConfirmDelete(null)} className="min-h-9 cursor-pointer rounded-full px-3 text-xs font-semibold hover:bg-shell">
                        Huỷ
                      </button>
                    </span>
                  ) : (
                    <button type="button" onClick={() => setConfirmDelete(s.key)} className="text-[13px] font-semibold text-bad hover:underline">
                      Xoá tiểu chủ đề
                    </button>
                  )}
                </div>
              </div>
            )}
          </section>
        );
      })}

      <button
        type="button"
        onClick={() => setSubs((list) => [...list.map((s) => ({ ...s, open: false })), emptySub()])}
        className="flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-[20px] border-2 border-dashed border-line-strong text-sm font-semibold text-muted hover:border-ink hover:text-ink"
      >
        <Icon d={ICON.plus} size={16} width={2} /> Thêm tiểu chủ đề
      </button>

      <p className="m-0 text-xs leading-normal text-muted">
        Sửa câu hỏi không ảnh hưởng các buổi luyện đã làm: mỗi buổi luyện lưu lại câu hỏi tại thời điểm học sinh luyện.
      </p>

      {/* Sticky save bar */}
      <div className="fixed inset-x-0 bottom-[68px] z-30 border-t border-line bg-white/95 px-5 py-3 backdrop-blur lg:bottom-0 lg:left-[260px]">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3">
          {error ? (
            <span role="alert" className="flex-1 text-[13px] font-medium text-bad">
              {error}
            </span>
          ) : (
            <span className="flex-1 text-[13px] text-muted">
              {topic ? "Thay đổi được áp dụng ngay cho học sinh sau khi lưu." : "Chủ đề mới sẽ hiện với học sinh sau khi lưu."}
            </span>
          )}
          <Link href="/teacher/topics" className={btn.light}>
            Huỷ
          </Link>
          <button type="button" onClick={save} disabled={saving} className={btn.dark}>
            {saving ? "Đang lưu…" : topic ? "Lưu thay đổi" : "Tạo chủ đề"}
          </button>
        </div>
      </div>
    </div>
  );
}
