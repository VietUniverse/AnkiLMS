import { useSyncExternalStore } from "react";

// Tùy chọn hiển thị khi học thẻ (lưu trên thiết bị này).
const HIDE_CHATGPT_KEY = "haechivn_hide_chatgpt";
const MUTE_SOUND_KEY = "haechivn_mute_sound";
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

const readMuteSound = (): boolean => {
  try {
    return localStorage.getItem(MUTE_SOUND_KEY) === "1";
  } catch {
    return false;
  }
};

export function useMuteSound(): boolean {
  return useSyncExternalStore(subscribePrefs, readMuteSound, () => false);
}

export function setMuteSound(muted: boolean): void {
  try {
    localStorage.setItem(MUTE_SOUND_KEY, muted ? "1" : "0");
    window.dispatchEvent(new Event(PREF_EVENT));
  } catch {
    // Bỏ qua khi trình duyệt chặn lưu trữ.
  }
}

export function setHideChatGpt(hidden: boolean): void {
  try {
    localStorage.setItem(HIDE_CHATGPT_KEY, hidden ? "1" : "0");
    window.dispatchEvent(new Event(PREF_EVENT));
  } catch {
    // Bỏ qua khi trình duyệt chặn lưu trữ.
  }
}
