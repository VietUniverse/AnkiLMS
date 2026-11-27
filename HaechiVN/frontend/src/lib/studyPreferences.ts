import { useSyncExternalStore } from "react";

// Tùy chọn hiển thị khi học thẻ (lưu trên thiết bị này).
const HIDE_CHATGPT_KEY = "haechivn_hide_chatgpt";
const HIDE_DICTIONARY_KEY = "haechivn_hide_dictionary";
const MUTE_WORD_KEY = "haechivn_mute_word_audio";
const MUTE_EXAMPLE_KEY = "haechivn_mute_example_audio";
// Tắt và ẩn toàn bộ nút loa/phát âm trên thẻ học.
const MUTE_HIDE_KEY = "haechivn_mute_hide_audio";
// Chỉ chặn tự phát khi ra thẻ/lật thẻ; bấm nút loa vẫn phát.
const DISABLE_AUTO_PRONOUNCE_KEY = "haechivn_disable_auto_pronounce";
// Tự đổi nền ngẫu nhiên sau mỗi 10 lượt trả lời.
const RANDOM_BG_KEY = "haechivn_random_bg_every_10";
const LEGACY_MUTE_KEY = "haechivn_mute_sound";
// Chế độ Tinder: chạm thẻ để lật, kéo/chạm trái = Quên, phải = Thuộc.
const TINDER_MODE_KEY = "haechivn_tinder_mode";
// Tô nền thẻ học theo từ loại (danh/động/tính/phó từ). Mặc định bật.
const POS_CARD_COLOR_KEY = "haechivn_pos_card_color";
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

const readHideDictionary = (): boolean => {
  try {
    return localStorage.getItem(HIDE_DICTIONARY_KEY) === "1";
  } catch {
    return false;
  }
};

export function useHideDictionary(): boolean {
  return useSyncExternalStore(subscribePrefs, readHideDictionary, () => false);
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

const readTinderMode = (): boolean => {
  try {
    return localStorage.getItem(TINDER_MODE_KEY) === "1";
  } catch {
    return false;
  }
};

export function useTinderMode(): boolean {
  return useSyncExternalStore(subscribePrefs, readTinderMode, () => false);
}

export function setTinderMode(enabled: boolean): void {
  writeMuted(TINDER_MODE_KEY, enabled);
}

/** Mặc định bật: chỉ tắt khi người học chủ động chọn "0". */
export function usePosCardColor(): boolean {
  return useSyncExternalStore(
    subscribePrefs,
    () => {
      try {
        return localStorage.getItem(POS_CARD_COLOR_KEY) !== "0";
      } catch {
        return true;
      }
    },
    () => true
  );
}

export function setPosCardColor(enabled: boolean): void {
  writeMuted(POS_CARD_COLOR_KEY, enabled);
}

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

export function useRandomStudyBgEvery10(): boolean {
  return useSyncExternalStore(
    subscribePrefs,
    () => {
      try {
        return localStorage.getItem(RANDOM_BG_KEY) === "1";
      } catch {
        return false;
      }
    },
    () => false,
  );
}

export function setRandomStudyBgEvery10(enabled: boolean): void {
  writeMuted(RANDOM_BG_KEY, enabled);
}

export function setHideChatGpt(hidden: boolean): void {
  try {
    localStorage.setItem(HIDE_CHATGPT_KEY, hidden ? "1" : "0");
    window.dispatchEvent(new Event(PREF_EVENT));
  } catch {
    // Bỏ qua khi trình duyệt chặn lưu trữ.
  }
}

export function setHideDictionary(hidden: boolean): void {
  try {
    localStorage.setItem(HIDE_DICTIONARY_KEY, hidden ? "1" : "0");
    window.dispatchEvent(new Event(PREF_EVENT));
  } catch {
    // Bỏ qua khi trình duyệt chặn lưu trữ.
  }
}

// Độ đục nền khối thẻ học (30-100%); chữ không mờ theo.
const CARD_OPACITY_KEY = "haechivn_study_card_opacity";

const readCardOpacity = (): number => {
  try {
    const n = Number(localStorage.getItem(CARD_OPACITY_KEY));
    return n >= 30 && n <= 100 ? n : 100;
  } catch {
    return 100;
  }
};

export function useStudyCardOpacity(): number {
  return useSyncExternalStore(subscribePrefs, readCardOpacity, () => 100);
}

export function setStudyCardOpacity(value: number): void {
  try {
    localStorage.setItem(CARD_OPACITY_KEY, String(value));
    window.dispatchEvent(new Event(PREF_EVENT));
  } catch {
    // Bỏ qua khi trình duyệt chặn lưu trữ.
  }
}

// Âm thanh tách riêng cho từ vựng và câu ví dụ: "on" phát, "mute" tắt tiếng nhưng còn nút loa, "hide" tắt và ẩn nút loa.
// Công tắc chung cũ "Tắt & Ẩn âm thanh" (MUTE_HIDE_KEY) vẫn được đọc làm giá trị mặc định cho cả hai.
export type AudioMode = "on" | "mute" | "hide";
const HIDE_WORD_KEY = "haechivn_hide_word_audio";
const HIDE_EXAMPLE_KEY = "haechivn_hide_example_audio";

const readHidden = (key: string): boolean => {
  try {
    const value = localStorage.getItem(key);
    if (value !== null) return value === "1";
    return localStorage.getItem(MUTE_HIDE_KEY) === "1";
  } catch {
    return false;
  }
};

export function useHideWordAudio(): boolean {
  return useSyncExternalStore(subscribePrefs, () => readHidden(HIDE_WORD_KEY), () => false);
}

export function useHideExampleAudio(): boolean {
  return useSyncExternalStore(subscribePrefs, () => readHidden(HIDE_EXAMPLE_KEY), () => false);
}

export function setAudioMode(kind: "word" | "example", mode: AudioMode): void {
  writeMuted(kind === "word" ? HIDE_WORD_KEY : HIDE_EXAMPLE_KEY, mode === "hide");
  writeMuted(kind === "word" ? MUTE_WORD_KEY : MUTE_EXAMPLE_KEY, mode !== "on");
}

// Thẻ gõ: bật thì phải gõ đúng từ mới bấm/vuốt được "Thuộc" (mặc định bật).
const REQUIRE_EXACT_TYPING_KEY = "haechivn_require_exact_typing";

export function useRequireExactTyping(): boolean {
  return useSyncExternalStore(
    subscribePrefs,
    () => {
      try {
        return localStorage.getItem(REQUIRE_EXACT_TYPING_KEY) !== "0";
      } catch {
        return true;
      }
    },
    () => true,
  );
}

export function setRequireExactTyping(required: boolean): void {
  writeMuted(REQUIRE_EXACT_TYPING_KEY, required);
}
