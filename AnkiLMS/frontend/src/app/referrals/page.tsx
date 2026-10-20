"use client";

import { useEffect, useState } from "react";
import { AppShell } from "../../components/AppShell";
import { useApp } from "../../contexts/AppProvider";
import { Check, Copy, Gift, Share2, Users } from "lucide-react";

export default function ReferralsPage() {
  const { currentUser, handleOpenAuth } = useApp();
  const [inviteUrl, setInviteUrl] = useState("");
  const [count, setCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!currentUser) return;
    fetch("/api/referrals", { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Không tải được liên kết mời.");
        setInviteUrl(data.inviteUrl);
        setCount(data.referralCount || 0);
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Không tải được liên kết mời."));
  }, [currentUser]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setError("Trình duyệt không cho phép sao chép tự động. Hãy chọn và sao chép đường dẫn bên dưới.");
    }
  }

  async function shareLink() {
    if (navigator.share) {
      try { await navigator.share({ title: "Học tiếng Hàn cùng HaechiVN", url: inviteUrl }); } catch { /* User closed the share sheet. */ }
    } else {
      await copyLink();
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-5 animate-fadeIn">
        <header className="card-duo overflow-hidden p-6 sm:p-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-300"><Gift className="h-7 w-7" /></div>
          <p className="mt-4 text-xs font-bold uppercase tracking-widest text-amber-300">Mời bạn bè</p>
          <h1 className="mt-2 text-2xl font-black text-white">Cùng nhau học tiếng Hàn</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">Gửi liên kết cá nhân của bạn. Khi bạn bè đăng ký bằng liên kết này, số lượt giới thiệu sẽ được ghi nhận trong tài khoản.</p>
        </header>

        {currentUser ? <>
          <section className="card-duo p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div><h2 className="text-sm font-black text-white">Liên kết mời của bạn</h2><p className="mt-1 text-xs text-slate-400">Liên kết này không cấp quyền vào tài khoản của bạn.</p></div>
              <Users className="h-5 w-5 text-sky-300" />
            </div>
            {inviteUrl ? <>
              <input readOnly value={inviteUrl} onFocus={(event) => event.currentTarget.select()} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 font-mono text-xs text-slate-200" aria-label="Liên kết mời bạn" />
              <div className="mt-3 flex flex-wrap gap-3">
                <button type="button" onClick={() => void copyLink()} className="btn-duo btn-duo-primary inline-flex items-center gap-2 px-4 py-2.5 text-xs">{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? "Đã sao chép" : "Sao chép"}</button>
                <button type="button" onClick={() => void shareLink()} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-xs font-bold text-slate-200 hover:border-sky-500"><Share2 className="h-4 w-4" /> Chia sẻ</button>
              </div>
            </> : <p className="text-sm text-slate-400">Đang tạo liên kết mời…</p>}
            {error && <p role="alert" className="mt-3 text-xs text-rose-300">{error}</p>}
          </section>
          <section className="card-duo flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300"><Users className="h-6 w-6" /></div>
            <div><p className="text-xs text-slate-400">Bạn bè đã đăng ký qua liên kết</p><p className="text-2xl font-black text-white">{count}</p></div>
          </section>
        </> : <section className="card-duo p-6 text-center"><p className="text-sm text-slate-300">Đăng nhập để tạo liên kết mời cá nhân.</p><button type="button" onClick={() => handleOpenAuth(false)} className="btn-duo btn-duo-primary mt-4 px-5 py-2.5 text-xs">Đăng nhập</button></section>}
      </div>
    </AppShell>
  );
}
