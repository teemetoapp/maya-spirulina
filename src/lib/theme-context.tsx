"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = "maya_theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  // Initialize theme from localStorage on mount (defaults to Modern Dark Studio)
  useEffect(() => {
    try {
      const stored = (localStorage.getItem("maya_theme") || localStorage.getItem(STORAGE_KEY)) as Theme | null;
      const initialTheme: Theme = stored || "light";
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from localStorage
      setThemeState(initialTheme);

      const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const isDark =
        initialTheme === "dark" || (initialTheme === "system" && systemPrefersDark);
      const effective: "light" | "dark" = isDark ? "dark" : "light";
      setResolvedTheme(effective);

      if (isDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } catch {
      // Fallback
    } finally {
      setMounted(true);
    }
  }, []);

  // Update DOM when theme state changes
  const applyTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
    } catch {
      // ignore
    }

    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = newTheme === "dark" || (newTheme === "system" && systemPrefersDark);
    const effective: "light" | "dark" = isDark ? "dark" : "light";
    setResolvedTheme(effective);

    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  // Toggle between light and dark
  const toggleTheme = () => {
    const next = resolvedTheme === "dark" ? "light" : "dark";
    applyTheme(next);
  };

  // Listen to system theme changes when in 'system' mode
  useEffect(() => {
    if (theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      const isDark = e.matches;
      setResolvedTheme(isDark ? "dark" : "light");
      if (isDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme: mounted ? resolvedTheme : "light",
        setTheme: applyTheme,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
