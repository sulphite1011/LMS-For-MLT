import { Navbar } from "@/components/Navbar";
import { ResourceGridSkeleton } from "@/components/ui/Skeleton";

// Shown while the homepage is being fetched/streamed (e.g. on client-side navigation).
// Reuses the same skeleton + container the homepage grid already uses while searching.
export default function Loading() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <ResourceGridSkeleton />
      </main>
    </div>
  );
}
