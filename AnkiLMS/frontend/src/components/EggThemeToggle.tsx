"use client";

import React, { useEffect, useState } from "react";

const STORAGE_KEY = "haechivn_theme";

export function EggThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const urlTheme = p.get("theme");
    const saved = localStorage.getItem(STORAGE_KEY);
    const initial =
      urlTheme === "dark" || urlTheme === "light"
        ? urlTheme
        : saved === "dark" || saved === "light"
          ? saved
          : document.documentElement.dataset.theme === "dark"
            ? "dark"
            : "light";

    setTheme(initial);
    document.documentElement.dataset.theme = initial;
    if (initial === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";

    const applyTheme = () => {
      setTheme(next);
      document.documentElement.dataset.theme = next;
      if (next === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      localStorage.setItem(STORAGE_KEY, next);
    };

    if (typeof document !== "undefined" && "startViewTransition" in document) {
      (document as unknown as { startViewTransition: (cb: () => void) => void }).startViewTransition(() => {
        applyTheme();
      });
    } else {
      applyTheme();
    }
  };

  const isLight = theme === "light";

  return (
    <div
      className="egg-toggle-container relative flex items-center select-none"
      suppressHydrationWarning
      title={isLight ? "Đang bật chế độ Sáng (Bấm để chuyển Tối)" : "Đang bật chế độ Tối (Bấm để chuyển Sáng)"}
    >
      <label className="egg-toggle-label relative flex items-center cursor-pointer">
        <input
          type="checkbox"
          className="sr-only"
          checked={isLight}
          onChange={toggleTheme}
          suppressHydrationWarning
          aria-label="Chuyển đổi giao diện Sáng / Tối"
        />

        {/* Pan Wrapper */}
        <div className={`pan-switch ${isLight ? "pan-checked" : ""}`} suppressHydrationWarning>
          {/* Pan Handle on the Left */}
          <div className="pan-handle">
            <span className="pan-handle-neck" />
            <span className="pan-handle-grip">
              <span className="pan-handle-hole" />
            </span>
          </div>

          {/* Pan Body */}
          <div className="pan-body">
            {/* Pan Inner Cavity */}
            <div className="pan-cavity">
              {/* Sliding Egg */}
              <div className="pan-egg">
                {/* Egg White (Translucent liquid when dark/raw, Cooked white when light/fried) */}
                <div className="egg-white" />
                {/* Egg Yolk (Glossy 3D sphere with highlight) */}
                <div className="egg-yolk">
                  <span className="yolk-highlight-large" />
                  <span className="yolk-highlight-small" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </label>
    </div>
  );
}
