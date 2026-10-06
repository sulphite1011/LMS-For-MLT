import { Navbar } from "@/components/Navbar";
import { DetailSkeleton } from "@/components/ui/Skeleton";

// Mirrors the loading state ResourceDetailClient already renders, so the page doesn't change
// visually between the route-level fallback and the client-side one.
export default function Loading() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <DetailSkeleton />
      </div>
    </div>
  );
}
