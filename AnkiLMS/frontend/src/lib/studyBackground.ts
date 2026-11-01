import { useSyncExternalStore } from "react";

// Nền tùy chỉnh khi học thẻ (lưu trên thiết bị này).
export type StudyBackground = {
  kind: "none" | "gradient" | "image";
  from: string;
  to: string;
  angle: number;
  image: string;
  opacity: number; // 10 đến 100
};

export const DEFAULT_STUDY_BG: StudyBackground = { kind: "none", from: "#38bdf8", to: "#6366f1", angle: 135, image: "", opacity: 60 };

export const GRADIENT_PRESETS: { name: string; from: string; to: string }[] = [
  { name: "Biển", from: "#38bdf8", to: "#6366f1" },
  { name: "Hoàng hôn", from: "#fb923c", to: "#ec4899" },
  { name: "Rừng", from: "#34d399", to: "#0ea5e9" },
  { name: "Oải hương", from: "#a78bfa", to: "#f472b6" },
  { name: "Nắng", from: "#fde68a", to: "#fca5a5" },
  { name: "Đêm", from: "#1e293b", to: "#0f172a" },
];

const KEY = "haechivn_study_bg";
const EVENT = "haechivn-study-bg";

const read = (): string => {
  try { return localStorage.getItem(KEY) || ""; } catch { return ""; }
};

const parse = (raw: string): StudyBackground => {
  if (!raw) return DEFAULT_STUDY_BG;
  try {
    const value = JSON.parse(raw) as Partial<StudyBackground>;
    return {
      kind: value.kind === "gradient" || value.kind === "image" ? value.kind : "none",
      from: typeof value.from === "string" ? value.from : DEFAULT_STUDY_BG.from,
      to: typeof value.to === "string" ? value.to : DEFAULT_STUDY_BG.to,
      angle: Number.isFinite(value.angle) ? Number(value.angle) : DEFAULT_STUDY_BG.angle,
      image: typeof value.image === "string" ? value.image : "",
      opacity: Math.min(100, Math.max(10, Number.isFinite(value.opacity) ? Number(value.opacity) : DEFAULT_STUDY_BG.opacity)),
    };
  } catch {
    return DEFAULT_STUDY_BG;
  }
};

const subscribe = (callback: () => void) => {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => { window.removeEventListener(EVENT, callback); window.removeEventListener("storage", callback); };
};

/** Trả về chuỗi JSON thô để useSyncExternalStore so sánh ổn định, rồi parse. */
export function useStudyBackground(): StudyBackground {
  const raw = useSyncExternalStore(subscribe, read, () => "");
  return parse(raw);
}

/** Lưu nền mới. Trả về false nếu bộ nhớ trình duyệt đầy (thường do ảnh quá lớn). */
export function saveStudyBackground(next: StudyBackground): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(EVENT));
    return true;
  } catch {
    return false;
  }
}

export function backgroundLayerStyle(bg: StudyBackground): React.CSSProperties | null {
  if (bg.kind === "gradient") return { backgroundImage: `linear-gradient(${bg.angle}deg, ${bg.from}, ${bg.to})`, opacity: bg.opacity / 100 };
  if (bg.kind === "image" && bg.image) return { backgroundImage: `url(${bg.image})`, backgroundSize: "cover", backgroundPosition: "center", opacity: bg.opacity / 100 };
  return null;
}

/** Thu nhỏ ảnh về tối đa 1600px để vừa bộ nhớ trình duyệt. */
export function fileToDataUrl(file: File, maxSide = 1600): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) { URL.revokeObjectURL(url); reject(new Error("canvas")); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("image")); };
    img.src = url;
  });
}
