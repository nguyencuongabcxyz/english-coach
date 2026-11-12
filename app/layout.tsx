import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "AI English Speaking Coach",
  description:
    "Hệ thống AI hỗ trợ cá nhân hoá việc rèn luyện kỹ năng nói tiếng Anh cho học sinh THPT.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#E4E2EA",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${jakarta.variable} antialiased`}>
      <body className="min-h-dvh" suppressHydrationWarning>{children}</body>
    </html>
  );
}
