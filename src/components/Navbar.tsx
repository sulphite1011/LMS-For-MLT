"use client";

import Link from "next/link";
import { useAuthState } from "@/contexts/AuthContext";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { BookOpen, LayoutDashboard, Menu, X } from "lucide-react";
import { useState } from "react";

export function Navbar() {
  const { userRole } = useAuthState();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="bg-[#0A1929] text-white shadow-lg relative z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-[#14b8a6] rounded-xl flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">
              Hamad&apos;s <span className="text-[#14b8a6]">LMS</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/"
              className="text-sm text-gray-300 hover:text-white transition-colors px-3 py-2"
            >
              Browse Resources
            </Link>

            <SignedIn>
              {(userRole === "superAdmin" || userRole === "admin") && (
                <Link
                  href="/admin"
                  className="flex items-center gap-2 text-sm bg-[#14b8a6]/10 text-[#14b8a6] hover:bg-[#14b8a6]/20 px-4 py-2 rounded-full transition-colors"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>
              )}
              <UserButton
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: "w-8 h-8",
                  },
                }}
              />
            </SignedIn>

            <SignedOut>
              <Link
                href="/sign-in"
                className="text-sm bg-[#14b8a6] hover:bg-[#0d9488] text-white px-5 py-2 rounded-full transition-colors font-medium"
              >
                Admin Sign In
              </Link>
            </SignedOut>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="md:hidden bg-[#0A1929] border-t border-white/10 px-4 py-4 space-y-3"
        >
          <Link
            href="/"
            className="block text-sm text-gray-300 hover:text-white py-2"
            onClick={() => setMobileMenuOpen(false)}
          >
            Browse Resources
          </Link>
          <SignedIn>
            {(userRole === "superAdmin" || userRole === "admin") && (
              <Link
                href="/admin"
                className="block text-sm text-[#14b8a6] py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Admin Dashboard
              </Link>
            )}
          </SignedIn>
          <SignedOut>
            <Link
              href="/sign-in"
              className="block text-sm bg-[#14b8a6] text-white text-center py-2.5 rounded-full"
              onClick={() => setMobileMenuOpen(false)}
            >
              Admin Sign In
            </Link>
          </SignedOut>
        </motion.div>
      )}
    </nav>
  );
}
