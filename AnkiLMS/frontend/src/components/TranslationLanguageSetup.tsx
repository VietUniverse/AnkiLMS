"use client";

import type { ReactNode } from "react";
import { Settings2, Check } from "lucide-react";
import { TranslationLanguage } from "../lib/translationPreference";

export function TranslationLanguageSetup({ language, onChange, up, children }: { language: TranslationLanguage; onChange: (language: TranslationLanguage) => void; up?: boolean; children?: ReactNode }) {
  return <details className="relative z-20 inline-block text-left">
    <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/50 px-3 py-2 text-xs font-bold text-slate-200 transition hover:border-sky-500 [&::-webkit-details-marker]:hidden"><Settings2 className="h-4 w-4 text-sky-300" /><span>Cài đặt</span><span className="rounded-md bg-slate-800 px-1.5 py-0.5 text-[10px] text-sky-200">{language.toUpperCase()}</span></summary>
    <div className={`absolute ${up ? "left-0 bottom-full mb-2" : "right-0 top-full mt-2"} w-64 rounded-2xl border border-slate-700 bg-[#111a31] p-4 shadow-2xl shadow-black/40`}>
      {children}
      <p className="text-sm font-black text-white">Ngôn ngữ dịch</p>
      <div className="mt-3 space-y-2">
        {([{ code: "vi", label: "Tiếng Việt" }, { code: "en", label: "English" }, { code: "ja", label: "日本語" }] as const).map((option) => <button key={option.code} type="button" onClick={() => onChange(option.code)} aria-pressed={language === option.code} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${language === option.code ? "border-sky-500/60 bg-sky-500/10" : "border-slate-800 bg-slate-950/30 hover:border-slate-600"}`}><span className={`flex h-5 w-5 items-center justify-center rounded-full border ${language === option.code ? "border-sky-400 bg-sky-500 text-white" : "border-slate-600 text-transparent"}`}>{language === option.code && <Check className="h-3.5 w-3.5" />}</span><span className="text-xs font-bold text-white">{option.label}</span></button>)}
      </div>
    </div>
  </details>;
}
