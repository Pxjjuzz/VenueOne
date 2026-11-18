export default function ExploreLoading() {
  return (
    <div className="pb-10">
      <div className="px-5 pt-[calc(0.85rem+env(safe-area-inset-top))]">
        <div className="flex items-center justify-between">
          <div className="h-9 w-32 rounded-[var(--radius-sm)] app-skeleton" />
          <div className="h-11 w-11 rounded-full app-skeleton" />
        </div>
        <div className="mt-6 h-8 w-40 rounded-full app-skeleton" />
        <div className="mt-3 h-4 w-28 rounded-full app-skeleton" />
        <div className="mt-4 h-12 w-full rounded-full app-skeleton" />
        <div className="mt-4 flex gap-2">
          <div className="h-10 w-20 rounded-full app-skeleton" />
          <div className="h-10 w-24 rounded-full app-skeleton" />
          <div className="h-10 w-28 rounded-full app-skeleton" />
        </div>
      </div>

      <div className="mt-5 px-5">
        <div className="h-4 w-24 rounded-full app-skeleton" />
        <div className="mt-4 space-y-4">
          {[0, 1].map((index) => (
            <div
              key={index}
              className="overflow-hidden rounded-[var(--radius-lg)] bg-surface shadow-[var(--shadow-sm)]"
            >
              <div className="aspect-[4/3] app-skeleton" />
              <div className="space-y-2.5 px-4 py-4">
                <div className="h-5 w-3/5 rounded-full app-skeleton" />
                <div className="h-4 w-2/5 rounded-full app-skeleton" />
                <div className="flex gap-2 pt-1">
                  <div className="h-6 w-24 rounded-full app-skeleton" />
                  <div className="h-6 w-20 rounded-full app-skeleton" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
