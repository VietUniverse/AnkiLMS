"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { Header } from "./Header";
import { backgroundLayerStyle, useStudyBackground } from "../lib/studyBackground";
import { AnkiImporter } from "./AnkiImporter";
import { AuthModal } from "./AuthModal";
import { useApp } from "../contexts/AppProvider";
import { Sparkles } from "lucide-react";
import { featureForPath } from "../lib/featureFlags";
import { BrandLoadingMascot } from "./BrandLoadingMascot";
import { PWAInstallPrompt } from "./PWAInstallPrompt";

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const {
    currentUser,
    isAuthReady,
    isFeatureEnabled,
    featureFlagsLoaded,
    isImporterOpen,
    setIsImporterOpen,
    isAuthOpen,
    authRegisterMode,
    setIsAuthOpen,
    setCurrentUser,
    checkinMessage,
    authErrorMessage,
    handleOpenAuth,
    handleLogout,
    handleDeckImported,
    activeStudySession,
  } = useApp();
  const studyBackground = useStudyBackground();
  const studyBackgroundStyle = activeStudySession ? backgroundLayerStyle(studyBackground) : null;

  // Cửa vào cho khách: học thử lớp mở, kiểm tra trình độ, từ điển, sách tương tác và kho bộ thẻ dùng được không cần đăng nhập.
  const isPublicPath = pathname === "/login" || ["/classes", "/placement-test", "/dictionary", "/explore", "/sach"].some((route) => pathname === route || pathname.startsWith(`${route}/`));

  useEffect(() => {
    if (isAuthReady && !currentUser && !isPublicPath) {
      router.replace("/login");
    }
  }, [isAuthReady, currentUser, isPublicPath, router]);

  if (isAuthReady && !currentUser && !isPublicPath) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0b1329] text-white font-sans">
        <BrandLoadingMascot label="Đang chuyển hướng sang trang đăng nhập…" className="animate-fadeIn" />
      </div>
    );
  }

  const routeFeature = featureForPath(pathname);
  const routeDisabled = !!(routeFeature && routeFeature !== "books" && !isFeatureEnabled(routeFeature));

  return (
    <div className="flex h-[100dvh] min-h-[100svh] bg-[#0b1329] text-white overflow-hidden font-sans">
      {/* Sidebar Desktop & Mobile Drawer */}
      <Sidebar
        onOpenImporter={() => setIsImporterOpen(true)}
        onOpenAuth={handleOpenAuth}
        currentUser={currentUser}
        onLogout={handleLogout}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        hideDesktop={!!activeStudySession}
      />

      {/* Nền tùy chỉnh khi học thẻ (gradient hoặc ảnh), nằm dưới nội dung */}
      {studyBackgroundStyle && <div aria-hidden className="pointer-events-none fixed inset-0 z-0 transition-opacity" style={studyBackgroundStyle} />}

      {/* Main Content View */}
      <div className={`${studyBackgroundStyle ? "relative z-10 " : ""}flex-1 flex flex-col min-w-0 overflow-y-auto`}>
        {/* Thanh trên chỉ hiện khi đang học thẻ (nút Trở về, chế độ học, tiến độ); còn lại dùng thanh bên. */}
        {activeStudySession && (
          <Header
            currentUser={currentUser}
            onOpenAuth={handleOpenAuth}
            onLogout={handleLogout}
            onToggleMobileMenu={() => setIsMobileMenuOpen((prev: boolean) => !prev)}
          />
        )}

        <main className="flex-1 min-w-0 overflow-x-hidden p-2.5 pb-[calc(6.5rem+env(safe-area-inset-bottom))] sm:p-4 sm:pb-28 lg:pb-4 w-full max-w-[1800px] mx-auto">
          {checkinMessage && !activeStudySession && (
            <div className="mb-4 p-4 rounded-2xl bg-amber-500/20 border border-amber-400 text-amber-300 font-bold text-xs flex items-center justify-between animate-fadeIn">
              <span>{checkinMessage}</span>
              <Sparkles className="w-4 h-4 text-amber-400" />
            </div>
          )}

          {authErrorMessage && !activeStudySession && (
            <div className="mb-4 p-4 rounded-2xl bg-rose-500/20 border border-rose-500 text-rose-300 font-bold text-xs flex items-center justify-between animate-fadeIn">
              <span>{authErrorMessage}</span>
            </div>
          )}

          {routeDisabled ? (
            <section className="mx-auto mt-12 max-w-xl rounded-2xl border border-blue-500/30 bg-[#101a32] p-8 text-center space-y-3">
              <h1 className="text-xl font-black text-white">Tính năng hiện chưa khả dụng</h1>
              <p className="text-sm text-slate-300">
                Tính năng này đang trong giai đoạn thử nghiệm và chỉ khả dụng ở môi trường kiểm thử.
              </p>
            </section>
          ) : children}
        </main>
      </div>

      {/* Đang học thẻ thì ẩn thanh điều hướng dưới để dành chỗ cho nút Quên/Thuộc */}
      {!activeStudySession && <BottomNav onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />}
      {!activeStudySession && <PWAInstallPrompt />}

      {isFeatureEnabled("ankiImport") && <AnkiImporter
        isOpen={isImporterOpen}
        onClose={() => setIsImporterOpen(false)}
        onImportComplete={(decks) => decks.forEach(handleDeckImported)}
      />}
      <AuthModal isOpen={isAuthOpen} initialRegisterMode={authRegisterMode} onClose={() => setIsAuthOpen(false)} onSuccess={(user) => { setCurrentUser(user); setIsAuthOpen(false); }} />
    </div>
  );
};
