export default function BookingsLoading() {
  return (
    <div className="pb-4">
      <div className="px-5 pt-[calc(0.85rem+env(safe-area-inset-top))]">
        <div className="flex items-start justify-between">
          <div>
            <div className="h-7 w-36 rounded-full app-skeleton" />
            <div className="mt-2 h-3.5 w-32 rounded-full app-skeleton" />
          </div>
          <div className="h-10 w-20 rounded-full app-skeleton" />
        </div>
        <div className="mt-4 flex gap-2">
          {[48, 84, 64, 108].map((width, index) => (
            <div
              key={index}
              className="h-9 rounded-full app-skeleton"
              style={{ width }}
            />
          ))}
        </div>
      </div>

      <div className="mt-4 space-y-3 px-5">
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className="overflow-hidden rounded-[var(--radius-lg)] bg-surface shadow-[var(--shadow-sm)]"
          >
            <div className="flex gap-3.5 p-3.5">
              <div className="h-[4.5rem] w-[4.5rem] shrink-0 rounded-[var(--radius-md)] app-skeleton" />
              <div className="min-w-0 flex-1 space-y-2 pt-1">
                <div className="h-5 w-24 rounded-full app-skeleton" />
                <div className="h-4 w-4/5 rounded-full app-skeleton" />
                <div className="h-3.5 w-3/5 rounded-full app-skeleton" />
              </div>
            </div>
            <div className="border-t border-border/70 px-3.5 py-3">
              <div className="h-3 w-28 rounded-full app-skeleton" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
