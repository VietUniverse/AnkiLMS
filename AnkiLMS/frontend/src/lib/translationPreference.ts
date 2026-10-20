"use client";

import { useCallback, useEffect, useState } from "react";

export type TranslationLanguage = "vi" | "en";
const STORAGE_KEY = "haechivn-translation-language";
const CHANGE_EVENT = "haechivn:translation-language-change";

export function useTranslationLanguage() {
  const [language, setLanguageState] = useState<TranslationLanguage>("vi");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "vi") setLanguageState(saved);
    const sync = (event: Event) => {
      const next = event instanceof CustomEvent ? event.detail : window.localStorage.getItem(STORAGE_KEY);
      if (next === "en" || next === "vi") setLanguageState(next);
    };
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const setLanguage = useCallback((next: TranslationLanguage) => {
    window.localStorage.setItem(STORAGE_KEY, next);
    setLanguageState(next);
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: next }));
  }, []);

  return [language, setLanguage] as const;
}
