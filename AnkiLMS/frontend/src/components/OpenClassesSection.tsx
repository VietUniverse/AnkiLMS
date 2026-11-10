"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, GraduationCap, Lock, Volume2 } from "lucide-react";
import { useApp } from "../contexts/AppProvider";
import { ApiClient } from "../lib/apiClient";
import { speakKorean } from "../lib/koreanSpeech";
import { OPEN_CLASS_LESSON_SIZE, OPEN_CLASSES, openClassId, OpenClass, OpenClassKey } from "../lib/openClasses";
import { OPEN_CLASS_TRIAL } from "../data/openClassTrial";

type TrialWord = [hangul: string, vietnamese: string, partOfSpeech: string];

type Props = {
  joinedClassIds: string[];
  /** Gọi sau khi vào lớp thành công (tải lại danh sách lớp và mở lớp vừa vào). */
  onJoined: (classId: string) => void;
  /** Mở một lớp đã tham gia. */
  onOpen: (classId: string) => void;
};

const PENDING_JOIN_KEY = "haechivn_pending_open_class";

export function OpenClassesSection({ joinedClassIds, onJoined, onOpen }: Props) {
  const { currentUser, handleOpenAuth } = useApp();
  const [trialKey, setTrialKey] = useState<OpenClassKey | null>(null);
  const [joining, setJoining] = useState<OpenClassKey | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function join(openClass: OpenClass) {
    if (!currentUser) {
      // Nhớ lớp khách muốn vào để tự vào lớp ngay sau khi đăng ký/đăng nhập.
      try { sessionStorage.setItem(PENDING_JOIN_KEY, openClass.key); } catch { /* bỏ qua */ }
      handleOpenAuth(true);
      return;
    }
    setJoining(openClass.key);
    setMessage(null);
    try {
      await ApiClient.classAction({ action: "join_open", level: openClass.key });
      setMessage({ type: "success", text: `Bạn đã vào lớp ${openClass.title}. Các bài học của lớp ở ngay bên dưới.` });
      setTrialKey(null);
      onJoined(openClassId(openClass.key));
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Không vào được lớp." });
    } finally {
      setJoining(null);
    }
  }

  // Sau khi đăng nhập xong, vào lớp khách đã chọn lúc còn học thử.
  useEffect(() => {
    if (!currentUser) return;
    // Đọc trong timeout: React chạy effect hai lần ở dev, lần đầu bị huỷ nên không mất lớp đang chờ.
    const timer = window.setTimeout(() => {
      let pending: string | null = null;
      try { pending = sessionStorage.getItem(PENDING_JOIN_KEY); sessionStorage.removeItem(PENDING_JOIN_KEY); } catch { /* bỏ qua */ }
      const openClass = OPEN_CLASSES.find((item) => item.key === pending);
      if (openClass) void join(openClass);
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ chạy khi vừa đăng nhập
  }, [currentUser?.id]);

  const trialClass = OPEN_CLASSES.find((item) => item.key === trialKey);
  if (trialClass) {
    return <TrialLesson
      openClass={trialClass}
      words={OPEN_CLASS_TRIAL[trialClass.key]?.words || []}
      joined={joinedClassIds.includes(openClassId(trialClass.key))}
      joining={joining === trialClass.key}
      isGuest={!currentUser}
      onBack={() => setTrialKey(null)}
      onJoin={() => join(trialClass)}
    />;
  }

  return <section aria-labelledby="open-classes-title" className="space-y-4">
    <div>
      <h2 id="open-classes-title" className="flex items-center gap-2 text-xl font-black text-stone-900 dark:text-white"><GraduationCap className="h-6 w-6 text-sky-400" /> Lớp mở theo cấp độ</h2>
      <p className="mt-1 text-sm text-stone-600 dark:text-slate-300">Học thử miễn phí vài từ đầu của mỗi lớp. Muốn học tiếp thì đăng nhập để vào lớp: mỗi bài 50 từ, có lưu tiến độ.</p>
    </div>
    {message && <p role="status" className={`rounded-xl px-4 py-3 text-sm font-semibold ${message.type === "success" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-200" : "bg-rose-500/15 text-rose-700 dark:text-rose-200"}`}>{message.text}</p>}
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {OPEN_CLASSES.map((item) => {
        const joined = joinedClassIds.includes(openClassId(item.key));
        const count = OPEN_CLASS_TRIAL[item.key]?.count || 0;
        return <li key={item.key} className="flex flex-col rounded-2xl border border-stone-200 bg-white p-5 dark:border-slate-700/70 dark:bg-[#111c38]">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-lg font-black text-stone-900 dark:text-white">{item.title}</h3>
            {joined && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="h-3.5 w-3.5" /> Đã vào lớp</span>}
          </div>
          <p className="mt-2 flex-1 text-sm text-stone-600 dark:text-slate-300">{item.description}</p>
          <p className="mt-3 text-xs font-semibold text-stone-500 dark:text-slate-400">{count.toLocaleString("vi-VN")} từ vựng · {Math.ceil(count / OPEN_CLASS_LESSON_SIZE)} bài</p>
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => setTrialKey(item.key)} disabled={!count} className="flex-1 rounded-xl bg-sky-500 px-3 py-2.5 text-sm font-black text-white transition hover:bg-sky-600 disabled:opacity-50 cursor-pointer" style={{ color: "#fff" }}>Học thử</button>
            {joined
              ? <button type="button" onClick={() => onOpen(openClassId(item.key))} className="flex-1 rounded-xl border border-emerald-500 px-3 py-2.5 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-500/10 cursor-pointer">Vào học</button>
              : <button type="button" onClick={() => join(item)} disabled={joining === item.key} className="flex-1 rounded-xl border border-sky-500 px-3 py-2.5 text-sm font-bold text-sky-700 transition hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-sky-500/10 disabled:opacity-50 cursor-pointer">{joining === item.key ? "Đang vào…" : "Vào lớp"}</button>}
          </div>
        </li>;
      })}
    </ul>
  </section>;
}

function TrialLesson({ openClass, words, joined, joining, isGuest, onBack, onJoin }: {
  openClass: OpenClass; words: TrialWord[]; joined: boolean; joining: boolean; isGuest: boolean;
  onBack: () => void; onJoin: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const finished = index >= words.length;
  const word = words[index];

  const next = () => { setIndex((value) => value + 1); setRevealed(false); };
  const previous = () => { setIndex((value) => Math.max(0, value - 1)); setRevealed(false); };

  return <section aria-label={`Học thử ${openClass.title}`} className="mx-auto max-w-xl space-y-4">
    <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-sm font-bold text-sky-700 hover:underline dark:text-sky-300 cursor-pointer"><ArrowLeft className="h-4 w-4" /> Tất cả lớp</button>
    <div className="flex items-center justify-between">
      <h2 className="text-xl font-black text-stone-900 dark:text-white">Học thử · {openClass.title}</h2>
      <span className="text-sm font-semibold text-stone-500 dark:text-slate-400">{Math.min(index + 1, words.length)}/{words.length}</span>
    </div>
    <div className="h-1.5 overflow-hidden rounded-full bg-stone-200 dark:bg-white/10" aria-hidden="true">
      <div className="h-full bg-sky-500 transition-all" style={{ width: `${words.length ? (Math.min(index, words.length) / words.length) * 100 : 0}%` }} />
    </div>

    {!finished && word ? <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center dark:border-transparent dark:bg-[#111c38]">
      <div className="font-noto text-4xl font-black text-stone-900 dark:text-white">{word[0]}</div>
      {word[2] && <div className="mt-1 text-xs font-semibold text-stone-500 dark:text-slate-400">{word[2]}</div>}
      <button type="button" onClick={() => speakKorean(word[0])} aria-label={`Nghe phát âm ${word[0]}`} className="mt-3 inline-flex items-center gap-1 rounded-full bg-stone-100 px-3 py-1.5 text-xs font-bold text-stone-700 hover:bg-stone-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 cursor-pointer"><Volume2 className="h-4 w-4" /> Nghe</button>
      <div className="mt-6 min-h-[3rem]">
        {revealed
          ? <p className="text-lg font-semibold text-stone-800 dark:text-slate-200">{word[1]}</p>
          : <button type="button" onClick={() => setRevealed(true)} className="rounded-xl bg-sky-500 px-5 py-2.5 text-sm font-black text-white hover:bg-sky-600 cursor-pointer" style={{ color: "#fff" }}>Xem nghĩa</button>}
      </div>
      <div className="mt-6 flex justify-between">
        <button type="button" onClick={previous} disabled={index === 0} className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-bold text-stone-600 hover:bg-stone-100 dark:text-slate-300 dark:hover:bg-white/10 disabled:opacity-40 cursor-pointer"><ArrowLeft className="h-4 w-4" /> Trước</button>
        <button type="button" onClick={next} className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-bold text-stone-900 hover:bg-stone-100 dark:text-white dark:hover:bg-white/10 cursor-pointer">Tiếp <ArrowRight className="h-4 w-4" /></button>
      </div>
    </div> : <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center dark:border-transparent dark:bg-[#111c38]">
      <Lock className="mx-auto h-8 w-8 text-sky-400" />
      <p className="mt-3 text-lg font-black text-stone-900 dark:text-white">Bạn đã học thử xong {words.length} từ đầu!</p>
      <p className="mt-1 text-sm text-stone-600 dark:text-slate-300">{joined ? "Bạn đã ở trong lớp này, bấm \"Vào học\" ở danh sách lớp để học tiếp." : isGuest ? "Đăng ký hoặc đăng nhập để vào lớp, học tiếp toàn bộ từ vựng và lưu tiến độ." : "Vào lớp để học tiếp toàn bộ từ vựng và nhận bài tập."}</p>
      {!joined && <button type="button" onClick={onJoin} disabled={joining} className="mt-5 rounded-xl bg-sky-500 px-6 py-3 text-sm font-black text-white hover:bg-sky-600 disabled:opacity-50 cursor-pointer" style={{ color: "#fff" }}>{joining ? "Đang vào lớp…" : isGuest ? "Đăng ký để học tiếp" : "Vào lớp học tiếp"}</button>}
    </div>}
  </section>;
}
