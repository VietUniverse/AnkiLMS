"use client";

import React, { useRef, useState } from "react";
import { ImagePlus, Settings, Trash2, X } from "lucide-react";
import { backgroundLayerStyle, DEFAULT_STUDY_BG, fileToDataUrl, GRADIENT_PRESETS, saveStudyBackground, useStudyBackground } from "../lib/studyBackground";

const SAMPLE_IMAGE = "/images/login-bg.webp";

export function StudyBackgroundPanel() {
  const bg = useStudyBackground();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

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
        aria-label="Cài đặt nền khi học"
        aria-expanded={open}
        title="Cài đặt nền"
        className={`flex h-9 w-9 items-center justify-center rounded-full transition cursor-pointer ${backgroundLayerStyle(bg) ? "bg-white/85 text-stone-700 backdrop-blur hover:bg-white dark:bg-stone-900/75 dark:text-slate-200" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}
      >
        <Settings className="h-5 w-5" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div role="dialog" aria-label="Nền khi học" className="absolute right-0 top-full z-50 mt-2 w-72 space-y-4 rounded-2xl border border-stone-200 bg-white p-4 text-stone-900 shadow-2xl dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black">Nền khi học</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Đóng" className="rounded-lg p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer"><X className="h-4 w-4" /></button>
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
              <button
                type="button"
                onClick={() => update({ kind: "image", image: SAMPLE_IMAGE })}
                aria-pressed={bg.kind === "image" && bg.image === SAMPLE_IMAGE}
                title="Ảnh mẫu (nền trang đăng nhập)"
                aria-label="Dùng ảnh mẫu"
                className={`mb-2 flex h-16 w-full items-end overflow-hidden rounded-xl border-2 bg-cover bg-center p-2 text-left text-xs font-bold text-white transition cursor-pointer ${bg.kind === "image" && bg.image === SAMPLE_IMAGE ? "border-sky-500" : "border-transparent hover:border-stone-300"}`}
                style={{ backgroundImage: `linear-gradient(to top, rgba(0,0,0,.55), transparent), url(${SAMPLE_IMAGE})`, color: "#fff" }}
              >
                Ảnh mẫu
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

            {error && <p role="alert" className="text-xs text-rose-600">{error}</p>}

            <button type="button" onClick={() => { saveStudyBackground({ ...DEFAULT_STUDY_BG }); setError(""); }} className="w-full rounded-xl py-2 text-xs font-bold text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800 cursor-pointer">
              Bỏ nền, về mặc định
            </button>
          </div>
        </>
      )}
    </div>
  );
}
