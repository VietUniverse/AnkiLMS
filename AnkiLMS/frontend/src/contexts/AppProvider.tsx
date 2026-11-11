"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { AnkiDeck } from "../lib/ankiParser";
import { ApiClient, UserProfile } from "../lib/apiClient";
import { BETA_FEATURE_KEYS, DEFAULT_FEATURE_FLAGS, FeatureFlags, FeatureKey, IS_BETA_FEATURES_ENABLED } from "../lib/featureFlags";
import { CURATED_DECKS, curatedDeckToAnkiDeck } from "../data/curatedDecks";
import { courseToExploreDeck, loadCourseVocabulary, loadSeoul1AExploreDeck } from "../lib/courseVocabulary";
import { syncManagedDecks } from "../lib/deckSync";
import { loadProgress, NEW_WORDS_FOR_CHECKIN, vietnamToday } from "../lib/dailyLimits";

export interface StudySessionInfo {
  title: string;
  onExit: () => void;
  studyMode?: "flip" | "typing" | "handwriting";
  setStudyMode?: (mode: "flip" | "typing" | "handwriting") => void;
  progressText?: string;
  /** Chữ trên nút quay lại ở thanh trên (mặc định "Trở về"). */
  backLabel?: string;
  /** false: ẩn nút cài đặt học (nền, giao diện) trên thanh trên. */
  showSettings?: boolean;
  progressPercent?: number;
  remainingNew?: number;
  remainingReview?: number;
}

interface AppContextType {
  currentUser: UserProfile | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  userDecks: AnkiDeck[];
  setUserDecks: React.Dispatch<React.SetStateAction<AnkiDeck[]>>;
  removedBuiltInDeckIds: string[];
  heatmapData: { checkin_date: string; time_spent_minutes: number; xp_earned: number }[];
  setHeatmapData: React.Dispatch<React.SetStateAction<{ checkin_date: string; time_spent_minutes: number; xp_earned: number }[]>>;
  isImporterOpen: boolean;
  setIsImporterOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isAuthOpen: boolean;
  setIsAuthOpen: React.Dispatch<React.SetStateAction<boolean>>;
  authRegisterMode: boolean;
  checkinMessage: string | null;
  authErrorMessage: string | null;
  isAuthReady: boolean;
  featureFlags: FeatureFlags;
  featureFlagsLoaded: boolean;
  isFeatureEnabled: (key: FeatureKey | undefined) => boolean;
  handleOpenAuth: (register?: boolean) => void;
  handleLogout: () => void;
  handleCheckin: () => Promise<void>;
  handleDeckImported: (deck: AnkiDeck) => void;
  handleRemoveDeck: (deckId: string) => void;
  activeStudySession: StudySessionInfo | null;
  setActiveStudySession: React.Dispatch<React.SetStateAction<StudySessionInfo | null>>;
}

const AppContext = createContext<AppContextType | null>(null);

