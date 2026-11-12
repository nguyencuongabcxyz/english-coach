import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { Icon, ICON } from "@/components/icons";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Đăng nhập · AI English Speaking Coach" };

export default async function LoginPage() {
  const user = await getUser();
  if (user) redirect(user.role === "teacher" ? "/teacher" : "/dashboard");
  return (
    <>
      <section className="hidden flex-1 flex-col gap-6 px-8 py-8 lg:flex xl:px-12">
        <div className="flex items-center gap-2.5">
          <div className="flex size-10 items-center justify-center rounded-xl bg-ink">
            <Icon d={ICON.logo} size={20} stroke="#fff" width={2.2} />
          </div>
          <span className="text-[15px] font-extrabold">AI English Speaking Coach</span>
        </div>
        <div className="mt-6 flex flex-col gap-4">
          <h1 className="m-0 max-w-[560px] text-[40px] leading-[1.15] font-bold tracking-[-1px] xl:text-[46px]">
            Luyện nói tiếng Anh mọi lúc, mọi nơi.
          </h1>
          <p className="m-0 max-w-[520px] text-[15px] leading-relaxed text-muted">
            Chọn chủ đề theo chương trình THPT, trò chuyện với AI bằng tiếng Anh, nhận phản hồi sau mỗi lượt và theo
            dõi tiến bộ của bạn.
          </p>
        </div>
        <div className="grid max-w-[600px] grid-cols-2 gap-3">
          <div className="overflow-hidden rounded-[18px] bg-lilac">
            <div className="flex flex-col gap-2.5 p-3">
              <span className="text-xs font-bold">AI đặt câu hỏi</span>
              <div className="rounded-xl bg-white p-3 text-[13px] leading-normal">
                What do you usually do with your family at weekends?
              </div>
            </div>
            <div className="bg-lilac-deep px-3 py-2 text-xs font-semibold">Chủ đề · Family</div>
          </div>
          <div className="overflow-hidden rounded-[18px] bg-mint">
            <div className="flex flex-col gap-2.5 p-3">
              <span className="text-xs font-bold">Bạn nhận phản hồi</span>
              <div className="rounded-xl bg-white p-3 text-[13px] leading-normal">
                Good vocabulary. Try to speak more smoothly.
              </div>
            </div>
            <div className="bg-mint-deep px-3 py-2 text-xs font-semibold">5 tiêu chí · bài luyện tiếp theo</div>
          </div>
        </div>
      </section>
      <section className="flex flex-1 items-center justify-center rounded-[22px] bg-white px-5 py-10 sm:px-10 lg:max-w-[620px]">
        <div className="w-full max-w-[400px]">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex size-10 items-center justify-center rounded-xl bg-ink">
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
