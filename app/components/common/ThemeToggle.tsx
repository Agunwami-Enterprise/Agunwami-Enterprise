"use client";

import { BsMoon, BsSun } from "react-icons/bs";
import { RiComputerLine } from "react-icons/ri";
import { useTheme } from "./ThemeProvider";

export default function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  const icon =
    theme === "dark" ? (
      <BsSun size={18} className="text-primary transition-all duration-300" />
    ) : theme === "light" ? (
      <BsMoon size={18} className="transition-all duration-300" />
    ) : (
      // "system" mode — show a monitor icon
      <RiComputerLine size={18} className="transition-all duration-300" />
    );

  const label =
    theme === "dark"
      ? "Switch to light mode"
      : theme === "light"
        ? "Switch to dark mode"
        : "Using system theme — click to override";

  return (
    <button
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={`group relative p-2 rounded-full transition-all duration-300 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 ${className ?? ""}`}
    >
      {icon}
      {/* Tooltip */}
      <span className="pointer-events-none absolute -bottom-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[11px] px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50">
        {theme === "system" ? "System" : theme === "dark" ? "Dark" : "Light"}
      </span>
    </button>
  );
}
