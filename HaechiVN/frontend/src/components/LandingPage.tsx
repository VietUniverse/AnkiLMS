"use client";

import React from "react";
import Link from "next/link";
import { posTone } from "../lib/vocabCards";
import { speakKorean } from "../lib/koreanSpeech";
import { LANDING_DECK, type LandingCard } from "../lib/landingDeck";

// Trang giới thiệu cho khách chưa đăng nhập, theo tinh thần thiết kế của Apple:
// chữ lớn tracking âm, nền trung tính, thanh điều hướng trong mờ, thẻ demo kéo bằng lò xo có quán tính.
// Màu chữ/nền chính để inline vì globals.css ép lại text-white / bg tối ở giao diện sáng.

const INK = "#1d1d1f";
const MUTED = "#6e6e73";
const CANVAS = "#fbfbfd";
const TILE = "#f5f5f7";
const ACCENT = "#0369a1"; // sky-700, cùng màu nút "Học tiếp" trong app

// Thẻ thật trích từ bộ "Tiếng Hàn Tổng Hợp"; bắt đầu ở 행복하다 cho câu mở đầu dễ thương.
const DEMO = LANDING_DECK;


let landingAudio: HTMLAudioElement | null = null;
/** Phát file âm thanh thật của thẻ (bộ THTH); lỗi thì mới dùng giọng đọc của trình duyệt. */
function playCardAudio(file: string, fallbackText: string) {
  landingAudio?.pause();
  if (!file) { speakKorean(fallbackText); return; }
  const a = new Audio(`/landing/audio/${encodeURIComponent(file)}`);
  landingAudio = a;
  a.play().catch(() => speakKorean(fallbackText));
}

