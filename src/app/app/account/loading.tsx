export default function AccountLoading() {
  return (
    <div className="px-5 pt-[calc(0.85rem+env(safe-area-inset-top))]">
      <div className="h-7 w-32 rounded-full app-skeleton" />
      <div className="mt-2 h-3.5 w-52 rounded-full app-skeleton" />

      <div className="mt-4 flex items-center gap-3.5 rounded-[var(--radius-lg)] bg-surface p-4 shadow-[var(--shadow-sm)]">
        <div className="h-14 w-14 shrink-0 rounded-full app-skeleton" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 rounded-full app-skeleton" />
          <div className="h-3 w-44 rounded-full app-skeleton" />
          <div className="h-4 w-16 rounded-full app-skeleton" />
        </div>
      </div>

      {[0, 1].map((group) => (
        <div key={group}>
          <div className="mt-6 h-3 w-24 rounded-full app-skeleton" />
          <div className="mt-2 space-y-px overflow-hidden rounded-[var(--radius-lg)] bg-surface shadow-[var(--shadow-sm)]">
            {[0, 1].map((row) => (
              <div key={row} className="flex items-center gap-3 px-4 py-3.5">
                <div className="h-9 w-9 shrink-0 rounded-full app-skeleton" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-28 rounded-full app-skeleton" />
                  <div className="h-3 w-40 rounded-full app-skeleton" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
