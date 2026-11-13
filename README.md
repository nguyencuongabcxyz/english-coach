# AI English Speaking Coach

Web app luyện nói tiếng Anh cho học sinh THPT, viết theo tài liệu *PHẦN 2 – THIẾT KẾ SẢN PHẨM* và bản thiết kế Claude Design.

- **Next.js 16** (App Router, Server Actions) + **Tailwind CSS 4**, font Plus Jakarta Sans
- **AI: OpenAI hoặc Groq (miễn phí)** – Whisper chuyển giọng nói thành văn bản (có mốc thời gian từng từ để đo độ trôi chảy), mô hình chat chấm 5 tiêu chí và viết phản hồi. Chọn bằng biến `AI_PROVIDER`:
  - `openai`: `whisper-1` + `gpt-5.4-mini` (trả phí, cần `OPENAI_API_KEY`)
  - `groq`: `whisper-large-v3-turbo` + `openai/gpt-oss-120b` (gói miễn phí có giới hạn lượt gọi, cần `GROQ_API_KEY` từ https://console.groq.com/keys)
- **Postgres**: Neon trên Vercel; khi chạy local không cần cài gì (PGlite lưu ở `.data/`)
- Giao diện responsive: desktop (sidebar), tablet & điện thoại (thanh menu dưới + menu trượt)

## Chức năng (theo 7 module)

| Module | Trang |
| --- | --- |
| 1. Hồ sơ học sinh | `/progress` (mã HS, lớp, chủ đề đã luyện, số lần, kỹ năng yếu, mức tiến bộ) |
| 2. Chủ đề luyện nói | `/topics` – 5 chủ đề × 3 tiểu chủ đề × 5 câu hỏi (`lib/topics.ts`) |
| 3. Luyện nói với AI | `/practice/[id]` – nghe câu hỏi (đọc lại, chậm hơn, gợi ý tiếng Việt), ghi âm bằng micro |
| 4. Phản hồi AI | `/feedback/[id]` – 5 tiêu chí, điểm mạnh, cần cải thiện, chú thích câu trả lời, gợi ý luyện tập |
| 5. Luyện tập cá nhân hoá | Bài luyện tiếp theo theo kỹ năng yếu nhất (`lib/skills.ts`), nút "Luyện lại" |
| 6. Theo dõi tiến bộ | Biểu đồ theo từng kỹ năng + bảng kết quả từng lần |
| 7. Giáo viên | `/teacher` tổng quan lớp, `/teacher/review` duyệt & chỉnh điểm, xuất CSV, thêm học sinh, cấp mã kích hoạt |
| Chủ đề của giáo viên | `/teacher/topics` – mỗi giáo viên có bộ bài học riêng (bản sao của bộ mặc định), thêm/sửa/ẩn, AI gợi ý câu hỏi |
| Quản trị | `/teacher/teachers` – chỉ giáo viên quản trị: thêm giáo viên + lớp phụ trách, cấp mã kích hoạt |

Đăng nhập: `/login`, kích hoạt tài khoản: `/activate`, quên mật khẩu: `/forgot-password`.

## Chạy local

```bash
npm install
cp .env.example .env.local   # điền OPENAI_API_KEY hoặc GROQ_API_KEY nếu muốn dùng AI thật
npm run dev
```

Lần chạy đầu tự tạo dữ liệu mẫu (xem `lib/seed.ts`):

- Giáo viên (quản trị): `admin@edu.vn` / `demo1234`
- Học sinh: `HS-11A2-014` (Nguyễn Minh Anh) / `demo1234`
- Học sinh chưa kích hoạt: `HS-11A2-022`, mã kích hoạt `QX7P2L`

Xoá thư mục `.data/` để tạo lại dữ liệu mẫu. Không có khoá AI (`OPENAI_API_KEY` / `GROQ_API_KEY`) thì app chạy **chế độ demo** (kết quả AI mô phỏng).

## Deploy lên Vercel

1. Đưa code lên GitHub rồi Import project trên Vercel (hoặc `vercel deploy`).
2. Thêm database: Vercel → Storage → **Neon Postgres** (tự tạo biến `DATABASE_URL`).
3. (Tuỳ chọn) Storage → **Blob** để lưu bản ghi âm cho giáo viên nghe lại (`BLOB_READ_WRITE_TOKEN`).
4. Environment Variables: `AI_PROVIDER` (`openai` hoặc `groq`) + khoá tương ứng (`OPENAI_API_KEY` / `GROQ_API_KEY`; có thể đặt cả hai rồi đổi `AI_PROVIDER` để chuyển qua lại), `SESSION_SECRET` (chuỗi ngẫu nhiên dài), `SEED_PASSWORD` (mật khẩu cho các tài khoản mẫu, đừng để mặc định `demo1234` khi chạy thật).
5. Deploy. Bảng và dữ liệu mẫu được tạo tự động ở request đầu tiên.

> Điểm do AI chấm chỉ là phản hồi tham khảo; giáo viên là người đánh giá cuối cùng (nguyên tắc 5).
