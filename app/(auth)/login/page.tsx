import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { Icon, ICON } from "@/components/icons";
import { LoginForm } from "./LoginForm";
import { LoginIllustration } from "@/components/LoginIllustration";

export const metadata = { title: "Đăng nhập · AI English Speaking Coach" };

export default async function LoginPage() {
  const user = await getUser();
  if (user) redirect(user.role === "teacher" ? "/teacher" : "/dashboard");
  return (
    <>
      <section className="hidden flex-1 flex-col gap-5 px-8 py-6 lg:flex xl:px-12">
        <div className="flex items-center gap-2.5">
          <div className="flex size-10 items-center justify-center rounded-xl bg-brand">
            <Icon d={ICON.logo} size={20} stroke="#fff" width={2.2} />
          </div>
          <span className="text-[15px] font-extrabold">AI English Speaking Coach</span>
        </div>
        <div className="mt-2 flex flex-col gap-4">
          <h1 className="m-0 max-w-[560px] text-[40px] leading-[1.15] font-bold tracking-[-1px] xl:text-[46px]">
            Luyện nói tiếng Anh mọi lúc, mọi nơi.
          </h1>
          <p className="m-0 max-w-[520px] text-[15px] leading-relaxed text-muted">
            Chọn chủ đề theo chương trình THPT, trò chuyện với AI bằng tiếng Anh, nhận phản hồi sau mỗi lượt và theo
            dõi tiến bộ của bạn.
          </p>
        </div>
        <div className="flex flex-1 items-center justify-center py-2">
          <LoginIllustration />
        </div>
        <ul className="m-0 flex list-none flex-wrap gap-x-6 gap-y-2 p-0 text-[13px] text-muted">
          {["5 tiêu chí chấm điểm", "Phản hồi ngay sau mỗi lượt", "Giáo viên duyệt kết quả"].map((t) => (
            <li key={t} className="flex items-center gap-2">
              <span className="flex size-5 items-center justify-center rounded-full bg-white">
                <Icon d={ICON.check} size={12} stroke="#11663F" width={3} />
              </span>
              {t}
            </li>
          ))}
        </ul>
      </section>
      <section className="flex flex-1 items-center justify-center rounded-[22px] bg-white px-5 py-10 sm:px-10 lg:max-w-[620px]">
        <div className="w-full max-w-[400px]">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex size-10 items-center justify-center rounded-xl bg-brand">
              <Icon d={ICON.logo} size={20} stroke="#fff" width={2.2} />
            </div>
            <span className="text-[15px] font-extrabold">AI English Speaking Coach</span>
          </div>
          <LoginForm />
        </div>
      </section>
    </>
  );
}
