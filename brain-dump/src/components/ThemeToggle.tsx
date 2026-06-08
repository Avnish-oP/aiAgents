"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type Theme = "light" | "dark";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    Promise.resolve().then(() => {
      setTheme(
        document.documentElement.classList.contains("dark")
          ? "dark"
          : "light",
      );
    });
  }, []);

  useEffect(() => {
    if (!theme) return;
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;
    localStorage.setItem("brain-dump-theme", theme);
  }, [theme]);

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="inline-flex size-9 items-center justify-center rounded-md border border-(--app-border) bg-(--app-panel) text-(--app-muted) transition-colors hover:bg-(--app-panel-soft) hover:text-(--app-text)"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
      disabled={!theme}
    >
      {!theme ? (
        <span className="size-4" />
      ) : isDark ? (
        <Sun className="size-4" />
      ) : (
        <Moon className="size-4" />
      )}
    </button>
  );
}
