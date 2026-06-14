export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-12 animate-pulse">
      <div className="w-full h-[40vw] max-h-[420px] bg-stone-200 rounded-2xl" />
      <div className="space-y-4">
        <div className="h-6 w-48 bg-stone-200 rounded" />
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-square bg-stone-200 rounded-full" />
          ))}
        </div>
      </div>
      <div className="space-y-4">
        <div className="h-6 w-48 bg-stone-200 rounded" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square bg-stone-200 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
