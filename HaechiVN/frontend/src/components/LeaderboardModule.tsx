"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { BookOpen, Flame, Zap, Users } from "lucide-react";
import { ApiClient, UserProfile, VocabularyLeaderboardEntry } from "../lib/apiClient";
import { getStudyRank } from "../lib/studyRanks";

interface LeaderboardModuleProps {
  currentUser: UserProfile | null;
}

type TabKey = "xp" | "streak" | "vocab";
type Range = { from: string; to: string };

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

const TAB_ACTIVE: Record<TabKey, string> = {
  xp: "bg-blue-600 text-white",
  // amber-600 với chữ trắng chỉ ~3:1 nên dùng nền sáng + chữ đậm để đủ tương phản.
  streak: "bg-amber-400 text-amber-950",
  vocab: "bg-emerald-700 text-white",
};

const SCORE_COLOR: Record<TabKey, string> = {
  xp: "lb-score-xp",
  streak: "lb-score-amber",
  vocab: "lb-score-emerald",
};

const METRIC_LABEL: Record<TabKey, string> = {
  xp: "XP",
  streak: "Streak",
  vocab: "Từ vựng",
};

type PresetKey =
  | "today"
  | "yesterday"
  | "week"
  | "lastWeek"
  | "month"
  | "lastMonth"
  | "year"
  | "lastYear"
  | "custom";

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: "today", label: "Hôm nay" },
  { key: "yesterday", label: "Hôm qua" },
  { key: "week", label: "7 ngày qua" },
  { key: "lastWeek", label: "Tuần trước" },
  { key: "month", label: "30 ngày qua" },
  { key: "lastMonth", label: "Tháng trước" },
  { key: "year", label: "Năm nay" },
  { key: "lastYear", label: "Năm trước" },
];

