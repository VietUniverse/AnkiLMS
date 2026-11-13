"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Flame, Zap, Users } from "lucide-react";
import { ApiClient, UserProfile } from "../lib/apiClient";
import { getStudyRank } from "../lib/studyRanks";

interface LeaderboardModuleProps {
  currentUser: UserProfile | null;
}

export const LeaderboardModule: React.FC<LeaderboardModuleProps> = ({ currentUser }) => {
  const [leaderboard, setLeaderboard] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"xp" | "streak">("xp");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const data = await ApiClient.getLeaderboard();
      setLeaderboard(data);
      setLoading(false);
    }
    loadData();
  }, []);

  const sortedList = [...leaderboard].sort((a, b) =>
    tab === "xp" ? (b.xp || 0) - (a.xp || 0) : (b.streak || 0) - (a.streak || 0)
  );
  const fmt = (value: number | undefined) => (value || 0).toLocaleString("vi-VN");
  const score = (user: UserProfile) => (tab === "xp" ? `${fmt(user.xp)} XP` : `${fmt(user.streak)} ngày`);
  const isMe = (user: UserProfile) => !!currentUser && (currentUser.id === user.id || currentUser.email === user.email);
  const myIndex = sortedList.findIndex(isMe);

  const metricLabel = tab === "xp" ? "XP" : "Streak";
  const value = (user: UserProfile) => (tab === "xp" ? user.xp || 0 : user.streak || 0);
  const me = myIndex >= 0 ? sortedList[myIndex] : null;
  const ahead = myIndex > 0 ? sortedList[myIndex - 1] : null;
  const gap = me && ahead ? value(ahead) - value(me) + 1 : 0;
  const unit = tab === "xp" ? "XP" : "ngày streak";
  // Màu huy chương chỉ dùng cho top 3; mọi thứ khác trung tính.
  const medal = ["text-amber-600 dark:text-amber-400", "text-slate-500 dark:text-slate-300", "text-orange-600 dark:text-orange-400"];
  const bar = ["bg-amber-400/90", "bg-slate-400/70", "bg-orange-400/80"];
  const top = sortedList.slice(0, 3);
  const topMax = Math.max(1, ...top.map(value));

  return (
    <div className="mx-auto max-w-3xl pb-24 animate-fadeIn motion-reduce:animate-none">
      {/* Không dùng <header>: globals.css tô nền trắng cho mọi header ở giao diện sáng. */}
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="min-w-0">
          <h2 className="text-3xl font-black tracking-tight text-white">Bảng xếp hạng</h2>
          {!loading && me && (
            <p className="mt-2 text-sm text-slate-400">
              Bạn hạng <strong className="font-black text-white tabular-nums">{myIndex + 1}</strong> trên {sortedList.length}.{" "}
              {ahead
                ? <>Thêm <strong className="font-black text-blue-500 tabular-nums">{fmt(gap)} {unit}</strong> là vượt {ahead.name}.</>
                : <>Không ai ở trên bạn cả.</>}
            </p>
          )}
        </div>
        <div role="group" aria-label="Xếp hạng theo" className="flex rounded-xl border-2 border-slate-700 p-1">
          {(["xp", "streak"] as const).map((key) => {
            const active = tab === key;
            const Icon = key === "xp" ? Zap : Flame;
            return (
              <button key={key} type="button" onClick={() => setTab(key)} aria-pressed={active}
                className={`inline-flex min-h-10 items-center gap-1.5 rounded-lg px-4 text-sm font-bold transition-colors duration-200 ${
                  active ? (key === "xp" ? "bg-blue-600 text-white" : "bg-amber-600 text-white") : "text-slate-400 hover:text-white"
                }`}>
                <Icon aria-hidden="true" className="h-4 w-4" />{key === "xp" ? "XP" : "Streak"}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bục: chiều cao cột tỉ lệ với điểm thật, nên khoảng cách giữa top 3 nhìn là thấy. */}
      {!loading && top.length >= 3 && (
        <ol aria-label="Top 3" className="mt-10 grid grid-cols-3 items-end gap-2 sm:gap-4">
          {[1, 0, 2].map((idx) => {
            const user = top[idx];
            const height = 28 + 52 * (value(user) / topMax); // 28–80px
            return (
              <li key={user.id || idx} className="flex min-w-0 flex-col items-center text-center">
                <p title={user.name} className="w-full truncate text-sm font-bold text-white">{user.name}</p>
                <p className={`text-sm font-black tabular-nums ${medal[idx]}`}>{score(user)}</p>
                <div style={{ height: `${height}px` }} className={`mt-2 flex w-full items-start justify-center rounded-t-xl pt-2 ${bar[idx]}`}>
                  <span className="text-lg font-black text-slate-900 tabular-nums">{idx + 1}</span>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {/* .card-duo đặt bo góc trong globals.css và thắng class rounded-t-none, nên vuông góc trên bằng style để cột bục ngồi khít. */}
      <div className={`card-duo overflow-hidden ${top.length >= 3 && !loading ? "" : "mt-8"}`} style={top.length >= 3 && !loading ? { borderTopLeftRadius: 0, borderTopRightRadius: 0 } : undefined}>
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
            <p className="mt-1 text-sm text-slate-400">Ai học bài đầu tiên sẽ đứng hạng 1.</p>
          </div>
        )}

        {!loading && sortedList.length > 0 && (
          <ol aria-label={`Xếp hạng theo ${metricLabel}`}>
            {sortedList.map((user, idx) => {
              const isCurrentUser = isMe(user);
              return (
                <li
                  key={user.id || idx}
                  aria-current={isCurrentUser ? "true" : undefined}
                  className={`flex items-center gap-3 border-b border-slate-700/40 px-4 py-3 last:border-0 ${isCurrentUser ? "bg-blue-500/10" : ""}`}
                >
                  <span className={`w-6 shrink-0 text-right text-base font-black tabular-nums ${medal[idx] ?? "text-slate-500"}`}>{idx + 1}</span>
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
                    <p className="truncate text-xs text-slate-400">{getStudyRank(user.level)} · cấp {user.level || 1}</p>
                  </div>
                  <div className="shrink-0 text-right tabular-nums">
                    <p className={`text-base font-black ${tab === "xp" ? "text-blue-500" : "text-amber-500"}`}>{score(user)}</p>
                    <p className="flex items-center justify-end gap-1 text-xs text-slate-400">
                      {tab === "xp"
                        ? <><Flame aria-hidden="true" className="h-3 w-3" />{fmt(user.streak)} ngày</>
                        : <><Zap aria-hidden="true" className="h-3 w-3" />{fmt(user.xp)} XP</>}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
};
