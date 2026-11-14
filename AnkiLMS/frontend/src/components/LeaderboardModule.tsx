"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { BookOpen, Flame, Zap, Users } from "lucide-react";
import { ApiClient, UserProfile, VocabularyLeaderboardEntry } from "../lib/apiClient";
import { getStudyRank } from "../lib/studyRanks";

interface LeaderboardModuleProps {
  currentUser: UserProfile | null;
}

type TabKey = "xp" | "streak" | "vocab";
type PeriodKey = "day" | "week" | "month";

type BoardRow = {
  id: string;
  name: string;
  email?: string;
  avatar_url?: string | null;
  level?: number;
  xp?: number;
  streak?: number;
  vocab_total?: number;
  vocab_today?: number;
};

const TABS: { key: TabKey; label: string; icon: typeof Zap }[] = [
  { key: "xp", label: "XP", icon: Zap },
  { key: "streak", label: "Streak", icon: Flame },
  { key: "vocab", label: "Từ vựng", icon: BookOpen },
];

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "day", label: "Ngày" },
  { key: "week", label: "Tuần" },
  { key: "month", label: "Tháng" },
];

const TAB_ACTIVE: Record<TabKey, string> = {
  xp: "bg-blue-600 text-white",
  streak: "bg-amber-600 text-white",
  vocab: "bg-emerald-600 text-white",
};

const SCORE_COLOR: Record<TabKey, string> = {
  xp: "text-blue-500",
  streak: "text-amber-500",
  vocab: "text-emerald-500",
};

const METRIC_LABEL: Record<TabKey, string> = {
  xp: "XP",
  streak: "Streak",
  vocab: "Từ vựng",
};

const UNIT: Record<TabKey, string> = {
  xp: "XP",
  streak: "ngày streak",
  vocab: "từ",
};

