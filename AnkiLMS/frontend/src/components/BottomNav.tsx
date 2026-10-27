"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, Layers, Trophy, Menu } from "lucide-react";
import { useApp } from "../contexts/AppProvider";

interface BottomNavProps {
  onOpenMobileMenu?: () => void;
}

const items = [
  { href: "/", label: "Trang chủ", icon: Home },
  { href: "/flashcards", label: "Từ vựng", icon: Layers, feature: "flashcards" },
  { href: "/lessons", label: "Bài học", icon: BookOpen, feature: "lessons" },
  { href: "/leaderboard", label: "Xếp hạng", icon: Trophy, feature: "leaderboard" },
] as const;

export const BottomNav: React.FC<BottomNavProps> = ({ onOpenMobileMenu }) => {
  const pathname = usePathname();
  const { isFeatureEnabled } = useApp();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0b1329]/95 backdrop-blur-md border-t border-[#19284d] px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex items-center justify-around select-none">
      {items.filter((item) => isFeatureEnabled("feature" in item ? item.feature : undefined)).map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all ${
              active ? "text-blue-400 bg-blue-500/10 font-bold" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Icon className={`w-5 h-5 ${active ? "text-blue-400" : "text-slate-400"}`} />
            <span className="text-[10px] font-bold">{item.label}</span>
          </Link>
        );
      })}

      {/* Menu button to open mobile drawer */}
      <button
        onClick={onOpenMobileMenu}
        className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-slate-400 hover:text-slate-200 cursor-pointer transition-all"
        aria-label="Thêm menu"
      >
        <Menu className="w-5 h-5 text-slate-400" />
        <span className="text-[10px] font-bold">Menu</span>
      </button>
    </div>
  );
};
