import { Navbar } from "@/components/Navbar";

/** Shown instantly while a unit loads, so a tap never feels like it did nothing. */
export default function Loading() {
  return (
    <div className="min-h-screen" aria-busy="true">
      <Navbar />
      <div className="fixed inset-x-0 top-0 z-[100] h-1 overflow-hidden bg-teal/20">
        <div className="h-full w-1/3 bg-teal rounded-full animate-[mcq-bar_1.1s_ease-in-out_infinite]" />
      </div>
      <div className="bg-gradient-to-br from-navy to-navy-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-8">
          <div className="h-4 w-48 rounded bg-white/15 mb-3" />
          <div className="h-8 w-2/3 max-w-md rounded bg-white/20" />
        </div>
      </div>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="rounded-2xl bg-white shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-3 text-sm font-medium text-teal">
            <span className="w-4 h-4 rounded-full border-2 border-teal border-t-transparent animate-spin" />
            Loading your MCQs…
          </div>
          <div className="h-3 w-full rounded-full bg-gray-100 overflow-hidden"><div className="h-full w-1/3 bg-teal/40 animate-pulse" /></div>
          <div className="h-6 w-3/4 rounded bg-gray-100 animate-pulse" />
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-12 rounded-xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
