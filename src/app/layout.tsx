import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { ScrollToTop } from "@/components/ui/ScrollToTop";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hamad's LMS - MLT Study Hub",
  description:
    "Your complete Medical Laboratory Technology resource library. Access notes, videos, PDFs, and more.",
  keywords: ["MLT", "Medical Laboratory Technology", "Study", "Resources", "LMS"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${inter.variable} font-sans antialiased`}>
          <AuthProvider>
            {children}
            <ToastProvider />
            <ScrollToTop />
          </AuthProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
