import { AnkiDeck } from "./ankiParser";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
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
    learnersToday: number;
  }>;
}

const LOCAL_STORAGE_TOKEN_KEY = "haechivn_auth_token";
const LOCAL_STORAGE_USER_KEY = "haechivn_user_profile";
const LOCAL_STORAGE_DECKS_KEY = "haechivn_decks";

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
    try {
      const res = await fetch("/api/auth/me", {
        credentials: "same-origin",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (res.status === 401) {
        localStorage.removeItem(LOCAL_STORAGE_TOKEN_KEY);
        localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
        return null;
      }
      if (!res.ok) {
        return this.getCurrentUser();
      }
      const data = await res.json();
      if (data.user) {
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(data.user));
        return data.user;
      }
    } catch (e) {
      console.warn("Offline or API error, fallback to local user");
    }
    return this.getCurrentUser();
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
        gems: 888,
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
          gems: 50,
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
        gems: 50,
        level: 1,
        role: "student",
      };
      this.setSession(localUser);
      if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("haechivn:user-updated", { detail: localUser }));
      return localUser;
    }
  }

  public static async register(email: string, name: string, password: string): Promise<UserProfile> {
    const referralCode = typeof window !== "undefined" ? localStorage.getItem("haechivn_referral_code") || new URLSearchParams(window.location.search).get("ref") || undefined : undefined;
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, password, referralCode }),
      });
      if (res.status === 404) {
        const localUser: UserProfile = {
          id: "local_" + Date.now(),
          email,
          name: name || email.split("@")[0],
          streak: 1,
          longest_streak: 1,
          xp: 100,
          gems: 50,
          level: 1,
          role: "student",
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
        gems: 50,
        level: 1,
        role: "student",
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
      gems: 50,
      level: 1,
      role: "student",
    };
    this.setSession(guestUser);
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("haechivn:user-updated", { detail: guestUser }));
    return guestUser;
  }

  public static loginWithGoogle() {
    window.location.href = "/api/auth/google";
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

  public static async getCardStates(): Promise<Record<string, { interval: number; easeFactor: number; reps: number; lapses: number; state: "new" | "learning" | "review"; dueDate: string; stability: number; difficulty: number; lastReview: string | null }>> {
    const token = this.getToken();
    const res = await fetch("/api/card-states", { credentials: "same-origin", headers: token ? { Authorization: `Bearer ${token}` } : undefined });
    if (!res.ok) throw new Error("Không tải được tiến độ ôn tập.");
    const data = await res.json();
    return Object.fromEntries((data.cardStates || []).map((item: any) => [
      `${item.deck_id}_${item.card_id}`,
      { interval: item.interval, easeFactor: item.ease_factor, reps: item.reps, lapses: item.lapses, state: item.state, dueDate: item.due_date, stability: item.stability || 0, difficulty: item.difficulty || 5, lastReview: item.last_review || null },
    ]));
  }

  public static async saveCardState(deckId: string, cardId: number, state: { interval: number; easeFactor: number; reps: number; lapses: number; state: string; dueDate: string; stability: number; difficulty: number; lastReview: string | null }): Promise<void> {
    const token = this.getToken();
    const res = await fetch("/api/card-states", {
      method: "POST", credentials: "same-origin",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ deckId, cardId, interval: state.interval, easeFactor: state.easeFactor, reps: state.reps, lapses: state.lapses, state: state.state, dueDate: state.dueDate, stability: state.stability, difficulty: state.difficulty, lastReview: state.lastReview }),
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

  public static saveDecks(decks: AnkiDeck[]): void {
    if (typeof window === "undefined") return;
    // Binary media is transient and uploaded when a teacher assigns an Anki deck.
    localStorage.setItem(LOCAL_STORAGE_DECKS_KEY, JSON.stringify(decks.map(({ mediaAssets: _mediaAssets, ...deck }) => deck)));
  }

  public static getSavedDecks(): AnkiDeck[] {
    if (typeof window === "undefined") return [];
    const data = localStorage.getItem(LOCAL_STORAGE_DECKS_KEY);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch (e) {
      return [];
    }
  }
}
