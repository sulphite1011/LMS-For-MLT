"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

function readTheme(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

interface ThemeToggleProps {
  className?: string;
  /** Show a text label next to the icon (used in menus). */
  showLabel?: boolean;
}

/**
 * Light/dark switch. The initial theme is applied by the inline script in layout.tsx (before first
 * paint, no flash): the saved choice, else the OS preference. This button only flips the `dark`
 * class on <html> and remembers the choice in localStorage.
 */
export function ThemeToggle({ className = "", showLabel = false }: ThemeToggleProps) {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(readTheme());
  }, []);

  const toggle = () => {
    const next: Theme = readTheme() === "dark" ? "light" : "dark";
    const root = document.documentElement;
    root.classList.add("theme-transition");
    root.classList.toggle("dark", next === "dark");
    window.setTimeout(() => root.classList.remove("theme-transition"), 300);
    setTheme(next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* storage can be blocked (private mode) — the choice just won't persist */
    }
  };

  const isDark = theme === "dark";
  const label = isDark ? "Switch to light mode" : "Switch to dark mode";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={
        className ||
        "flex items-center gap-2 p-2 rounded-full text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
      }
    >
      {/* Render both icons until mounted so server and client markup match. */}
      {theme === null ? (
        <Moon className="w-4 h-4 opacity-0" />
      ) : isDark ? (
        <Sun className="w-4 h-4" />
      ) : (
        <Moon className="w-4 h-4" />
      )}
      {showLabel && <span className="text-sm">{isDark ? "Light mode" : "Dark mode"}</span>}
    </button>
  );
}
