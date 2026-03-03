import { FlaskConical, Activity } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 mt-16 animate-in fade-in duration-500">
      {/* Container for the flask and bubbles */}
      <div className="relative mb-8 flex flex-col items-center">

        {/* Glow behind flask */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-teal/20 blur-2xl rounded-full mix-blend-screen" />

        {/* Bubbles Area - positioned above the flask */}
        <div className="relative w-16 h-12">
          {/* Animated bubbles with pure Tailwind classes */}
          <div className="absolute bottom-0 left-2 w-3 h-3 bg-teal/80 rounded-full animate-bounce" style={{ animationDuration: '1s' }} />
          <div className="absolute bottom-2 right-1 w-2 h-2 bg-teal-light/60 rounded-full animate-pulse" style={{ animationDuration: '0.8s' }} />
          <div className="absolute bottom-4 left-6 w-2.5 h-2.5 bg-white/80 rounded-full animate-bounce" style={{ animationDuration: '1.2s' }} />
          <div className="absolute bottom-6 right-5 w-1.5 h-1.5 bg-teal rounded-full animate-pulse" style={{ animationDuration: '1.5s' }} />
        </div>

        {/* Center Icon (Flask) */}
        <div className="relative z-10 bg-navy-light/50 p-5 rounded-full border border-teal/20 shadow-lg shadow-teal/10">
          <FlaskConical className="w-12 h-12 text-teal" strokeWidth={1.5} />
        </div>
      </div>

      {/* Loading Text */}
      <div className="text-center space-y-3 relative z-10">
        <h2 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
          Preparing Lab Results
          <span className="flex gap-1 ml-1">
            <span className="w-1.5 h-1.5 bg-teal rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 bg-teal rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 bg-teal rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </span>
        </h2>
        <div className="flex items-center justify-center gap-2 text-gray-400 text-sm font-medium">
          <Activity className="w-4 h-4 text-teal animate-pulse" />
          <span>Analyzing MLT Resources...</span>
        </div>
      </div>
    </div>
  );
}
