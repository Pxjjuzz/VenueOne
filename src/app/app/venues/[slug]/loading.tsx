export default function VenueLoading() {
  return (
    <div className="pb-32">
      <div className="aspect-[4/3] app-skeleton" />

      <div className="relative -mt-7 rounded-t-[28px] bg-background px-5 pb-6 pt-6">
        <div className="h-3.5 w-24 rounded-full app-skeleton" />
        <div className="mt-3 h-7 w-4/5 rounded-full app-skeleton" />
        <div className="mt-3 h-4 w-3/5 rounded-full app-skeleton" />

        <div className="mt-5 grid grid-cols-3 gap-px overflow-hidden rounded-[var(--radius-md)] bg-border">
          {[0, 1, 2].map((index) => (
            <div key={index} className="bg-surface px-2 py-3">
              <div className="mx-auto h-2.5 w-12 rounded-full app-skeleton" />
              <div className="mx-auto mt-2 h-3.5 w-16 rounded-full app-skeleton" />
            </div>
          ))}
        </div>

        <div className="mt-7 space-y-2">
          <div className="h-4 w-32 rounded-full app-skeleton" />
          <div className="h-3.5 w-full rounded-full app-skeleton" />
          <div className="h-3.5 w-full rounded-full app-skeleton" />
          <div className="h-3.5 w-4/5 rounded-full app-skeleton" />
        </div>

        <div className="mt-7 space-y-2">
          <div className="h-4 w-24 rounded-full app-skeleton" />
          <div className="flex gap-2">
            <div className="h-9 w-24 rounded-full app-skeleton" />
            <div className="h-9 w-20 rounded-full app-skeleton" />
            <div className="h-9 w-16 rounded-full app-skeleton" />
          </div>
        </div>
      </div>
    </div>
  );
}
