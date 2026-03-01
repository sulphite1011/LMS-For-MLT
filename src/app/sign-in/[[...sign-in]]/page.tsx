import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0A1929] to-[#132F4C] relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="med-pattern" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
              <circle cx="30" cy="30" r="8" fill="none" stroke="white" strokeWidth="0.5" />
              <circle cx="30" cy="30" r="3" fill="white" opacity="0.3" />
              <line x1="22" y1="30" x2="38" y2="30" stroke="white" strokeWidth="0.3" />
              <line x1="30" y1="22" x2="30" y2="38" stroke="white" strokeWidth="0.3" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#med-pattern)" />
        </svg>
      </div>
      
      <div className="relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Hamad&apos;s LMS</h1>
          <p className="text-teal-300 text-sm">Sign in to access admin features</p>
        </div>
        <SignIn
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "shadow-2xl border-0",
              formButtonPrimary: "bg-teal hover:bg-teal-dark",
            },
          }}
        />
        <p className="text-center text-slate-400 text-xs mt-4">
          Visitors can browse resources without signing in
        </p>
      </div>
    </div>
  );
}
