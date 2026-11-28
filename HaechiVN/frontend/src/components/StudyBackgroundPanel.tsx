"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ImagePlus, Settings, Trash2, X } from "lucide-react";
import { EggThemeToggle } from "./EggThemeToggle";
import { backgroundLayerStyle, DEFAULT_STUDY_BG, fileToDataUrl, GRADIENT_PRESETS, saveStudyBackground, STUDY_BACKGROUND_GALLERY, useStudyBackground } from "../lib/studyBackground";
import { type AudioMode, setAudioMode, setDisableAutoPronounce, setHideChatGpt, setTinderMode, useTinderMode, usePosCardColor, setPosCardColor, setHideDictionary, setRandomStudyBgEvery10, setRequireExactTyping, setStudyCardOpacity, useStudyCardOpacity, useDisableAutoPronounce, useHideChatGpt, useHideDictionary, useHideExampleAudio, useHideWordAudio, useMuteExampleAudio, useMuteWordAudio, useRandomStudyBgEvery10, useRequireExactTyping } from "../lib/studyPreferences";

type SectionKey = "study" | "audio" | "look";
const SHEET_HEIGHT_KEY = "haechivn_settings_sheet_height";
const SHEET_MIN = 30;
const SHEET_MAX = 95;
const SECTIONS: { key: SectionKey; label: string }[] = [
  { key: "study", label: "Học" },
  { key: "audio", label: "Âm thanh" },
  { key: "look", label: "Giao diện" },
];

