"use client";

import React from "react";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { Header } from "./Header";
import { AnkiImporter } from "./AnkiImporter";
import { AuthModal } from "./AuthModal";
import { FloatingCommunityChat } from "./FloatingCommunityChat";
import { useApp } from "../contexts/AppProvider";
import { Sparkles } from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const {
    currentUser,
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

  return (
    <div className="flex h-screen bg-[#0b1329] text-white overflow-hidden font-sans">
      {/* Sidebar Desktop */}
      <Sidebar
        onOpenImporter={() => setIsImporterOpen(true)}
        onOpenAuth={handleOpenAuth}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Main Content View */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header
          currentUser={currentUser}
          onOpenAuth={handleOpenAuth}
          onLogout={handleLogout}
        />

        <main className="flex-1 p-2 md:p-4 w-full max-w-[1800px] mx-auto">
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

          {children}
        </main>
      </div>

      <BottomNav />
      <FloatingCommunityChat />

      <AnkiImporter
        isOpen={isImporterOpen}
        onClose={() => setIsImporterOpen(false)}
        onImportComplete={(decks) => decks.forEach(handleDeckImported)}
      />
      <AuthModal isOpen={isAuthOpen} initialRegisterMode={authRegisterMode} onClose={() => setIsAuthOpen(false)} onSuccess={(user) => { setCurrentUser(user); setIsAuthOpen(false); }} />
    </div>
  );
};
