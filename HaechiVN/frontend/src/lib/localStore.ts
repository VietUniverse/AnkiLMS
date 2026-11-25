// State đọc/ghi localStorage qua useSyncExternalStore: render phía server và lúc hydrate dùng giá trị mặc định,
// sau đó đọc giá trị thật mà không cần setState trong effect.
import { useCallback, useMemo, useSyncExternalStore } from "react";

const EVENT = "haechivn:local-store";
// Bản ghi mới nhất trong tab này: vẫn chạy khi localStorage bị chặn hoặc đầy.
const memory = new Map<string, string | null>();

export function readLocal(key: string): string | null {
  if (memory.has(key)) return memory.get(key) ?? null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeLocal(key: string, raw: string) {
  memory.set(key, raw);
  try { localStorage.setItem(key, raw); } catch { /* bộ nhớ bị chặn/đầy: giữ bản trong memory */ }
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void) {
  // Tab khác ghi: bỏ bản memory để đọc lại từ localStorage.
  const onStorage = (e: StorageEvent) => { if (e.key) memory.delete(e.key); else memory.clear(); onChange(); };
  window.addEventListener("storage", onStorage);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(EVENT, onChange);
  };
}

/** Chuỗi thô của key, server/hydrate trả null. */
export function useLocalRaw(key: string): string | null {
  return useSyncExternalStore(subscribe, () => readLocal(key), () => null);
}

/**
 * `parse`/`serialize` phải ổn định (khai báo ngoài component), vì giá trị chỉ được parse lại khi chuỗi thô đổi.
 * Setter nhận giá trị hoặc hàm (prev) => next như useState.
 */
export function useLocalState<T>(
  key: string,
  parse: (raw: string | null) => T,
  serialize: (value: T) => string = JSON.stringify,
): [T, (next: T | ((prev: T) => T)) => void] {
  const raw = useLocalRaw(key);
  const value = useMemo(() => parse(raw), [raw, parse]);
  const setValue = useCallback((next: T | ((prev: T) => T)) => {
    const resolved = typeof next === "function" ? (next as (prev: T) => T)(parse(readLocal(key))) : next;
    writeLocal(key, serialize(resolved));
  }, [key, parse, serialize]);
  return [value, setValue];
}

export const parseJson = <T,>(fallback: T) => (raw: string | null): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};
