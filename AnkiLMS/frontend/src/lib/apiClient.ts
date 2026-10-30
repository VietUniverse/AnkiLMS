import { AnkiDeck } from "./ankiParser";
import type { SharedDeckRecord } from "../data/curatedDecks";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  bio?: string | null;
  profile_public?: number | boolean;
  streak: number;
  longest_streak?: number;
  xp: number;
  gems: number;
  level: number;
  active_badge?: string | null;
  active_frame?: string | null;
  active_background?: string | null;
  last_checkin_date?: string;
  role?: "student" | "teacher" | "admin";
  translation_language?: "vi" | "en" | "ja";
}

export interface StudyProfileSummary {
  summary: { session_count: number; cards_reviewed: number; correct_count: number; duration_seconds: number };
  days: Array<{ day: string; minutes: number; cards: number }>;
  sessions: Array<{ module: string; cards_reviewed: number; correct_count: number; duration_seconds: number; created_at: string }>;
}

export interface DailyMissionsSummary {
  date: string;
  completedCount: number;
  gemsEarned: number;
  user: { gems: number };
  missions: Array<{
    id: "shadowing" | "vocabulary" | "dictation";
    title: string;
    description: string;
    href: string;
    completed: boolean;
    sessions: number;
    gemsAwarded: number;
    gemReward: number;
    learnersToday: number;
  }>;
}

const LOCAL_STORAGE_TOKEN_KEY = "haechivn_auth_token";
const LOCAL_STORAGE_USER_KEY = "haechivn_user_profile";
const LOCAL_STORAGE_DECKS_KEY = "haechivn_decks";
const DECK_DB_NAME = "haechivn-storage";
const DECK_STORE_NAME = "app-data";
let deckDbPromise: Promise<IDBDatabase> | null = null;
let deckSaveQueue: Promise<void> = Promise.resolve();

function openDeckDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("IndexedDB is unavailable"));
  deckDbPromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DECK_DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(DECK_STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not open local deck database"));
  });
  return deckDbPromise;
}

