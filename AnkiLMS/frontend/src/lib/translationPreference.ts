"use client";

import { useCallback, useEffect, useState } from "react";

import { ApiClient } from "./apiClient";

export type TranslationLanguage = "vi" | "en" | "ja";
const STORAGE_KEY = "haechivn-translation-language";
const CHANGE_EVENT = "haechivn:translation-language-change";

export function useTranslationLanguage() {
  const [language, setLanguageState] = useState<TranslationLanguage>("vi");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const userLanguage = ApiClient.getCurrentUser()?.translation_language;
    const initial = userLanguage === "en" || userLanguage === "ja" || userLanguage === "vi" ? userLanguage : saved;
    if (initial === "en" || initial === "vi" || initial === "ja") setLanguageState(initial);
    const sync = (event: Event) => {
      const next = event instanceof CustomEvent ? event.detail : window.localStorage.getItem(STORAGE_KEY);
      if (next === "en" || next === "vi" || next === "ja") setLanguageState(next);
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
    const user = ApiClient.getCurrentUser();
    if (user) {
      const updated = { ...user, translation_language: next };
      localStorage.setItem("haechivn_user_profile", JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("haechivn:user-updated", { detail: updated }));
      void fetch("/api/preferences", { method: "PATCH", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ translationLanguage: next }) });
    }
  }, []);

  return [language, setLanguage] as const;
}
