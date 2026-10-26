"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, Layers, Trophy, User } from "lucide-react";

const items = [
  { href: "/", label: "Trang chủ", icon: Home },
  { href: "/lessons", label: "Bài học", icon: BookOpen },
  { href: "/flashcards", label: "Từ vựng", icon: Layers },
  { href: "/leaderboard", label: "Xếp hạng", icon: Trophy },
  { href: "/profile", label: "Hồ sơ", icon: User },
];

export const BottomNav: React.FC = () => {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0b1329]/95 backdrop-blur-md border-t border-[#19284d] px-2 py-2 flex items-center justify-around select-none">
      {items.map((item) => {
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
    </div>
  );
};