function ToggleRow({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (next: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-3">
      <span className="min-w-0">
        <span className="block text-sm font-bold">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-stone-500 dark:text-stone-400">{hint}</span>}
      </span>
      <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition cursor-pointer ${checked ? "bg-sky-500" : "bg-stone-300 dark:bg-stone-700"}`}>
        <span className={`absolute left-0 top-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-[22px]" : "translate-x-0.5"}`} />
      </button>
    </label>
  );
}

const AUDIO_MODES: { key: AudioMode; label: string }[] = [
  { key: "on", label: "Bật" },
  { key: "mute", label: "Tắt tiếng" },
  { key: "hide", label: "Ẩn nút loa" },
];

function AudioModeRow({ label, value, onChange }: { label: string; value: AudioMode; onChange: (mode: AudioMode) => void }) {
  return (
    <div role="radiogroup" aria-label={label}>
      <p className="mb-2 text-sm font-bold">{label}</p>
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-stone-100 p-1 dark:bg-stone-800">
        {AUDIO_MODES.map(({ key, label: text }) => (
          <button key={key} type="button" role="radio" aria-checked={value === key} onClick={() => onChange(key)}
            className={`min-h-9 rounded-lg text-xs font-bold transition cursor-pointer ${value === key ? "bg-white text-stone-900 shadow-sm dark:bg-stone-950 dark:text-white" : "text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"}`}>
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

function SliderRow({ id, label, value, min, onChange }: { id: string; label: string; value: number; min: number; onChange: (value: number) => void }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm font-bold">
        <label htmlFor={id}>{label}</label>
        <span className="tabular-nums text-stone-500 dark:text-stone-400">{value}%</span>
      </div>
      <input id={id} type="range" min={min} max={100} step={5} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full cursor-pointer accent-sky-500" />
    </div>
  );
}

export function StudyBackgroundPanel() {
  const bg = useStudyBackground();
  const hideChatGpt = useHideChatGpt();
  const hideDictionary = useHideDictionary();
  const tinderMode = useTinderMode();
  const posCardColor = usePosCardColor();
  const muteWordAudio = useMuteWordAudio();
  const cardOpacity = useStudyCardOpacity();
  const muteExampleAudio = useMuteExampleAudio();
  const hideWordAudio = useHideWordAudio();
  const hideExampleAudio = useHideExampleAudio();
  const requireExactTyping = useRequireExactTyping();
  const wordMode: AudioMode = hideWordAudio ? "hide" : muteWordAudio ? "mute" : "on";
  const exampleMode: AudioMode = hideExampleAudio ? "hide" : muteExampleAudio ? "mute" : "on";
  const [section, setSection] = useState<SectionKey>("study");
  // Mobile: kéo vạch trên đầu bảng để đổi chiều cao (% màn hình), nhớ theo thiết bị; kéo thấp quá thì đóng.
  const [sheetHeight, setSheetHeight] = useState<number | null>(() => {
    try {
      const n = Number(localStorage.getItem(SHEET_HEIGHT_KEY));
      return n >= SHEET_MIN && n <= SHEET_MAX ? n : null;
    } catch {
      return null;
    }
  });
  const sheetDragRef = useRef<{ startY: number; startHeight: number } | null>(null);
  const effectiveHeight = sheetHeight ?? 65;
  const onSheetPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    sheetDragRef.current = { startY: e.clientY, startHeight: effectiveHeight };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onSheetPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = sheetDragRef.current;
    if (!drag) return;
    const next = drag.startHeight - ((e.clientY - drag.startY) / window.innerHeight) * 100;
    setSheetHeight(Math.max(SHEET_MIN - 10, Math.min(SHEET_MAX, next)));
  };
  const onSheetPointerUp = () => {
    const drag = sheetDragRef.current;
    if (!drag) return;
    sheetDragRef.current = null;
    if (effectiveHeight < SHEET_MIN) {
      // Đóng bảng, lần mở sau giữ chiều cao trước khi kéo.
      setOpen(false);
      setSheetHeight(drag.startHeight);
      return;
    }
    try {
      localStorage.setItem(SHEET_HEIGHT_KEY, String(Math.round(effectiveHeight)));
    } catch {
      // Bỏ qua khi trình duyệt chặn lưu trữ.
    }
  };
  const disableAutoPronounce = useDisableAutoPronounce();
  const randomBgEvery10 = useRandomStudyBgEvery10();
  const [open, setOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const update = (patch: Partial<typeof bg>) => {
    if (!saveStudyBackground({ ...bg, ...patch })) setError("Không lưu được. Thử ảnh nhỏ hơn.");
    else setError("");
  };

  const pickImage = async (file: File | undefined) => {
    if (!file) return;
    try {
      update({ kind: "image", image: await fileToDataUrl(file) });
    } catch {
      setError("Không đọc được ảnh này.");
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label="Cài đặt học"
        aria-expanded={open}
        title="Cài đặt học"
        className={`flex h-9 w-9 items-center justify-center rounded-full transition cursor-pointer ${backgroundLayerStyle(bg) ? "bg-white/85 text-stone-700 backdrop-blur hover:bg-white dark:bg-stone-900/75 dark:text-slate-200" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}
      >
        <Settings className="h-5 w-5" />
      </button>

      {galleryOpen && createPortal(
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4" onClick={() => setGalleryOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Thư viện ảnh nền"
            className="w-full max-w-lg rounded-2xl border border-stone-200 bg-white p-4 shadow-2xl dark:border-stone-700 dark:bg-stone-900"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-black text-stone-900 dark:text-stone-100">Thư viện ảnh nền</h2>
                <p className="mt-0.5 text-[11px] text-stone-500 dark:text-stone-400">
                  {STUDY_BACKGROUND_GALLERY.length} ảnh có sẵn · bấm để chọn
                </p>
              </div>
              <button
                type="button"
                onClick={() => setGalleryOpen(false)}
                aria-label="Đóng thư viện ảnh"
                className="rounded-lg p-1.5 text-stone-400 transition hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 grid max-h-[60vh] grid-cols-3 gap-2 overflow-y-auto pr-1">
              {STUDY_BACKGROUND_GALLERY.map((src, index) => {
                const active = bg.kind === "image" && bg.image === src;
                return (
                  <button
                    key={src}
                    type="button"
                    onClick={() => {
                      update({ kind: "image", image: src });
                      setGalleryOpen(false);
                    }}
                    aria-pressed={active}
                    aria-label={`Chọn ảnh nền ${index + 1}`}
                    className={`relative h-24 overflow-hidden rounded-xl border-2 bg-cover bg-center transition cursor-pointer ${active ? "border-sky-500" : "border-transparent hover:border-stone-300 dark:hover:border-stone-600"}`}
                    style={{ backgroundImage: `url(${src})` }}
                  >
                    {active && (
                      <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-sky-500 text-white">
                        <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* Một kiểu bố cục cho cả 3 nhóm: đáy (mobile) hoặc cạnh phải (desktop), không lớp tối để thấy nền vừa chọn. */}
      {open && createPortal(
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-transparent transition-colors sm:items-stretch sm:justify-end sm:p-4" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Cài đặt học"
            style={{ "--sheet-h": `${effectiveHeight}dvh` } as React.CSSProperties}
            className="flex w-full flex-col overflow-hidden rounded-t-3xl max-sm:h-[var(--sheet-h)] border border-stone-200 bg-white text-stone-900 shadow-2xl sm:max-h-none sm:max-w-lg sm:rounded-2xl dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
            onClick={(event) => event.stopPropagation()}
          >
            {/* Thanh kéo trên mobile, tiêu đề, và 3 nhóm cài đặt. */}
            <div
              onPointerDown={onSheetPointerDown}
              onPointerMove={onSheetPointerMove}
              onPointerUp={onSheetPointerUp}
              onPointerCancel={onSheetPointerUp}
              aria-hidden
              className="flex h-6 shrink-0 cursor-row-resize touch-none items-center justify-center sm:hidden"
            >
              <span className="h-1.5 w-10 rounded-full bg-stone-300 dark:bg-stone-700" />
            </div>
            <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-1 sm:pt-4">
              <h2 className="text-base font-black">Cài đặt học</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Đóng" className="rounded-full p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200 cursor-pointer"><X className="h-4 w-4" /></button>
            </div>
            <div role="tablist" aria-label="Nhóm cài đặt" className="mx-5 grid grid-cols-3 gap-1 rounded-xl bg-stone-100 p-1 dark:bg-stone-800">
              {SECTIONS.map(({ key, label }) => (
                <button key={key} type="button" role="tab" aria-selected={section === key} onClick={() => setSection(key)}
                  className={`min-h-9 rounded-lg text-sm font-bold transition cursor-pointer ${section === key ? "bg-white text-stone-900 shadow-sm dark:bg-stone-950 dark:text-white" : "text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"}`}>
                  {label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4">
              {section === "study" && (
                <div className="divide-y divide-stone-100 dark:divide-stone-800">
                  <ToggleRow label="Vuốt thẻ để chấm" hint="Vuốt trái là Quên, vuốt phải là Thuộc. Thẻ thường thì chạm để lật." checked={tinderMode} onChange={setTinderMode} />
                  <ToggleRow label="Tô màu thẻ theo từ loại" hint="Danh từ xanh dương, động từ đỏ, tính từ xanh lá, phó từ tím." checked={posCardColor} onChange={setPosCardColor} />
                  <ToggleRow label="Thẻ gõ: phải gõ đúng mới qua" hint="Mặc định tắt: xem đáp án rồi vẫn chấm Thuộc được. Bật thì phải gõ đúng." checked={requireExactTyping} onChange={setRequireExactTyping} />
                  <ToggleRow label="Hiện nút Từ điển" checked={!hideDictionary} onChange={(on) => setHideDictionary(!on)} />
                  <ToggleRow label="Hiện nút ChatGPT" checked={!hideChatGpt} onChange={(on) => setHideChatGpt(!on)} />
                </div>
              )}

              {section === "audio" && (
                <div className="space-y-5">
                  <ToggleRow label="Tự phát âm khi ra thẻ" hint="Tắt thì chỉ phát khi bấm nút loa." checked={!disableAutoPronounce} onChange={(on) => setDisableAutoPronounce(!on)} />
                  <AudioModeRow label="Âm thanh từ vựng" value={wordMode} onChange={(mode) => setAudioMode("word", mode)} />
                  <AudioModeRow label="Âm thanh câu ví dụ" value={exampleMode} onChange={(mode) => setAudioMode("example", mode)} />
                </div>
              )}

              {section === "look" && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold">Sáng / tối</p>
                    <EggThemeToggle />
                  </div>

                  <div>
                    <p className="mb-2 text-sm font-bold">Nền</p>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { void pickImage(e.target.files?.[0]); e.target.value = ""; }} />
                    <div className="grid grid-cols-6 gap-2">
                      {GRADIENT_PRESETS.map((preset) => {
                        const active = bg.kind === "gradient" && bg.from === preset.from && bg.to === preset.to;
                        return (
                          <button key={preset.name} type="button" title={preset.name} aria-label={`Gradient ${preset.name}`} aria-pressed={active}
                            onClick={() => update({ kind: "gradient", from: preset.from, to: preset.to })}
                            className={`h-10 rounded-lg border-2 transition cursor-pointer ${active ? "border-sky-500" : "border-transparent hover:border-stone-300"}`}
                            style={{ backgroundImage: `linear-gradient(135deg, ${preset.from}, ${preset.to})` }} />
                        );
                      })}
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {STUDY_BACKGROUND_GALLERY.slice(0, 3).map((src, index) => {
                        const active = bg.kind === "image" && bg.image === src;
                        return (
                          <button key={src} type="button" onClick={() => update({ kind: "image", image: src })} aria-pressed={active} aria-label={`Chọn ảnh nền ${index + 1}`}
                            className={`relative h-16 overflow-hidden rounded-xl border-2 bg-cover bg-center transition cursor-pointer ${active ? "border-sky-500" : "border-transparent hover:border-stone-300"}`}
                            style={{ backgroundImage: `url(${src})` }}>
                            {active && <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-sky-500 text-white"><Check className="h-2.5 w-2.5" strokeWidth={3.5} /></span>}
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button type="button" onClick={() => setGalleryOpen(true)} className="flex-1 rounded-xl border border-stone-200 py-2 text-xs font-bold hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800 cursor-pointer">
                        Tất cả {STUDY_BACKGROUND_GALLERY.length} ảnh
                      </button>
                      <button type="button" onClick={() => fileRef.current?.click()} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-stone-200 py-2 text-xs font-bold hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800 cursor-pointer">
                        <ImagePlus className="h-4 w-4" /> Ảnh của bạn
                      </button>
                      {bg.image && (
                        <button type="button" onClick={() => update({ kind: bg.kind === "image" ? "none" : bg.kind, image: "" })} aria-label="Xóa ảnh" title="Xóa ảnh" className="rounded-xl border border-stone-200 px-3 text-rose-500 hover:bg-rose-500/10 dark:border-stone-700 cursor-pointer"><Trash2 className="h-4 w-4" /></button>
                      )}
                    </div>
                    <details className="mt-2 text-xs text-stone-500 dark:text-stone-400">
                      <summary className="cursor-pointer font-bold">Tự chọn màu gradient</summary>
                      <div className="mt-2 flex items-center gap-3">
                        <label className="flex items-center gap-1.5">Từ <input type="color" value={bg.from} onChange={(e) => update({ kind: "gradient", from: e.target.value })} aria-label="Màu bắt đầu" className="h-7 w-9 cursor-pointer rounded border border-stone-300 bg-transparent p-0.5 dark:border-stone-600" /></label>
                        <label className="flex items-center gap-1.5">đến <input type="color" value={bg.to} onChange={(e) => update({ kind: "gradient", to: e.target.value })} aria-label="Màu kết thúc" className="h-7 w-9 cursor-pointer rounded border border-stone-300 bg-transparent p-0.5 dark:border-stone-600" /></label>
                      </div>
                    </details>
                  </div>

                  <div className="divide-y divide-stone-100 dark:divide-stone-800">
                    <ToggleRow label="Nền chuyển màu chậm" checked={bg.kind === "animated"} onChange={(on) => update({ kind: on ? "animated" : "gradient" })} />
                    <ToggleRow label="Đổi nền ngẫu nhiên sau mỗi 10 thẻ" checked={randomBgEvery10} onChange={setRandomStudyBgEvery10} />
                  </div>

                  <SliderRow id="study-bg-opacity" label="Độ đậm nền" value={bg.opacity} min={10} onChange={(v) => update({ opacity: v })} />
                  <SliderRow id="study-card-opacity" label="Độ đục thẻ học" value={cardOpacity} min={30} onChange={setStudyCardOpacity} />

                  {error && <p role="alert" className="text-xs text-rose-600">{error}</p>}
                  <button type="button" onClick={() => { saveStudyBackground({ ...DEFAULT_STUDY_BG }); setError(""); }} className="w-full rounded-xl py-2 text-xs font-bold text-stone-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800 cursor-pointer">
                    Về giao diện mặc định
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
