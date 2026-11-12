export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh items-stretch justify-center bg-canvas p-0 sm:p-3 lg:p-0">
      <div className="flex w-full max-w-[1440px] gap-3 bg-shell p-2 sm:rounded-[28px] sm:p-3 lg:max-w-none lg:rounded-none">{children}</div>
    </div>
  );
}
