"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
  /** The user-selected preference: "light", "dark", or "system". */
  theme: Theme;
  /** The actual theme being applied (never "system" — always "light" or "dark"). */
  resolvedTheme: "light" | "dark";
  /** Cycle through: system → light → dark → system … */
  toggleTheme: () => void;
  /** Choose a theme directly (used by the workstation's light/dark switch). */
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "system",
  resolvedTheme: "light",
  toggleTheme: () => {},
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function getSystemDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/**
 * Applies the resolved theme to <html>:
 * - Adds/removes .dark class (controls Tailwind dark: utilities)
 * - Adds/removes .light class (suppresses the @media prefers-color-scheme
 *   CSS variable block when the user has manually chosen light mode)
 * - In system mode: neither class is present — the media query handles CSS vars
 */
function applyToDOM(theme: Theme, resolved: "light" | "dark") {
  const html = document.documentElement;
  html.classList.toggle("dark", resolved === "dark");
  // .light class suppresses the @media dark fallback in globals.css
  html.classList.toggle("light", theme === "light");
}

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [theme, setTheme] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  // On mount: restore stored preference (or default to "system")
  useEffect(() => {
    const stored = (localStorage.getItem("theme") as Theme | null) ?? "system";
    const resolved =
      stored === "system" ? (getSystemDark() ? "dark" : "light") : stored;
    setTheme(stored);
    setResolvedTheme(resolved);
    applyToDOM(stored, resolved);
  }, []);

  // Live-listen to OS theme changes — only active when mode is "system"
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");

    const handler = (e: MediaQueryListEvent) => {
      setTheme((current) => {
        if (current === "system") {
          const resolved = e.matches ? "dark" : "light";
          setResolvedTheme(resolved);
          applyToDOM("system", resolved);
        }
        return current;
      });
    };

    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const chooseTheme = (next: Theme) => {
    const resolved = next === "system" ? (getSystemDark() ? "dark" : "light") : next;
    try {
      if (next === "system") localStorage.removeItem("theme");
      else localStorage.setItem("theme", next);
    } catch {
      // Storage can be unavailable (private mode); the choice still applies now.
    }
    setTheme(next);
    setResolvedTheme(resolved);
    applyToDOM(next, resolved);
  };

  const toggleTheme = () => {
    setTheme((prev) => {
      // Cycle: system → light → dark → system
      const next: Theme =
        prev === "system" ? "light" : prev === "light" ? "dark" : "system";

      const resolved =
        next === "system" ? (getSystemDark() ? "dark" : "light") : next;

      if (next === "system") {
        localStorage.removeItem("theme");
      } else {
        localStorage.setItem("theme", next);
      }

      setResolvedTheme(resolved);
      applyToDOM(next, resolved);
      return next;
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, toggleTheme, setTheme: chooseTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
