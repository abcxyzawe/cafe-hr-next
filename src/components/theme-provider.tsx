"use client";

import * as React from "react";

export type Theme = "light" | "dark" | "system" | "auto-time";
type Ctx = { theme: Theme; setTheme: (t: Theme) => void; resolvedTheme: "light" | "dark" };

const ThemeContext = React.createContext<Ctx | null>(null);

const STORAGE_KEY = "cafe-hr-theme";

/** Day = 06:00 – 18:00 local time, otherwise night. */
function isDayByClock(): boolean {
  const h = new Date().getHours();
  return h >= 6 && h < 18;
}

function applyTheme(theme: Theme): "light" | "dark" {
  const root = document.documentElement;
  let resolved: "light" | "dark";
  if (theme === "system") {
    resolved = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  } else if (theme === "auto-time") {
    resolved = isDayByClock() ? "light" : "dark";
  } else {
    resolved = theme;
  }
  root.classList.toggle("dark", resolved === "dark");
  return resolved;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>("system");
  const [resolved, setResolved] = React.useState<"light" | "dark">("light");

  React.useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? "system";
    setThemeState(stored);
    setResolved(applyTheme(stored));
  }, []);

  React.useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setResolved(applyTheme("system"));
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  // Auto-time: re-evaluate every minute so we flip at 06:00 / 18:00 boundaries
  React.useEffect(() => {
    if (theme !== "auto-time") return;
    const id = setInterval(() => {
      setResolved(applyTheme("auto-time"));
    }, 60_000);
    return () => clearInterval(id);
  }, [theme]);

  const setTheme = React.useCallback((t: Theme) => {
    localStorage.setItem(STORAGE_KEY, t);
    setThemeState(t);
    setResolved(applyTheme(t));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme: resolved }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be inside ThemeProvider");
  return ctx;
}
