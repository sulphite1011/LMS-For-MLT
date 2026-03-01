"use client";

import { useAuthState } from "@/contexts/AuthContext";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Skeleton } from "@/components/ui/Skeleton";
import { ShieldAlert } from "lucide-react";
import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoaded, isSignedIn, userRole } = useAuthState();

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

  if (!isSignedIn || !userRole) {
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
              href="/sign-in"
              className="bg-[#14b8a6] text-white px-6 py-2.5 rounded-full font-medium hover:bg-[#0d9488] transition-colors"
            >
              Sign In
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

  return (
    <div className="min-h-screen flex bg-gray-50">
      <AdminSidebar />
      <main className="flex-1 min-h-screen">
        <div className="p-4 md:p-8 pt-16 lg:pt-8">{children}</div>
      </main>
    </div>
  );
}
