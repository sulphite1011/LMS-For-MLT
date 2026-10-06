import LoadingComponent from "@/components/ui/Loading";

// Route-level loading UI: the app's existing branded loader, shown while a route is genuinely loading.
export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen w-full">
      <LoadingComponent />
    </div>
  );
}