function Speaker({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M11 5 6 9H3v6h3l5 4V5z" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M18.5 5.5a9 9 0 0 1 0 13" /></svg>;
}

const FEATURES = [
  { title: "Nhắc đúng lúc sắp quên", text: "Thuật toán FSRS tính ngày ôn cho từng từ. Bạn chỉ việc mở app." },
  { title: "Gõ lại để nhớ mặt chữ", text: "Thẻ gõ cho nghe nghĩa, bạn tự gõ lại từ tiếng Hàn." },
  { title: "Chuỗi ngày học", text: "Vài phút mỗi ngày. Biểu đồ cho thấy vốn từ lớn dần lên." },
  { title: "Bảng xếp hạng", text: "Đua streak và XP với bạn bè, theo tuần, tháng hoặc mọi lúc." },
  { title: "Lớp học với giáo viên", text: "Vào lớp bằng mã, nhận bài tập, giáo viên theo dõi tiến độ." },
  { title: "Từ điển và ChatGPT", text: "Tra nghĩa, xem ví dụ, hỏi thêm ngay trên thẻ đang học." },
];

// Ảnh chụp từ localhost; tên người dùng trên bảng xếp hạng đã đổi thành tên giả.
const SHOTS = [
  { src: "/landing/dashboard.webp", alt: "Trang chủ HaechiVN: chuỗi ngày học, nút Học tiếp và các ô thống kê", caption: "Trang chủ", title: "Biết ngay hôm nay học gì.", text: "Chuỗi ngày học, nút Học tiếp và Ôn tập, thời gian học, số thẻ và trí nhớ, tất cả trên một màn." },
  { src: "/landing/stats.webp", alt: "Thống kê 7 và 30 ngày qua cùng biểu đồ phát triển vốn từ", caption: "Thống kê", title: "Thấy rõ mình tiến bộ.", text: "So 7 và 30 ngày qua với kỳ trước. Biểu đồ cho thấy vốn từ lớn dần mỗi ngày." },
  { src: "/landing/leaderboard.webp", alt: "Bảng xếp hạng streak với bục 2-1-3", caption: "Bảng xếp hạng", title: "Có bạn đua thì khác.", text: "Đua streak và XP với bạn bè, theo ngày, tuần, tháng hoặc mọi lúc." },
];

/** Khung iPhone đời mới. Mọi chi tiết (viền, bo góc, Dynamic Island, nút cạnh, thanh trạng thái) tính theo % bề rộng máy
 *  (container query `cqw`), nên máy to hay nhỏ vẫn đúng tỉ lệ thật. */
function PhoneFrame({ children, fullBleed = false, darkStatus = false }: { children: React.ReactNode; fullBleed?: boolean; darkStatus?: boolean }) {
  const ink = fullBleed && !darkStatus ? "#fff" : "#000";
  const side = "absolute w-[1.1cqw] bg-[#2c2c30]";
  return (
    <div className="relative [container-type:inline-size]">
      <span className={`${side} -left-[0.9cqw] top-[17%] h-[7cqw] rounded-l-[0.6cqw]`} aria-hidden />
      <span className={`${side} -left-[0.9cqw] top-[25%] h-[13cqw] rounded-l-[0.6cqw]`} aria-hidden />
      <span className={`${side} -left-[0.9cqw] top-[33%] h-[13cqw] rounded-l-[0.6cqw]`} aria-hidden />
      <span className={`${side} -right-[0.9cqw] top-[27%] h-[20cqw] rounded-r-[0.6cqw]`} aria-hidden />
      <div className="rounded-[16cqw] bg-[#0b0b0d] p-[2.6cqw] shadow-[0_2px_0_1px_#3a3a3f_inset,0_30px_60px_-25px_rgba(0,0,0,0.45)] ring-1 ring-[#4a4a50]">
        <div className="relative overflow-hidden rounded-[13.6cqw] bg-[#f8fafc]">
          <div className={`${fullBleed ? "absolute inset-x-0 top-0 z-10" : "relative"} flex h-[12cqw] items-center justify-between px-[8cqw] text-[3.8cqw] font-semibold`} style={{ color: ink }}>
            <span className="tabular-nums">9:41</span>
            <span className="absolute left-1/2 top-[3cqw] h-[7.6cqw] w-[26cqw] -translate-x-1/2 rounded-full bg-black" aria-hidden />
            <span className="flex items-center gap-[1.3cqw]" aria-hidden>
              <span className="flex items-end gap-[0.5cqw]">{[1.4, 2.1, 2.8, 3.5].map((h) => <span key={h} className="w-[0.9cqw] rounded-[0.3cqw]" style={{ height: `${h}cqw`, backgroundColor: ink }} />)}</span>
              <span className="h-[3.5cqw] w-[6.8cqw] rounded-[1cqw] border p-[0.35cqw]" style={{ borderColor: ink, opacity: 0.9 }}><span className="block h-full w-[80%] rounded-[0.5cqw]" style={{ backgroundColor: ink }} /></span>
            </span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

// Nền lấy từ thư viện ảnh có sẵn của app (public/images/study-backgrounds).
const GALLERY = Array.from({ length: 25 }, (_, n) => `/images/study-backgrounds/bg-${String(n + 1).padStart(2, "0")}.jpg`);
const BG_PICKS = [3, 7, 11, 1, 15, 19, 22].map((n) => GALLERY[n - 1]);
const MORE_COVER = GALLERY[11];
// Màu nền đặc; trong app chọn được cả dải màu và ảnh tự tải lên.
const BG_COLORS = ["#fde2e4", "#fef3c7", "#dcfce7", "#dbeafe", "#ede9fe", "#1f2937"];

/** Kết quả từ điển mẫu dựng từ chính thẻ đang học (dữ liệu bộ THTH, không gọi API). */
function DictMock({ c }: { c: LandingCard }) {
  const tone = posTone(c.pos);
  return (
    <div className="space-y-3">
      <div>
        <p className="text-xl font-bold" style={{ color: INK }} lang="ko">{c.word}</p>
        <p className="mt-1 flex items-center gap-1.5">
          <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${lightChip(tone?.chip)}`}>{c.pos}</span>
          <span className="text-[10px]" style={{ color: MUTED }}>Tiếng Hàn Tổng Hợp 1 · Bài {c.lesson}</span>
        </p>
      </div>
      <p><b style={{ color: INK }}>{c.meaning}</b>{c.explain && <span style={{ color: MUTED }}> — {c.explain}</span>}</p>
      <div className="space-y-1 rounded-xl p-2.5" style={{ backgroundColor: TILE }}>
        <p lang="ko">{c.ex}</p>
        <p style={{ color: MUTED }}>{c.exVi}</p>
      </div>
      {c.collocation && <p><span className="font-semibold" style={{ color: INK }}>Hay đi với:</span> <span lang="ko">{c.collocation}</span></p>}
      {c.antonym && <p><span className="font-semibold" style={{ color: INK }}>Trái nghĩa:</span> <span lang="ko">{c.antonym}</span></p>}
    </div>
  );
}

type GptBlock = { label: string; body: React.ReactNode };
const gptBlocks = (c: LandingCard): GptBlock[] =>
  ([
    { label: "Nghĩa", body: <><b style={{ color: INK }}>{c.meaning}</b> <span style={{ color: MUTED }}>({c.pos})</span>{c.explain && <> — {c.explain}</>}</> },
    { label: "Ví dụ", body: <><span lang="ko" style={{ color: INK }}>{c.ex}</span><br /><span style={{ color: MUTED }}>{c.exVi}</span></> },
    c.collocation ? { label: "Hay gặp", body: <span lang="ko">{c.collocation}</span> } : null,
    c.antonym ? { label: "Trái nghĩa", body: <span lang="ko">{c.antonym}</span> } : null,
    { label: "Ghi nhớ", body: <>Từ ở Bài {c.lesson}, Tiếng Hàn Tổng Hợp 1. Đặt thử một câu với {c.word} để nhớ lâu hơn nhé.</> },
  ] as (GptBlock | null)[]).filter((x): x is GptBlock => x !== null);

/** Màn ChatGPT mẫu: bong bóng câu hỏi, chấm "đang trả lời", rồi từng mục hiện dần như được gõ ra. */
function GptMock({ c }: { c: LandingCard }) {
  const blocks = gptBlocks(c);
  const [n, setN] = React.useState(0); // 0 = đang "suy nghĩ"
  React.useEffect(() => {
    const all = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const id = window.setInterval(() => setN((v) => (all ? blocks.length : Math.min(blocks.length, v + 1))), 450);
    return () => window.clearInterval(id);
  }, [blocks.length]);
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-3">
        <p className="ml-auto w-fit max-w-[85%] rounded-[18px] px-3 py-2" style={{ backgroundColor: "#f0f0f2", color: INK }}>Giải thích từ <span lang="ko">{c.word}</span> cho mình nhé</p>
        <div className="flex gap-2">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold" style={{ backgroundColor: INK, color: "#fff" }} aria-hidden>AI</span>
          {n === 0 ? (
            <span className="flex items-center gap-1 pt-1.5" aria-label="Đang trả lời">
              {[0, 150, 300].map((d) => <span key={d} className="h-1.5 w-1.5 animate-pulse rounded-full bg-black/40" style={{ animationDelay: `${d}ms` }} />)}
            </span>
          ) : (
            <div className="min-w-0 flex-1 space-y-2">
              <p style={{ color: INK }}><b lang="ko" className="text-[13px]">{c.word}</b></p>
              {blocks.slice(0, n).map((bl) => (
                <div key={bl.label} className="animate-fadeIn">
                  <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: MUTED }}>{bl.label}</p>
                  <p className="mt-0.5">{bl.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const lightChip = (chip?: string) => (chip ?? "").split(" ").filter((cl) => !cl.startsWith("dark:")).join(" ");

/** Mô phỏng màn học trong khung iPhone: chọn nền / kéo độ trong của thẻ là đổi ngay, giống phần Cài đặt học trong app. */
function BackgroundPlayground() {
  const [bg, setBgRaw] = React.useState(BG_PICKS[0]);
  // Chỉ dựng lớp nền cho ảnh đã chọn: vẫn chuyển mờ mượt mà không tải sẵn cả 25 ảnh.
  const [usedImgs, setUsedImgs] = React.useState<string[]>([BG_PICKS[0]]);
  const setBg = (v: string) => { if (!v.startsWith("#")) setUsedImgs((u) => (u.includes(v) ? u : [...u, v])); setBgRaw(v); };
  const [moreIdx, setMoreIdx] = React.useState(0);
  const extra = GALLERY.filter((g) => !BG_PICKS.includes(g));
  const showMore = () => { setBg(extra[moreIdx % extra.length]); setMoreIdx((n) => n + 1); };
  const isColor = bg.startsWith("#");
  const lightBg = isColor && bg !== "#1f2937";
  const chrome = lightBg ? "#1d1d1f" : "#fff";
  const [opacity, setOpacity] = React.useState(70);
  const [sheet, setSheetRaw] = React.useState<null | "dict" | "gpt">(null);
  const [gptRun, setGptRun] = React.useState(0); // mỗi lần mở ChatGPT thì gõ lại câu trả lời
  const [k, setK] = React.useState(() => Math.max(0, DEMO.findIndex((c) => c.word === "좋다")));
  const c = DEMO[k % DEMO.length];
  const [flipped, setFlipped] = React.useState(false);
  const nextCard = () => { setSheetRaw(null); setFlipped(false); setK((v) => v + 1); playCardAudio(DEMO[(k + 1) % DEMO.length].audioWord, DEMO[(k + 1) % DEMO.length].word); };
  const flip = () => { if (!flipped) playCardAudio(c.audioEx, c.ex); setFlipped(!flipped); };
  const setSheet = (v: null | "dict" | "gpt") => { if (v === "gpt") setGptRun((n) => n + 1); setSheetRaw(v); };
  const glass = opacity < 100;
  return (
    <div className="grid items-center gap-8 md:grid-cols-[minmax(0,34rem)_auto] md:grid-rows-[auto_auto] md:justify-center md:gap-x-[clamp(2.5rem,5vw,5rem)] md:gap-y-8">
      <div className="order-2 mx-auto w-[min(78vw,calc((100dvh-18rem)*0.47))] max-w-[380px] md:order-none md:col-start-2 md:row-span-2 md:row-start-1 md:w-[min(380px,calc((100dvh-8rem)*0.47))]">
        <PhoneFrame fullBleed darkStatus={lightBg}>
          <div className="relative aspect-[9/19.5]">
            <div className="absolute inset-0 transition-colors duration-300" style={{ backgroundColor: isColor ? bg : "#e5e7eb" }} aria-hidden />
            {usedImgs.map((src) => (
              <div key={src} className="absolute inset-0 bg-cover bg-center transition-opacity duration-300 ease-out" style={{ backgroundImage: `url(${src})`, opacity: src === bg ? 1 : 0 }} aria-hidden />
            ))}
            <div className={`absolute inset-0 transition-opacity duration-300 ${isColor ? "opacity-0" : "opacity-100"} bg-black/10`} aria-hidden />
            <div className="absolute inset-x-4 top-12 flex items-center gap-2" aria-hidden>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: lightBg ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.4)" }}><span className="block h-full rounded-full transition-[width] duration-300" style={{ width: `${(((k % DEMO.length) + 1) / DEMO.length) * 100}%`, backgroundColor: chrome }} /></span>
              <span className="text-[11px] font-semibold tabular-nums" style={{ color: chrome }}>{(k % DEMO.length) + 1}/{DEMO.length}</span>
            </div>
            <div
              className="absolute inset-x-4 top-[47%] flex -translate-y-1/2 flex-col overflow-hidden rounded-[26px] text-center shadow-[0_20px_40px_-20px_rgba(0,0,0,0.5)] transition-[background-color] duration-150"
              style={{
                backgroundColor: `rgba(255,255,255,${opacity / 100})`,
                backdropFilter: glass ? "blur(18px) saturate(160%)" : undefined,
                WebkitBackdropFilter: glass ? "blur(18px) saturate(160%)" : undefined,
                border: "1px solid rgba(255,255,255,0.5)",
              }}
            >
              <button type="button" onClick={flip} aria-label={flipped ? `${c.word}: ${c.meaning}. Chạm để úp thẻ` : `${c.word}. Chạm để lật thẻ`} className="flex flex-col items-center gap-1 px-4 pb-5 pt-7 outline-none transition-transform duration-100 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-sky-300">
                <span className="text-[40px] font-bold leading-tight" style={{ color: INK, letterSpacing: "-0.03em" }} lang="ko">{c.word}</span>
                <span className="flex min-h-[28px] items-center">
                  {flipped
                    ? <span className="animate-fadeIn text-xl font-semibold" style={{ color: ACCENT }}>{c.meaning}</span>
                    : null}
                </span>
                <span className="mt-1.5 text-[13px] leading-snug" style={{ color: "#3a3a3c" }} lang="ko">{c.ex}</span>
                {flipped && <span className="animate-fadeIn text-[11px] leading-snug" style={{ color: MUTED }}>{c.exVi}</span>}
              </button>
              <div className="flex items-center gap-0.5 whitespace-nowrap border-t px-2.5 py-1.5" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
                <span className={`mr-auto min-w-0 truncate rounded-full px-2 py-0.5 text-[9px] font-semibold ${lightChip(posTone(c.pos)?.chip)}`}>{c.pos}</span>
                <button type="button" onClick={() => setSheet("dict")} className="shrink-0 rounded-md px-1.5 py-1 text-[11px] font-medium active:opacity-60" style={{ color: sheet === "dict" ? ACCENT : MUTED }}>Từ điển</button>
                <button type="button" onClick={() => setSheet("gpt")} className="shrink-0 rounded-md px-1.5 py-1 text-[11px] font-medium active:opacity-60" style={{ color: sheet === "gpt" ? ACCENT : MUTED }}>ChatGPT</button>
                <button type="button" onClick={() => playCardAudio(c.audioWord, c.word)} aria-label={`Nghe phát âm ${c.word}`} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full active:scale-90" style={{ backgroundColor: "rgba(0,0,0,0.05)", color: INK }}><Speaker className="h-3.5 w-3.5" /></button>
              </div>
            </div>
            {/* Giống app: chưa lật thì chỉ có "Hiện đáp án", lật rồi mới chấm Quên/Thuộc. */}
            {flipped ? (
              <div className="absolute inset-x-4 bottom-8 grid grid-cols-2 gap-2">
                <button type="button" onClick={nextCard} className="rounded-full py-2 text-center text-xs font-semibold transition-transform duration-100 active:scale-95" style={{ backgroundColor: "rgba(255,228,230,0.92)", color: "#be123c" }}>Quên</button>
                <button type="button" onClick={nextCard} className="rounded-full py-2 text-center text-xs font-semibold transition-transform duration-100 active:scale-95" style={{ backgroundColor: "rgba(209,250,229,0.92)", color: "#047857" }}>Thuộc</button>
              </div>
            ) : (
              <div className="absolute inset-x-4 bottom-8">
                <button type="button" onClick={flip} className="w-full rounded-full py-2 text-center text-xs font-semibold transition-transform duration-100 active:scale-95" style={{ backgroundColor: ACCENT, color: "#fff" }}>Hiện đáp án</button>
              </div>
            )}

            {/* Sheet mô phỏng: trồi lên từ đáy, bấm nền tối hoặc nút Đóng để hạ xuống cùng đường. */}
            <div className={`absolute inset-0 z-20 bg-black/30 transition-opacity duration-300 ${sheet ? "opacity-100" : "pointer-events-none opacity-0"}`} onClick={() => setSheet(null)} aria-hidden />
            <div
              role="dialog"
              aria-label={sheet === "gpt" ? "ChatGPT mẫu" : "Từ điển mẫu"}
              aria-hidden={!sheet}
              className="absolute inset-x-0 bottom-0 z-30 flex h-[64%] flex-col rounded-t-[24px] bg-white text-left shadow-[0_-10px_30px_rgba(0,0,0,0.15)] transition-transform duration-[400ms] ease-[cubic-bezier(0.32,0.72,0,1)]"
              style={{ transform: sheet ? "translateY(0)" : "translateY(105%)" }}
            >
              <span className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-black/15" aria-hidden />
              <div className="flex items-center justify-between px-4 pb-2 pt-2">
                <p className="text-sm font-semibold" style={{ color: INK }}>{sheet === "gpt" ? "ChatGPT" : "Từ điển"}</p>
                <button type="button" onClick={() => setSheet(null)} tabIndex={sheet ? 0 : -1} className="text-xs font-medium active:opacity-60" style={{ color: ACCENT }}>Đóng</button>
              </div>
              <div className="flex-1 overflow-y-auto px-4 pb-6 text-[11.5px] leading-relaxed" style={{ color: "#3a3a3c" }}>
                {sheet === "gpt" ? <GptMock key={`${gptRun}-${k}`} c={c} /> : <DictMock c={c} />}
              </div>
            </div>
            <span className="absolute bottom-2 left-1/2 h-1 w-24 -translate-x-1/2 rounded-full" style={{ backgroundColor: chrome, opacity: 0.8 }} aria-hidden />
          </div>
        </PhoneFrame>
      </div>

      <div className="order-1 text-center md:order-none md:col-start-1 md:row-start-1 md:self-end md:text-left">
        <h2 className="text-[clamp(2rem,1.2rem+3vw,3.5rem)] font-bold" style={heading}>Học trên nền<br />bạn thích.</h2>
        <p className="mx-auto mt-4 max-w-[28em] text-[clamp(1rem,0.9rem+0.45vw,1.25rem)] md:mx-0" style={{ color: MUTED }}>Chạm thẻ để lật, bấm Quên hoặc Thuộc để qua thẻ. Đổi ảnh nền, màu nền, độ trong của thẻ, tra Từ điển hay hỏi ChatGPT ngay trên thẻ.</p>
      </div>

      <div className="order-3 md:order-none md:col-start-1 md:row-start-2 md:self-start">

        <fieldset>
          <legend className="text-sm font-semibold" style={{ color: INK }}>Ảnh nền</legend>
          <div className="mt-3 flex flex-wrap justify-center gap-2.5 md:justify-start">
            {BG_PICKS.map((src, n) => (
              <button
                key={src}
                type="button"
                onClick={() => setBg(src)}
                aria-label={`Nền ${n + 1}`}
                aria-pressed={src === bg}
                className="h-14 w-14 rounded-2xl bg-cover bg-center transition-transform duration-100 active:scale-[0.94]"
                style={{ backgroundImage: `url(${src})`, boxShadow: src === bg ? `0 0 0 2px ${CANVAS}, 0 0 0 4px ${ACCENT}` : "0 0 0 1px rgba(0,0,0,0.08)" }}
              />
            ))}
            <button
              type="button"
              onClick={showMore}
              aria-label="Xem thêm ảnh nền (25+ ảnh)"
              className="relative h-14 w-14 overflow-hidden rounded-2xl bg-cover bg-center transition-transform duration-100 active:scale-[0.94]"
              style={{ backgroundImage: `url(${MORE_COVER})`, boxShadow: extra.includes(bg) ? `0 0 0 2px ${CANVAS}, 0 0 0 4px ${ACCENT}` : "0 0 0 1px rgba(0,0,0,0.08)" }}
            >
              <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-sm font-bold" style={{ color: "#fff" }}>25+</span>
            </button>
          </div>
        </fieldset>

        <fieldset className="mt-6">
          <legend className="text-sm font-semibold" style={{ color: INK }}>Màu nền</legend>
          <div className="mt-3 flex flex-wrap justify-center gap-2.5 md:justify-start">
            {BG_COLORS.map((col) => (
              <button
                key={col}
                type="button"
                onClick={() => setBg(col)}
                aria-label={`Màu nền ${col}`}
                aria-pressed={bg === col}
                className="h-10 w-10 rounded-full transition-transform duration-100 active:scale-[0.92]"
                style={{ backgroundColor: col, boxShadow: bg === col ? `0 0 0 2px ${CANVAS}, 0 0 0 4px ${ACCENT}` : "inset 0 0 0 1px rgba(0,0,0,0.08)" }}
              />
            ))}
          </div>
        </fieldset>

        <label className="mx-auto mt-8 block max-w-sm md:mx-0 md:max-w-none">
          <span className="flex justify-between text-sm font-semibold" style={{ color: INK }}>
            Độ đậm của thẻ <span className="tabular-nums" style={{ color: MUTED }}>{opacity}%</span>
          </span>
          <input type="range" min={30} max={100} value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} className="mt-3 w-full" style={{ accentColor: ACCENT }} />
        </label>
      </div>
    </div>
  );
}

/** Thanh điều hướng dạng viên thuốc nổi giữa, kính mờ; bóng đậm hơn khi nội dung đã cuộn vào dưới nó. */
function Nav() {
  const [scrolled, setScrolled] = React.useState(false);
  React.useEffect(() => {
    const on = () => setScrolled(window.scrollY > 4);
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-30 px-3 sm:top-4">
      <nav
        className="pointer-events-auto mx-auto flex h-14 w-fit items-center gap-[clamp(1.25rem,3vw,2rem)] rounded-full pl-4 pr-2 transition-shadow duration-200"
        aria-label="Chính"
        style={{
          backgroundColor: "rgba(255,255,255,0.72)",
          backdropFilter: "saturate(180%) blur(20px)",
          WebkitBackdropFilter: "saturate(180%) blur(20px)",
          border: "1px solid rgba(255,255,255,0.6)",
          boxShadow: scrolled ? "0 8px 30px -10px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.05)" : "0 2px 10px -4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)",
        }}
      >
        <Link href="/" className="flex items-center gap-2 text-[17px] font-semibold" style={{ color: INK }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/haechivn-mark.png" alt="" className="h-7 w-7 rounded-lg" />
          <span>Haechi<span style={{ color: ACCENT }}>VN</span></span>
        </Link>
        <div className="flex items-center gap-1">
          <Link href="/login" className="rounded-full px-4 py-1.5 text-sm font-medium transition-transform duration-100 active:scale-[0.97]" style={{ backgroundColor: INK, color: "#fff" }}>Học miễn phí</Link>
        </div>
      </nav>
    </div>
  );
}

// Tiếng Việt có dấu chồng (ỗ, ầ) nên cần leading cao hơn chuẩn Latin.
const display = { color: INK, letterSpacing: "-0.03em", lineHeight: 1.18 } as const;
const heading = { color: INK, letterSpacing: "-0.02em", lineHeight: 1.22 } as const;

/** Nút tròn về đầu trang: hiện khi đã cuộn quá một màn hình. */
function ScrollTopButton() {
  const [show, setShow] = React.useState(false);
  React.useEffect(() => {
    const on = () => setShow(window.scrollY > window.innerHeight * 0.8);
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })}
      aria-label="Về đầu trang"
      tabIndex={show ? 0 : -1}
      className={`fixed bottom-5 right-5 z-30 flex h-12 w-12 items-center justify-center rounded-full transition-[opacity,transform,scale] duration-200 active:scale-90 sm:bottom-8 sm:right-8 ${show ? "opacity-100" : "pointer-events-none translate-y-3 opacity-0"}`}
      style={{
        backgroundColor: "rgba(255,255,255,0.78)",
        backdropFilter: "saturate(180%) blur(20px)",
        WebkitBackdropFilter: "saturate(180%) blur(20px)",
        boxShadow: "0 8px 24px -8px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.06)",
        color: INK,
      }}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 19V5" /><path d="m5 12 7-7 7 7" /></svg>
    </button>
  );
}

export function LandingPage() {
  // Màn rộng (mỗi section vừa một màn): lăn chuột một nấc là trượt hẳn sang section kế/trước.
  // Điện thoại dọc: section dài hơn màn nên chỉ "hít" nhẹ bằng CSS, không chiếm cuộn.
  React.useEffect(() => {
    const html = document.documentElement;
    const prev = { snap: html.style.scrollSnapType, behavior: html.style.scrollBehavior };
    const wide = window.matchMedia("(min-width: 768px) and (min-height: 600px)");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const apply = () => { html.style.scrollSnapType = wide.matches ? "none" : "y proximity"; };
    apply();
    wide.addEventListener("change", apply);

    // Cuộn tự vẽ: nhanh dần rồi chậm dần (easeInOutCubic), ~0.9s, mượt hơn smooth mặc định của trình duyệt.
    let raf = 0;
    let animating = false;
    const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
    const glideTo = (target: number) => {
      cancelAnimationFrame(raf);
      const from = window.scrollY;
      const dist = target - from;
      const dur = Math.min(1100, 650 + Math.abs(dist) * 0.3);
      const t0 = performance.now();
      animating = true;
      const step = (now: number) => {
        const t = Math.min(1, (now - t0) / dur);
        window.scrollTo(0, from + dist * ease(t));
        if (t < 1) raf = requestAnimationFrame(step);
        else animating = false;
      };
      raf = requestAnimationFrame(step);
      return dur;
    };

    let lockUntil = 0;
    let acc = 0;
    const sectionTops = () => [...document.querySelectorAll("main > section, footer")].map((el) => (el as HTMLElement).offsetTop);
    const onWheel = (e: WheelEvent) => {
      if (!wide.matches || e.ctrlKey || Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
      // Đang cuộn trong một khung có thanh cuộn riêng (vd sheet Từ điển trong điện thoại) thì để yên.
      for (let el = e.target as HTMLElement | null; el && el !== document.body; el = el.parentElement) {
        if (el.scrollHeight > el.clientHeight + 1 && /(auto|scroll)/.test(getComputedStyle(el).overflowY)) return;
      }
      e.preventDefault();
      const now = performance.now();
      if (now < lockUntil || animating) return;
      acc += e.deltaY;
      if (Math.abs(acc) < 12) return; // gom các nhích rất nhỏ của touchpad
      const dir = Math.sign(acc);
      acc = 0;
      const tops = sectionTops();
      const y = window.scrollY;
      const target = dir > 0 ? tops.find((t) => t > y + 4) : [...tops].reverse().find((t) => t < y - 4);
      if (target === undefined) return;
      if (reduce) { window.scrollTo(0, target); lockUntil = now + 250; return; }
      lockUntil = now + glideTo(target) + 120;
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("wheel", onWheel);
      wide.removeEventListener("change", apply);
      html.style.scrollSnapType = prev.snap;
      html.style.scrollBehavior = prev.behavior;
    };
  }, []);

  // Nội dung mỗi section mờ dần lên và trượt nhẹ khi vào màn hình.
  React.useEffect(() => {
    const items = [...document.querySelectorAll<HTMLElement>("main > section > *")];
    items.forEach((el) => el.classList.add("landing-reveal"));
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
    }, { threshold: 0.18 });
    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="min-h-dvh antialiased [&_h1]:text-balance [&_h2]:text-balance [&_p]:text-pretty" style={{ backgroundColor: CANVAS, color: INK, colorScheme: "light" }}>
      <Nav />
      <ScrollTopButton />

      <main>
        <section className="mx-auto flex min-h-dvh max-w-7xl snap-start snap-always flex-col items-center justify-center px-4 pb-12 pt-24 text-center sm:px-6">
          <h1 className="mx-auto max-w-[13em] text-[clamp(2.5rem,min(7.5vw,11vh),5.75rem)] font-bold" style={display}>
            <span className="block text-balance">Nhớ từ vựng tiếng Hàn.</span>
            <span className="block text-balance" style={{ color: ACCENT }}>Mỗi ngày một chút.</span>
          </h1>
          <p className="mx-auto mt-[0.9em] max-w-[30em] text-[clamp(1.0625rem,0.9rem+0.6vw,1.375rem)] leading-relaxed" style={{ color: MUTED }}>
            <span className="block text-balance">Chỉ sau một ngày, bạn quên gần hết từ vừa học.</span><span className="block text-balance">Haechi nhắc lại đúng khoảnh khắc đó.</span>
          </p>
        </section>

        <section className="snap-start snap-always flex items-center py-16 md:min-h-dvh md:pb-10 md:pt-24" style={{ backgroundColor: TILE }}>
          <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
            <BackgroundPlayground />
          </div>
        </section>

        {SHOTS.map((shot, n) => (
          <section key={shot.src} id={n === 0 ? "giao-dien" : undefined} className="snap-start snap-always flex items-center py-16 md:min-h-dvh md:pb-10 md:pt-24" style={{ backgroundColor: n % 2 ? TILE : CANVAS }}>
            <div className={`mx-auto grid w-full max-w-5xl items-center gap-12 px-4 sm:px-6 md:grid-cols-[minmax(0,30rem)_auto] md:justify-center md:gap-[clamp(2.5rem,6vw,6rem)]`}>
              {/* Điện thoại co theo chiều cao màn hình để luôn nằm gọn trong một màn ngang. */}
              <div className="mx-auto w-[min(72vw,calc((100dvh-15rem)*0.43))] max-w-[360px] md:w-[min(360px,calc((100dvh-8rem)*0.42))]">
                <PhoneFrame>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={shot.src} alt={shot.alt} width={374} height={809} loading="lazy" className="block h-auto w-full" />
                </PhoneFrame>
              </div>
              <div className="order-first text-center md:text-left">
                <p className="text-sm font-semibold" style={{ color: ACCENT }}>{shot.caption}</p>
                <h2 className="mt-2 text-[clamp(2rem,1.2rem+3vw,3.5rem)] font-bold" style={heading}>{shot.title}</h2>
                <p className="mx-auto mt-4 max-w-[26em] text-[clamp(1rem,0.9rem+0.45vw,1.25rem)] md:mx-0" style={{ color: MUTED }}>{shot.text}</p>
              </div>
            </div>
          </section>
        ))}

        <section className="snap-start snap-always flex items-center py-16 md:min-h-dvh md:pb-10 md:pt-24" style={{ backgroundColor: TILE }}>
          <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
            <h2 className="max-w-[16em] text-[clamp(2rem,1.2rem+3vw,3.5rem)] font-bold" style={heading}>Mọi thứ để học đều đặn.<br /><span style={{ color: MUTED }}>Không cần tự nhớ hôm nay ôn gì.</span></h2>
            <dl className="mt-[clamp(2rem,6vh,3.5rem)] grid gap-x-[clamp(1.5rem,3vw,2.5rem)] gap-y-[clamp(1.5rem,4vh,2.5rem)] sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <div key={f.title} className="border-t pt-5" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
                  <dt className="text-[clamp(1rem,0.92rem+0.35vw,1.2rem)] font-semibold" style={{ color: INK, letterSpacing: "-0.01em" }}>{f.title}</dt>
                  <dd className="mt-1.5 text-[clamp(0.9375rem,0.88rem+0.25vw,1.0625rem)] leading-relaxed" style={{ color: MUTED }}>{f.text}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="snap-start snap-always flex items-center py-16 md:min-h-dvh md:pb-10 md:pt-24 justify-center px-4 text-center sm:px-6">
          <div>
            <h2 className="mx-auto max-w-[12em] text-[clamp(2.25rem,1.2rem+4vw,4.25rem)] font-bold" style={display}>Học từ đầu tiên ngay hôm nay.</h2>
            <p className="mx-auto mt-5 max-w-[30em] text-[clamp(1rem,0.9rem+0.45vw,1.25rem)]" style={{ color: MUTED }}>Miễn phí. Đăng ký bằng email hoặc Google trong vài giây.</p>
            <Link href="/login?mode=register" className="mt-8 inline-block rounded-full px-[1.9em] py-[0.9em] text-[clamp(1rem,0.95rem+0.25vw,1.125rem)] font-medium transition-transform duration-100 active:scale-[0.97]" style={{ backgroundColor: ACCENT, color: "#fff" }}>
              Tạo tài khoản
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t px-4 py-8 text-xs sm:px-6" style={{ borderColor: "rgba(0,0,0,0.08)", backgroundColor: TILE, color: MUTED }}>
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 sm:flex-row">
          <p>© {new Date().getFullYear()} HaechiVN</p>
          <div className="flex gap-5">
            <Link href="/terms" className="hover:underline">Điều khoản</Link>
            <Link href="/privacy" className="hover:underline">Quyền riêng tư</Link>
            <Link href="/login" className="hover:underline">Đăng nhập</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
