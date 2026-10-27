"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "../contexts/AppProvider";
import { FeatureKey } from "../lib/featureFlags";
import {
  Home,
  BookOpen,
  Headphones,
  Repeat,
  Mic,
  GraduationCap,
  Brain,
  MessageSquare,
  Trophy,
  MessagesSquare,
  MessageSquareHeart,
  ShoppingBag,
  Gift,
  Crown,
  ChevronsLeft,
  ChevronsRight,
  Upload,
  LogOut,
  Award,
  User,
  ShieldCheck,
  Gamepad2,
  ListMusic,
  Compass,
  X,
  Menu,
} from "lucide-react";

interface SidebarProps {
  onOpenImporter: () => void;
  onOpenAuth: (isRegisterMode?: boolean) => void;
  currentUser: any;
  onLogout: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

const mainNav = [
  { href: "/", label: "Trang chủ", icon: Home },
  { href: "/hangul", label: "Bảng Hangeul", icon: BookOpen, feature: "hangul" },
  { href: "/flashcards", label: "Từ vựng", icon: Brain, feature: "flashcards" },
  { href: "/dictation", label: "Luyện nghe chính tả", icon: Headphones, feature: "dictation" },
  { href: "/shadowing", label: "Shadowing", icon: Repeat, feature: "shadowing" },
  { href: "/listen", label: "Nghe thụ động", icon: ListMusic, badge: "MỚI", feature: "listen" },
  { href: "/games", label: "Trò chơi từ vựng", icon: Gamepad2, feature: "games" },
] as const;

const communityNav = [
  { href: "/leaderboard", label: "Bảng xếp hạng", icon: Trophy, feature: "leaderboard" },
  { href: "/achievements", label: "Huy hiệu & Mốc thưởng", icon: Award, feature: "achievements" },
  { href: "/feedback", label: "Góp ý & Đánh giá", icon: MessageSquareHeart, feature: "feedback" },
] as const;

// LƯU Ý BACKEND: Các tính năng Beta đang thử nghiệm UX/UI, không đưa lên production
const betaNav = [
  { href: "/topics", label: "Học theo chủ đề", icon: Compass, badge: "BETA", feature: "topics" },
  { href: "/lessons", label: "Lộ trình bài học", icon: BookOpen, badge: "BETA", feature: "lessons" },
  { href: "/ai-speaking", label: "Luyện nói tiếng Hàn", icon: Mic, badge: "BETA", feature: "aiSpeaking" },
  { href: "/topik", label: "Luyện thi TOPIK I/II", icon: GraduationCap, badge: "BETA", feature: "topik" },
  { href: "/community", label: "Cộng đồng Haechi", icon: MessageSquare, badge: "BETA", feature: "community" },
  { href: "/chat", label: "Phòng Trò chuyện", icon: MessagesSquare, badge: "BETA", feature: "chat" },
  { href: "/rewards", label: "Cửa hàng Đổi quà", icon: ShoppingBag, badge: "BETA", feature: "rewards" },
  { href: "/referrals", label: "Mời bạn bè", icon: Gift, badge: "BETA", feature: "referrals" },
  { href: "/pricing", label: "Nâng cấp PRO", icon: Crown, badge: "BETA", feature: "pricing" },
] as const;

export const Sidebar: React.FC<SidebarProps> = ({
  onOpenImporter,
  onOpenAuth,
  currentUser,
  onLogout,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { isFeatureEnabled } = useApp();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const renderNavItem = (item: { href: string; label: string; icon: any; badge?: string; feature?: FeatureKey }, isMobile = false) => {
    const Icon = item.icon;
    const active = isActive(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={isMobile ? onCloseMobile : undefined}
        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-colors border-0 ${
          active
            ? "bg-blue-600 text-white font-extrabold shadow-md shadow-blue-900/30"
            : "text-slate-400 hover:text-white hover:bg-[#111c38] font-medium"
        }`}
        title={!isMobile && collapsed ? item.label : undefined}
      >
        <div className="flex items-center gap-2.5">
          <Icon className={`w-4 h-4 shrink-0 ${active ? "text-white" : "text-slate-400"}`} />
          {(!collapsed || isMobile) && <span className="tracking-normal truncate">{item.label}</span>}
        </div>
        {(!collapsed || isMobile) && item.badge && (
          <span
            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border-0 ${
              item.badge === "BETA"
                ? "bg-purple-500/20 text-purple-300"
                : "bg-blue-500/20 text-blue-300"
            }`}
          >
            {item.badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile Navigation Drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex animate-fadeIn">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-[85vw] h-full bg-[#090f1e] text-white flex flex-col justify-between shadow-2xl z-10 border-r border-[#19284d]">
            {/* Mobile Header with Close button */}
            <div className="flex h-16 items-center justify-between border-b border-[#111c38]/70 px-4 shrink-0">
              <Link
                href="/"
                onClick={onCloseMobile}
                className="flex items-center gap-2.5"
              >
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-black text-lg text-white tracking-tight block leading-none">
                    Haechi<span className="text-blue-400">VN</span>
                  </span>
                  <span className="text-[9px] font-semibold text-slate-400 tracking-wider">Tiếng Hàn & Anki LMS</span>
                </div>
              </Link>
              <button
                onClick={onCloseMobile}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                aria-label="Đóng menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Scrollable Links */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              <div>
                <p className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                  HỌC TẬP
                </p>
                <nav className="space-y-0.5 mt-1">
                  {mainNav.filter((item) => isFeatureEnabled("feature" in item ? item.feature : undefined)).map((item) => renderNavItem(item, true))}
                  {currentUser?.role === "admin" && renderNavItem({ href: "/admin", label: "Quản trị hệ thống", icon: ShieldCheck }, true)}
                </nav>
              </div>

              <div className="pt-3 border-t border-[#132247]/60">
                <p className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                  CỘNG ĐỒNG & XẾP HẠNG
                </p>
                <div className="space-y-0.5 mt-1">
                  {communityNav.filter((item) => isFeatureEnabled(item.feature)).map((item) => renderNavItem(item, true))}
                </div>
              </div>

              <div className="pt-3 border-t border-[#132247]/60">
                <div className="px-3 py-1 flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-purple-400">
                    TÍNH NĂNG BETA
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">
                    THỬ NGHIỆM
                  </span>
                </div>
                <div className="space-y-0.5 mt-1">
                  {betaNav.filter((item) => isFeatureEnabled(item.feature)).map((item) => renderNavItem(item, true))}
                  {isFeatureEnabled("ankiImport") && (
                    <button
                      onClick={() => {
                        onCloseMobile?.();
                        onOpenImporter();
                      }}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-colors border-0 text-slate-400 hover:text-white hover:bg-[#111c38] font-medium cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <Upload className="w-4 h-4 text-purple-400 shrink-0" />
                        <span className="tracking-normal truncate">Nhập thẻ Anki (.apkg)</span>
                      </div>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md border-0 bg-purple-500/20 text-purple-300">
                        BETA
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Mobile Footer User info */}
            <div className="p-3 border-t border-[#111c38]/70 bg-[#070d1a] shrink-0">
              {currentUser ? (
                <div className="flex items-center justify-between p-2 rounded-xl bg-[#0b1329]">
                  <Link
                    href="/profile"
                    onClick={onCloseMobile}
                    className="flex items-center gap-2.5 min-w-0"
                  >
                    {currentUser.avatar_url ? (
                      <img src={currentUser.avatar_url} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-xs text-white shrink-0">
                        {currentUser.name?.[0]?.toUpperCase() || "?"}
                      </div>
                    )}
                    <div className="min-w-0">
                      <span className="font-bold text-xs text-white block truncate">{currentUser.name}</span>
                      <span className="text-[10px] text-amber-400 font-semibold block">
                        Lv.{Math.floor((currentUser.xp || 0) / 300) + 1} · {currentUser.xp || 0} XP
                      </span>
                    </div>
                  </Link>
                  <button
                    onClick={() => {
                      onCloseMobile?.();
                      onLogout();
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                    title="Đăng xuất"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    onCloseMobile?.();
                    onOpenAuth(false);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md"
                >
                  ĐĂNG NHẬP
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Desktop Aside Sidebar */}
      <aside
        className={`hidden md:flex flex-col border-r border-[#111c38]/70 bg-[#090f1e] text-white h-screen sticky top-0 justify-between z-30 select-none transition-all duration-300 ${
          collapsed ? "w-16" : "w-64"
        }`}
      >
      {/* HaechiVN Brand Header */}
      <Link
        href="/"
        className="flex h-16 items-center border-b border-[#111c38]/70 px-4 shrink-0 justify-between cursor-pointer hover:bg-[#0b1329] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
            <GraduationCap className="w-4 h-4" />
          </div>
          {!collapsed && (
            <div>
              <span className="font-black text-lg text-white tracking-tight block leading-none">
                Haechi<span className="text-blue-400">VN</span>
              </span>
              <span className="text-[9px] font-semibold text-slate-400 tracking-wider">Tiếng Hàn & Anki LMS</span>
            </div>
          )}
        </div>
      </Link>

      {/* Navigation Scrollable Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Section 1: HỌC TẬP (Chính) */}
        <div>
          {!collapsed && (
            <p className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
              HỌC TẬP
            </p>
          )}
          <nav className="space-y-0.5 mt-1">
            {mainNav.filter((item) => isFeatureEnabled("feature" in item ? item.feature : undefined)).map((item) => renderNavItem(item))}
            {currentUser?.role === "admin" && renderNavItem({ href: "/admin", label: "Quản trị hệ thống", icon: ShieldCheck })}
          </nav>
        </div>

        {/* Section 2: CỘNG ĐỒNG & XẾP HẠNG */}
        <div className="pt-3 border-t border-[#132247]/60">
          {!collapsed && (
            <p className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
              CỘNG ĐỒNG & XẾP HẠNG
            </p>
          )}
          <div className="space-y-0.5 mt-1">
            {communityNav.filter((item) => isFeatureEnabled(item.feature)).map((item) => renderNavItem(item))}
          </div>
        </div>

        {/* Section 3: TÍNH NĂNG BETA (Xuống dưới cùng) */}
        <div className="pt-3 border-t border-[#132247]/60">
          {!collapsed && (
            <div className="px-3 py-1 flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-purple-400">
                TÍNH NĂNG BETA
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">
                THỬ NGHIỆM
              </span>
            </div>
          )}
          <div className="space-y-0.5 mt-1">
            {betaNav.filter((item) => isFeatureEnabled(item.feature)).map((item) => renderNavItem(item))}

            {/* Tính năng Kéo thẻ Anki (.apkg) đưa vào mục Beta */}
            {isFeatureEnabled("ankiImport") && <button
              onClick={onOpenImporter}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-colors border-0 text-slate-400 hover:text-white hover:bg-[#111c38] font-medium cursor-pointer"
              title={collapsed ? "Nhập thẻ Anki (.apkg)" : undefined}
            >
              <div className="flex items-center gap-2.5">
                <Upload className="w-4 h-4 text-purple-400 shrink-0" />
                {!collapsed && <span className="tracking-normal truncate">Nhập thẻ Anki (.apkg)</span>}
              </div>
              {!collapsed && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md border-0 bg-purple-500/20 text-purple-300">
                  BETA
                </span>
              )}
            </button>}
          </div>
        </div>
      </div>

      {/* Bottom Action Area: Login / User Profile */}
      <div className="p-3 space-y-2 border-t border-[#111c38]/70 bg-[#070d1a] shrink-0">
        {currentUser ? (
          <div className="flex items-center justify-between p-2 rounded-xl bg-[#0b1329] border-0">
            <Link
              href={isFeatureEnabled("profile") ? "/profile" : "/"}
              className="flex items-center gap-2 min-w-0 hover:opacity-85 transition-opacity"
            >
              {currentUser.avatar_url ? (
                <img src={currentUser.avatar_url} alt={currentUser.name} className="w-8 h-8 rounded-lg object-cover shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-xs text-white shrink-0">
                  {currentUser.name?.[0]?.toUpperCase() || "?"}
                </div>
              )}
              {!collapsed && (
                <div className="min-w-0">
                  <span className="font-bold text-xs text-white block truncate">{currentUser.name}</span>
                  <span className="text-[10px] text-amber-400 font-semibold block">
                    Lv.{Math.floor((currentUser.xp || 0) / 300) + 1} · {currentUser.xp || 0} XP
                  </span>
                </div>
              )}
            </Link>
            <button
              onClick={onLogout}
              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg transition-colors shrink-0 cursor-pointer border-0"
              title="Đăng xuất"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => onOpenAuth(false)}
            className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer border-0 shadow-md shadow-blue-900/30"
          >
            {collapsed ? <User className="w-4 h-4 mx-auto" /> : "ĐĂNG NHẬP"}
          </button>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-300 transition-colors cursor-pointer border-0"
        >
          {collapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
          {!collapsed && <span>{collapsed ? "Mở rộng" : "Thu gọn"}</span>}
        </button>
      </div>
    </aside>
    </>
  );
};
