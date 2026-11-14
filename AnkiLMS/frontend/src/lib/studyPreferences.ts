import { useSyncExternalStore } from "react";

// Tùy chọn hiển thị khi học thẻ (lưu trên thiết bị này).
const HIDE_CHATGPT_KEY = "haechivn_hide_chatgpt";
const PREF_EVENT = "haechivn-study-prefs";

const readHideChatGpt = (): boolean => {
  try {
    return localStorage.getItem(HIDE_CHATGPT_KEY) === "1";
  } catch {
    return false;
  }
};

const subscribePrefs = (callback: () => void) => {
  window.addEventListener(PREF_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(PREF_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
};

export function useHideChatGpt(): boolean {
  return useSyncExternalStore(subscribePrefs, readHideChatGpt, () => false);
}

export function setHideChatGpt(hidden: boolean): void {
  try {
    localStorage.setItem(HIDE_CHATGPT_KEY, hidden ? "1" : "0");
    window.dispatchEvent(new Event(PREF_EVENT));
  } catch {
    // Bỏ qua khi trình duyệt chặn lưu trữ.
  }
}