export const LeaderboardModule: React.FC<LeaderboardModuleProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [vocabulary, setVocabulary] = useState<VocabularyLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("xp");
  const [period, setPeriod] = useState<PeriodKey>("day");

  useEffect(() => {
    let active = true;
    setLoading(true);
    ApiClient.getLeaderboard(period).then((data) => {
      if (!active) return;
      setUsers(data.users);
      setVocabulary(data.vocabulary);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [period]);

  const fmt = (value: number | undefined) => (value || 0).toLocaleString("vi-VN");
  const value = (user: BoardRow) => {
    if (tab === "vocab") return user.vocab_total || 0;
    if (tab === "streak") return user.streak || 0;
    return user.xp || 0;
  };
  const score = (user: BoardRow) =>
    tab === "vocab" ? `${fmt(user.vocab_total)} từ` : tab === "xp" ? `${fmt(user.xp)} XP` : `${fmt(user.streak)} ngày`;

  const rows: BoardRow[] = tab === "vocab" ? vocabulary : users;
  const sortedList = [...rows].sort((a, b) => value(b) - value(a));

  const isMe = (user: BoardRow) =>
    !!currentUser && (currentUser.id === user.id || (!!user.email && currentUser.email === user.email));
  const myIndex = sortedList.findIndex(isMe);

  const me = myIndex >= 0 ? sortedList[myIndex] : null;
  const ahead = myIndex > 0 ? sortedList[myIndex - 1] : null;
  const gap = me && ahead ? value(ahead) - value(me) + 1 : 0;
  const unit = UNIT[tab];
  // Màu huy chương chỉ dùng cho top 3; mọi thứ khác trung tính.
  const medal = ["text-amber-600 dark:text-amber-400", "text-slate-500 dark:text-slate-300", "text-orange-600 dark:text-orange-400"];
  const top = sortedList.slice(0, 3);
  const hasPodium = top.length >= 3;
  // Bảng bên dưới chỉ liệt kê từ hạng 4; khi chưa đủ 3 người thì giữ nguyên toàn bộ danh sách.
  const tableOffset = hasPodium ? 3 : 0;
  const tableList = sortedList.slice(tableOffset);
  const showTable = loading || sortedList.length === 0 || tableList.length > 0;

  return (
    <div className="mx-auto max-w-3xl pb-24 animate-fadeIn motion-reduce:animate-none">
      {/* Không dùng <header>: globals.css tô nền trắng cho mọi header ở giao diện sáng. */}
      <div className="flex flex-col items-center gap-4 text-center">
        <div role="group" aria-label="Xếp hạng theo" className="flex flex-wrap justify-center rounded-xl border-2 border-slate-700 p-1">
          {TABS.map(({ key, label, icon: Icon }) => {
            const active = tab === key;
            return (
              <button key={key} type="button" onClick={() => setTab(key)} aria-pressed={active}
                className={`inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3.5 text-sm font-bold transition-colors duration-200 ${
                  active ? TAB_ACTIVE[key] : "text-slate-400 hover:text-white"
                }`}>
                <Icon aria-hidden="true" className="h-4 w-4" />{label}
              </button>
            );
          })}
        </div>
        <div role="group" aria-label="Khoảng thời gian" className="flex flex-wrap justify-center gap-1 rounded-xl border border-slate-700/70 p-1">
          {PERIODS.map(({ key, label }) => {
            const active = period === key;
            return (
              <button key={key} type="button" onClick={() => setPeriod(key)} aria-pressed={active}
                className={`inline-flex min-h-8 items-center rounded-lg px-3 text-xs font-bold transition-colors duration-200 ${
                  active ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"
                }`}>
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Top 3: ba khối riêng biệt, không dính liền với bảng bên dưới. */}
      {!loading && hasPodium && (
        <div aria-label="Top 3" className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {top.map((user, idx) => {
            const badge = [
              "bg-amber-500/15 border-amber-400/40 text-amber-300",
              "bg-slate-500/15 border-slate-400/40 text-slate-200",
              "bg-orange-500/15 border-orange-400/40 text-orange-300",
            ][idx];
            return (
              <div key={user.id || idx} className="card-duo flex flex-col items-center gap-1.5 p-5 text-center">
                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-black tabular-nums ${badge}`}>
                  #{idx + 1}
                </span>
                <Link href={`/member?id=${encodeURIComponent(user.id)}`} aria-label={`Mở hồ sơ ${user.name}`} className="mt-1">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="" width={48} height={48} loading="lazy" decoding="async" className="h-12 w-12 rounded-full object-cover" />
                  ) : (
                    <span className="grid h-12 w-12 place-items-center rounded-full bg-blue-600 text-base font-black text-white">{user.name?.charAt(0)?.toUpperCase() || "?"}</span>
                  )}
                </Link>
                <p title={user.name} className="w-full truncate text-sm font-bold text-white">{user.name}</p>
                <p className={`text-base font-black tabular-nums ${medal[idx]}`}>{score(user)}</p>
              </div>
            );
          })}
        </div>
      )}

      {showTable && (
      <div className="card-duo mt-8 overflow-hidden">
        {loading && (
          <div aria-busy="true">
            <span className="sr-only" role="status">Đang tải bảng xếp hạng…</span>
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} aria-hidden="true" className="flex items-center gap-4 border-b border-slate-700/40 px-4 py-3.5 last:border-0 animate-pulse motion-reduce:animate-none">
                <div className="h-4 w-5 rounded bg-slate-700/40" />
                <div className="h-9 w-9 rounded-full bg-slate-700/40" />
                <div className="h-3 flex-1 rounded bg-slate-700/40" />
                <div className="h-4 w-14 rounded bg-slate-700/40" />
              </div>
            ))}
          </div>
        )}

        {!loading && sortedList.length === 0 && (
          <div className="px-6 py-14 text-center">
            <Users aria-hidden="true" className="mx-auto h-8 w-8 text-slate-500" />
            <p className="mt-3 font-bold text-white">Bảng còn trống</p>
            <p className="mt-1 text-sm text-slate-400">
              {tab === "vocab" ? "Học flashcard hôm nay để ghi tên mình lên bảng từ vựng." : "Ai học bài đầu tiên sẽ đứng hạng 1."}
            </p>
          </div>
        )}

        {!loading && tableList.length > 0 && (
          <ol aria-label={`Xếp hạng theo ${METRIC_LABEL[tab]}`}>
            {tableList.map((user, idx) => {
              const isCurrentUser = isMe(user);
              return (
                <li
                  key={user.id || idx}
                  aria-current={isCurrentUser ? "true" : undefined}
                  className={`flex items-center gap-3 border-b border-slate-700/40 px-4 py-3 last:border-0 ${isCurrentUser ? "bg-blue-500/10" : ""}`}
                >
                  <span className={`w-6 shrink-0 text-right text-base font-black tabular-nums ${tableOffset ? "text-slate-500" : medal[idx] ?? "text-slate-500"}`}>{idx + 1 + tableOffset}</span>
                  <Link href={`/member?id=${encodeURIComponent(user.id)}`} aria-label={`Mở hồ sơ ${user.name}`} className="shrink-0">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="" width={36} height={36} loading="lazy" decoding="async" className="h-9 w-9 rounded-full object-cover" />
                    ) : (
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-blue-600 text-sm font-black text-white">{user.name?.charAt(0)?.toUpperCase() || "?"}</span>
                    )}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <p className="flex min-w-0 items-baseline gap-2">
                      <Link href={`/member?id=${encodeURIComponent(user.id)}`} className="truncate text-sm font-bold text-white underline-offset-2 hover:underline">{user.name}</Link>
                      {isCurrentUser && <span className="shrink-0 text-xs font-bold text-blue-600 dark:text-blue-400">(bạn)</span>}
                    </p>
                    <p className="truncate text-xs text-slate-400">{getStudyRank(user.level || 1)} · cấp {user.level || 1}</p>
                  </div>
                  <div className="shrink-0 text-right tabular-nums">
                    <p className={`text-base font-black ${SCORE_COLOR[tab]}`}>{score(user)}</p>
                    <p className="flex items-center justify-end gap-1 text-xs text-slate-400">
                      {tab === "xp" && <><Flame aria-hidden="true" className="h-3 w-3" />{fmt(user.streak)} ngày</>}
                      {tab === "streak" && <><Zap aria-hidden="true" className="h-3 w-3" />{fmt(user.xp)} XP</>}
                      {tab === "vocab" && <><BookOpen aria-hidden="true" className="h-3 w-3" />{fmt(user.vocab_today)} từ hôm nay</>}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
      )}
    </div>
  );
};