export class ApiClient {
  public static getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(LOCAL_STORAGE_TOKEN_KEY);
  }

  public static setSession(user: UserProfile) {
    if (typeof window === "undefined") return;
    // New sessions are stored in the server's HttpOnly cookie.
    localStorage.removeItem(LOCAL_STORAGE_TOKEN_KEY);
    localStorage.removeItem("haechivn_referral_code");
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(user));
  }

  public static getCurrentUser(): UserProfile | null {
    if (typeof window === "undefined") return null;
    const data = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch (e) {
      return null;
    }
  }

  public static async fetchMe(): Promise<UserProfile | null> {
    const token = this.getToken();
    const localUser = this.getCurrentUser();
    // Nếu chưa có token thì trả về user cục bộ ngay lập tức (không chờ gọi API 404)
    if (!token) {
      return localUser;
    }

    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), 800) : null;

    try {
      const res = await fetch("/api/auth/me", {
        credentials: "same-origin",
        headers: { Authorization: `Bearer ${token}` },
        signal: controller?.signal,
      });
      if (timer) clearTimeout(timer);
      if (res.status === 401) {
        localStorage.removeItem(LOCAL_STORAGE_TOKEN_KEY);
        localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
        return null;
      }
      if (!res.ok) {
        return localUser;
      }
      const data = await res.json();
      if (data.user) {
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(data.user));
        return data.user;
      }
    } catch (e) {
      // Bỏ qua lỗi mạng / offline / timeout
    } finally {
      if (timer) clearTimeout(timer);
    }
    return localUser;
  }

  public static async login(email: string, password: string): Promise<UserProfile> {
    // Tài khoản thử nghiệm cục bộ
    if (email.toLowerCase() === "admin@example.com" || email.toLowerCase() === "admin@haechivn.local") {
      if (password !== "adminadmin123") {
        throw new Error("Mật khẩu không chính xác cho tài khoản admin");
      }
      const adminUser: UserProfile = {
        id: "admin_test_user",
        email: "admin@example.com",
        name: "Admin Haechi",
        streak: 15,
        longest_streak: 30,
        xp: 2500,
        gems: 2,
        level: 9,
        role: "admin",
      };
      this.setSession(adminUser);
      if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("haechivn:user-updated", { detail: adminUser }));
      return adminUser;
    }

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.status === 404) {
        // Fallback cho môi trường local development không có Cloudflare Functions
        const localUser: UserProfile = {
          id: "local_" + Date.now(),
          email,
          name: email.split("@")[0],
          streak: 1,
          longest_streak: 1,
          xp: 150,
          gems: 2,
          level: 1,
          role: "student",
        };
        this.setSession(localUser);
        if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("haechivn:user-updated", { detail: localUser }));
        return localUser;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Đăng nhập thất bại");
      }
      this.setSession(data.user);
      return data.user;
    } catch (err: any) {
      if (err.message && !err.message.includes("fetch")) throw err;
      // Offline fallback
      const localUser: UserProfile = {
        id: "local_" + Date.now(),
        email,
        name: email.split("@")[0],
        streak: 1,
        longest_streak: 1,
        xp: 150,
        gems: 2,
        level: 1,
        role: "student",
      };
      this.setSession(localUser);
      if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("haechivn:user-updated", { detail: localUser }));
      return localUser;
    }
  }

  public static async register(email: string, name: string, password: string, translationLanguage: "vi" | "en" | "ja" = "vi"): Promise<UserProfile> {
    const referralCode = typeof window !== "undefined" ? localStorage.getItem("haechivn_referral_code") || new URLSearchParams(window.location.search).get("ref") || undefined : undefined;
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, password, referralCode, translationLanguage }),
      });
      if (res.status === 404) {
        const localUser: UserProfile = {
          id: "local_" + Date.now(),
          email,
          name: name || email.split("@")[0],
          streak: 1,
          longest_streak: 1,
          xp: 100,
          gems: 2,
          level: 1,
          role: "student",
          translation_language: translationLanguage,
        };
        this.setSession(localUser);
        if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("haechivn:user-updated", { detail: localUser }));
        return localUser;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Đăng ký thất bại");
      }
      this.setSession(data.user);
      return data.user;
    } catch (err: any) {
      if (err.message && !err.message.includes("fetch")) throw err;
      const localUser: UserProfile = {
        id: "local_" + Date.now(),
        email,
        name: name || email.split("@")[0],
        streak: 1,
        longest_streak: 1,
        xp: 100,
        gems: 2,
        level: 1,
        role: "student",
        translation_language: translationLanguage,
      };
      this.setSession(localUser);
      if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("haechivn:user-updated", { detail: localUser }));
      return localUser;
    }
  }

  public static loginGuest(): UserProfile {
    const guestUser: UserProfile = {
      id: "guest_" + Math.random().toString(36).substring(2, 9),
      email: "guest@haechivn.local",
      name: "Học viên Haechi",
      streak: 1,
      longest_streak: 1,
      xp: 120,
      gems: 2,
      level: 1,
      role: "student",
    };
    this.setSession(guestUser);
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("haechivn:user-updated", { detail: guestUser }));
    return guestUser;
  }

  public static loginWithGoogle(translationLanguage: "vi" | "en" | "ja" = "vi") {
    window.location.href = `/api/auth/google?translationLanguage=${translationLanguage}`;
  }

  public static async logout(): Promise<void> {
    const token = this.getToken();
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
    } catch {
      // The local session is still cleared below if the service is unreachable.
    }
    localStorage.removeItem(LOCAL_STORAGE_TOKEN_KEY);
    localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
  }

  public static async checkin(): Promise<{ alreadyCheckedIn: boolean; message: string; user?: UserProfile }> {
    const token = this.getToken();
    const res = await fetch("/api/checkin", {
      method: "POST",
      credentials: "same-origin",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Không thể điểm danh. Vui lòng thử lại.");
    if (data.user) {
      const updated = { ...this.getCurrentUser(), ...data.user } as UserProfile;
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(updated));
      if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("haechivn:user-updated", { detail: updated }));
    }
    return data;
  }

  public static async getLeaderboard(): Promise<UserProfile[]> {
    try {
      const res = await fetch("/api/leaderboard");
      if (res.ok) {
        const data = await res.json();
        return data.leaderboard || [];
      }
    } catch (e) {}
    // Trả mảng rỗng – không dùng dữ liệu giả
    return [];
  }

  public static async getHeatmapData(): Promise<{ checkin_date: string; time_spent_minutes: number; xp_earned: number }[]> {
    const token = this.getToken();
    try {
      const res = await fetch("/api/heatmap", {
        credentials: "same-origin",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.checkins || [];
    } catch {
      return [];
    }
  }

  public static async getCardStates(): Promise<Record<string, { interval: number; easeFactor: number; reps: number; lapses: number; state: "new" | "learning" | "review"; dueDate: string; dueAt?: string; stability: number; difficulty: number; lastReview: string | null }>> {
    const token = this.getToken();
    const res = await fetch("/api/card-states", { credentials: "same-origin", headers: token ? { Authorization: `Bearer ${token}` } : undefined });
    if (!res.ok) throw new Error("Không tải được tiến độ ôn tập.");
    const data = await res.json();
    return Object.fromEntries((data.cardStates || []).map((item: any) => [
      `${item.deck_id}_${item.card_id}`,
      { interval: item.interval, easeFactor: item.ease_factor, reps: item.reps, lapses: item.lapses, state: item.state, dueDate: item.due_date, dueAt: item.due_at || undefined, stability: item.stability || 0, difficulty: item.difficulty || 5, lastReview: item.last_review || null },
    ]));
  }

  public static async saveCardState(deckId: string, cardId: number, state: { interval: number; easeFactor: number; reps: number; lapses: number; state: string; dueDate: string; dueAt?: string; stability: number; difficulty: number; lastReview: string | null }): Promise<void> {
    const token = this.getToken();
    const res = await fetch("/api/card-states", {
      method: "POST", credentials: "same-origin",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ deckId, cardId, interval: state.interval, easeFactor: state.easeFactor, reps: state.reps, lapses: state.lapses, state: state.state, dueDate: state.dueDate, dueAt: state.dueAt, stability: state.stability, difficulty: state.difficulty, lastReview: state.lastReview }),
    });
    if (!res.ok) throw new Error("Không lưu được tiến độ ôn tập.");
  }

  public static async getClasses(): Promise<any[]> {
    const token = this.getToken();
    const res = await fetch("/api/classes", { credentials: "same-origin", headers: token ? { Authorization: `Bearer ${token}` } : undefined });
    if (!res.ok) throw new Error("Không tải được lớp học.");
    const data = await res.json();
    return data.classes || [];
  }

  public static async classAction(payload: Record<string, unknown>): Promise<any[]> {
    const token = this.getToken();
    const res = await fetch("/api/classes", {
      method: "POST", credentials: "same-origin",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Không thể cập nhật lớp học.");
    return data.classes || [];
  }

  public static async getClassAssignment(classId: string, assignmentId: string): Promise<{
    id: string; classId: string; title: string; deckName: string; dueDate: string; totalCards: number;
    reviewedCards: number; correctCards: number; lastStudiedAt: string | null; completed: boolean;
    deckCards: { id: number; korean: string; meaning: string; example?: string; pronunciation?: string; mediaHtml?: string }[];
  }> {
    const token = this.getToken();
    const res = await fetch("/api/classes", {
      method: "POST", credentials: "same-origin",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ action: "get_assignment", classId, assignmentId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.assignment) throw new Error(data.error || "Không tải được bộ thẻ của bài tập.");
    return data.assignment;
  }

  public static async recordClassAssignmentReview(classId: string, assignmentId: string, cardId: number, correct: boolean): Promise<{ reviewedCards: number; totalCards: number; correctCards: number; lastStudiedAt: string | null; completed: boolean }> {
    const token = this.getToken();
    const res = await fetch("/api/classes", {
      method: "POST", credentials: "same-origin",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ action: "review_card", classId, assignmentId, cardId, correct }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.progress) throw new Error(data.error || "Không lưu được tiến độ bài tập.");
    return data.progress;
  }

  public static async uploadClassAssignmentMedia(classId: string, assignmentId: string, assetId: string, blob: Blob, contentType: string): Promise<void> {
    const token = this.getToken();
    const params = new URLSearchParams({ classId, assignmentId, assetId });
    const res = await fetch(`/api/classes?${params.toString()}`, {
      method: "PUT", credentials: "same-origin",
      headers: { "Content-Type": contentType, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: blob,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Không tải được media lên Cloudflare.");
  }

  public static async recordStudySession(moduleName: string, cardsReviewed: number, correctCount: number, xpEarned: number, durationSeconds: number) {
    const token = this.getToken();
    try {
      const res = await fetch("/api/study-session", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          module: moduleName,
          cardsReviewed,
          correctCount,
          xpEarned,
          durationSeconds,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.user) {
        const updated = { ...this.getCurrentUser(), ...data.user } as UserProfile;
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent("haechivn:user-updated", { detail: updated }));
        if (data.dailyMission) window.dispatchEvent(new CustomEvent("haechivn:daily-mission-updated", { detail: data.dailyMission }));
      }
    } catch {
      // Studying remains available offline; the server stays authoritative for XP.
    }
  }

  public static async getStudyProfileSummary(): Promise<StudyProfileSummary | null> {
    try {
      const res = await fetch("/api/study-session", { credentials: "same-origin", cache: "no-store" });
      if (!res.ok) return null;
      return await res.json() as StudyProfileSummary;
    } catch {
      return null;
    }
  }

  public static async getDailyMissions(): Promise<DailyMissionsSummary | null> {
    try {
      const token = this.getToken();
      const res = await fetch("/api/daily-missions", {
        credentials: "same-origin",
        cache: "no-store",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) return null;
      return await res.json() as DailyMissionsSummary;
    } catch {
      return null;
    }
  }

  public static async getPublicSharedDecks(): Promise<SharedDeckRecord[]> {
    try {
      const response = await fetch("/api/shared-decks", { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) return [];
      const payload = await response.json() as { decks?: SharedDeckRecord[] };
      return payload.decks || [];
    } catch {
      return [];
    }
  }

  public static async getSharedDeck(sharedId: string): Promise<SharedDeckRecord | null> {
    try {
      const response = await fetch(`/api/shared-decks?id=${encodeURIComponent(sharedId)}`, { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) return null;
      const payload = await response.json() as { deck?: SharedDeckRecord };
      return payload.deck || null;
    } catch {
      return null;
    }
  }

  public static async getMySharedDecks(): Promise<SharedDeckRecord[]> {
    try {
      const response = await fetch("/api/shared-decks?mine=1", { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) return [];
      const payload = await response.json() as { decks?: SharedDeckRecord[] };
      return payload.decks || [];
    } catch {
      return [];
    }
  }

  public static async saveSharedDeck(deck: AnkiDeck): Promise<string> {
    const response = await fetch("/api/shared-decks", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sharedId: deck.sharedId,
        deckId: deck.id,
        title: deck.name,
        description: deck.description || "",
        visibility: deck.visibility || "private",
        cards: deck.cards,
      }),
    });
    const payload = await response.json() as { sharedId?: string; error?: string };
    if (!response.ok || !payload.sharedId) throw new Error(payload.error || "Không lưu được bộ thẻ chia sẻ.");
    return payload.sharedId;
  }

  public static saveDecks(decks: AnkiDeck[], userId?: string): Promise<void> {
    if (typeof window === "undefined") return Promise.resolve();
    // IndexedDB is not subject to localStorage's ~5 MB quota; deck cards stay local and are structured-cloned.
    const storedDecks = decks.map(({ mediaAssets: _mediaAssets, ...deck }) => deck);
    deckSaveQueue = deckSaveQueue.catch(() => undefined).then(async () => {
      const db = await openDeckDatabase();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(DECK_STORE_NAME, "readwrite");
        tx.objectStore(DECK_STORE_NAME).put(storedDecks, userId ? `decks:${userId}` : "decks");
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error || new Error("Could not save decks"));
        tx.onabort = () => reject(tx.error || new Error("Deck save was aborted"));
      });
      // Keep the legacy unscoped data intact when writing one account's copy.
      if (!userId) {
        try { localStorage.removeItem(LOCAL_STORAGE_DECKS_KEY); } catch { /* Storage may be disabled. */ }
      }
    });
    return deckSaveQueue;
  }

  public static async getSavedDecks(userId?: string): Promise<AnkiDeck[]> {
    if (typeof window === "undefined") return [];
    try {
      const db = await openDeckDatabase();
      const decks = await new Promise<AnkiDeck[] | undefined>((resolve, reject) => {
        const store = db.transaction(DECK_STORE_NAME, "readonly").objectStore(DECK_STORE_NAME);
        const request = store.get(userId ? `decks:${userId}` : "decks");
        request.onsuccess = () => {
          const saved = request.result as AnkiDeck[] | undefined;
          if (saved || !userId) {
            resolve(saved);
            return;
          }
          // First signed-in load adopts the legacy shared browser deck list into
          // this account's partition; the legacy copy remains for other accounts.
          const legacyRequest = store.get("decks");
          legacyRequest.onsuccess = () => resolve(legacyRequest.result as AnkiDeck[] | undefined);
          legacyRequest.onerror = () => reject(legacyRequest.error);
        };
        request.onerror = () => reject(request.error);
      });
      if (decks) {
        if (userId) void this.saveDecks(decks, userId);
        return decks;
      }
    } catch { /* Migrate legacy localStorage data when IndexedDB is unavailable or empty. */ }
    try {
      const legacy = localStorage.getItem(LOCAL_STORAGE_DECKS_KEY);
      if (!legacy) return [];
      const decks = JSON.parse(legacy) as AnkiDeck[];
      // Migrate legacy browser storage into the signed-in account's own deck store.
      void this.saveDecks(decks, userId);
      return decks;
    } catch {
      return [];
    }
  }
}
