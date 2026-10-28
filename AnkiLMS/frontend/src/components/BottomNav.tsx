"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Home, Layers, Headphones, Repeat, Menu } from "lucide-react";
import { useApp } from "../contexts/AppProvider";

interface BottomNavProps {
  onOpenMobileMenu?: () => void;
}

const items = [
  { href: "/", label: "Trang chủ", icon: Home },
  { href: "/flashcards", label: "Từ vựng", icon: Layers, feature: "flashcards" },
  { href: "/dictation", label: "Nghe chép", icon: Headphones, feature: "dictation" },
  { href: "/shadowing", label: "Shadowing", icon: Repeat, feature: "shadowing" },
] as const;

export const BottomNav: React.FC<BottomNavProps> = ({ onOpenMobileMenu }) => {
  const pathname = usePathname();
  const { isFeatureEnabled } = useApp();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0b1329]/95 backdrop-blur-md border-t border-[#19284d] px-1 pt-1.5 pb-[calc(.375rem+env(safe-area-inset-bottom))] flex items-center justify-around select-none">
      {items.filter((item) => isFeatureEnabled("feature" in item ? item.feature : undefined)).map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);
        return (
          <a
            key={item.href}
            href={item.href}
            className={`flex min-w-0 flex-1 flex-col items-center gap-1 px-1 py-1.5 rounded-xl transition-all ${
              active ? "text-blue-400 bg-blue-500/10 font-bold" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Icon className={`w-5 h-5 ${active ? "text-blue-400" : "text-slate-400"}`} />
            <span className="max-w-full truncate text-[10px] font-bold">{item.label}</span>
          </a>
        );
      })}

      {/* Menu button to open mobile drawer */}
      <button
        onClick={onOpenMobileMenu}
        className="flex min-w-0 flex-1 flex-col items-center gap-1 px-1 py-1.5 rounded-xl text-slate-400 hover:text-slate-200 cursor-pointer transition-all"
        aria-label="Thêm menu"
      >
        <Menu className="w-5 h-5 text-slate-400" />
        <span className="text-[10px] font-bold">Menu</span>
      </button>
    </div>
  );
};
