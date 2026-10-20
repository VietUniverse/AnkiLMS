"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "../../components/AppShell";
import { useApp } from "../../contexts/AppProvider";
import { ApiClient, DailyMissionsSummary } from "../../lib/apiClient";
import { ArrowRight, BookOpen, CheckCircle2, Headphones, LockKeyhole, Mic2, RefreshCw, Sparkles, Target, Users, Zap } from "lucide-react";
import { DailyShadowingChallenge } from "../../components/DailyShadowingChallenge";

const missionIcons = {
  shadowing: Mic2,
  vocabulary: BookOpen,
  dictation: Headphones,
} as const;

export default function DailyMissionsPage() {
  const { currentUser, handleOpenAuth } = useApp();
  const [summary, setSummary] = useState<DailyMissionsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void ApiClient.getDailyMissions().then((data) => {
      if (active) {
        setSummary(data);
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [currentUser?.id]);

  const refresh = () => {
    setLoading(true);
    void ApiClient.getDailyMissions().then((data) => {
      setSummary(data);
      setLoading(false);
    });
  };

  const completedCount = summary?.completedCount || 0;
  const fallbackMissions: DailyMissionsSummary["missions"] = [
    { id: "shadowing", title: "Nhại câu sau", description: "Nghe một câu tiếng Hàn, thu âm và đọc lại.", href: "/shadowing", completed: false, sessions: 0, gemsAwarded: 0, learnersToday: 0 },
    { id: "vocabulary", title: "Ôn từ vựng", description: "Ôn ít nhất một thẻ Anki và chọn mức độ nhớ.", href: "/flashcards", completed: false, sessions: 0, gemsAwarded: 0, learnersToday: 0 },
    { id: "dictation", title: "Nghe chép chính tả", description: "Nghe và chép đúng ít nhất một câu.", href: "/dictation", completed: false, sessions: 0, gemsAwarded: 0, learnersToday: 0 },
  ];
  const dateLabel = summary?.date
    ? new Date(`${summary.date}T12:00:00+07:00`).toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long" })
    : new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long" });
  const challengeDate = summary?.date || new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6 pb-24 animate-fadeIn">
        <section className="overflow-hidden rounded-3xl border border-amber-400/30 bg-gradient-to-br from-[#1a2340] via-[#15213f] to-[#101a34] p-5 sm:p-7 shadow-xl shadow-amber-950/10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-300"><Target className="h-4 w-4" /> Nhiệm vụ hôm nay</p>
              <h1 className="mt-2 text-2xl font-black text-white sm:text-3xl">Học một chút, tiến bộ mỗi ngày</h1>
              <p className="mt-2 text-sm text-slate-400">{dateLabel} · Mỗi nhiệm vụ hoàn thành nhận 30 💎, tối đa 90 💎 mỗi ngày.</p>
            </div>
            <button onClick={refresh} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-xs font-bold text-slate-300 hover:text-white disabled:opacity-50">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Làm mới
            </button>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl border border-slate-700/70 bg-slate-950/40 p-4">
            <div className="min-w-36">
              <div className="text-xs font-bold text-slate-400">Tiến độ hôm nay</div>
              <div className="mt-1 text-xl font-black text-white">{loading ? "—" : `${completedCount}/3`} <span className="text-sm font-semibold text-slate-400">nhiệm vụ</span></div>
            </div>
            <div className="h-2 min-w-40 flex-1 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all" style={{ width: `${(completedCount / 3) * 100}%` }} />
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-sm font-black text-cyan-200"><Sparkles className="h-4 w-4 text-cyan-300" /> {summary?.user.gems ?? currentUser?.gems ?? 0} 💎</div>
          </div>
          {!currentUser && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-500/20 bg-sky-500/10 p-3 text-xs text-sky-100">
              <span><LockKeyhole className="mr-2 inline h-4 w-4" />Đăng nhập để lưu tiến độ và nhận kim cương nhiệm vụ.</span>
              <button onClick={() => handleOpenAuth(false)} className="rounded-lg bg-sky-500 px-3 py-2 font-bold text-white hover:bg-sky-400">Đăng nhập</button>
            </div>
          )}
        </section>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.8fr)]">
          <section className="space-y-3">
            <div className="flex items-end justify-between gap-3">
              <div><h2 className="text-lg font-black text-white">Ba bước học hôm nay</h2><p className="mt-1 text-xs text-slate-500">Hoàn thành hoạt động học thật để hệ thống tự ghi nhận.</p></div>
              <span className="text-xs font-bold text-slate-500">{dateLabel}</span>
            </div>
            {loading && !summary ? <div className="rounded-2xl border border-slate-800 bg-[#0f1b38] p-6 text-sm text-slate-400">Đang tải nhiệm vụ…</div> : (
              <div className="space-y-3">
                {(summary?.missions || fallbackMissions).map((mission, index) => {
                  const Icon = missionIcons[mission.id];
                  return (
                    <article key={mission.id} className={`rounded-2xl border p-4 sm:p-5 transition-colors ${mission.completed ? "border-emerald-500/30 bg-emerald-950/15" : "border-slate-800 bg-[#0f1b38] hover:border-sky-500/30"}`}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${mission.completed ? "bg-emerald-500/15 text-emerald-300" : "bg-sky-500/15 text-sky-300"}`}><Icon className="h-5 w-5" /></div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2"><span className="text-[10px] font-black uppercase tracking-wider text-slate-500">{index + 1}</span><h3 className="font-black text-white">{mission.title}</h3>{mission.completed && <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">Hoàn thành</span>}</div>
                            <p className="mt-1 text-xs text-slate-400">{mission.description}</p>
                            <p className="mt-2 text-[11px] text-slate-500">{mission.completed ? `Đã ghi nhận ${mission.sessions} phiên học hôm nay` : "Chưa hoàn thành"}</p>
                            {mission.id === "shadowing" && <DailyShadowingChallenge date={challengeDate} userId={currentUser?.id} completed={mission.completed} onComplete={refresh} />}
                          </div>
                        </div>
                        <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1.5 text-xs font-black text-amber-300">💎 30{mission.gemsAwarded ? " · Đã nhận" : ""}</span>
                      </div>
                      <Link href={mission.href} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-sky-600/15 px-3 py-2 text-xs font-extrabold text-sky-200 transition-colors hover:bg-sky-600/25">
                        {mission.completed ? "Luyện thêm" : mission.id === "shadowing" ? "Mở thư viện Shadowing" : "Bắt đầu học"}<ArrowRight className="h-4 w-4" />
                      </Link>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <aside className="h-fit rounded-2xl border border-slate-800 bg-[#0f1b38] p-5">
            <div className="flex items-center gap-2"><Users className="h-4 w-4 text-sky-300" /><h2 className="font-black text-white">Cộng đồng đang học</h2></div>
            <p className="mt-1 text-xs text-slate-500">Số người học đã có phiên học trong 24 giờ qua.</p>
            <div className="mt-4 space-y-2">
              {[
                { id: "shadowing", label: "Shadowing", Icon: Mic2 },
                { id: "vocabulary", label: "Ôn từ vựng", Icon: BookOpen },
                { id: "dictation", label: "Nghe chép", Icon: Headphones },
              ].map(({ id, label, Icon }) => {
                const count = summary?.missions.find((mission) => mission.id === id)?.learnersToday || 0;
                return <div key={id} className="flex items-center justify-between rounded-xl bg-slate-950/40 px-3 py-3"><span className="flex items-center gap-2 text-xs font-bold text-slate-300"><Icon className="h-4 w-4 text-slate-500" />{label}</span><span className="flex items-center gap-1 text-xs font-black text-sky-300"><Zap className="h-3 w-3" />{count}</span></div>;
              })}
            </div>
            {completedCount === 3 && <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs font-bold text-emerald-300"><CheckCircle2 className="h-4 w-4 shrink-0" />Bạn đã hoàn thành cả ba nhiệm vụ hôm nay. Hẹn gặp lại ngày mai!</div>}
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
