import { useSyncExternalStore } from "react";

// Tùy chọn hiển thị khi học thẻ (lưu trên thiết bị này).
const HIDE_CHATGPT_KEY = "haechivn_hide_chatgpt";
const MUTE_WORD_KEY = "haechivn_mute_word_audio";
const MUTE_EXAMPLE_KEY = "haechivn_mute_example_audio";
// Tắt và ẩn toàn bộ nút loa/phát âm trên thẻ học.
const MUTE_HIDE_KEY = "haechivn_mute_hide_audio";
// Chỉ chặn tự phát khi ra thẻ/lật thẻ; bấm nút loa vẫn phát.
const DISABLE_AUTO_PRONOUNCE_KEY = "haechivn_disable_auto_pronounce";
const LEGACY_MUTE_KEY = "haechivn_mute_sound";
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

const readMuted = (key: string): boolean => {
  try {
    const value = localStorage.getItem(key);
    if (value !== null) return value === "1";
    // Tương thích công tắc "Tắt âm thanh" chung trước đây.
    return localStorage.getItem(LEGACY_MUTE_KEY) === "1";
  } catch {
    return false;
  }
};

const writeMuted = (key: string, muted: boolean): void => {
  try {
    localStorage.setItem(key, muted ? "1" : "0");
    window.dispatchEvent(new Event(PREF_EVENT));
  } catch {
    // Bỏ qua khi trình duyệt chặn lưu trữ.
  }
};

export function useMuteWordAudio(): boolean {
  return useSyncExternalStore(subscribePrefs, () => readMuted(MUTE_WORD_KEY), () => false);
}

export function setMuteWordAudio(muted: boolean): void {
  writeMuted(MUTE_WORD_KEY, muted);
}

export function useMuteExampleAudio(): boolean {
  return useSyncExternalStore(subscribePrefs, () => readMuted(MUTE_EXAMPLE_KEY), () => false);
}

export function setMuteExampleAudio(muted: boolean): void {
  writeMuted(MUTE_EXAMPLE_KEY, muted);
}

export function useMuteAndHideAudio(): boolean {
  return useSyncExternalStore(subscribePrefs, () => readMuted(MUTE_HIDE_KEY), () => false);
}

export function setMuteAndHideAudio(muted: boolean): void {
  writeMuted(MUTE_HIDE_KEY, muted);
}

export function useDisableAutoPronounce(): boolean {
  return useSyncExternalStore(subscribePrefs, () => readMuted(DISABLE_AUTO_PRONOUNCE_KEY), () => false);
}

export function setDisableAutoPronounce(disabled: boolean): void {
  writeMuted(DISABLE_AUTO_PRONOUNCE_KEY, disabled);
}

export function setHideChatGpt(hidden: boolean): void {
  try {
    localStorage.setItem(HIDE_CHATGPT_KEY, hidden ? "1" : "0");
    window.dispatchEvent(new Event(PREF_EVENT));
  } catch {
    // Bỏ qua khi trình duyệt chặn lưu trữ.
  }
}
