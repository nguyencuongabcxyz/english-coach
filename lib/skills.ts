// Assessment criteria (Module 4) + personalisation rules (Module 5).

export const SKILLS = ["pronunciation", "fluency", "vocabulary", "grammar", "content"] as const;
export type Skill = (typeof SKILLS)[number];
export type Scores = Record<Skill, number> & { total: number };

export const SKILL_VI: Record<Skill, string> = {
  pronunciation: "Phát âm",
  fluency: "Độ trôi chảy",
  vocabulary: "Từ vựng",
  grammar: "Ngữ pháp",
  content: "Nội dung",
};
export const SKILL_SHORT_VI: Record<Skill, string> = {
  pronunciation: "Phát âm",
  fluency: "Trôi chảy",
  vocabulary: "Từ vựng",
  grammar: "Ngữ pháp",
  content: "Nội dung",
};
export const SKILL_EN: Record<Skill, string> = {
  pronunciation: "Pronunciation",
  fluency: "Fluency",
  vocabulary: "Vocabulary",
  grammar: "Grammar",
  content: "Content",
};

export type Level = { label: string; bg: string; fg: string; bar: string };
export function level(v: number): Level {
  if (v >= 8) return { label: "Tốt", bg: "#D9F5E6", fg: "#11663F", bar: "#3FAE7A" };
  if (v >= 6.5) return { label: "Khá", bg: "#FCEBC8", fg: "#7A4D00", bar: "#E3A92B" };
  return { label: "Cần cải thiện", bg: "#FBD9D2", fg: "#9B2C1A", bar: "#E0624A" };
}

export const round1 = (v: number) => Math.round(v * 10) / 10;
export const fmt = (v: number | null | undefined) =>
  v == null || Number.isNaN(v) ? "–" : round1(v).toFixed(1);

export function totalOf(s: Record<Skill, number>) {
  return round1(SKILLS.reduce((a, k) => a + (s[k] ?? 0), 0) / SKILLS.length);
}

export function averageScores(list: Record<Skill, number>[]): Scores | null {
  if (!list.length) return null;
  const out = {} as Scores;
  for (const k of SKILLS) out[k] = round1(list.reduce((a, s) => a + (s[k] ?? 0), 0) / list.length);
  out.total = totalOf(out);
  return out;
}

export function weakestSkill(s: Record<Skill, number>): Skill {
  return [...SKILLS].sort((a, b) => s[a] - s[b])[0];
}

export function weakSkills(s: Record<Skill, number>, threshold = 7): Skill[] {
  return SKILLS.filter((k) => s[k] < threshold).sort((a, b) => s[a] - s[b]);
}

/** A personalised follow-up activity, chosen from the student's weakest skill. */
export type Activity = {
  skill: Skill;
  title: string;
  description: string;
  minutes: number;
  question: string;
  instruction: string;
  keywords: string[];
  topicId: string;
};

const ACTIVITY_BANK: Record<Skill, (topicId: string, topicTitle: string) => Omit<Activity, "skill" | "topicId">> = {
  fluency: () => ({
    title: "Nói 1 phút: My daily routine",
    description: "Nói liên tục trong 60 giây. Hệ thống ghi nhận các khoảng ngập ngừng.",
    minutes: 3,
    question: "Talk about your daily routine for one minute. Try not to stop.",
    instruction: "Your fluency needs more practice. Speak for 60 seconds without long pauses.",
    keywords: ["first", "after that", "then", "finally"],
  }),
  vocabulary: (_id, title) => ({
    title: `Học và dùng 5 từ mới về ${title}`,
    description: "Dùng ít nhất 5 từ gợi ý trong câu trả lời của bạn.",
    minutes: 4,
    question: `Talk about ${title.toLowerCase()} using at least five new words from the list.`,
    instruction: `Learn and use 5 new words about ${title.toLowerCase()}.`,
    keywords: [],
  }),
  grammar: () => ({
    title: "Kể lại cuối tuần trước (thì quá khứ đơn)",
    description: "Tập trung chia động từ đúng thì quá khứ đơn.",
    minutes: 3,
    question: "What did you do last weekend? Describe it in detail.",
    instruction: "Use the past simple correctly in every sentence.",
    keywords: ["went", "visited", "had", "watched"],
  }),
  pronunciation: () => ({
    title: "Luyện phát âm: đọc rõ từng từ",
    description: "Nói chậm, rõ âm cuối (-s, -ed) và trọng âm từ.",
    minutes: 3,
    question: "Describe your favourite place in your hometown. Speak slowly and clearly.",
    instruction: "Pay attention to final sounds (-s, -ed) and word stress.",
    keywords: ["places", "visited", "beautiful", "comfortable"],
  }),
  content: () => ({
    title: "Phát triển ý theo cấu trúc PREP",
    description: "Point – Reason – Example – Point: trả lời đủ 4 phần.",
    minutes: 4,
    question: "Is it better to study in the morning or at night? Give your opinion.",
    instruction: "Answer with Point – Reason – Example – Point.",
    keywords: ["In my opinion", "because", "for example", "that's why"],
  }),
};

export function activityFor(skill: Skill, topicId: string, topicTitle: string, vocab: string[] = []): Activity {
  const a = ACTIVITY_BANK[skill](topicId, topicTitle);
  return {
    ...a,
    skill,
    topicId,
    keywords: skill === "vocabulary" && vocab.length ? vocab.slice(0, 5) : a.keywords,
  };
}