export function useApp(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within <AppProvider>");
  return ctx;
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const accountDeckCleanupEmail = "anki@adminvn.com";
  const accountDeckCleanupIds: string[] = [];
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [userDecks, setUserDecks] = useState<AnkiDeck[]>([]);
  const [removedBuiltInDeckIds, setRemovedBuiltInDeckIds] = useState<string[]>([]);
  const [heatmapData, setHeatmapData] = useState<{ checkin_date: string; time_spent_minutes: number; xp_earned: number }[]>([]);
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authRegisterMode, setAuthRegisterMode] = useState(false);
  const [checkinMessage, setCheckinMessage] = useState<string | null>(null);
  const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlags>(DEFAULT_FEATURE_FLAGS);
  const [featureFlagsLoaded, setFeatureFlagsLoaded] = useState(false);
  const [activeStudySession, setActiveStudySession] = useState<StudySessionInfo | null>(null);
  const syncingDeckIds = useRef(new Set<string>());
  const nextSharedDeckBackupAt = useRef(0);
  const autoCheckinRef = useRef<string | null>(null);
  const [sharedDeckSyncTick, setSharedDeckSyncTick] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get("auth_error");
    const referralCode = params.get("ref");
    const fragmentParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const oauthHandoff = fragmentParams.get("oauth_handoff");

    if (referralCode && referralCode.length <= 80) {
      localStorage.setItem("haechivn_referral_code", referralCode);
    }

    // Remove legacy JS-readable bearer credentials from older client versions.
    localStorage.removeItem("haechivn_auth_token");

    // OAuth callback uses a one-time ticket in the URL fragment: fragments are
    // never sent to servers or referrers. Exchange it for an HttpOnly cookie
    // before loading user data; the session token never enters JavaScript.
    if (oauthHandoff) {
      window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.search}`);
    }

    // The login page handles OAuth errors itself.
    const isLoginPage = window.location.pathname === "/login";
    if (authError && !isLoginPage) {
      const authErrorMessages: Record<string, string> = {
        oauth_invalid_request: "Yêu cầu đăng nhập không hợp lệ. Vui lòng thử lại.",
        oauth_state_expired: "Phiên đăng nhập đã hết hạn. Vui lòng thử lại.",
        oauth_not_configured: "Đăng nhập Google chưa được cấu hình trên máy chủ.",
        oauth_token_failed: "Google không xác nhận được đăng nhập. Vui lòng thử lại.",
        oauth_profile_failed: "Không lấy được hồ sơ Google. Vui lòng thử lại.",
        oauth_email_unverified: "Tài khoản Google cần có email đã xác minh.",
        oauth_account_failed: "Không thể tạo tài khoản. Vui lòng thử lại.",
        oauth_failed: "Đăng nhập Google gặp lỗi. Vui lòng thử lại.",
      };
      const msg = authErrorMessages[authError] || "Đăng nhập Google thất bại. Vui lòng thử lại.";
      setTimeout(() => setAuthErrorMessage(msg), 0);
      window.history.replaceState({}, document.title, window.location.pathname);
      setTimeout(() => setAuthErrorMessage(null), 8000);
    }

    async function loadInitialData() {
      try {
        const [user, featureResponse] = await Promise.all([
          ApiClient.fetchMe(),
          fetch("/api/features", { credentials: "same-origin", cache: "no-store" }).catch(() => null),
        ]);
        setCurrentUser(user);
        if (featureResponse?.ok) {
          const payload = await featureResponse.json() as { features?: Partial<FeatureFlags> };
          setFeatureFlags({ ...DEFAULT_FEATURE_FLAGS, ...payload.features });
        }
        setFeatureFlagsLoaded(true);
        let decks = await ApiClient.getSavedDecks(user?.id);
        if (user?.email.toLowerCase() === accountDeckCleanupEmail) {
          setRemovedBuiltInDeckIds(accountDeckCleanupIds);
          const cleanupKey = `haechivn_account_deck_cleanup_v1_${user.id}`;
          if (!localStorage.getItem(cleanupKey)) {
            const isCopiedDeck = (name: string) => {
              const normalized = name.trim().toLocaleLowerCase();
              return normalized === "từ vựng tiếng hàn cơ bản" ||
                normalized === "tiếng hàn tổng hợp::sách 4::bài 01" ||
                normalized.startsWith("tiếng hàn tổng hợp::quyển 01::") ||
                normalized.startsWith("tiếng hàn tổng hợp::quyển 02::");
            };
            let removedCards = 0;
            const cleanedDecks = decks.flatMap((deck) => {
              if (isCopiedDeck(deck.name)) {
                removedCards += deck.cards?.length || 0;
                return [];
              }
              const cards = (deck.cards || []).filter((card) => !isCopiedDeck(card.deckName));
              removedCards += (deck.cards?.length || 0) - cards.length;
              if (cards.length === 0) return [];
              return cards.length === deck.cards.length
                ? [deck]
                : [{ ...deck, cards, cardCount: cards.length }];
            });
            if (cleanedDecks.length !== decks.length || removedCards > 0) {
              await ApiClient.saveDecks(cleanedDecks, user.id);
              decks = cleanedDecks;
            }
            localStorage.setItem(cleanupKey, "done");
          }
        }
        setUserDecks(decks);

        if (user) {
          const heatmap = await ApiClient.getHeatmapData();
          setHeatmapData(heatmap);
        }
      } finally {
        setFeatureFlagsLoaded(true);
        setIsAuthReady(true);
      }
    }
    async function bootstrap() {
      if (oauthHandoff) {
        try {
          const response = await fetch("/api/auth/handoff", {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            cache: "no-store",
            body: JSON.stringify({ ticket: oauthHandoff }),
          });
          const payload = await response.json() as { error?: string };
          if (!response.ok) {
            setTimeout(() => setAuthErrorMessage(payload.error || "Không hoàn tất được đăng nhập Google. Vui lòng thử lại."), 0);
            setTimeout(() => setAuthErrorMessage(null), 8000);
          }
        } catch {
          setTimeout(() => setAuthErrorMessage("Không thể hoàn tất đăng nhập Google. Hãy kiểm tra kết nối rồi thử lại."), 0);
          setTimeout(() => setAuthErrorMessage(null), 8000);
        }
      }
      await loadInitialData();
    }
    void bootstrap();

    const handleUserUpdate = (event: Event) => {
      const updatedUser = (event as CustomEvent<UserProfile>).detail;
      if (updatedUser) setCurrentUser(updatedUser);
    };
    window.addEventListener("haechivn:user-updated", handleUserUpdate);
    return () => window.removeEventListener("haechivn:user-updated", handleUserUpdate);
  }, []);

  // Refresh Explore decks on app startup. New/updated cards are synchronized
  // while each learner's review schedule and removed cards are retained.
  const [publishedDecks, setPublishedDecks] = useState<AnkiDeck[] | null>(null);
  useEffect(() => {
    if (!isAuthReady || !currentUser) return;
    let active = true;
    void Promise.all([loadCourseVocabulary(), loadSeoul1AExploreDeck()]).then(([courseData, seoul1ADeck]) => {
      if (!active) return;
      const decks = [
        ...CURATED_DECKS.map(curatedDeckToAnkiDeck),
        ...(courseData?.decks.flatMap((group) => group.courses.map(courseToExploreDeck)) || []).map(curatedDeckToAnkiDeck),
        ...(seoul1ADeck ? [curatedDeckToAnkiDeck(seoul1ADeck)] : []),
      ];
      setPublishedDecks(decks);
    });
    return () => { active = false; };
  }, [isAuthReady, currentUser?.id]);

  useEffect(() => {
    if (!publishedDecks || !isAuthReady || !currentUser) return;
    const synchronized = syncManagedDecks(userDecks, publishedDecks);
    if (synchronized === userDecks) return;
    setUserDecks(synchronized);
    void ApiClient.saveDecks(synchronized, currentUser?.id).catch((error) => console.error("Could not sync published decks", error));
  }, [currentUser?.id, isAuthReady, publishedDecks, userDecks]);

  // Back up user-created decks to R2/D1 and restore server copies missing from
  // this browser. Curated Explore decks remain managed by the published catalog.
  useEffect(() => {
    if (!isAuthReady || !currentUser) return;
    let active = true;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    const userId = currentUser.id;
    const localDecks = userDecks.filter((deck) => !deck.id.startsWith("curated-"));

    void (async () => {
      const remoteRecords = await ApiClient.getMySharedDecks();
      if (!active) return;
      // A 429/network failure is not an empty remote library. Never upload or
      // restore anything until the inventory request succeeds.
      if (!remoteRecords) {
        retryTimer = setTimeout(() => setSharedDeckSyncTick((tick) => tick + 1), 60_000);
        return;
      }
      const localIds = new Set(localDecks.map((deck) => deck.id));
      const localSharedIds = new Set(localDecks.map((deck) => deck.sharedId).filter((id): id is string => !!id));
      const remoteDeckIds = new Set(remoteRecords.map((record) => record.deckId));

      const missingLocally = remoteRecords.filter((record) => !localIds.has(record.deckId) && !localSharedIds.has(record.sharedId));
      const restored: AnkiDeck[] = [];
      for (let offset = 0; offset < missingLocally.length; offset += 4) {
        const records = missingLocally.slice(offset, offset + 4);
        const results = await Promise.all(records.map((record) => ApiClient.getSharedDeck(record.sharedId)));
        results.forEach((result, index) => {
          const record = result || records[index];
          if (!result?.cards?.length) return;
          restored.push({
            id: record.deckId,
            name: record.title,
            description: record.description,
            cardCount: record.cardCount,
            cards: result.cards,
            visibility: record.visibility,
            sharedId: record.sharedId,
            author: record.author,
          });
        });
      }

      const localMissingRemotely = localDecks.filter((deck) => !remoteDeckIds.has(deck.id) && !syncingDeckIds.current.has(deck.id));
      const uploaded: { id: string; sharedId: string }[] = [];
      if (localMissingRemotely.length) {
        const waitMs = Math.max(0, nextSharedDeckBackupAt.current - Date.now());
        if (waitMs > 0) {
          retryTimer = setTimeout(() => setSharedDeckSyncTick((tick) => tick + 1), waitMs);
        } else {
          // Keep automatic backups gentle: one deck per request, with a
          // cooldown so state updates cannot trigger a burst of POSTs.
          const deck = localMissingRemotely[0];
          syncingDeckIds.current.add(deck.id);
          nextSharedDeckBackupAt.current = Date.now() + 15_000;
          try {
            const sharedId = await ApiClient.saveSharedDeck({ ...deck, visibility: deck.visibility || "private" });
            uploaded.push({ id: deck.id, sharedId });
          } catch (error) {
            const status = (error as Error & { status?: number }).status;
            const retryAfterMs = (error as Error & { retryAfterMs?: number }).retryAfterMs || 0;
            const backoffMs = status === 429 ? Math.max(60_000, retryAfterMs) : 30_000;
            nextSharedDeckBackupAt.current = Date.now() + backoffMs;
            if (status !== 429) console.error("Could not back up study deck to server", error);
          } finally {
            syncingDeckIds.current.delete(deck.id);
          }
          if (localMissingRemotely.length > 1) {
            const remainingMs = Math.max(0, nextSharedDeckBackupAt.current - Date.now());
            retryTimer = setTimeout(() => setSharedDeckSyncTick((tick) => tick + 1), remainingMs);
          }
        }
      }
      if (!active) return;

      const sharedIdsByDeckId = new Map(remoteRecords.map((record) => [record.deckId, record.sharedId]));
      uploaded.forEach((item) => sharedIdsByDeckId.set(item.id, item.sharedId));
      if (restored.length || localDecks.some((deck) => sharedIdsByDeckId.has(deck.id) && deck.sharedId !== sharedIdsByDeckId.get(deck.id))) {
        setUserDecks((previous) => {
          const next = previous.map((deck) => sharedIdsByDeckId.has(deck.id)
            ? { ...deck, sharedId: sharedIdsByDeckId.get(deck.id) }
            : deck);
          const existingIds = new Set(next.map((deck) => deck.id));
          next.push(...restored.filter((deck) => !existingIds.has(deck.id)));
          void ApiClient.saveDecks(next, userId).catch((error) => console.error("Could not save synchronized decks locally", error));
          return next;
        });
      }
    })().catch((error) => console.error("Could not synchronize decks with server", error));

    return () => {
      active = false;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [currentUser?.id, isAuthReady, sharedDeckSyncTick, userDecks]);

  const handleOpenAuth = useCallback((register?: boolean) => {
    setAuthRegisterMode(!!register);
    setIsAuthOpen(true);
  }, []);

  const handleDeckImported = useCallback((deck: AnkiDeck) => {
    setUserDecks((prev) => {
      const existing = prev.find((item) => item.id === deck.id || item.name === deck.name);
      const preparedDeck: AnkiDeck = {
        ...deck,
        description: deck.description || existing?.description || "",
        visibility: deck.visibility || existing?.visibility || "private",
        sharedId: deck.sharedId || existing?.sharedId,
        author: deck.author || existing?.author || (currentUser ? {
          userId: currentUser.id,
          name: currentUser.name,
          avatar: currentUser.avatar_url || undefined,
          bio: currentUser.bio || undefined,
        } : undefined),
      };
      const filtered = prev.filter((d) => d.id !== preparedDeck.id && d.name !== preparedDeck.name);
      const updated = [...filtered, preparedDeck];
      void ApiClient.saveDecks(updated, currentUser?.id).catch((error) => console.error("Could not save study decks", error));
      return updated;
    });
    setIsImporterOpen(false);
  }, [currentUser?.id]);

  const handleRemoveDeck = useCallback((deckId: string) => {
    setUserDecks((prev) => {
      const updated = prev.filter((d) => d.id !== deckId && `user-${d.id}` !== deckId && `curated-${d.id}` !== deckId);
      void ApiClient.saveDecks(updated, currentUser?.id).catch((error) => console.error("Could not save study decks", error));
      return updated;
    });
  }, [currentUser?.id]);

  const handleCheckin = useCallback(async () => {
    if (!currentUser) {
      handleOpenAuth(false);
      return;
    }
    try {
      const res = await ApiClient.checkin();
      setCheckinMessage(res.message);
      if (res.user) {
        setCurrentUser((prev) => ({ ...prev, ...res.user } as UserProfile));
      }
      const updatedHeatmap = await ApiClient.getHeatmapData();
      setHeatmapData(updatedHeatmap);
      setTimeout(() => setCheckinMessage(null), 4000);
    } catch (e: any) {
      setCheckinMessage("⚠️ " + (e.message || "Vui lòng đăng nhập để điểm danh"));
      setTimeout(() => setCheckinMessage(null), 4000);
    }
  }, [currentUser, handleOpenAuth]);

  // Điểm danh tự động khi học đủ 10 từ mới trong ngày (bỏ nút điểm danh thủ công).
  const autoCheckinFromStudy = useCallback(async () => {
    if (!currentUser) return;
    const today = vietnamToday();
    if (currentUser.last_checkin_date === today) return;
    const guardKey = `${currentUser.id}:${today}`;
    if (autoCheckinRef.current === guardKey) return;
    autoCheckinRef.current = guardKey;
    await handleCheckin();
  }, [currentUser, handleCheckin]);

  useEffect(() => {
    if (!isAuthReady || !currentUser) return;
    const maybeCheckin = () => {
      if (typeof window === "undefined") return;
      if (loadProgress().newDone >= NEW_WORDS_FOR_CHECKIN) void autoCheckinFromStudy();
    };
    maybeCheckin();
    window.addEventListener("haechivn:daily-progress-updated", maybeCheckin);
    window.addEventListener("focus", maybeCheckin);
    return () => {
      window.removeEventListener("haechivn:daily-progress-updated", maybeCheckin);
      window.removeEventListener("focus", maybeCheckin);
    };
  }, [isAuthReady, currentUser, autoCheckinFromStudy]);

  const handleLogout = useCallback(async () => {
    await ApiClient.logout();
    setCurrentUser(null);
    setHeatmapData([]);
  }, []);

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        userDecks,
        setUserDecks,
        removedBuiltInDeckIds,
        heatmapData,
        setHeatmapData,
        isImporterOpen,
        setIsImporterOpen,
        isAuthOpen,
        setIsAuthOpen,
        authRegisterMode,
        checkinMessage,
        authErrorMessage,
        isAuthReady,
        featureFlags,
        featureFlagsLoaded,
        isFeatureEnabled: (key) => !key || (featureFlags[key] && (IS_BETA_FEATURES_ENABLED || !BETA_FEATURE_KEYS.includes(key))),
        handleOpenAuth,
        handleLogout,
        handleCheckin,
        handleDeckImported,
        handleRemoveDeck,
        activeStudySession,
        setActiveStudySession,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
