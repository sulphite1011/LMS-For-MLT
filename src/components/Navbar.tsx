"use client";

import Link from "next/link";
import { useAuthState } from "@/contexts/AuthContext";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { BookOpen, LayoutDashboard, Menu, X, User as UserIcon, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { NotificationBell } from "./NotificationBell";
import { EnvironmentBadge } from "./EnvironmentBadge";

export function Navbar() {
  const { userRole, isLoaded: authLoaded } = useAuthState();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="bg-navy text-white shadow-lg relative z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-teal rounded-xl flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">
              Hamad&apos;s <span className="text-teal">LMS</span>
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
              {!authLoaded ? (
                <div className="w-20 h-8 bg-white/5 animate-pulse rounded-full" />
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-2 text-sm text-gray-300 hover:text-white hover:bg-white/10 px-3 py-2 rounded-full transition-colors"
                  >
                    <UserIcon className="w-4 h-4" />
                    My Profile
                  </Link>
                  {(userRole === "superAdmin" || userRole === "admin") && (
                    <Link
                      href="/admin"
                      className="flex items-center gap-2 text-sm bg-teal/10 text-teal hover:bg-teal/20 px-4 py-2 rounded-full transition-colors"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      Admin
                    </Link>
                  )}
                  {authLoaded && userRole === "user" && (
                    <Link
                      href="/admin/claim"
                      className="flex items-center gap-2 text-sm text-teal hover:bg-teal/10 px-3 py-2 rounded-full border border-teal/20 transition-colors"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      Verify Admin
                    </Link>
                  )}
                </div>
              )}
              <div className="flex items-center gap-1 ml-2">
                <NotificationBell />
                <UserButton
                  afterSignOutUrl="/"
                  appearance={{
                    elements: {
                      avatarBox: "w-8 h-8",
                    },
                  }}
                />
              </div>
            </SignedIn>

            <SignedOut>
              <Link
                href="/sign-in"
                className="text-sm bg-teal hover:bg-teal-dark text-white px-5 py-2 rounded-full transition-colors font-medium"
              >
                Sign In
              </Link>
            </SignedOut>
          </div>

          {/* Mobile menu button / Actions */}
          <div className="flex md:hidden items-center gap-2">
            <SignedIn>
              <NotificationBell />
            </SignedIn>
            <button
              className="p-2"
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
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="md:hidden bg-navy border-t border-white/10 px-4 py-4 space-y-3"
        >
          <Link
            href="/"
            className="block text-sm text-gray-300 hover:text-white py-2"
            onClick={() => setMobileMenuOpen(false)}
          >
            Browse Resources
          </Link>
          <SignedIn>
            <Link href="/dashboard" className="block text-sm text-gray-300 hover:text-white py-2" onClick={() => setMobileMenuOpen(false)}>
              My Profile
            </Link>
            {(userRole === "superAdmin" || userRole === "admin") && (
              <Link href="/admin" className="block text-sm text-teal py-2" onClick={() => setMobileMenuOpen(false)}>
                Admin Dashboard
              </Link>
            )}
            {userRole === "user" && (
              <Link href="/admin/claim" className="block text-sm text-teal py-2 font-medium" onClick={() => setMobileMenuOpen(false)}>
                Claim Admin Status
              </Link>
            )}
          </SignedIn>
          <SignedOut>
            <Link
              href="/sign-in"
              className="block text-sm bg-teal text-white text-center py-2.5 rounded-full"
              onClick={() => setMobileMenuOpen(false)}
            >
              Sign In
            </Link>
          </SignedOut>
        </motion.div>
      )}
      <EnvironmentBadge />
    </nav>
  );
}
