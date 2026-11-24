"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ImagePlus, Settings, Trash2, X } from "lucide-react";
import { EggThemeToggle } from "./EggThemeToggle";
import { backgroundLayerStyle, DEFAULT_STUDY_BG, fileToDataUrl, GRADIENT_PRESETS, saveStudyBackground, STUDY_BACKGROUND_GALLERY, useStudyBackground } from "../lib/studyBackground";
import { setDisableAutoPronounce, setHideChatGpt, setHideDictionary, setMuteAndHideAudio, setMuteExampleAudio, setMuteWordAudio, setRandomStudyBgEvery10, setStudyCardOpacity, useStudyCardOpacity, useDisableAutoPronounce, useHideChatGpt, useHideDictionary, useMuteAndHideAudio, useMuteExampleAudio, useMuteWordAudio, useRandomStudyBgEvery10 } from "../lib/studyPreferences";

export function StudyBackgroundPanel() {
  const bg = useStudyBackground();
  const hideChatGpt = useHideChatGpt();
  const hideDictionary = useHideDictionary();
  const muteWordAudio = useMuteWordAudio();
  const cardOpacity = useStudyCardOpacity();
  const muteExampleAudio = useMuteExampleAudio();
  const muteAndHideAudio = useMuteAndHideAudio();
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

      {open && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Cài đặt học"
            className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-stone-200 bg-white text-stone-900 shadow-2xl dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-stone-200 bg-white px-4 py-3 dark:border-stone-700 dark:bg-stone-900 sm:px-6">
              <div>
                <h2 className="text-sm font-black">Cài đặt học</h2>
                <p className="mt-0.5 text-[11px] text-stone-500 dark:text-stone-400">Tùy chỉnh nền, âm thanh và giao diện khi học</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Đóng" className="rounded-lg p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer"><X className="h-4 w-4" /></button>
            </div>

            <div className="grid grid-cols-1 gap-3 p-4 sm:p-6 md:grid-cols-2 xl:grid-cols-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-stone-500 dark:text-stone-400">Giao diện sáng / tối</p>
              <EggThemeToggle />
            </div>

            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-bold text-stone-500 dark:text-stone-400">Nền động (gradient chuyển màu chậm)</p>
              <button
                type="button"
                role="switch"
                aria-checked={bg.kind === "animated"}
                aria-label="Bật nền động"
                onClick={() => update({ kind: bg.kind === "animated" ? "gradient" : "animated" })}
                className={`relative h-6 w-11 shrink-0 rounded-full transition cursor-pointer ${bg.kind === "animated" ? "bg-sky-500" : "bg-stone-300 dark:bg-stone-700"}`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${bg.kind === "animated" ? "translate-x-[22px]" : "translate-x-0.5"}`} />
              </button>
            </div>

            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-bold text-stone-500 dark:text-stone-400">Tự đổi nền ngẫu nhiên sau mỗi 10 thẻ</p>
              <button
                type="button"
                role="switch"
                aria-checked={randomBgEvery10}
                aria-label="Tự đổi nền ngẫu nhiên sau mỗi 10 thẻ"
                onClick={() => setRandomStudyBgEvery10(!randomBgEvery10)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition cursor-pointer ${randomBgEvery10 ? "bg-sky-500" : "bg-stone-300 dark:bg-stone-700"}`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${randomBgEvery10 ? "translate-x-[22px]" : "translate-x-0.5"}`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-stone-500 dark:text-stone-400">Tắt âm thanh từ vựng</p>
              <button
                type="button"
                role="switch"
                aria-checked={muteWordAudio}
                aria-label="Tắt âm thanh từ vựng"
                onClick={() => setMuteWordAudio(!muteWordAudio)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition cursor-pointer ${muteWordAudio ? "bg-sky-500" : "bg-stone-300 dark:bg-stone-700"}`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${muteWordAudio ? "translate-x-[22px]" : "translate-x-0.5"}`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-stone-500 dark:text-stone-400">Tắt âm thanh ví dụ</p>
              <button
                type="button"
                role="switch"
                aria-checked={muteExampleAudio}
                aria-label="Tắt âm thanh câu ví dụ"
                onClick={() => setMuteExampleAudio(!muteExampleAudio)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition cursor-pointer ${muteExampleAudio ? "bg-sky-500" : "bg-stone-300 dark:bg-stone-700"}`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${muteExampleAudio ? "translate-x-[22px]" : "translate-x-0.5"}`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-stone-500 dark:text-stone-400">Tắt &amp; Ẩn âm thanh</p>
              <button
                type="button"
                role="switch"
                aria-checked={muteAndHideAudio}
                aria-label="Tắt và ẩn mọi nút phát âm trên thẻ học"
                onClick={() => setMuteAndHideAudio(!muteAndHideAudio)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition cursor-pointer ${muteAndHideAudio ? "bg-sky-500" : "bg-stone-300 dark:bg-stone-700"}`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${muteAndHideAudio ? "translate-x-[22px]" : "translate-x-0.5"}`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-stone-500 dark:text-stone-400">Tắt phát âm thanh tự động</p>
              <button
                type="button"
                role="switch"
                aria-checked={disableAutoPronounce}
                aria-label="Tắt tự động phát âm khi ra thẻ hoặc lật thẻ"
                onClick={() => setDisableAutoPronounce(!disableAutoPronounce)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition cursor-pointer ${disableAutoPronounce ? "bg-sky-500" : "bg-stone-300 dark:bg-stone-700"}`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${disableAutoPronounce ? "translate-x-[22px]" : "translate-x-0.5"}`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-stone-500 dark:text-stone-400">Ẩn nút Hỏi ChatGPT</p>
              <button
                type="button"
                role="switch"
                aria-checked={hideChatGpt}
                aria-label="Ẩn nút Hỏi ChatGPT khi học"
                onClick={() => setHideChatGpt(!hideChatGpt)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition cursor-pointer ${hideChatGpt ? "bg-sky-500" : "bg-stone-300 dark:bg-stone-700"}`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${hideChatGpt ? "translate-x-[22px]" : "translate-x-0.5"}`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-stone-500 dark:text-stone-400">Ẩn nút Từ điển</p>
              <button
                type="button"
                role="switch"
                aria-checked={hideDictionary}
                aria-label="Ẩn nút Từ điển khi học"
                onClick={() => setHideDictionary(!hideDictionary)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition cursor-pointer ${hideDictionary ? "bg-sky-500" : "bg-stone-300 dark:bg-stone-700"}`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${hideDictionary ? "translate-x-[22px]" : "translate-x-0.5"}`} />
              </button>
            </div>

            <div>
              <p className="mb-2 text-xs font-bold text-stone-500 dark:text-stone-400">Màu gradient</p>
              <div className="grid grid-cols-6 gap-2">
                {GRADIENT_PRESETS.map((preset) => {
                  const active = bg.kind === "gradient" && bg.from === preset.from && bg.to === preset.to;
                  return (
                    <button
                      key={preset.name}
                      type="button"
                      title={preset.name}
                      aria-label={`Gradient ${preset.name}`}
                      aria-pressed={active}
                      onClick={() => update({ kind: "gradient", from: preset.from, to: preset.to })}
                      className={`h-9 rounded-lg border-2 transition cursor-pointer ${active ? "border-sky-500" : "border-transparent hover:border-stone-300"}`}
                      style={{ backgroundImage: `linear-gradient(135deg, ${preset.from}, ${preset.to})` }}
                    />
                  );
                })}
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
                <label className="flex items-center gap-1.5">Từ <input type="color" value={bg.from} onChange={(e) => update({ kind: "gradient", from: e.target.value })} aria-label="Màu bắt đầu" className="h-7 w-9 cursor-pointer rounded border border-stone-300 bg-transparent p-0.5 dark:border-stone-600" /></label>
                <label className="flex items-center gap-1.5">đến <input type="color" value={bg.to} onChange={(e) => update({ kind: "gradient", to: e.target.value })} aria-label="Màu kết thúc" className="h-7 w-9 cursor-pointer rounded border border-stone-300 bg-transparent p-0.5 dark:border-stone-600" /></label>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-bold text-stone-500 dark:text-stone-400">Ảnh nền</p>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { void pickImage(e.target.files?.[0]); e.target.value = ""; }} />
              <div className="grid grid-cols-3 gap-2">
                {STUDY_BACKGROUND_GALLERY.slice(0, 3).map((src, index) => {
                  const active = bg.kind === "image" && bg.image === src;
                  return (
                    <button
                      key={src}
                      type="button"
                      onClick={() => update({ kind: "image", image: src })}
                      aria-pressed={active}
                      aria-label={`Chọn ảnh nền ${index + 1}`}
                      title={`Ảnh nền ${index + 1}`}
                      className={`relative h-16 overflow-hidden rounded-xl border-2 bg-cover bg-center transition cursor-pointer ${active ? "border-sky-500" : "border-transparent hover:border-stone-300"}`}
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
              <button
                type="button"
                onClick={() => setGalleryOpen(true)}
                className="mb-2 mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-stone-200 py-2 text-xs font-bold transition hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800 cursor-pointer"
              >
                Xem tất cả {STUDY_BACKGROUND_GALLERY.length} ảnh nền
              </button>
              <div className="flex gap-2">
                <button type="button" onClick={() => fileRef.current?.click()} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-stone-200 py-2 text-xs font-bold hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800 cursor-pointer">
                  <ImagePlus className="h-4 w-4" /> {bg.image ? "Đổi ảnh" : "Chọn ảnh"}
                </button>
                {bg.image && (
                  <button type="button" onClick={() => update({ kind: bg.kind === "image" ? "none" : bg.kind, image: "" })} aria-label="Xóa ảnh" title="Xóa ảnh" className="rounded-xl border border-stone-200 px-3 text-rose-500 hover:bg-rose-500/10 dark:border-stone-700 cursor-pointer"><Trash2 className="h-4 w-4" /></button>
                )}
              </div>
              {bg.image && bg.kind !== "image" && (
                <button type="button" onClick={() => update({ kind: "image" })} className="mt-2 text-xs font-bold text-sky-600 hover:underline dark:text-sky-400 cursor-pointer">Dùng ảnh đã chọn</button>
              )}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-xs font-bold text-stone-500 dark:text-stone-400">
                <label htmlFor="study-bg-opacity">Độ đậm nền</label>
                <span className="tabular-nums text-stone-900 dark:text-stone-100">{bg.opacity}%</span>
              </div>
              <input
                id="study-bg-opacity"
                type="range"
                min={10}
                max={100}
                step={5}
                value={bg.opacity}
                onChange={(e) => update({ opacity: Number(e.target.value) })}
                className="w-full cursor-pointer accent-sky-500"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-xs font-bold text-stone-500 dark:text-stone-400">
                <label htmlFor="study-card-opacity">Độ đục khối học</label>
                <span className="tabular-nums text-stone-900 dark:text-stone-100">{cardOpacity}%</span>
              </div>
              <input
                id="study-card-opacity"
                type="range"
                min={30}
                max={100}
                step={5}
                value={cardOpacity}
                onChange={(e) => setStudyCardOpacity(Number(e.target.value))}
                className="w-full cursor-pointer accent-sky-500"
              />
            </div>

            <div className="space-y-2 md:col-span-2 xl:col-span-3">
              {error && <p role="alert" className="text-xs text-rose-600">{error}</p>}

              <button type="button" onClick={() => { saveStudyBackground({ ...DEFAULT_STUDY_BG }); setError(""); }} className="w-full rounded-xl py-2 text-xs font-bold text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800 cursor-pointer">
                Bỏ nền, về mặc định
              </button>
            </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
