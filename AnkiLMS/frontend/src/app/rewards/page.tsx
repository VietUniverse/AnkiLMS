"use client";

import { useCallback, useEffect, useState, type ElementType } from "react";
import { AppShell } from "../../components/AppShell";
import { useApp } from "../../contexts/AppProvider";
import { Check, Crown, Gem, Image, Sparkles, Trophy, UserRound } from "lucide-react";

type Reward = { id: string; name: string; description: string; cost: number; icon: string; kind: "badge" | "frame" | "background"; visual: string };
type RewardKind = Reward["kind"];
const categories: Array<{ id: RewardKind; label: string; icon: ElementType; description: string }> = [
  { id: "frame", label: "Khung avatar", icon: UserRound, description: "Viền cá tính quanh ảnh đại diện." },
  { id: "background", label: "Ảnh nền", icon: Image, description: "Phông nền nghệ thuật cho hồ sơ." },
  { id: "badge", label: "Huy hiệu", icon: Trophy, description: "Danh hiệu nổi bật trên hồ sơ." },
];

export default function RewardsPage() {
  const { currentUser, setCurrentUser, handleOpenAuth } = useApp();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [owned, setOwned] = useState<string[]>([]);
  const [equipped, setEquipped] = useState<Record<RewardKind, string | null>>({ badge: null, frame: null, background: null });
  const [category, setCategory] = useState<RewardKind>("frame");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!currentUser) { setLoading(false); return; }
    setLoading(true);
    try {
      const response = await fetch("/api/rewards", { credentials: "same-origin", cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không tải được phần thưởng.");
      setRewards(data.rewards || []);
      setOwned((data.owned || []).map((item: { reward_id: string }) => item.reward_id));
      setEquipped({ badge: data.user?.active_badge || null, frame: data.user?.active_frame || null, background: data.user?.active_background || null });
      if (data.user && (data.user.gems !== currentUser.gems || data.user.active_badge !== currentUser.active_badge || data.user.active_frame !== currentUser.active_frame || data.user.active_background !== currentUser.active_background)) {
        const updated = { ...currentUser, ...data.user };
        setCurrentUser(updated);
        localStorage.setItem("haechivn_user_profile", JSON.stringify(updated));
      }
      setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không tải được phần thưởng."); }
    finally { setLoading(false); }
  }, [currentUser, setCurrentUser]);

  useEffect(() => { void load(); }, [load]);

  async function perform(rewardId: string, action: "redeem" | "equip" | "unequip", slot: RewardKind = category) {
    setWorking(rewardId || slot); setError(""); setMessage("");
    try {
      const response = await fetch("/api/rewards", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rewardId, action, slot }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể đổi phần thưởng.");
      if (action === "redeem") setOwned((previous) => previous.includes(rewardId) ? previous : [...previous, rewardId]);
      if (data.user) {
        setEquipped({ badge: data.user.active_badge || null, frame: data.user.active_frame || null, background: data.user.active_background || null });
        if (currentUser) {
          const updated = { ...currentUser, ...data.user };
          setCurrentUser(updated);
          localStorage.setItem("haechivn_user_profile", JSON.stringify(updated));
        }
      }
      setMessage(action === "redeem" ? "Đã đổi vật phẩm thành công." : action === "equip" ? "Đã trang bị vật phẩm vào hồ sơ." : "Đã bỏ trang bị vật phẩm.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể đổi phần thưởng."); }
    finally { setWorking(null); }
  }

  const displayedRewards = rewards.filter((reward) => reward.kind === category);
  return <AppShell><div className="mx-auto max-w-6xl space-y-6 pb-20 animate-fadeIn">
    <header className="relative overflow-hidden rounded-[28px] border border-amber-300/15 bg-gradient-to-br from-amber-950 via-slate-900 to-fuchsia-950 p-6 sm:p-8">
      <div className="absolute -right-12 -top-20 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-200">HaechiVN · Profile Atelier</p><h1 className="mt-2 text-2xl font-black text-white sm:text-3xl">Cửa hàng vật phẩm hồ sơ</h1><p className="mt-2 max-w-2xl text-sm text-slate-300">Đổi khung avatar, nền hồ sơ và huy hiệu bằng kim cương học tập. Vật phẩm đã sở hữu có thể thay đổi bất cứ lúc nào.</p></div><div className="inline-flex items-center gap-2 self-start rounded-2xl border border-amber-300/25 bg-amber-300/10 px-5 py-3 text-sm font-black text-amber-100"><Gem className="h-5 w-5" />{currentUser?.gems ?? 0} kim cương</div></div>
    </header>

    {!currentUser ? <section className="card-duo p-8 text-center"><p className="text-sm text-slate-300">Đăng nhập để đổi và trang bị vật phẩm hồ sơ.</p><button onClick={() => handleOpenAuth(false)} className="btn-duo btn-duo-primary mt-4 px-5 py-2.5 text-xs">Đăng nhập</button></section> : loading ? <div className="card-duo p-8 text-center text-sm text-slate-400">Đang tải cửa hàng…</div> : <>
      {error && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}
      {message && <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm font-bold text-emerald-300">✨ {message}</p>}
      <nav className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-800 bg-slate-950/60 p-2">{categories.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setCategory(id)} className={`flex items-center justify-center gap-2 rounded-xl px-2 py-3 text-xs font-black transition ${category === id ? "bg-gradient-to-r from-amber-300 to-orange-400 text-slate-950 shadow-lg" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}><Icon className="h-4 w-4" />{label}</button>)}</nav>
      <p className="-mt-3 text-xs text-slate-500">{categories.find((item) => item.id === category)?.description} {displayedRewards.length} vật phẩm để chọn.</p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {displayedRewards.map((reward) => {
          const hasReward = owned.includes(reward.id);
          const isEquipped = equipped[reward.kind] === reward.id;
          return <article key={reward.id} className="card-duo flex flex-col p-4">
            <div className="relative flex h-36 items-center justify-center overflow-hidden rounded-2xl border border-white/10" style={{ backgroundImage: reward.visual }}>
              <div className="absolute inset-0 bg-black/10" />
              {reward.kind === "frame" ? <div className="relative rounded-full p-[4px] shadow-2xl" style={{ backgroundImage: reward.visual }}><div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-white/60 bg-slate-900 text-3xl font-black text-white">{currentUser.name.charAt(0).toUpperCase()}</div></div> : reward.kind === "badge" ? <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl border border-white/40 bg-black/20 text-5xl shadow-xl backdrop-blur-sm">{reward.icon}</div> : <div className="relative max-w-[85%] rounded-2xl border border-white/20 bg-black/20 px-4 py-3 text-center shadow-xl backdrop-blur-sm"><span className="text-2xl">{reward.icon}</span><p className="mt-1 text-xs font-black text-white">{currentUser.name}</p><p className="text-[9px] font-bold uppercase tracking-widest text-white/70">HaechiVN learner</p></div>}
              {isEquipped && <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full border border-emerald-200/20 bg-emerald-950/80 px-2.5 py-1 text-[10px] font-bold text-emerald-200"><Check className="h-3 w-3" />Đang dùng</span>}
            </div>
            <div className="flex-1 px-1 pt-4"><h2 className="text-base font-black text-white">{reward.name}</h2><p className="mt-1 min-h-10 text-xs leading-5 text-slate-400">{reward.description}</p></div>
            <div className="mt-4 flex items-center justify-between text-xs font-bold text-amber-200"><span className="inline-flex items-center gap-1.5"><Gem className="h-4 w-4" />{reward.cost.toLocaleString("vi-VN")}</span>{hasReward && <span className="text-emerald-300">Đã sở hữu</span>}</div>
            {hasReward ? <button disabled={working !== null || isEquipped} onClick={() => void perform(reward.id, "equip", reward.kind)} className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 py-2.5 text-xs font-bold text-slate-200 hover:border-sky-500 disabled:opacity-50">{isEquipped ? <><Crown className="h-4 w-4" /> Đang trang bị</> : <><Sparkles className="h-4 w-4" /> Trang bị</>}</button> : <button disabled={working !== null || (currentUser.gems || 0) < reward.cost} onClick={() => void perform(reward.id, "redeem", reward.kind)} className="btn-duo btn-duo-primary mt-3 py-2.5 text-xs disabled:opacity-50">{working === reward.id ? "Đang đổi…" : "Mở khóa vật phẩm"}</button>}
          </article>;
        })}
      </div>
      {equipped[category] && <button type="button" disabled={working !== null} onClick={() => void perform("", "unequip", category)} className="text-xs font-bold text-slate-400 underline underline-offset-4 hover:text-white disabled:opacity-50">Bỏ trang bị {categories.find((item) => item.id === category)?.label.toLowerCase()}</button>}
    </>}
  </div></AppShell>;
}
