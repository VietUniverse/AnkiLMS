"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Trophy, Flame, Zap, Crown, Sparkles, Users } from "lucide-react";
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
    tab === "xp" ? b.xp - a.xp : b.streak - a.streak
  );

  return (
    <div className="space-y-6 animate-fadeIn pb-24 max-w-4xl mx-auto select-none">
      {/* Header Banner */}
      <div className="card-duo p-6 bg-gradient-to-r from-amber-950/40 via-slate-900 to-blue-950/40 border-amber-500/40 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center text-2xl font-black shadow-lg">
            <Trophy className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white flex items-center gap-2">
              Bảng Xếp Hạng Học Viên HaechiVN
            </h2>
            <p className="text-xs text-slate-400">Vinh danh những học viên kiên trì và chăm chỉ nhất</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
          <button
            onClick={() => setTab("xp")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              tab === "xp" ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:text-white"
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>Top XP</span>
          </button>
          <button
            onClick={() => setTab("streak")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              tab === "streak" ? "bg-amber-600 text-white shadow-md" : "text-slate-400 hover:text-white"
            }`}
          >
            <Flame className="w-4 h-4" />
            <span>Top Streak</span>
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="card-duo p-12 text-center bg-slate-900 border-slate-800">
          <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xs text-slate-400">Đang tải bảng xếp hạng từ server...</p>
        </div>
      )}

      {/* Empty State – khi chưa có ai đăng ký */}
      {!loading && sortedList.length === 0 && (
        <div className="card-duo p-12 text-center bg-slate-900 border-slate-800 space-y-4">
          <Users className="w-16 h-16 text-slate-600 mx-auto" />
          <h3 className="text-lg font-black text-white">Bảng Xếp Hạng Trống</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Chưa có học viên nào trên hệ thống. Hãy đăng ký tài khoản và bắt đầu học để trở thành người đầu tiên trên bảng xếp hạng!
          </p>
        </div>
      )}

      {/* Top 3 Podium */}
      {!loading && sortedList.length >= 3 && (
        <div className="grid grid-cols-3 gap-3 items-end pt-6">
          {/* #2 Rank */}
          <div className="card-duo p-4 bg-slate-900 border-slate-700 text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-slate-400/20 border-2 border-slate-400 text-slate-300 flex items-center justify-center font-black mb-2 text-base">🥈</div>
            <p className="text-xs font-black text-white truncate max-w-full">{sortedList[1].name}</p>
            <p className="text-[11px] font-bold text-blue-400 mt-1">
              {tab === "xp" ? `${sortedList[1].xp} XP` : `${sortedList[1].streak} Ngày`}
            </p>
            <span className="text-[10px] text-slate-500 font-mono mt-1">Hạng 2</span>
          </div>

          {/* #1 Rank (Center Podium) */}
          <div className="card-duo p-5 bg-amber-950/30 border-2 border-amber-400 text-center flex flex-col items-center transform -translate-y-3 shadow-xl">
            <Crown className="w-6 h-6 text-amber-400 mb-1 animate-bounce" />
            <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-400 text-amber-300 flex items-center justify-center font-black mb-2 text-xl shadow-lg">🥇</div>
            <p className="text-sm font-black text-amber-300 truncate max-w-full">{sortedList[0].name}</p>
            <p className="text-xs font-black text-amber-400 mt-1">
              {tab === "xp" ? `${sortedList[0].xp} XP` : `${sortedList[0].streak} Ngày`}
            </p>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold mt-1">Quán Quân</span>
          </div>

          {/* #3 Rank */}
          <div className="card-duo p-4 bg-slate-900 border-slate-700 text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-amber-700/20 border-2 border-amber-700 text-amber-600 flex items-center justify-center font-black mb-2 text-base">🥉</div>
            <p className="text-xs font-black text-white truncate max-w-full">{sortedList[2].name}</p>
            <p className="text-[11px] font-bold text-blue-400 mt-1">
              {tab === "xp" ? `${sortedList[2].xp} XP` : `${sortedList[2].streak} Ngày`}
            </p>
            <span className="text-[10px] text-slate-500 font-mono mt-1">Hạng 3</span>
          </div>
        </div>
      )}

      {/* Full Leaderboard Table */}
      {!loading && sortedList.length > 0 && (
        <div className="card-duo bg-slate-900 border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-800 text-xs font-bold text-slate-400 flex justify-between">
            <span>Hạng & Học viên</span>
            <span>Thành tích</span>
          </div>
          <div className="divide-y divide-slate-800/60">
            {sortedList.map((user, idx) => {
              const isCurrentUser = currentUser?.id === user.id || currentUser?.email === user.email;
              return (
                <div
                  key={user.id || idx}
                  className={`p-4 flex items-center justify-between gap-3 transition-colors ${
                    isCurrentUser ? "bg-amber-500/15 border-l-4 border-amber-400" : "hover:bg-slate-800/40"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-7 h-7 rounded-xl font-mono font-black text-xs flex items-center justify-center ${
                        idx === 0 ? "bg-amber-400 text-slate-950"
                          : idx === 1 ? "bg-slate-300 text-slate-950"
                          : idx === 2 ? "bg-amber-700 text-white"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {idx + 1}
                    </span>

                    <Link href={`/member?id=${encodeURIComponent(user.id)}`} aria-label={`Mở hồ sơ ${user.name}`} className="shrink-0">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.name} className="w-9 h-9 rounded-full object-cover" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center">
                          {user.name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                      )}
                    </Link>

                    <div>
                      <p className="text-xs font-black text-white flex items-center gap-1.5">
                        <Link href={`/member?id=${encodeURIComponent(user.id)}`} className="truncate underline-offset-2 hover:text-sky-200 hover:underline">{user.name}</Link>
                        {isCurrentUser && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 font-bold">Bạn</span>
                        )}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {getStudyRank(user.level)} · Cấp {user.level || 1} • {user.gems || 0} 💎
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-extrabold text-amber-400 flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 fill-amber-400" /> {user.streak || 0}
                    </span>
                    <span className="text-xs font-black text-blue-400 flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 fill-blue-400" /> {user.xp || 0} XP
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
