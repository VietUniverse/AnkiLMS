"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { Header } from "./Header";
import { AnkiImporter } from "./AnkiImporter";
import { AuthModal } from "./AuthModal";
import { FloatingCommunityChat } from "./FloatingCommunityChat";
import { useApp } from "../contexts/AppProvider";
import { Sparkles } from "lucide-react";
import { featureForPath } from "../lib/featureFlags";

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
  } = useApp();

  useEffect(() => {
    if (isAuthReady && !currentUser && pathname !== "/login") {
      router.replace("/login");
    }
  }, [isAuthReady, currentUser, pathname, router]);

  if (isAuthReady && !currentUser && pathname !== "/login") {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0b1329] text-white font-sans">
        <div className="flex flex-col items-center gap-3 animate-fadeIn">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-semibold tracking-wide">
            Đang chuyển hướng sang trang đăng nhập...
          </p>
        </div>
      </div>
    );
  }

  const routeFeature = featureForPath(pathname);
  const routeDisabled = featureFlagsLoaded && routeFeature && !isFeatureEnabled(routeFeature);

  return (
    <div className="flex h-screen bg-[#0b1329] text-white overflow-hidden font-sans">
      {/* Sidebar Desktop & Mobile Drawer */}
      <Sidebar
        onOpenImporter={() => setIsImporterOpen(true)}
        onOpenAuth={handleOpenAuth}
        currentUser={currentUser}
        onLogout={handleLogout}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content View */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header
          currentUser={currentUser}
          onOpenAuth={handleOpenAuth}
          onLogout={handleLogout}
          onToggleMobileMenu={() => setIsMobileMenuOpen((prev: boolean) => !prev)}
        />

        <main className="flex-1 p-2.5 sm:p-4 pb-24 md:pb-6 w-full max-w-[1800px] mx-auto">
          {checkinMessage && (
            <div className="mb-4 p-4 rounded-2xl bg-amber-500/20 border border-amber-400 text-amber-300 font-bold text-xs flex items-center justify-between animate-fadeIn">
              <span>{checkinMessage}</span>
              <Sparkles className="w-4 h-4 text-amber-400" />
            </div>
          )}

          {authErrorMessage && (
            <div className="mb-4 p-4 rounded-2xl bg-rose-500/20 border border-rose-500 text-rose-300 font-bold text-xs flex items-center justify-between animate-fadeIn">
              <span>{authErrorMessage}</span>
            </div>
          )}

          {routeDisabled ? (
            <section className="mx-auto mt-12 max-w-xl rounded-2xl border border-blue-500/30 bg-[#101a32] p-8 text-center">
              <h1 className="text-xl font-black text-white">Tính năng hiện chưa khả dụng</h1>
              <p className="mt-2 text-sm text-slate-300">Tính năng này đang được tạm ẩn trên HaechiVN.</p>
            </section>
          ) : children}
        </main>
      </div>

      <BottomNav onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />
      {pathname !== "/" && isFeatureEnabled("chat") && <FloatingCommunityChat />}

      {isFeatureEnabled("ankiImport") && <AnkiImporter
        isOpen={isImporterOpen}
        onClose={() => setIsImporterOpen(false)}
        onImportComplete={(decks) => decks.forEach(handleDeckImported)}
      />}
      <AuthModal isOpen={isAuthOpen} initialRegisterMode={authRegisterMode} onClose={() => setIsAuthOpen(false)} onSuccess={(user) => { setCurrentUser(user); setIsAuthOpen(false); }} />
    </div>
  );
};
