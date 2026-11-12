// Shown instantly in the page area (the sidebar stays) while an admin page loads.
export default function Loading() {
  const bar = "rounded-full bg-gray-100";
  return (
    <div role="status" aria-label="Loading" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className={`h-7 w-56 max-w-full ${bar}`} />
        <div className={`h-3 w-80 max-w-full ${bar}`} />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col gap-3 rounded-md border border-gray-100 bg-layer p-4">
            <div className={`h-3 w-20 ${bar}`} />
            <div className={`h-6 w-16 ${bar}`} />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-4 rounded-md border border-gray-100 bg-layer p-5">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4">
            <div className={`h-3 w-32 ${bar}`} />
            <div className={`h-3 flex-1 ${bar}`} />
            <div className={`h-3 w-16 ${bar}`} />
          </div>
        ))}
      </div>
      <p className="type-body-sm text-secondary">Loading…</p>
    </div>
  );
}
