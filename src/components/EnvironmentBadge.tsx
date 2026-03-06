"use client";

import { useEffect, useState } from "react";

export function EnvironmentBadge() {
  const [isDev, setIsDev] = useState(false);

  useEffect(() => {
    // Determine if we are in a development/sandbox environment
    const hostname = window.location.hostname;
    const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
    const isVercelDev = hostname.includes("-dev") || hostname.includes("-git-dev");

    if (isLocal || isVercelDev) {
      setIsDev(true);
    }
  }, []);

  if (!isDev) return null;

  return (
    <div className="fixed bottom-6 right-6 z-9999 pointer-events-none sm:block hidden">
      <div className="bg-linear-to-r from-orange-500 to-red-600 text-white text-[10px] font-bold px-4 py-1.5 rounded-full shadow-2xl border border-white/30 uppercase tracking-[0.2em] animate-pulse flex items-center gap-2 backdrop-blur-sm">
        <span className="w-2 h-2 bg-white rounded-full animate-ping" />
        Sandbox Mode
      </div>
    </div>
  );
}
