import { ActivateForm } from "./ActivateForm";

export const metadata = { title: "Kích hoạt tài khoản · AI English Speaking Coach" };

export default function ActivatePage() {
  return (
    <section className="flex flex-1 items-center justify-center rounded-[22px] bg-shell px-3 py-8">
      <div className="w-full max-w-[480px] rounded-[22px] bg-white p-6 sm:p-9">
        <ActivateForm />
      </div>
    </section>
  );
}
