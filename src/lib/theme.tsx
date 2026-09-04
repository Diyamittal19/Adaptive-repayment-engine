import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemeMode = "Light" | "Dark" | "System";

interface ThemeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  isDark: boolean;
  toggle: () => void; // quick toggle used by the sidebar Moon button
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "adaptive-repayment-theme";

function systemPrefersDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function resolveIsDark(mode: ThemeMode) {
  if (mode === "System") return systemPrefersDark();
  return mode === "Dark";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "Light" || stored === "Dark" || stored === "System" ? stored : "Light";
  });

  const [isDark, setIsDark] = useState(() => resolveIsDark(mode));

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  useEffect(() => {
    setIsDark(resolveIsDark(mode));
    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  // If following System, react to the OS preference changing live.
  useEffect(() => {
    if (mode !== "System") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => setIsDark(systemPrefersDark());
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [mode]);

  function setMode(next: ThemeMode) {
    setModeState(next);
  }

  // The sidebar's Moon button is a quick binary toggle — it always
  // switches between Light and Dark directly (bypassing System), since
  // "toggle" only makes sense as a two-state action.
  function toggle() {
    setModeState((prev) => (resolveIsDark(prev) ? "Light" : "Dark"));
  }

  return (
    <ThemeContext.Provider value={{ mode, setMode, isDark, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}