// Speaking topics for Vietnamese upper-secondary (THPT) students (Module 2).
// These are the built-in defaults copied into the database on first run.
// Teachers then add and edit topics in the app (/teacher/topics); see lib/topics-db.ts.

export type Question = { q: string; hint: string };
export type Subtopic = {
  id: string;
  name: string;
  questions: Question[];
  tips: string[];
  vocab: string[];
  hidden?: boolean;
};
export type Topic = {
  id: string;
  n: string;
  title: string;
  vi: string;
  theme?: ThemeKey;
  bg: string;
  foot: string;
  ink: string;
  hidden?: boolean;
  subtopics: Subtopic[];
};

/** Colour themes a teacher can pick for a topic card (from the design palette). */
export const THEMES = {
  lilac: { label: "Tím", bg: "#CDD0F8", foot: "#B9BDEF", ink: "#2E2F5C" },
  mint: { label: "Xanh lá", bg: "#C8F2DD", foot: "#A9E3C6", ink: "#14533A" },
  sand: { label: "Vàng", bg: "#FBE5BC", foot: "#EFD39F", ink: "#6B4A10" },
  peach: { label: "Cam", bg: "#F6CBBF", foot: "#E9B3A5", ink: "#7A2D1C" },
  sky: { label: "Xanh dương", bg: "#CDE6F7", foot: "#B0D3EC", ink: "#1F4A66" },
} as const;
export type ThemeKey = keyof typeof THEMES;
export const THEME_KEYS = Object.keys(THEMES) as ThemeKey[];

