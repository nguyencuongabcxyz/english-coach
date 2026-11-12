import { ForgotForm } from "./ForgotForm";

export const metadata = { title: "Quên mật khẩu · AI English Speaking Coach" };

export default function ForgotPage() {
  return (
    <section className="flex flex-1 items-center justify-center rounded-[22px] bg-shell px-3 py-8">
      <div className="w-full max-w-[440px] rounded-[22px] bg-white p-6 sm:p-9">
        <ForgotForm />
      </div>
    </section>
  );
}
