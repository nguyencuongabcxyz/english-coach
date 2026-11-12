/** Shown inside the content panel while the next page loads (sidebar stays in place). */
export function PageSkeleton() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Đang tải">
      <div className="m-2.5 h-[50px] rounded-2xl border border-line sm:m-3.5" />
      <div className="flex flex-col gap-3 px-5 pt-4 pb-6 sm:px-9">
        <div className="h-8 w-64 max-w-full rounded-xl bg-shell" />
        <div className="h-4 w-[28rem] max-w-full rounded-lg bg-shell" />
      </div>
      <div className="grid grid-cols-2 gap-3 px-5 sm:px-9 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[104px] rounded-[18px] bg-shell" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 px-5 pt-5 sm:px-9 md:grid-cols-2">
        <div className="h-56 rounded-[22px] bg-shell" />
        <div className="h-56 rounded-[22px] bg-shell" />
      </div>
    </div>
  );
}