/** Hôm nay theo giờ Việt Nam (UTC+7), dạng YYYY-MM-DD. */
function vnToday(): string {
  return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function shiftDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function presetRange(preset: PresetKey, customDate: string): Range {
  const today = vnToday();
  const [year, month] = today.split("-").map(Number);
  switch (preset) {
    case "yesterday": {
      const day = shiftDays(today, -1);
      return { from: day, to: day };
    }
    case "week":
      return { from: shiftDays(today, -6), to: today };
    case "lastWeek":
      return { from: shiftDays(today, -13), to: shiftDays(today, -7) };
    case "month":
      return { from: shiftDays(today, -29), to: today };
    case "lastMonth":
      // Tháng dương lịch trước: ngày 1 tới ngày cuối của tháng đó.
      // Date.UTC nhận tháng 0-based: tháng trước = index month - 2 (tháng 1 tự lùi về 12 năm trước).
      return {
        from: new Date(Date.UTC(year, month - 2, 1)).toISOString().slice(0, 10),
        to: new Date(Date.UTC(year, month - 1, 1) - 86_400_000).toISOString().slice(0, 10),
      };
    case "year":
      return { from: `${year}-01-01`, to: today };
    case "lastYear":
      return { from: `${year - 1}-01-01`, to: `${year - 1}-12-31` };
    case "custom":
      return { from: customDate, to: customDate };
    default:
      return { from: today, to: today };
  }
}

function formatDay(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

export const LeaderboardModule: React.FC<LeaderboardModuleProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [vocabulary, setVocabulary] = useState<VocabularyLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("xp");
  const [preset, setPreset] = useState<PresetKey>("today");
  const [customDate, setCustomDate] = useState(vnToday);

  const range = useMemo(() => presetRange(preset, customDate), [preset, customDate]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    ApiClient.getLeaderboard(range).then((data) => {
      if (!active) return;
      setUsers(data.users);
      setVocabulary(data.vocabulary);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [range]);

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

  // Màu huy chương chỉ dùng cho top 3; mọi thứ khác trung tính.
  const medal = ["lb-medal-1", "lb-medal-2", "lb-medal-3"];
  const top = sortedList.slice(0, 3);
  const hasPodium = top.length >= 3;
  // Bảng bên dưới chỉ liệt kê từ hạng 4; khi chưa đủ 3 người thì giữ nguyên toàn bộ danh sách.
  const tableOffset = hasPodium ? 3 : 0;
  const tableList = sortedList.slice(tableOffset);
  const showTable = loading || sortedList.length === 0 || tableList.length > 0;
  const rangeLabel = range.from === range.to
    ? formatDay(range.from)
    : `${formatDay(range.from)} – ${formatDay(range.to)}`;

  return (
    <div className="mx-auto max-w-3xl pb-24 animate-fadeIn motion-reduce:animate-none">
      {/* Không dùng <header>: globals.css tô nền trắng cho mọi header ở giao diện sáng. */}
      <h1 className="text-lg font-black text-stone-900 dark:text-white">Bảng xếp hạng</h1>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div role="group" aria-label="Xếp hạng theo" className="flex flex-wrap rounded-xl border border-stone-200 bg-stone-100 p-1 dark:border-stone-800 dark:bg-transparent">
          {TABS.map(({ key, label, icon: Icon }) => {
            const active = tab === key;
            return (
              <button key={key} type="button" onClick={() => setTab(key)} aria-pressed={active}
                className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-bold transition-colors duration-200 ${
                  active ? TAB_ACTIVE[key] : "text-stone-700 hover:bg-white hover:text-stone-900 dark:text-stone-400 dark:hover:bg-transparent dark:hover:text-white"
                }`}>
                <Icon aria-hidden="true" className="h-4 w-4" />{label}
              </button>
            );
          })}
        </div>

        <div role="group" aria-label="Khoảng thời gian" className="flex flex-wrap items-center gap-2">
          <select
            value={preset}
            onChange={(event) => setPreset(event.target.value as PresetKey)}
            aria-label="Chọn khoảng thời gian"
            className="min-h-9 rounded-xl border border-stone-200 bg-white px-2.5 text-xs font-bold text-stone-800 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
          >
            {PRESETS.map((item) => (
              <option key={item.key} value={item.key}>{item.label}</option>
            ))}
            <option value="custom">Ngày cụ thể…</option>
          </select>
          <label className="flex items-center gap-1.5 text-[11px] font-bold text-stone-500 dark:text-stone-400">
            <span className="sr-only">Ngày cụ thể</span>
            <input
              type="date"
              value={customDate}
            max={vnToday()}
              onChange={(event) => {
                const next = event.target.value;
                if (!next) return;
                setCustomDate(next);
                setPreset("custom");
              }}
              aria-label="Xem bảng xếp hạng của một ngày"
              className="min-h-9 rounded-xl border border-stone-200 bg-white px-2.5 text-xs font-bold text-stone-800 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
            />
          </label>
        </div>
      </div>

      <p className="mt-2 text-right text-[11px] font-bold text-stone-500 dark:text-stone-400">
        {rangeLabel}
      </p>

      {!loading && hasPodium && (
        <div aria-label="Top 3" className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {top.map((user, idx) => (
            <div key={user.id || idx} className="relative flex flex-col items-center gap-1.5 rounded-2xl border border-stone-200 bg-white p-4 text-center dark:border-stone-800 dark:bg-stone-900/60">
              <span className="inline-flex items-center rounded-full border border-stone-200 px-2 py-0.5 text-[11px] font-black tabular-nums text-stone-600 dark:border-stone-700 dark:text-stone-300">
                #{idx + 1}
              </span>
              {isMe(user) && (
                <span className="absolute right-3 top-3 text-[10px] font-black text-blue-700 dark:text-blue-400">bạn</span>
              )}
              <Link href={`/member?id=${encodeURIComponent(user.id)}`} aria-label={`Mở hồ sơ ${user.name}`} className="mt-0.5">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="" width={48} height={48} loading="lazy" decoding="async" className="h-12 w-12 rounded-full object-cover" />
                ) : (
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-blue-600 text-base font-black text-white">{user.name?.charAt(0)?.toUpperCase() || "?"}</span>
                )}
              </Link>
              <p title={user.name} className="w-full truncate text-sm font-bold text-stone-900 dark:text-white">{user.name}</p>
              <p className={`text-base font-black tabular-nums ${medal[idx]}`}>{score(user)}</p>
            </div>
          ))}
        </div>
      )}

      {showTable && (
        <div className="mt-5 overflow-hidden rounded-2xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900/60">
          {loading && (
            <div aria-busy="true">
              <span className="sr-only" role="status">Đang tải bảng xếp hạng…</span>
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} aria-hidden="true" className="flex items-center gap-4 border-b border-stone-100 px-4 py-3.5 last:border-0 animate-pulse motion-reduce:animate-none dark:border-stone-800/70">
                  <div className="h-4 w-5 rounded bg-stone-200 dark:bg-stone-700/40" />
                  <div className="h-9 w-9 rounded-full bg-stone-200 dark:bg-stone-700/40" />
                  <div className="h-3 flex-1 rounded bg-stone-200 dark:bg-stone-700/40" />
                  <div className="h-4 w-14 rounded bg-stone-200 dark:bg-stone-700/40" />
                </div>
              ))}
            </div>
          )}

          {!loading && sortedList.length === 0 && (
            <div className="px-6 py-14 text-center">
              <Users aria-hidden="true" className="mx-auto h-8 w-8 text-stone-400" />
              <p className="mt-3 font-bold text-stone-900 dark:text-white">Chưa có dữ liệu trong khoảng này</p>
              <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                {tab === "vocab"
                  ? "Chọn khoảng khác, hoặc học flashcard để ghi tên mình lên bảng từ vựng."
                  : "Chọn khoảng khác, hoặc học bài để có điểm trong khoảng này."}
              </p>
            </div>
          )}

          {!loading && tableList.length > 0 && (
            <>
            <div className="flex items-center gap-3 border-b border-stone-100 px-4 py-2 text-[10px] font-black uppercase tracking-wider text-stone-400 dark:border-stone-800/70 dark:text-stone-500">
              <span className="w-6 shrink-0 text-right">#</span>
              <span className="flex-1">Thành viên</span>
              <span className="w-24 shrink-0 text-right">{METRIC_LABEL[tab]}</span>
            </div>
            <ol aria-label={`Xếp hạng theo ${METRIC_LABEL[tab]}`}>
              {tableList.map((user, idx) => {
                const isCurrentUser = isMe(user);
                return (
                  <li
                    key={user.id || idx}
                    aria-current={isCurrentUser ? "true" : undefined}
                    className={`flex items-center gap-3 border-b border-stone-100 px-4 py-3 last:border-0 dark:border-stone-800/70 ${isCurrentUser ? "bg-blue-50 dark:bg-blue-500/10" : ""}`}
                  >
                    <span className={`w-6 shrink-0 text-right text-base font-black tabular-nums ${tableOffset ? "text-stone-400" : medal[idx]}`}>
                      {idx + 1 + tableOffset}
                    </span>
                    <Link href={`/member?id=${encodeURIComponent(user.id)}`} aria-label={`Mở hồ sơ ${user.name}`} className="shrink-0">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt="" width={36} height={36} loading="lazy" decoding="async" className="h-9 w-9 rounded-full object-cover" />
                      ) : (
                        <span className="grid h-9 w-9 place-items-center rounded-full bg-blue-600 text-sm font-black text-white">{user.name?.charAt(0)?.toUpperCase() || "?"}</span>
                      )}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <p className="flex min-w-0 items-baseline gap-2">
                        <Link href={`/member?id=${encodeURIComponent(user.id)}`} className="truncate text-sm font-bold text-stone-900 underline-offset-2 hover:underline dark:text-white">{user.name}</Link>
                        {isCurrentUser && <span className="shrink-0 text-xs font-bold text-blue-700 dark:text-blue-400">(bạn)</span>}
                      </p>
                      <p className="truncate text-xs text-stone-500 dark:text-stone-400">{getStudyRank(user.level || 1)} · cấp {user.level || 1}</p>
                    </div>
                    <div className="w-24 shrink-0 text-right tabular-nums">
                      <p className={`text-base font-black ${SCORE_COLOR[tab]}`}>{score(user)}</p>
                      <p className="flex items-center justify-end gap-1 text-xs text-stone-500 dark:text-stone-400">
                        {tab === "xp" && <><Flame aria-hidden="true" className="h-3 w-3" />{fmt(user.streak)} ngày</>}
                        {tab === "streak" && <><Zap aria-hidden="true" className="h-3 w-3" />{fmt(user.xp)} XP</>}
                        {tab === "vocab" && <><BookOpen aria-hidden="true" className="h-3 w-3" />{fmt(user.vocab_today)} từ hôm nay</>}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
            </>
          )}
        </div>
      )}
    </div>
  );
};
