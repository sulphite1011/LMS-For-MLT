"use client";

import { useAuthState } from "@/contexts/AuthContext";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Skeleton } from "@/components/ui/Skeleton";
import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoaded, isSignedIn, userRole } = useAuthState();
  const pathname = usePathname();

  const isClaimPage = pathname === "/admin/claim";
  const hasAdminAccess = userRole === "admin" || userRole === "superAdmin";

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-4 w-full max-w-md px-4">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-4 w-64 mx-auto" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  // Strictly block non-admins from admin routes (except the claim page)
  if (!isSignedIn || (!isClaimPage && !hasAdminAccess)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center p-8">
          <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8 text-amber-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            Admin Access Required
          </h2>
          <p className="text-gray-500 mb-6">
            You need to be signed in with admin privileges to access this area.
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              href="/admin/claim"
              className="bg-teal text-white px-6 py-2.5 rounded-full font-medium hover:bg-teal-dark transition-colors"
            >
              Verify Credentials
            </Link>
            <Link
              href="/"
              className="bg-gray-100 text-gray-700 px-6 py-2.5 rounded-full font-medium hover:bg-gray-200 transition-colors"
            >
              Go Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // If on the claim page, just show the content without the sidebar
  if (isClaimPage) {
    return (
      <main className="flex-1 min-h-screen bg-slate-50">
        {children}
      </main>
    );
  }

  // Standard admin layout with sidebar
  return (
    <div className="min-h-screen flex bg-gray-50">
      <AdminSidebar />
      <main className="flex-1 min-h-screen">
        <div className="p-4 md:p-8 pt-16 lg:pt-8">{children}</div>
      </main>
    </div>
  );
}
