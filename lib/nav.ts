import { ICON } from "@/components/icons";

export type NavKey = "overview" | "topics" | "practice" | "feedback" | "progress" | "teacher" | "review" | "teacherTopics" | "teachers";
export type NavItem = { key: NavKey; label: string; short: string; href: string; d: string; badge?: string; adminOnly?: boolean };

export const STUDENT_NAV: NavItem[] = [
  { key: "overview", label: "Tổng quan", short: "Tổng quan", href: "/dashboard", d: ICON.overview },
  { key: "topics", label: "Chủ đề luyện nói", short: "Chủ đề", href: "/topics", d: ICON.topics },
  { key: "practice", label: "Luyện nói với AI", short: "Luyện nói", href: "/practice", d: ICON.mic },
  { key: "feedback", label: "Phản hồi từ AI", short: "Phản hồi", href: "/feedback", d: ICON.feedback },
  { key: "progress", label: "Tiến bộ của tôi", short: "Tiến bộ", href: "/progress", d: ICON.progress },
];

export const TEACHER_NAV: NavItem[] = [
  { key: "teacher", label: "Tổng quan lớp", short: "Lớp học", href: "/teacher", d: ICON.classGrid },
  { key: "review", label: "Duyệt bài luyện", short: "Duyệt bài", href: "/teacher/review", d: ICON.review },
  { key: "teacherTopics", label: "Chủ đề luyện nói", short: "Chủ đề", href: "/teacher/topics", d: ICON.topics },
  { key: "teachers", label: "Giáo viên", short: "Giáo viên", href: "/teacher/teachers", d: ICON.users, adminOnly: true },
];
