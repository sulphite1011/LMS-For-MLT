import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { ScrollToTop } from "@/components/ui/ScrollToTop";
import { NotificationOnboarding } from "@/components/NotificationOnboarding";
import { SignedIn } from "@clerk/nextjs";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap", // Ensures text is visible during font load (font-display: swap)
});

// Viewport export (moved out of metadata per Next.js 14+ recommendation)
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#14b8a6",
};

// NOTE: Do NOT add `export const dynamic = "force-dynamic"` here.
// That would force every page in the app to SSR on every request,
// disabling all caching. Pages opt into dynamic rendering individually if needed.

export const metadata: Metadata = {
  metadataBase: new URL("https://lms-for-mlt.vercel.app"),
  title: {
    default: "Hamad's MLT Study Hub — Free Medical Lab Technology Resources",
    template: "%s | Hamad's MLT Study Hub",
  },
  description:
    "Access free Medical Laboratory Technology (MLT) notes, videos, PDFs, and quizzes. Your complete study hub for Hematology, Microbiology, Clinical Chemistry, Histopathology, Immunology, Blood Banking, and more.",
  keywords: [
    // Core program
    "MLT", "Medical Laboratory Technology", "Medical Lab Technician",
    "Allied Health Sciences", "AHS", "MIT", "OTT", "Nursing",
    // Semester subjects
    "Basic Biochemistry", "Basic Anatomy", "Basic Physiology",
    "Basic Lab Instrumentation", "General Pathology",
    // Histopathology
    "Histopathology", "Histopathology notes", "Histopathology MLT",
    // Hematology
    "Hematology", "Hematology notes for MLT", "Hematology I", "Hematology II", "Hematology III",
    // Microbiology
    "Microbiology", "Basic Bacteriology", "Microbiology MLT",
    // Chemical Pathology
    "Chemical Pathology", "Clinical Chemistry", "Clinical Chemistry PDF",
    // Immunology & Blood Banking
    "Immunology", "Basic Immunology and Serology", "Advanced Immunology",
    "Blood Banking", "Transfusion Medicine",
    // Molecular Biology
    "Molecular Biology", "Molecular Biology and Genetics",
    "Molecular Pathology", "Cytogenetics", "Basic Molecular Biology",
    // Other subjects
    "Biostatistics", "Quality Control", "Accreditation",
    "Biosafety", "Risk Management", "Research Methodology",
    // Study resources
    "MLT study resources", "MLT notes", "MLT practice quizzes",
    "MLT exam prep", "MLT PDF", "free MLT resources",
    "Hamad MLT", "LMS for MLT",
  ],
  verification: {
    google: "J7pJjyMwoeQK6XCpWQvxWltPw5NODQ1to-0XCzoB5Ng",
  },
  alternates: {
    canonical: "https://lms-for-mlt.vercel.app",
  },
  openGraph: {
    type: "website",
    url: "https://lms-for-mlt.vercel.app",
    siteName: "Hamad's MLT Study Hub",
    title: "Hamad's MLT Study Hub — Free Medical Lab Technology Resources",
    description:
      "Access free Medical Laboratory Technology (MLT) notes, videos, PDFs, and quizzes. Your complete study hub for Hematology, Microbiology, Clinical Chemistry, Histopathology, Immunology, Blood Banking, and more.",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hamad's MLT Study Hub — Free Medical Lab Technology Resources",
    description:
      "Free MLT notes, PDFs, videos, and quizzes — all subjects from Hematology to Molecular Biology.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <head>
          {/* Preconnect to external origins to reduce connection latency */}
          <link rel="preconnect" href="https://clerk.com" />
          <link rel="dns-prefetch" href="https://clerk.com" />
          <link rel="preconnect" href="https://img.clerk.com" />
        </head>
        <body className={`${inter.variable} font-sans antialiased`}>
          <AuthProvider>
            {children}
            <SignedIn>
              <NotificationOnboarding />
            </SignedIn>
            <ToastProvider />
            <ScrollToTop />
          </AuthProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
