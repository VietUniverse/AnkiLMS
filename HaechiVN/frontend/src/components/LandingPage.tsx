"use client";

import React from "react";
import Link from "next/link";
import { posTone } from "../lib/vocabCards";

// Trang giới thiệu cho khách chưa đăng nhập: cho thấy app trông thế nào trước khi bắt tạo tài khoản.
const DEMO = [
  { word: "사랑하다", pos: "động từ", meaning: "yêu", ex: "저는 한국어를 사랑해요." },
  { word: "귀엽다", pos: "tính từ", meaning: "dễ thương", ex: "강아지가 정말 귀여워요!" },
  { word: "친구", pos: "danh từ", meaning: "bạn bè", ex: "친구랑 같이 공부해요." },
  { word: "천천히", pos: "phó từ", meaning: "từ từ, chậm rãi", ex: "천천히 말해 주세요." },
];

function DemoCard() {
  const [i, setI] = React.useState(0);
  const [flipped, setFlipped] = React.useState(false);
  const [dx, setDx] = React.useState(0);
  const [done, setDone] = React.useState({ good: 0, again: 0 });
  const [startX, setStartX] = React.useState<number | null>(null);
  const card = DEMO[i % DEMO.length];
  const tone = posTone(card.pos);

  const rate = (good: boolean) => {
    setDone((d) => (good ? { ...d, good: d.good + 1 } : { ...d, again: d.again + 1 }));
    setDx(good ? 600 : -600);
    setTimeout(() => { setI((n) => n + 1); setFlipped(false); setDx(0); }, 220);
  };

  const tint = Math.min(1, Math.abs(dx) / 120);
  return (
    <div className="mx-auto w-full max-w-[340px] select-none">
      <div className="relative">
      <div className="absolute inset-x-6 -bottom-3 h-full rounded-[28px] bg-white/60 shadow-sm" aria-hidden />
      <div
        role="button"
        tabIndex={0}
        aria-label={flipped ? "Thẻ đang lật, vuốt hoặc bấm nút để chấm" : "Bấm để lật thẻ"}
        onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); setFlipped((f) => !f); } }}
        onPointerDown={(e) => { setStartX(e.clientX); (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); }}
        onPointerMove={(e) => { if (startX !== null) setDx(e.clientX - startX); }}
        onPointerUp={() => {
          const moved = dx;
          setStartX(null);
          if (Math.abs(moved) >= 100) rate(moved > 0);
          else { setDx(0); if (Math.abs(moved) < 6) setFlipped((f) => !f); }
        }}
        className="relative cursor-grab touch-pan-y overflow-hidden rounded-[28px] bg-white shadow-[0_20px_50px_-20px_rgba(15,27,56,0.35)] ring-1 ring-stone-200 transition-transform active:cursor-grabbing"
        style={{ transform: `translateX(${dx}px) rotate(${dx / 18}deg)`, transition: startX === null ? "transform .22s ease" : "none" }}
      >
        <div className={`h-2 ${tone?.bar ?? "bg-amber-500"}`} />
        <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 px-6 py-8 text-center">
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${(tone?.chip ?? "").split(" ").filter((c) => !c.startsWith("dark:")).join(" ")}`}>{card.pos}</span>
          <p className="text-5xl font-black tracking-tight text-[#0f1b38]" lang="ko">{card.word}</p>
          {flipped ? (
            <div className="space-y-2 animate-fadeIn">
              <p className="text-2xl font-extrabold text-rose-500">{card.meaning}</p>
              <p className="text-sm text-stone-500" lang="ko">{card.ex}</p>
            </div>
          ) : (
            <p className="text-sm font-semibold text-stone-400">Chạm để lật thẻ ✨</p>
          )}
        </div>
        {dx !== 0 && (
          <div
            className={`pointer-events-none absolute inset-0 flex items-center justify-center text-3xl font-black text-white ${dx > 0 ? "bg-emerald-500" : "bg-rose-500"}`}
            style={{ opacity: tint * 0.85 }}
          >
            {dx > 0 ? "Nhớ rồi!" : "Học lại"}
          </div>
        )}
      </div>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <button type="button" onClick={() => rate(false)} className="rounded-2xl bg-rose-100 py-3 text-sm font-extrabold text-rose-600 transition hover:bg-rose-200 active:scale-95">
          ← Học lại {done.again > 0 && <span className="tabular-nums">({done.again})</span>}
        </button>
        <button type="button" onClick={() => rate(true)} className="rounded-2xl bg-emerald-100 py-3 text-sm font-extrabold text-emerald-700 transition hover:bg-emerald-200 active:scale-95">
          Nhớ rồi → {done.good > 0 && <span className="tabular-nums">({done.good})</span>}
        </button>
      </div>
      <p className="mt-3 text-center text-xs font-medium text-stone-500">Thử vuốt trái/phải như ở trong app nè</p>
    </div>
  );
}

const FEATURES = [
  { emoji: "🃏", title: "Flashcard thông minh", text: "Thuật toán FSRS nhắc đúng lúc bạn sắp quên. Vuốt phải là nhớ, vuốt trái là học lại.", bg: "bg-sky-100" },
  { emoji: "⌨️", title: "Thẻ gõ chữ Hàn", text: "Nghe nghĩa, tự gõ lại từ. Nhớ cả mặt chữ lẫn cách viết, không chỉ nhìn cho quen.", bg: "bg-violet-100" },
  { emoji: "🔥", title: "Chuỗi ngày học", text: "Mỗi ngày vài từ, giữ lửa streak. Biểu đồ cho bạn thấy vốn từ lớn dần lên.", bg: "bg-orange-100" },
  { emoji: "🏆", title: "Bảng xếp hạng", text: "Đua XP và streak với bạn bè. Lên bục vinh quang theo tuần, tháng hay mọi thời đại.", bg: "bg-amber-100" },
  { emoji: "👩‍🏫", title: "Lớp học với giáo viên", text: "Vào lớp bằng mã, nhận bài tập từ vựng, giáo viên theo dõi tiến độ từng bạn.", bg: "bg-emerald-100" },
  { emoji: "📖", title: "Từ điển & ChatGPT", text: "Tra nghĩa, xem ví dụ, hỏi ChatGPT ngay trên thẻ đang học. Không phải mở tab khác.", bg: "bg-rose-100" },
];

// Nền navy để inline: globals.css ép lại màu nền/chữ khi giao diện sáng.
const NAVY = { backgroundColor: "#0f1b38", color: "#fff" };

// Ảnh chụp từ localhost; tên người dùng trên bảng xếp hạng đã đổi thành tên giả.
const SHOTS = [
  { src: "/landing/dashboard.webp", alt: "Trang chủ HaechiVN: chuỗi ngày học, nút Học tiếp và các ô thống kê", caption: "Trang chủ: streak & học tiếp" },
  { src: "/landing/stats.webp", alt: "Thống kê 7 và 30 ngày qua cùng biểu đồ phát triển vốn từ", caption: "Thống kê vốn từ" },
  { src: "/landing/leaderboard.webp", alt: "Bảng xếp hạng streak với bục 2-1-3", caption: "Bảng xếp hạng" },
];

const PODIUM = [
  { name: "Minh Anh", streak: 42, h: "h-24", place: 2, color: "bg-slate-200" },
  { name: "Bảo Ngọc", streak: 87, h: "h-32", place: 1, color: "bg-amber-300" },
  { name: "Gia Huy", streak: 31, h: "h-20", place: 3, color: "bg-orange-200" },
];

export function LandingPage() {
  return (
    <div className="min-h-dvh bg-[#fff8ef] text-[#0f1b38]" style={{ colorScheme: "light" }}>
      <header className="sticky top-0 z-20 border-b border-amber-100/80 bg-[#fff8ef]/85 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2 font-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/haechivn-mark.png" alt="" className="h-9 w-9 rounded-xl" />
            <span className="text-lg">HaechiVN</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden whitespace-nowrap rounded-full px-3 py-2 text-sm font-bold text-[#0f1b38] hover:bg-amber-100 sm:inline-block">Đăng nhập</Link>
            <Link href="/login" className="whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold shadow-md sm:hidden" style={NAVY}>Đăng nhập</Link>
            <Link href="/login?mode=register" className="hidden whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold shadow-md sm:inline-block" style={NAVY}>Học miễn phí</Link>
          </div>
        </nav>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-amber-200/60 blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute -right-20 top-40 h-72 w-72 rounded-full bg-rose-200/60 blur-3xl" aria-hidden />
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-10 sm:px-6 md:grid-cols-2 md:pt-20">
            <div className="text-center md:text-left">
              <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-bold text-rose-500 shadow-sm ring-1 ring-rose-100">
                <span lang="ko">안녕!</span> Học tiếng Hàn mỗi ngày
              </p>
              <h1 className="mt-5 text-4xl font-black leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
                Nhớ từ vựng tiếng Hàn <span className="text-rose-500">dễ như lướt thẻ</span>
              </h1>
              <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-stone-600 md:mx-0">
                Mỗi ngày vài phút: lật thẻ, vuốt, gõ lại từ. HaechiVN nhắc bạn ôn đúng lúc sắp quên, để từ đã học thì nhớ luôn.
              </p>
              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row md:justify-start sm:justify-center">
                <Link href="/login?mode=register" className="w-full rounded-2xl bg-rose-500 px-7 py-4 text-base font-black text-white shadow-lg shadow-rose-500/30 transition hover:bg-rose-600 active:scale-95 sm:w-auto">
                  Bắt đầu học miễn phí
                </Link>
                <a href="#tinh-nang" className="w-full rounded-2xl bg-white px-7 py-4 text-base font-bold text-[#0f1b38] ring-1 ring-stone-200 transition hover:bg-stone-50 sm:w-auto">
                  Xem có gì hay
                </a>
              </div>
            </div>
            <DemoCard />
          </div>
        </section>

        <section id="tinh-nang" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
          <h2 className="text-center text-3xl font-black sm:text-4xl">Mọi thứ để học đều đặn</h2>
          <p className="mx-auto mt-3 max-w-lg text-center text-stone-600">Không cần tự nhớ hôm nay ôn gì. Mở app ra là có sẵn.</p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-stone-100 transition hover:-translate-y-1 hover:shadow-md">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl ${f.bg}`} aria-hidden>{f.emoji}</div>
                <h3 className="mt-4 text-lg font-extrabold">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-stone-600">{f.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white/60 py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="text-center text-3xl font-black sm:text-4xl">Giao diện thật trong app</h2>
            <p className="mx-auto mt-3 max-w-lg text-center text-stone-600">Gọn, sáng, dùng trên điện thoại như một app thật. Cài lên màn hình chính chỉ một chạm.</p>
            <div className="-mx-4 mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-4 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">
              {SHOTS.map((s) => (
                <figure key={s.src} className="w-[68%] shrink-0 snap-center sm:mx-auto sm:w-full sm:max-w-[250px]">
                  <div className="overflow-hidden rounded-[32px] border-[6px] border-[#0f1b38] bg-white shadow-xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.src} alt={s.alt} width={374} height={809} loading="lazy" className="block h-auto w-full" />
                  </div>
                  <figcaption className="mt-3 text-center text-sm font-bold">{s.caption}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-2">
          <div className="order-2 rounded-[32px] p-6 shadow-xl md:order-1 sm:p-8" style={NAVY}>
            <div className="flex items-center justify-between text-sm font-bold">
              <span>🏆 Bảng xếp hạng</span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs">Streak · Mọi lúc</span>
            </div>
            <div className="mt-8 flex items-end justify-center gap-3">
              {PODIUM.map((p) => (
                <div key={p.name} className="flex w-24 flex-col items-center">
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-lg font-black">{p.name[0]}</div>
                  <p className="text-xs font-bold">{p.name}</p>
                  <p className="mb-2 text-xs text-amber-300">🔥 {p.streak} ngày</p>
                  <div className={`${p.h} ${p.color} flex w-full items-start justify-center rounded-t-2xl pt-2 text-2xl font-black text-[#0f1b38]`}>{p.place}</div>
                </div>
              ))}
            </div>
            <div className="mt-6 grid grid-cols-4 gap-2 text-center">
              {[["128", "từ đã học", "bg-sky-500"], ["94%", "nhớ đúng", "bg-emerald-500"], ["15", "ngày streak", "bg-orange-500"], ["2.4k", "XP", "bg-violet-500"]].map(([v, l, c]) => (
                <div key={l} className={`rounded-2xl ${c} px-1 py-3`}>
                  <p className="text-lg font-black tabular-nums">{v}</p>
                  <p className="text-[10px] font-semibold opacity-90">{l}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="order-1 text-center md:order-2 md:text-left">
            <h2 className="text-3xl font-black sm:text-4xl">Học một mình thì dễ bỏ, có bạn đua thì khác</h2>
            <p className="mt-4 text-stone-600">Giữ chuỗi ngày học, kiếm XP và leo bảng xếp hạng. Thống kê cho bạn thấy mình đã tiến bộ bao nhiêu so với tuần trước.</p>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-3xl rounded-[36px] bg-gradient-to-br from-rose-400 to-amber-400 px-6 py-12 text-center text-white shadow-xl">
            <p className="text-4xl" aria-hidden>🐯</p>
            <h2 className="mt-3 text-3xl font-black sm:text-4xl">Học từ đầu tiên ngay hôm nay</h2>
            <p className="mx-auto mt-3 max-w-md text-white/90">Tạo tài khoản miễn phí trong vài giây, đăng nhập bằng Google cũng được.</p>
            <Link href="/login?mode=register" className="mt-8 inline-block rounded-2xl bg-white px-8 py-4 text-base font-black text-rose-500 shadow-lg transition hover:scale-105 active:scale-95">
              Tạo tài khoản miễn phí
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-amber-100 px-4 py-8 text-center text-sm text-stone-500">
        <div className="flex justify-center gap-5">
          <Link href="/terms" className="hover:text-stone-800">Điều khoản</Link>
          <Link href="/privacy" className="hover:text-stone-800">Quyền riêng tư</Link>
          <Link href="/login" className="hover:text-stone-800">Đăng nhập</Link>
        </div>
        <p className="mt-3">© {new Date().getFullYear()} HaechiVN · haechi.vn</p>
      </footer>
    </div>
  );
}
