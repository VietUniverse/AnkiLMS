"use client";

import { useEffect, useState } from "react";
import { Check, Moon, Palette, Sun } from "lucide-react";

type Theme = "light" | "dark" | "rainbow";

const THEMES: { id: Theme; label: string; description: string; icon: typeof Sun }[] = [
  { id: "light", label: "Sáng", description: "Nền sáng, dễ đọc ban ngày", icon: Sun },
  { id: "dark", label: "Tối", description: "Giao diện tối HaechiVN", icon: Moon },
  { id: "rainbow", label: "Rainbow", description: "Màu sắc rực rỡ", icon: Palette },
];

const STORAGE_KEY = "haechivn_theme";

export function ThemeSwitcher() {
  const [theme, setTheme] = useState<Theme>("light");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const next: Theme = saved === "dark" || saved === "rainbow" ? saved : "light";
    setTheme(next);
    document.documentElement.dataset.theme = next;
  }, []);

  function chooseTheme(next: Theme) {
    setTheme(next);
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem(STORAGE_KEY, next);
    setOpen(false);
  }

  const ActiveIcon = THEMES.find((item) => item.id === theme)?.icon ?? Sun;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={`Giao diện hiện tại: ${THEMES.find((item) => item.id === theme)?.label}. Mở chọn giao diện`}
        aria-expanded={open}
        title="Đổi giao diện"
        className="flex h-9 items-center gap-2 rounded-full border border-slate-700 bg-slate-800/80 px-3 text-xs font-bold text-slate-100 transition hover:border-sky-400 hover:text-sky-200"
      >
        <ActiveIcon className="h-4 w-4" />
        <span className="hidden sm:inline">Giao diện</span>
      </button>
      {open && (
        <>
          <button className="fixed inset-0 z-40 cursor-default" aria-label="Đóng chọn giao diện" onClick={() => setOpen(false)} />
          <div role="menu" aria-label="Chọn giao diện" className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-slate-700 bg-slate-900 p-2 shadow-2xl">
            <p className="px-3 pb-2 pt-1 text-[10px] font-black uppercase tracking-wider text-slate-400">Giao diện</p>
            {THEMES.map(({ id, label, description, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="menuitemradio"
                aria-checked={theme === id}
                onClick={() => chooseTheme(id)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-slate-800"
              >
                <Icon className={`h-4 w-4 ${id === "light" ? "text-amber-300" : id === "rainbow" ? "text-fuchsia-300" : "text-sky-300"}`} />
                <span className="min-w-0 flex-1"><span className="block text-xs font-bold text-white">{label}</span><span className="mt-0.5 block text-[10px] text-slate-400">{description}</span></span>
                {theme === id && <Check className="h-4 w-4 text-emerald-300" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
