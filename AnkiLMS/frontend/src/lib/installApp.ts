"use client";

import { useSyncExternalStore } from "react";

// Cài HaechiVN như một ứng dụng (PWA).
// - Chrome, Edge, Samsung Internet, Opera (Android và máy tính): có sự kiện beforeinstallprompt, bấm là hiện hộp xác nhận của trình duyệt.
// - Safari (iPhone, iPad, Mac), Firefox: không có sự kiện đó, nên hiện hướng dẫn từng bước theo trình duyệt.

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

export type InstallPlatform = "ios" | "ipados" | "mac-safari" | "android-firefox" | "desktop-firefox" | "samsung" | "other";

type State = { installed: boolean; canPrompt: boolean };

let deferred: PromptEvent | null = null;
let state: State = { installed: false, canPrompt: false };
const listeners = new Set<() => void>();

const emit = (next: Partial<State>) => {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
};

const INSTALLED_KEY = "haechivn_app_installed";
const readInstalledFlag = () => {
  try { return localStorage.getItem(INSTALLED_KEY) === "1"; } catch { return false; }
};
const markInstalled = () => {
  try { localStorage.setItem(INSTALLED_KEY, "1"); } catch { /* bỏ qua */ }
};

const isStandalone = () =>
  window.matchMedia?.("(display-mode: standalone)").matches ||
  window.matchMedia?.("(display-mode: window-controls-overlay)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

let started = false;
function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  // Đã cài nếu đang chạy như ứng dụng, hoặc đã từng cài trên trình duyệt này (nhớ lại để mở bằng tab thường vẫn ẩn nút).
  if (isStandalone()) markInstalled();
  state = { ...state, installed: isStandalone() || readInstalledFlag() };
  // Chrome (Android, và máy tính bản mới) cho biết ứng dụng web đã cài hay chưa.
  const nav = navigator as Navigator & { getInstalledRelatedApps?: () => Promise<unknown[]> };
  void nav.getInstalledRelatedApps?.().then((apps) => {
    if (apps.length > 0) { markInstalled(); emit({ installed: true, canPrompt: false }); }
  }).catch(() => { /* không hỗ trợ: bỏ qua */ });
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault(); // tự hiện nút của mình thay vì thanh nhỏ mặc định
    deferred = event as PromptEvent;
    emit({ canPrompt: true });
  });
  window.addEventListener("appinstalled", () => {
    markInstalled();
    deferred = null;
    emit({ installed: true, canPrompt: false });
  });
  window.matchMedia?.("(display-mode: standalone)").addEventListener?.("change", () => { if (isStandalone()) markInstalled(); emit({ installed: isStandalone() || readInstalledFlag() }); });
  if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
    void navigator.serviceWorker.register("/sw.js").catch(() => { /* không đăng ký được thì chỉ mất khả năng cài trên vài trình duyệt cũ */ });
  }
}

// Bắt sự kiện ngay khi module được nạp, trước khi bất kỳ nút nào kịp hiện.
if (typeof window !== "undefined") start();

const subscribe = (callback: () => void) => {
  start();
  listeners.add(callback);
  return () => { listeners.delete(callback); };
};

export function detectPlatform(): InstallPlatform {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  const touchMac = /Macintosh/.test(ua) && (navigator.maxTouchPoints || 0) > 1;
  if (/iPhone|iPod/.test(ua)) return "ios";
  if (/iPad/.test(ua) || touchMac) return "ipados";
  if (/SamsungBrowser/i.test(ua)) return "samsung";
  if (/Firefox|FxiOS/.test(ua)) return /Android/.test(ua) ? "android-firefox" : "desktop-firefox";
  if (/Macintosh/.test(ua) && /Safari/.test(ua) && !/Chrome|Chromium|Edg|OPR/.test(ua)) return "mac-safari";
  return "other";
}

const SERVER_STATE: State = { installed: false, canPrompt: false };

export function useInstallApp() {
  const current = useSyncExternalStore(subscribe, () => state, () => SERVER_STATE);
  return {
    ...current,
    /** Hiện hộp cài của trình duyệt. Trả về true nếu người dùng đồng ý. */
    install: async (): Promise<boolean> => {
      if (!deferred) return false;
      const event = deferred;
      deferred = null;
      emit({ canPrompt: false });
      await event.prompt();
      const choice = await event.userChoice;
      return choice.outcome === "accepted";
    },
  };
}

const noopSubscribe = () => () => {};
/** Nền tảng hiện tại (chỉ đúng sau khi trang chạy trên trình duyệt). */
export function useInstallPlatform(): InstallPlatform {
  return useSyncExternalStore(noopSubscribe, detectPlatform, () => "other" as InstallPlatform);
}