export const DEFAULT_TOPICS: Topic[] = [
  {
    id: "family",
    n: "01",
    title: "Family",
    vi: "Gia đình",
    bg: "#CDD0F8",
    foot: "#B9BDEF",
    ink: "#2E2F5C",
    subtopics: [
      {
        id: "family-relationships",
        name: "Family relationships",
        questions: [
          { q: "Who are you closest to in your family? Why?", hint: "Bạn thân nhất với ai trong gia đình? Vì sao?" },
          { q: "How do you usually show love to your parents?", hint: "Bạn thường thể hiện tình yêu với bố mẹ thế nào?" },
          { q: "Do you think there is a generation gap in your family? Give an example.", hint: "Gia đình bạn có khoảng cách thế hệ không? Cho ví dụ." },
          { q: "What do you do when you disagree with your parents?", hint: "Bạn làm gì khi bất đồng ý kiến với bố mẹ?" },
          { q: "What makes a happy family, in your opinion?", hint: "Theo bạn, điều gì tạo nên một gia đình hạnh phúc?" },
        ],
        tips: [
          "Nêu rõ người bạn nói đến và mối quan hệ: my older sister, my grandmother.",
          "Thêm lý do bằng because / since để phát triển ý.",
          "Kể một kỷ niệm ngắn làm ví dụ.",
        ],
        vocab: ["get along with", "look up to", "close-knit", "generation gap", "support each other"],
      },
      {
        id: "family-activities",
        name: "Family activities",
        questions: [
          { q: "What do you usually do with your family at weekends?", hint: "Cuối tuần bạn thường làm gì cùng gia đình?" },
          { q: "Describe a memorable trip you took with your family.", hint: "Mô tả một chuyến đi đáng nhớ cùng gia đình." },
          { q: "Do you prefer eating at home or eating out with your family? Why?", hint: "Bạn thích ăn ở nhà hay ăn ngoài cùng gia đình? Vì sao?" },
          { q: "How does your family celebrate special occasions?", hint: "Gia đình bạn kỷ niệm các dịp đặc biệt thế nào?" },
          { q: "Why is it important for family members to spend time together?", hint: "Vì sao các thành viên nên dành thời gian cho nhau?" },
        ],
        tips: [
          "Nói bạn làm gì và mức độ thường xuyên: usually, often, sometimes.",
          "Thêm lý do hoặc cảm xúc: because it helps us relax.",
          "Đưa ra một ví dụ từ cuối tuần trước.",
        ],
        vocab: ["get together", "spend quality time", "go on a picnic", "help with chores", "visit grandparents"],
      },
      {
        id: "household-chores",
        name: "Household chores",
        questions: [
          { q: "What household chores do you do at home?", hint: "Bạn làm những việc nhà nào?" },
          { q: "Which chore do you like the most and which do you hate? Why?", hint: "Việc nhà bạn thích nhất và ghét nhất? Vì sao?" },
          { q: "Should children be paid for doing chores? Why or why not?", hint: "Trẻ em có nên được trả tiền khi làm việc nhà không?" },
          { q: "How are chores shared in your family?", hint: "Việc nhà được chia sẻ thế nào trong gia đình bạn?" },
          { q: "What skills can teenagers learn from doing housework?", hint: "Thanh thiếu niên học được kỹ năng gì từ việc nhà?" },
        ],
        tips: [
          "Dùng thì hiện tại đơn cho thói quen: I do the washing-up every day.",
          "So sánh các việc với nhau: easier than, more tiring than.",
          "Nêu quan điểm rồi giải thích: I think..., because...",
        ],
        vocab: ["do the washing-up", "take out the rubbish", "share the housework", "responsibility", "tidy up"],
      },
    ],
  },
  {
    id: "education",
    n: "02",
    title: "Education",
    vi: "Giáo dục",
    bg: "#C8F2DD",
    foot: "#A9E3C6",
    ink: "#14533A",
    subtopics: [
      {
        id: "school-life",
        name: "School life",
        questions: [
          { q: "Describe a typical day at your school.", hint: "Mô tả một ngày bình thường ở trường bạn." },
          { q: "What is your favourite subject and why?", hint: "Môn học yêu thích của bạn là gì, vì sao?" },
          { q: "What extracurricular activities do you join?", hint: "Bạn tham gia hoạt động ngoại khoá nào?" },
          { q: "What do you like most about your school?", hint: "Bạn thích điều gì nhất ở trường?" },
          { q: "If you could change one thing about your school, what would it be?", hint: "Nếu được thay đổi một điều ở trường, bạn chọn gì?" },
        ],
        tips: [
          "Sắp xếp ý theo thời gian: first, then, after that.",
          "Nêu cảm nhận cá nhân: I really enjoy..., I find it...",
          "Với câu giả định dùng: If I could..., I would...",
        ],
        vocab: ["extracurricular activities", "timetable", "classmates", "school club", "break time"],
      },
      {
        id: "learning-methods",
        name: "Learning methods",
        questions: [
          { q: "How do you usually prepare for an exam?", hint: "Bạn thường ôn thi thế nào?" },
          { q: "Do you prefer studying alone or in a group? Why?", hint: "Bạn thích học một mình hay học nhóm? Vì sao?" },
          { q: "What is the best way to learn new English words?", hint: "Cách tốt nhất để học từ mới tiếng Anh là gì?" },
          { q: "How do you stay motivated when studying is difficult?", hint: "Làm sao bạn giữ động lực khi việc học khó khăn?" },
          { q: "Describe a learning method that works well for you.", hint: "Mô tả một phương pháp học hiệu quả với bạn." },
        ],
        tips: [
          "Đưa ra phương pháp cụ thể, không nói chung chung.",
          "So sánh hai lựa chọn: On the one hand..., on the other hand...",
          "Kết thúc bằng một câu tổng kết ngắn.",
        ],
        vocab: ["revise", "take notes", "self-study", "stay motivated", "learn by heart"],
      },
      {
        id: "technology-in-education",
        name: "Using technology in education",
        questions: [
          { q: "How do you use technology for studying?", hint: "Bạn dùng công nghệ để học thế nào?" },
          { q: "What are the advantages of online learning?", hint: "Học trực tuyến có lợi ích gì?" },
          { q: "What are the disadvantages of using smartphones in class?", hint: "Dùng điện thoại trong lớp có bất lợi gì?" },
          { q: "Can AI replace teachers in the future? Why or why not?", hint: "AI có thể thay thế giáo viên trong tương lai không?" },
          { q: "Which educational app or website do you find most useful?", hint: "Ứng dụng/website học tập nào hữu ích nhất với bạn?" },
        ],
        tips: [
          "Liệt kê ưu điểm và nhược điểm rõ ràng.",
          "Dùng từ nối: however, moreover, therefore.",
          "Đưa ví dụ về ứng dụng bạn từng dùng.",
        ],
        vocab: ["online learning", "distraction", "access information", "interactive", "digital device"],
      },
    ],
  },
  {
    id: "environment",
    n: "03",
    title: "Environment",
    vi: "Môi trường",
    bg: "#FBE5BC",
    foot: "#EFD39F",
    ink: "#6B4A10",
    subtopics: [
      {
        id: "environmental-problems",
        name: "Environmental problems",
        questions: [
          { q: "What is the most serious environmental problem in your area?", hint: "Vấn đề môi trường nghiêm trọng nhất nơi bạn sống là gì?" },
          { q: "What causes air pollution in big cities?", hint: "Nguyên nhân gây ô nhiễm không khí ở thành phố lớn?" },
          { q: "How does plastic waste affect the ocean?", hint: "Rác thải nhựa ảnh hưởng đến đại dương thế nào?" },
          { q: "How does climate change affect Vietnam?", hint: "Biến đổi khí hậu ảnh hưởng đến Việt Nam thế nào?" },
          { q: "Who should be responsible for solving environmental problems?", hint: "Ai nên chịu trách nhiệm giải quyết vấn đề môi trường?" },
        ],
        tips: [
          "Nêu vấn đề → nguyên nhân → hậu quả.",
          "Dùng cấu trúc: This leads to..., As a result,...",
          "Đưa ví dụ thực tế ở Việt Nam.",
        ],
        vocab: ["air pollution", "plastic waste", "climate change", "deforestation", "emissions"],
      },
      {
        id: "green-lifestyle",
        name: "Green lifestyle",
        questions: [
          { q: "What do you do to live a greener life?", hint: "Bạn làm gì để sống xanh hơn?" },
          { q: "Do you think using public transport is a good idea? Why?", hint: "Đi phương tiện công cộng có phải ý hay không? Vì sao?" },
          { q: "How can students reduce plastic use at school?", hint: "Học sinh có thể giảm dùng nhựa ở trường thế nào?" },
          { q: "Is it expensive to live a green lifestyle?", hint: "Sống xanh có tốn kém không?" },
          { q: "How can you encourage your friends to go green?", hint: "Bạn khuyến khích bạn bè sống xanh thế nào?" },
        ],
        tips: [
          "Nói về hành động cụ thể của bạn.",
          "Dùng should / could để đưa lời khuyên.",
          "Thêm lợi ích của mỗi hành động.",
        ],
        vocab: ["reusable bag", "recycle", "save energy", "public transport", "eco-friendly"],
      },
      {
        id: "protecting-the-environment",
        name: "Protecting the environment",
        questions: [
          { q: "What can the government do to protect the environment?", hint: "Chính phủ có thể làm gì để bảo vệ môi trường?" },
          { q: "Have you ever joined an environmental campaign? Describe it.", hint: "Bạn từng tham gia chiến dịch môi trường nào chưa?" },
          { q: "Why should we plant more trees?", hint: "Vì sao chúng ta nên trồng thêm cây?" },
          { q: "How can technology help protect the environment?", hint: "Công nghệ giúp bảo vệ môi trường thế nào?" },
          { q: "What would happen if we did nothing to protect nature?", hint: "Điều gì xảy ra nếu ta không làm gì để bảo vệ thiên nhiên?" },
        ],
        tips: [
          "Nêu giải pháp và giải thích hiệu quả của nó.",
          "Câu điều kiện loại 2: If we did nothing, ... would ...",
          "Kết luận bằng lời kêu gọi hành động.",
        ],
        vocab: ["raise awareness", "renewable energy", "wildlife", "campaign", "conserve"],
      },
    ],
  },
  {
    id: "future",
    n: "04",
    title: "Future",
    vi: "Tương lai",
    bg: "#F6CBBF",
    foot: "#E9B3A5",
    ink: "#7A2D1C",
    subtopics: [
      {
        id: "future-jobs",
        name: "Future jobs",
        questions: [
          { q: "What job would you like to do in the future? Why?", hint: "Bạn muốn làm nghề gì trong tương lai? Vì sao?" },
          { q: "What skills do you need for your dream job?", hint: "Nghề mơ ước cần những kỹ năng gì?" },
          { q: "Which jobs might disappear because of AI?", hint: "Nghề nào có thể biến mất vì AI?" },
          { q: "Is a high salary the most important thing in a job?", hint: "Lương cao có phải điều quan trọng nhất không?" },
          { q: "Would you like to work abroad? Why or why not?", hint: "Bạn có muốn làm việc ở nước ngoài không?" },
        ],
        tips: [
          "Dùng would like to / be going to cho dự định.",
          "Nêu lý do và kỹ năng cần có.",
          "Liên hệ với sở thích, thế mạnh của bạn.",
        ],
        vocab: ["career", "skills", "job satisfaction", "work-life balance", "qualification"],
      },
      {
        id: "future-cities",
        name: "Future cities",
        questions: [
          { q: "What will cities look like in 50 years?", hint: "Thành phố sẽ trông thế nào sau 50 năm?" },
          { q: "Would you prefer to live in a smart city or the countryside?", hint: "Bạn thích sống ở thành phố thông minh hay nông thôn?" },
          { q: "How can cities reduce traffic jams in the future?", hint: "Thành phố có thể giảm tắc đường trong tương lai thế nào?" },
          { q: "What problems might future cities face?", hint: "Thành phố tương lai có thể gặp vấn đề gì?" },
          { q: "Describe your ideal city of the future.", hint: "Mô tả thành phố tương lai lý tưởng của bạn." },
        ],
        tips: [
          "Dùng will / might để dự đoán.",
          "Mô tả bằng tính từ cụ thể: green, crowded, high-tech.",
          "So sánh với thành phố hiện tại.",
        ],
        vocab: ["smart city", "skyscraper", "infrastructure", "traffic congestion", "green space"],
      },
      {
        id: "technology-in-the-future",
        name: "Technology in the future",
        questions: [
          { q: "Which technology will change our lives the most?", hint: "Công nghệ nào sẽ thay đổi cuộc sống nhiều nhất?" },
          { q: "Would you like to have a robot at home? What would it do?", hint: "Bạn có muốn có robot ở nhà không? Nó sẽ làm gì?" },
          { q: "Are you worried about technology in the future?", hint: "Bạn có lo lắng về công nghệ trong tương lai không?" },
          { q: "How will people communicate in the future?", hint: "Con người sẽ giao tiếp thế nào trong tương lai?" },
          { q: "Can technology make people happier?", hint: "Công nghệ có làm con người hạnh phúc hơn không?" },
        ],
        tips: [
          "Nêu cả mặt tích cực và tiêu cực.",
          "Dùng từ nối: however, on the other hand.",
          "Đưa ví dụ công nghệ cụ thể (AI, robot, xe tự lái).",
        ],
        vocab: ["artificial intelligence", "self-driving car", "virtual reality", "convenient", "privacy"],
      },
    ],
  },
  {
    id: "culture",
    n: "05",
    title: "Culture",
    vi: "Văn hoá",
    bg: "#CDE6F7",
    foot: "#B0D3EC",
    ink: "#1F4A66",
    subtopics: [
      {
        id: "cultural-diversity",
        name: "Cultural diversity",
        questions: [
          { q: "Why is cultural diversity important?", hint: "Vì sao sự đa dạng văn hoá lại quan trọng?" },
          { q: "Which foreign culture are you interested in? Why?", hint: "Bạn quan tâm nền văn hoá nước ngoài nào? Vì sao?" },
          { q: "How can we learn about other cultures?", hint: "Làm sao để tìm hiểu văn hoá khác?" },
          { q: "Have you ever met someone from another country? Describe it.", hint: "Bạn từng gặp người nước ngoài chưa? Kể lại." },
          { q: "How does the internet affect cultural diversity?", hint: "Internet ảnh hưởng đến đa dạng văn hoá thế nào?" },
        ],
        tips: [
          "Nêu quan điểm và 2 lý do.",
          "Đưa ví dụ về món ăn, lễ hội, âm nhạc.",
          "Dùng: For example, such as...",
        ],
        vocab: ["diversity", "custom", "respect", "open-minded", "cultural exchange"],
      },
      {
        id: "vietnamese-traditions",
        name: "Vietnamese traditions",
        questions: [
          { q: "How does your family celebrate Tet?", hint: "Gia đình bạn đón Tết thế nào?" },
          { q: "What is your favourite Vietnamese tradition? Why?", hint: "Truyền thống Việt Nam bạn thích nhất? Vì sao?" },
          { q: "Describe a traditional Vietnamese dish.", hint: "Mô tả một món ăn truyền thống Việt Nam." },
          { q: "Are young people losing interest in traditions?", hint: "Giới trẻ có đang mất hứng thú với truyền thống không?" },
          { q: "How would you introduce Vietnamese culture to a foreign friend?", hint: "Bạn giới thiệu văn hoá Việt cho bạn nước ngoài thế nào?" },
        ],
        tips: [
          "Giải thích từ tiếng Việt bằng tiếng Anh: banh chung, a square sticky rice cake.",
          "Kể theo trình tự các hoạt động.",
          "Thêm ý nghĩa của truyền thống đó.",
        ],
        vocab: ["Lunar New Year", "ancestor worship", "lucky money", "traditional costume", "festival"],
      },
      {
        id: "cultural-differences",
        name: "Cultural differences",
        questions: [
          { q: "What cultural differences have you noticed between Vietnam and other countries?", hint: "Bạn thấy khác biệt văn hoá nào giữa Việt Nam và nước khác?" },
          { q: "What should tourists know before visiting Vietnam?", hint: "Du khách nên biết gì trước khi đến Việt Nam?" },
          { q: "How can cultural differences cause misunderstandings?", hint: "Khác biệt văn hoá gây hiểu lầm thế nào?" },
          { q: "Would you like to study in a country with a very different culture?", hint: "Bạn có muốn du học ở nước có văn hoá rất khác không?" },
          { q: "How can we avoid culture shock?", hint: "Làm sao để tránh sốc văn hoá?" },
        ],
        tips: [
          "So sánh: In Vietnam..., while in...",
          "Đưa một tình huống cụ thể.",
          "Đề xuất cách ứng xử phù hợp.",
        ],
        vocab: ["culture shock", "misunderstanding", "etiquette", "adapt to", "greeting"],
      },
    ],
  },
];

const DEFAULT_THEME: Record<string, ThemeKey> = {
  family: "lilac",
  education: "mint",
  environment: "sand",
  future: "peach",
  culture: "sky",
};
export const defaultThemeOf = (topicId: string): ThemeKey => DEFAULT_THEME[topicId] ?? "lilac";

/** Helpers that work on a topic list loaded from the database. */
export function getTopic(list: Topic[], id: string) {
  return list.find((t) => t.id === id);
}

export function findSubtopic(list: Topic[], subId: string) {
  for (const t of list) {
    const s = t.subtopics.find((x) => x.id === subId);
    if (s) return { topic: t, sub: s };
  }
  return null;
}

export function topicColors(list: Topic[], topicId: string) {
  const t = getTopic(list, topicId);
  return t
    ? { bg: t.bg, foot: t.foot, ink: t.ink }
    : { bg: "#CDD0F8", foot: "#B9BDEF", ink: "#2E2F5C" };
}

/** Lookup in the built-in defaults only (used by the demo seed). */
export function findDefaultSubtopic(subId: string) {
  return findSubtopic(DEFAULT_TOPICS, subId);
}
